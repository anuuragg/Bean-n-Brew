const Product = require('./../models/productModel')

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(201).json({
            status: 'success',
            data: {
                Product: products
            },
        })
        
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        })        
    }
}

exports.createProduct = async (req, res) => {
    try {
        const newProduct = await Product.create(req.body);
        res.status(201).json({
            status: 'success',
            data: {
                Product: newProduct
            },
        })
        
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        })        
    }
}