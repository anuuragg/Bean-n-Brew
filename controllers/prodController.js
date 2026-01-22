const Product = require('../models/productModel');

exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.status(200).json({
            status: 'success',
            results: products.length,
            data: {
                Product: products
            },
        });
        
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        });       
    }
}

exports.getProduct = async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        res.status(200).json({
            status: 'success',
            data: {
                product
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        });        
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
        });
        
    } catch (err) {
        console.log('Full error:', err); // Add this
        console.log('Error message:', err.message); // Add this
        res.status(400).json({ // Changed from 404 to 400
            status: 'fail',
            message: err.message || err, // Changed to show actual message
        });    
    }
}

exports.updateProduct = async (req, res) => {
    try {
        const updatedProd = await Product.findByIdAndUpdate(req.params.id, req.body,{
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            status: 'success',
            data: {
                product: updatedProd
            }
        });
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        });
    }
}

exports.deleteProduct = async (req, res) => {
    try {
        await Product.findByIdAndDelete(req.params.id);
        res.status(204).json({
            status: 'success',
            data: null
        })
    } catch (err) {
        res.status(404).json({
            status: 'fail',
            message: err
        });
    }
}