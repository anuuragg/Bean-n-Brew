const express = require('express');
const prodController = require('../controllers/prodController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');

const router = express.Router();

router.route('/stats').get(prodController.getProdStats);

router.route('/:id/reviews')
    .get(reviewController.getReviews)
    .post(authController.protect, reviewController.createReview);

router.route('/:id/reviews/me')
    .patch(authController.protect, reviewController.updateMyReview);

router.route('/:id/reviews/:reviewId')
    .delete(authController.protect, reviewController.deleteReview);

router.route('/')
    .get(prodController.getAllProducts)
    .post(authController.protect, authController.restrictTo('admin'), prodController.createProduct);

router.route('/:id')
    .get(prodController.getProduct)
    .patch(authController.protect, authController.restrictTo('admin'), prodController.updateProduct)
    .delete(
        authController.protect,
        authController.restrictTo('admin'),
        prodController.deleteProduct
    );



module.exports = router;
