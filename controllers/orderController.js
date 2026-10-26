const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const Order = require('../models/orderModel');
const Product = require('../models/productModel');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const getRazorpay = () => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET || !process.env.RAZORPAY_WEBHOOK_SECRET) {
        throw new AppError('Online payments are not configured. Use cash on delivery or contact support.', 503);
    }
    return new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID, key_secret: process.env.RAZORPAY_KEY_SECRET });
};

const makeOrderNumber = () => `BNB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

const checkoutDetails = order => order.razorpayOrderId ? {
    provider: 'razorpay',
    keyId: process.env.RAZORPAY_KEY_ID,
    orderId: order.razorpayOrderId,
    amount: Math.round(order.total * 100),
    currency: order.currency
} : null;

const releaseInventory = async items => {
    for (const item of items) {
        await Product.findByIdAndUpdate(item.product, {
            $inc: { 'inventory.stockQuantity': item.quantity },
            $set: { 'inventory.isAvailable': true }
        });
    }
};

const reserveInventory = async cartItems => {
    const reserved = [];
    try {
        const items = [];
        let subtotal = 0;
        for (const cartItem of cartItems) {
            if (!cartItem.product) throw new AppError('A cart item refers to an unavailable product. Remove it and try again.', 409);
            const productId = cartItem.product._id;
            const quantity = cartItem.quantity;
            const product = await Product.findOneAndUpdate(
                { _id: productId, 'inventory.isAvailable': true, 'inventory.stockQuantity': { $gte: quantity } },
                { $inc: { 'inventory.stockQuantity': -quantity } },
                { new: true }
            );
            if (!product) throw new AppError(`${cartItem.product.name} does not have enough stock.`, 409);
            reserved.push({ product: productId, quantity });
            if (product.inventory.stockQuantity === 0) {
                await Product.findByIdAndUpdate(productId, { $set: { 'inventory.isAvailable': false } });
            }

            const unitPrice = product.priceDiscount ?? product.price;
            subtotal += unitPrice * quantity;
            items.push({
                product: product._id,
                name: product.name,
                image: product.media?.thumbnail,
                unitPrice,
                quantity
            });
        }
        if (!Number.isFinite(subtotal) || subtotal <= 0) throw new AppError('Order total must be greater than zero.', 400);
        return { reserved, items, subtotal };
    } catch (error) {
        await releaseInventory(reserved);
        throw error;
    }
};

const populateOrder = query => query.populate('user', 'name email');

const createRazorpayOrder = async order => {
    const razorpay = getRazorpay();
    const checkoutOrder = await razorpay.orders.create({
        amount: Math.round(order.total * 100),
        currency: order.currency,
        partial_payment: false,
        receipt: order.orderNumber,
        notes: { internalOrderId: order.id }
    });
    order.razorpayOrderId = checkoutOrder.id;
    await order.save();
    return {
        provider: 'razorpay',
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: checkoutOrder.id,
        amount: checkoutOrder.amount,
        currency: checkoutOrder.currency
    };
};

exports.checkout = catchAsync(async (req, res, next) => {
    const paymentMethod = req.body.paymentMethod || 'cash_on_delivery';
    if (!['cash_on_delivery', 'razorpay'].includes(paymentMethod)) {
        return next(new AppError('paymentMethod must be cash_on_delivery or razorpay.', 400));
    }
    if (!req.body.shippingAddress || typeof req.body.shippingAddress !== 'object') {
        return next(new AppError('shippingAddress is required.', 400));
    }

    if (paymentMethod === 'razorpay') getRazorpay();

    const idempotencyKey = req.get('Idempotency-Key');
    if (idempotencyKey && idempotencyKey.length > 128) return next(new AppError('Idempotency-Key must be 128 characters or fewer.', 400));
    if (idempotencyKey) {
        const existing = await Order.findOne({ user: req.user.id, idempotencyKey });
        if (existing) {
            if (existing.paymentMethod === 'razorpay' && !existing.razorpayOrderId) {
                return next(new AppError('Checkout is still being prepared. Retry this request with the same Idempotency-Key.', 409));
            }
            return res.status(200).json({ status: 'success', data: { order: existing, checkout: checkoutDetails(existing) } });
        }
    }

    const user = await User.findById(req.user.id).select('+cartItems').populate(
        'cartItems.product', 'name price priceDiscount media inventory'
    );
    if (!user?.cartItems?.length) return next(new AppError('Your cart is empty.', 400));

    const { reserved, items, subtotal } = await reserveInventory(user.cartItems);
    const shippingFee = Number(process.env.SHIPPING_FEE || 0);
    const taxRate = Number(process.env.TAX_RATE || 0);
    if (!Number.isFinite(shippingFee) || shippingFee < 0 || !Number.isFinite(taxRate) || taxRate < 0) {
        await releaseInventory(reserved);
        return next(new AppError('SHIPPING_FEE and TAX_RATE must be zero or positive numbers.', 500));
    }
    const taxAmount = Math.round(subtotal * taxRate) / 100;
    const total = Math.round((subtotal + shippingFee + taxAmount) * 100) / 100;
    let order;
    try {
        [order] = await Order.create([{
            orderNumber: makeOrderNumber(),
            user: req.user.id,
            items,
            shippingAddress: req.body.shippingAddress,
            subtotal,
            shippingFee,
            taxAmount,
            total,
            currency: process.env.CURRENCY || 'INR',
            paymentMethod,
            idempotencyKey
        }]);
        let checkout = null;
        if (paymentMethod === 'razorpay') checkout = await createRazorpayOrder(order);

        await User.findByIdAndUpdate(req.user.id, { $set: { cartItems: [] } });
        res.status(201).json({ status: 'success', data: { order, checkout } });
    } catch (error) {
        await releaseInventory(reserved);
        if (order) await Order.findByIdAndDelete(order.id);
        if (error.code === 11000 && idempotencyKey) {
            const existing = await Order.findOne({ user: req.user.id, idempotencyKey });
            if (existing) {
                if (existing.paymentMethod === 'razorpay' && !existing.razorpayOrderId) {
                    return next(new AppError('Checkout is still being prepared. Retry this request with the same Idempotency-Key.', 409));
                }
                return res.status(200).json({ status: 'success', data: { order: existing, checkout: checkoutDetails(existing) } });
            }
        }
        throw error;
    }
});

exports.getMyOrders = catchAsync(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const filter = { user: req.user.id };
    const [orders, total] = await Promise.all([
        Order.find(filter).sort('-createdAt').skip((page - 1) * limit).limit(limit),
        Order.countDocuments(filter)
    ]);
    res.status(200).json({ status: 'success', results: orders.length, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, data: { orders } });
});

exports.getOrder = catchAsync(async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) return next(new AppError('Invalid order id.', 400));
    const filter = { _id: req.params.id };
    if (req.user.role !== 'admin') filter.user = req.user.id;
    const order = await populateOrder(Order.findOne(filter));
    if (!order) return next(new AppError('Order not found.', 404));
    res.status(200).json({ status: 'success', data: { order } });
});

exports.cancelOrder = catchAsync(async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) return next(new AppError('Invalid order id.', 400));
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id });
    if (!order) return next(new AppError('Order not found.', 404));
    if (order.status !== 'placed' && order.status !== 'processing') return next(new AppError('This order can no longer be cancelled.', 409));
    if (order.paymentStatus === 'paid') return next(new AppError('Paid orders require a refund before cancellation. Contact support.', 409));
    if (order.paymentMethod === 'razorpay' && ['pending', 'authorized'].includes(order.paymentStatus)) return next(new AppError('A payment is still pending. Wait for its result before cancelling.', 409));

    const cancelled = await Order.findOneAndUpdate(
        { _id: order.id, status: { $in: ['placed', 'processing'] }, paymentStatus: { $ne: 'paid' } },
        { $set: { status: 'cancelled' } },
        { new: true }
    );
    if (!cancelled) return next(new AppError('This order has already changed and cannot be cancelled.', 409));
    await releaseInventory(order.items);
    res.status(200).json({ status: 'success', data: { order: cancelled } });
});

exports.getAllOrders = catchAsync(async (req, res) => {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit, 10) || 20));
    const [orders, total] = await Promise.all([
        populateOrder(Order.find()).sort('-createdAt').skip((page - 1) * limit).limit(limit),
        Order.countDocuments()
    ]);
    res.status(200).json({ status: 'success', results: orders.length, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }, data: { orders } });
});

exports.updateOrderStatus = catchAsync(async (req, res, next) => {
    const allowed = ['processing', 'shipped', 'delivered', 'cancelled'];
    const nextStatus = req.body.status;
    if (!allowed.includes(nextStatus)) return next(new AppError(`status must be one of: ${allowed.join(', ')}.`, 400));
    const order = await Order.findById(req.params.id);
    if (!order) return next(new AppError('Order not found.', 404));
    const transitions = {
        placed: ['processing', 'cancelled'],
        processing: ['shipped', 'cancelled'],
        shipped: ['delivered'],
        delivered: [],
        cancelled: []
    };
    if (!transitions[order.status].includes(nextStatus)) return next(new AppError(`Cannot move an order from ${order.status} to ${nextStatus}.`, 409));
    if (nextStatus === 'cancelled' && order.paymentStatus === 'paid') return next(new AppError('Refund the paid order before cancelling it.', 409));
    if (order.paymentMethod === 'razorpay' && ['pending', 'authorized'].includes(order.paymentStatus)) {
        return next(new AppError('Wait for the payment result before changing this order status.', 409));
    }
    if (order.paymentMethod === 'razorpay' && nextStatus !== 'cancelled' && order.paymentStatus !== 'paid') {
        return next(new AppError('Only paid Razorpay orders can be fulfilled.', 409));
    }
    const update = { status: nextStatus };
    if (nextStatus === 'delivered' && order.paymentMethod === 'cash_on_delivery') update.paymentStatus = 'paid';
    const updatedOrder = await Order.findOneAndUpdate(
        { _id: order.id, status: order.status },
        { $set: update },
        { new: true, runValidators: true }
    );
    if (!updatedOrder) return next(new AppError('Order changed while updating its status. Reload and try again.', 409));
    if (nextStatus === 'cancelled') await releaseInventory(order.items);
    res.status(200).json({ status: 'success', data: { order: updatedOrder } });
});

exports.retryPayment = catchAsync(async (req, res, next) => {
    const order = await Order.findOne({
        _id: req.params.id,
        user: req.user.id,
        paymentMethod: 'razorpay',
        paymentStatus: 'failed',
        status: { $in: ['placed', 'cancelled'] }
    });
    if (!order) return next(new AppError('This order has no failed payment to retry.', 404));
    getRazorpay();

    let reserved = [];
    if (order.status === 'cancelled') {
        const cartLikeItems = [];
        for (const item of order.items) {
            const product = await Product.findById(item.product).select('name');
            if (!product) return next(new AppError(`Product '${item.name}' is no longer available.`, 409));
            cartLikeItems.push({ product, quantity: item.quantity });
        }
        ({ reserved } = await reserveInventory(cartLikeItems));
    }
    try {
        order.status = 'placed';
        order.paymentStatus = 'pending';
        order.razorpayPaymentId = undefined;
        const checkout = await createRazorpayOrder(order);
        await order.save();
        res.status(200).json({ status: 'success', data: { order, checkout } });
    } catch (error) {
        await releaseInventory(reserved);
        throw error;
    }
});

exports.verifyPayment = catchAsync(async (req, res, next) => {
    const { razorpay_payment_id: paymentId, razorpay_order_id: providerOrderId, razorpay_signature: signature } = req.body;
    if (!paymentId || !providerOrderId || !signature) return next(new AppError('Payment id, order id, and signature are required.', 400));
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id, paymentMethod: 'razorpay' });
    if (!order) return next(new AppError('Order not found.', 404));
    if (order.paymentStatus === 'paid') return res.status(200).json({ status: 'success', data: { order } });
    if (order.razorpayOrderId !== providerOrderId) return next(new AppError('Payment order does not match this checkout.', 400));

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${providerOrderId}|${paymentId}`).digest();
    const received = Buffer.from(signature, 'hex');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
        return next(new AppError('Payment signature is invalid.', 400));
    }

    const payment = await getRazorpay().payments.fetch(paymentId);
    if (payment.order_id !== providerOrderId || payment.amount !== Math.round(order.total * 100)) {
        return next(new AppError('Payment details do not match this order.', 400));
    }
    if (payment.status !== 'captured') {
        order.paymentStatus = payment.status === 'authorized' ? 'authorized' : 'pending';
        await order.save();
        return res.status(202).json({ status: 'pending', message: 'Payment is authorized and awaiting capture confirmation.', data: { order } });
    }
    order.paymentStatus = 'paid';
    order.razorpayPaymentId = paymentId;
    if (order.status === 'cancelled') order.requiresManualReview = true;
    else order.status = 'processing';
    await order.save();
    res.status(200).json({ status: 'success', data: { order } });
});

exports.razorpayWebhook = catchAsync(async (req, res) => {
    if (!process.env.RAZORPAY_WEBHOOK_SECRET) throw new AppError('Razorpay webhook secret is not configured.', 503);
    if (!Buffer.isBuffer(req.body)) throw new AppError('Webhook body must be JSON.', 400);
    const signature = req.get('x-razorpay-signature') || '';
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(req.body).digest();
    const received = Buffer.from(signature, 'hex');
    if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) throw new AppError('Invalid webhook signature.', 400);

    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'payment.captured') {
        const payment = event.payload?.payment?.entity;
        const order = payment && await Order.findOne({ razorpayOrderId: payment.order_id });
        if (order && payment.amount === Math.round(order.total * 100)) {
            const update = { paymentStatus: 'paid', razorpayPaymentId: payment.id };
            if (order.status === 'placed') update.status = 'processing';
            if (order.status === 'cancelled') update.requiresManualReview = true;
            await Order.findOneAndUpdate(
                { _id: order.id, status: order.status, paymentStatus: { $ne: 'paid' } },
                { $set: update }
            );
        }
    } else if (event.event === 'payment.failed') {
        const payment = event.payload?.payment?.entity;
        if (payment) await Order.findOneAndUpdate(
            { razorpayOrderId: payment.order_id, paymentStatus: { $nin: ['paid', 'refunded'] } },
            { $set: { paymentStatus: 'failed' } }
        );
    }
    res.status(200).json({ status: 'ok' });
});
