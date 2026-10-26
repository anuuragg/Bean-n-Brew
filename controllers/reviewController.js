const mongoose = require('mongoose');
const Product = require('../models/productModel');
const Review = require('../models/reviewModel');
const Order = require('../models/orderModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const refreshProductRatings = async productId => {
    const [summary] = await Review.aggregate([
        { $match: { product: new mongoose.Types.ObjectId(productId) } },
        { $group: { _id: null, avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } }
    ]);
    await Product.findByIdAndUpdate(productId, {
        $set: {
            'ratings.avgRating': summary ? Math.round(summary.avgRating * 10) / 10 : 0,
            'ratings.reviewCount': summary?.reviewCount || 0
        }
    });
};

exports.getReviews = catchAsync(async (req, res, next) => {
    if (!await Product.exists({ _id: req.params.id })) return next(new AppError('Product not found.', 404));
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(req.query.limit, 10) || 10));
    const [reviews, total] = await Promise.all([
        Review.find({ product: req.params.id }).populate('user', 'name photo').sort('-createdAt').skip((page - 1) * limit).limit(limit),
        Review.countDocuments({ product: req.params.id })
    ]);
    res.status(200).json({
        status: 'success',
        results: reviews.length,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        data: { reviews }
    });
});

exports.createReview = catchAsync(async (req, res, next) => {
    if (!await Product.exists({ _id: req.params.id })) return next(new AppError('Product not found.', 404));
    const hasPurchase = await Order.exists({
        user: req.user.id,
        status: 'delivered',
        'items.product': req.params.id
    });
    const review = await Review.create({
        product: req.params.id,
        user: req.user.id,
        rating: req.body.rating,
        title: req.body.title,
        text: req.body.text,
        verifiedPurchase: Boolean(hasPurchase)
    });
    await refreshProductRatings(req.params.id);
    res.status(201).json({ status: 'success', data: { review } });
});

exports.updateMyReview = catchAsync(async (req, res, next) => {
    const review = await Review.findOneAndUpdate(
        { product: req.params.id, user: req.user.id },
        { rating: req.body.rating, title: req.body.title, text: req.body.text },
        { new: true, runValidators: true }
    );
    if (!review) return next(new AppError('You have not reviewed this product.', 404));
    await refreshProductRatings(req.params.id);
    res.status(200).json({ status: 'success', data: { review } });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
    const filter = { _id: req.params.reviewId, product: req.params.id };
    if (req.user.role !== 'admin') filter.user = req.user.id;
    const review = await Review.findOneAndDelete(filter);
    if (!review) return next(new AppError('Review not found.', 404));
    await refreshProductRatings(req.params.id);
    res.status(204).end();
});
