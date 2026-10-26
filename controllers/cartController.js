const mongoose = require('mongoose');
const User = require('../models/userModel');
const Product = require('../models/productModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const loadCart = userId => User.findById(userId).select('+cartItems').populate(
    'cartItems.product', 'name brand slug price priceDiscount weight media inventory'
);

const formatCart = user => {
    const items = user.cartItems.filter(item => item.product).map(item => {
        const product = item.product;
        const unitPrice = product.priceDiscount ?? product.price;
        return {
            product,
            quantity: item.quantity,
            unitPrice,
            lineTotal: unitPrice * item.quantity
        };
    });
    return {
        items,
        totalQuantity: items.reduce((total, item) => total + item.quantity, 0),
        subtotal: items.reduce((total, item) => total + item.lineTotal, 0)
    };
};

const validateQuantity = (value, next) => {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 1) {
        next(new AppError('quantity must be a positive integer.', 400));
        return null;
    }
    return quantity;
};

exports.getCart = catchAsync(async (req, res, next) => {
    const user = await loadCart(req.user.id);
    if (!user) return next(new AppError('User not found.', 404));
    res.status(200).json({ status: 'success', data: { cart: formatCart(user) } });
});

exports.addItem = catchAsync(async (req, res, next) => {
    const quantity = validateQuantity(req.body.quantity, next);
    if (!quantity) return;
    if (!mongoose.isValidObjectId(req.body.productId)) return next(new AppError('A valid productId is required.', 400));

    const product = await Product.findById(req.body.productId);
    if (!product) return next(new AppError('Product not found.', 404));
    if (!product.inventory.isAvailable || product.inventory.stockQuantity < quantity) {
        return next(new AppError('Requested quantity is not available.', 409));
    }

    const user = await User.findById(req.user.id).select('+cartItems');
    const existing = user.cartItems.find(item => item.product.toString() === product.id);
    const totalQuantity = (existing?.quantity || 0) + quantity;
    if (totalQuantity > product.inventory.stockQuantity) {
        return next(new AppError('Cart quantity exceeds available stock.', 409));
    }
    if (existing) existing.quantity = totalQuantity;
    else user.cartItems.push({ product: product.id, quantity });
    await user.save({ validateBeforeSave: false });
    const refreshed = await loadCart(req.user.id);
    res.status(200).json({ status: 'success', data: { cart: formatCart(refreshed) } });
});

exports.setItemQuantity = catchAsync(async (req, res, next) => {
    const quantity = validateQuantity(req.body.quantity, next);
    if (!quantity) return;
    if (!mongoose.isValidObjectId(req.params.productId)) return next(new AppError('A valid product id is required.', 400));
    const product = await Product.findById(req.params.productId);
    if (!product) return next(new AppError('Product not found.', 404));
    if (!product.inventory.isAvailable || product.inventory.stockQuantity < quantity) {
        return next(new AppError('Requested quantity is not available.', 409));
    }

    const user = await User.findById(req.user.id).select('+cartItems');
    const item = user.cartItems.find(entry => entry.product.toString() === product.id);
    if (!item) return next(new AppError('Product is not in your cart.', 404));
    item.quantity = quantity;
    await user.save({ validateBeforeSave: false });
    const refreshed = await loadCart(req.user.id);
    res.status(200).json({ status: 'success', data: { cart: formatCart(refreshed) } });
});

exports.removeItem = catchAsync(async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.productId)) return next(new AppError('A valid product id is required.', 400));
    const user = await User.findById(req.user.id).select('+cartItems');
    const before = user.cartItems.length;
    user.cartItems = user.cartItems.filter(item => item.product.toString() !== req.params.productId);
    if (before === user.cartItems.length) return next(new AppError('Product is not in your cart.', 404));
    await user.save({ validateBeforeSave: false });
    const refreshed = await loadCart(req.user.id);
    res.status(200).json({ status: 'success', data: { cart: formatCart(refreshed) } });
});

exports.clearCart = catchAsync(async (req, res) => {
    await User.findByIdAndUpdate(req.user.id, { $set: { cartItems: [] } });
    res.status(200).json({ status: 'success', data: { cart: { items: [], totalQuantity: 0, subtotal: 0 } } });
});

exports.loadCart = loadCart;
exports.formatCart = formatCart;
