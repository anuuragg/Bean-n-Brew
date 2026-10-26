# Frontend API contract

## Base URL and authentication

Local base URL: `http://localhost:3000/api/v1`. In production, use the deployed API origin plus `/api/v1`.

Public catalog and review reads do not need authentication. Account, cart, order, and review-write routes require a JWT. Send `Authorization: Bearer <token>`. Signup and login also set an HTTP-only `jwt` cookie and return the token in JSON. For cookie authentication, send requests with credentials enabled (`credentials: 'include'` or `withCredentials: true`). `POST /user/logout` invalidates all sessions for the account and clears the cookie; bearer-token clients should also discard their locally stored token.

The API allows only origins listed in `FRONTEND_ORIGINS`. Set this to the exact production frontend origin(s), comma-separated. Cross-site cookie use requires HTTPS and `COOKIE_SAME_SITE=none`; bearer auth is the recommended option when the frontend and API have unrelated sites.

JSON requests use `Content-Type: application/json`. Product collection queries support `search` (name, brand, description, and tags), exact `name`, `brand`, `beanType`, and `tags` filters, and numeric `price`, `priceDiscount`, and `weight` filters. Numeric fields support `[gt]`, `[gte]`, `[lt]`, and `[lte]`. Sorting accepts `name`, `brand`, `price`, `priceDiscount`, `weight`, `ratings.avgRating`, and `createdAt`. `limit` is capped at 100. Duplicate query keys and unsupported filters/sorts return `400`.

## Products

| Method | Path | Access |
| --- | --- | --- |
| GET | `/product` | Public; filter, sort, select fields, paginate |
| GET | `/product/stats` | Public |
| GET | `/product/:id` | Public |
| POST | `/product` | Admin |
| PATCH | `/product/:id` | Admin |
| DELETE | `/product/:id` | Admin; returns `204` |
| GET | `/product/:id/reviews` | Public; `page`, `limit` |
| POST | `/product/:id/reviews` | Signed-in user; one review per user/product |
| PATCH | `/product/:id/reviews/me` | Review owner |
| DELETE | `/product/:id/reviews/:reviewId` | Review owner or admin; returns `204` |

Product list response:

```json
{
  "status": "success",
  "results": 1,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1,
    "hasNextPage": false,
    "hasPreviousPage": false
  },
  "data": { "products": [] }
}
```

`priceDiscount` is the discounted selling price (and must be lower than `price`). `inventory.isAvailable` and `inventory.stockQuantity` are controlled by inventory updates and orders. Reviews use `{ "rating": 1, "title": "Optional", "text": "Review text" }`; rating must be 1–5. A review is marked `verifiedPurchase` after that user has a delivered order containing the product.

## Account

| Method | Path | Access |
| --- | --- | --- |
| POST | `/user/signup` | Public |
| POST | `/user/login` | Public |
| POST | `/user/logout` | Signed-in user; invalidates current account sessions |
| GET | `/user/me` | Signed-in user |
| PATCH | `/user/updateMe` | Signed-in user; name/email only |
| PATCH | `/user/updateMyPassword` | Signed-in user |
| PATCH | `/user/deleteMe` | Signed-in user; deactivates account |
| POST | `/user/forgotPassword` | Public; body `{ "email": "..." }` |
| POST | `/user/resetPassword/:token` | Public; body `{ "password": "...", "passwordConfirm": "..." }` |
| GET | `/user` | Admin |
| GET | `/user/:id` | Admin |

Signup body: `{ "name": "A Name", "email": "person@example.com", "password": "at-least-8-chars", "passwordConfirm": "at-least-8-chars" }`.

Login body: `{ "email": "person@example.com", "password": "..." }`. Success returns `{ "status": "success", "token": "...", "data": { "user": { "id": "...", "name": "...", "email": "...", "role": "user" } } }`.

Password change body: `{ "currentPassword": "...", "password": "...", "passwordConfirm": "..." }`. Set `FRONTEND_APP_URL` to the frontend origin so reset emails link to `/reset-password?token=...`; the frontend then posts the new password to `/user/resetPassword/:token`.

## Cart

All cart paths require a signed-in user. The cart is account-backed and survives new sessions.

| Method | Path | Body |
| --- | --- | --- |
| GET | `/cart` | — |
| POST | `/cart/items` | `{ "productId": "...", "quantity": 2 }` |
| PATCH | `/cart/items/:productId` | `{ "quantity": 3 }` |
| DELETE | `/cart/items/:productId` | — |
| DELETE | `/cart` | — |

Cart responses include `items` with current product data, `unitPrice`, and `lineTotal`, plus `totalQuantity` and `subtotal`. Prices are recalculated at checkout; cart contents do not reserve stock.

## Orders and checkout

| Method | Path | Access |
| --- | --- | --- |
| POST | `/orders/checkout` | Signed-in user; creates an order from the server-side cart |
| GET | `/orders` | Signed-in user's orders; `page`, `limit` |
| GET | `/orders/:id` | Owner or admin |
| PATCH | `/orders/:id/cancel` | Owner; only before fulfillment and subject to payment state |
| POST | `/orders/:id/retry-payment` | Owner; after a failed Razorpay payment |
| POST | `/orders/:id/verify-payment` | Owner; Razorpay checkout callback |
| GET | `/orders/admin` | Admin; all orders, `page`, `limit` |
| PATCH | `/orders/:id/status` | Admin; body `{ "status": "processing" }` |

Checkout requires a shipping address. `shippingFee` and `TAX_RATE` are server configuration; clients must never submit prices or totals.

```json
{
  "paymentMethod": "cash_on_delivery",
  "shippingAddress": {
    "fullName": "A Customer",
    "phone": "+91 9000000000",
    "addressLine1": "10 Example Road",
    "addressLine2": "Apartment 2",
    "city": "Mumbai",
    "state": "Maharashtra",
    "postalCode": "400001",
    "country": "India"
  }
}
```

`paymentMethod` may be `cash_on_delivery` or `razorpay`. Pass an `Idempotency-Key` header when placing an order so retrying a network request cannot create duplicate orders. The response contains a stored order snapshot with `subtotal`, `shippingFee`, `taxAmount`, and `total`. COD checkout returns `checkout: null`.

For Razorpay, configure test credentials and the webhook secret. Checkout returns `data.checkout` with `provider`, the public `keyId`, provider `orderId`, `amount` in paise, and `currency`. The frontend loads Razorpay Checkout.js and opens it using these server-provided values. On success, POST the checkout result unchanged to `/orders/:id/verify-payment`:

```json
{
  "razorpay_payment_id": "pay_...",
  "razorpay_order_id": "order_...",
  "razorpay_signature": "..."
}
```

The backend verifies the signature and payment amount/status. Configure a Razorpay webhook to POST `payment.captured` and `payment.failed` events to `/api/v1/payments/razorpay/webhook`; its signing secret must match `RAZORPAY_WEBHOOK_SECRET`. The checkout integration uses test mode when test keys are configured. Refunds are not automated: paid-order cancellation/refund requires a manual Razorpay refund and reconciliation.

Order statuses: `placed`, `processing`, `shipped`, `delivered`, `cancelled`. Payment statuses: `pending`, `authorized`, `paid`, `failed`, `refunded`. Delivery tracking and refunds are not provided by this API.

## Admin setup

Create the first admin from a trusted terminal: set `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` in `config.env`, then run `npm run seed:admin`. The command creates that account if needed or promotes the matching account. Remove the admin password from the environment after running it. Admin access is never accepted from public signup input.

## Errors and limits

Errors use `{ "status": "fail", "message": "..." }` for expected client errors. Development responses include stack details; production does not. Common statuses: `400` invalid input, `401` missing/invalid session, `403` insufficient role or CORS origin, `404` missing resource, `409` stock/order conflict, `429` rate limit, and `500` unexpected server error. API requests are limited to 100 per IP per hour; signup, login, and password recovery are additionally limited to 10 attempts per IP per 15 minutes. Password recovery always returns a generic success message to avoid disclosing registered emails.
