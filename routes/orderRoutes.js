const express = require('express');
const authController = require('../controllers/authController');
const orderController = require('../controllers/orderController');

const router = express.Router();
router.use(authController.protect);

router.post('/checkout', orderController.checkout);
router.get('/admin', authController.restrictTo('admin'), orderController.getAllOrders);
router.get('/', orderController.getMyOrders);
router.get('/:id', orderController.getOrder);
router.patch('/:id/cancel', orderController.cancelOrder);
router.post('/:id/verify-payment', orderController.verifyPayment);
router.post('/:id/retry-payment', orderController.retryPayment);
router.patch('/:id/status', authController.restrictTo('admin'), orderController.updateOrderStatus);

module.exports = router;
