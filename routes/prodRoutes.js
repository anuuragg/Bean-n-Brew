const express = require('express');
const prodController = require('../controllers/prodController');

const router = express.Router();

router.route('/')
    .get(prodController.getAllProducts)
    .post(prodController.createProduct);
    
router.route('/:id')
    .get(prodController.getProduct)
    .patch(prodController.updateProduct)
    .delete(prodController.deleteProduct);

module.exports = router;