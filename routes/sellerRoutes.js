const express = require('express');
const sellerController = require('../controllers/sellerController');

const router = express.Router();

router.route('/').get(sellerController.getAllProducts);

module.exports = router;