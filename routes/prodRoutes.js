const express = require('express');
const prodController = require('../controllers/prodController');
const authController = require('../controllers/authController');

const router = express.Router();

router.route('/stats').get(authController.protect, prodController.getProdStats);

router.route('/')
    .get(authController.protect, prodController.getAllProducts)
    .post(authController.protect, authController.restrictTo('admin'), prodController.createProduct);

router.route('/:id')
    .get(authController.protect, prodController.getProduct)
    .patch(authController.protect, authController.restrictTo('admin'), prodController.updateProduct)
    .delete(
        authController.protect,
        authController.restrictTo('admin'),
        prodController.deleteProduct
    );



module.exports = router;
