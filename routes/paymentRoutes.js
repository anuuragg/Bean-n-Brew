const express = require('express');
const orderController = require('../controllers/orderController');

const router = express.Router();
router.post('/razorpay/webhook', orderController.razorpayWebhook);

module.exports = router;
