# Bean-n-Brew ☕

A modern coffee e-commerce API built with Node.js, Express, and MongoDB.

## Overview

Bean-n-Brew is a RESTful API for a coffee e-commerce platform. This practice project provides backend services for managing coffee products with detailed specifications including bean types, roast levels, pricing, and inventory management.


## API Documentation

The versioned API base path is `/api/v1`. The [frontend API contract](docs/API.md) documents routes, access rules, payloads, response shapes, pagination, carts, orders, reviews, Razorpay test checkout, CORS, and admin setup.

## Data Model

### Product Schema

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| `name` | String | Yes | 10-40 characters, alphabetic only (spaces allowed) |
| `brand` | String | Yes | - |
| `description` | String | Yes | - |
| `beanType` | String | No | - |
| `price` | Number | Yes | - |
| `priceDiscount` | Number | No | Must be less than price |
| `weight` | Number | Yes | Product weight in grams |
| `inventory.stockQuantity` | Number | Yes | Available stock count |
| `inventory.isAvailable` | Boolean | Yes | Product availability status |
| `media.images` | Array[String] | Yes | Array of image URLs |
| `media.thumbnail` | String | Yes | Thumbnail image URL |
| `ratings.avgRating` | Number | No | 0-5, starts at 0 and is recalculated from reviews |
| `ratings.reviewCount` | Number | No | Default: 0 |
| `tags` | Array[String] | No | Product tags |

### Example Product

```json
{
    "name": "Vienna Roast",
    "brand": "Blue Tokai",
    "description": "Dark roasted coffee blend with rich chocolate notes and smoky undertones perfect for espresso",
    "beanType": "Arabica Blend",
    "price": 475,
    "weight": 250,
    "inventory": {
        "stockQuantity": 150,
        "isAvailable": true
    },
    "media": {
        "images": [
            "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500",
            "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500"
        ],
        "thumbnail": "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500"
    },
    "ratings": {
        "avgRating": 4.6,
        "reviewCount": 234
    },
    "tags": ["dark-roast", "espresso", "chocolate-notes", "premium"]
}
```

## Getting Started

### Prerequisites
- Node.js (v20.19 or higher)
- MongoDB
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/anuuragg/Bean-n-Brew.git

# Navigate to project directory
cd Bean-n-Brew

# Install dependencies
npm install

# Set up environment variables and configure the first admin
cp config.env.example config.env
# Edit config.env with MongoDB/JWT credentials, frontend origins, and optional email/payment settings.

# Start the server
npm start
```

Create the first admin from the terminal with `npm run seed:admin` after setting `ADMIN_EMAIL`, `ADMIN_NAME`, and `ADMIN_PASSWORD` in `config.env`. Use `npm run dev` during development to restart the server when files change.

For a deployed frontend, set `FRONTEND_ORIGINS` and `FRONTEND_APP_URL` in the API host's environment. Razorpay checkout stays unavailable until the Razorpay test keys and webhook secret are configured; COD works without payment-provider credentials.

## Contributing

This is a personal practice project. Feel free to fork and experiment!

---

**Note**: This is a learning project and is under active development. Features and API endpoints are subject to change.
