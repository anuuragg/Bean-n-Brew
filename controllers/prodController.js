const Product = require('../models/productModel');
const APIFeatures = require('../utils/APIFeatures');

exports.getAllProducts = async (req, res) => {
    try {
        const features = new APIFeatures(Product.find(), req.query)
            .filter();
        const products = await features.query;
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
            message: err.message || err
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
        res.status(400).json({
            status: 'fail',
            message: err.message || err
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