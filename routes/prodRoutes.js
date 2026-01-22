const express = require('express');
const sellerController = require('../controllers/prodController');

const router = express.Router();

router.route('/')
    .get(sellerController.getAllProducts)
    .post(sellerController.createProduct);

module.exports = router;