const Product = require('../models/productModel');
const apiFeatures = require('../utils/APIFeatures');
const catchAsync = require('../utils/catchAsync');

exports.getAllProducts = catchAsync(async (req, res) => {
    const features = new apiFeatures(Product.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    const products = await features.query;
    res.status(200).json({
        status: 'success',
        results: products.length,
        data: {
            Product: products
        },
    });
});

exports.getProduct = catchAsync (async (req, res) => {
    const product = await Product.findById(req.params.id);
    res.status(200).json({
        status: 'success',
        data: {
            product
        }
    });
});

exports.createProduct = catchAsync (async (req, res) => {
    const newProduct = await Product.create(req.body);
    res.status(201).json({
        status: 'success',
        data: {
            Product: newProduct
        },
    });
});

exports.updateProduct = catchAsync (async (req, res) => {
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
});

exports.deleteProduct = catchAsync (async (req, res) => {
    await Product.findByIdAndDelete(req.params.id);
    res.status(204).json({
        status: 'success',
        data: null
    });
});

exports.getProdStats = catchAsync (async (req, res) => {
    const stats = await Product.aggregate([
        {
            $group: {
                _id: '$brand',
                numProds: { $sum: 1 },
                numRatings: { $sum: '$ratings.reviewCount' },
                avgRatings: { $avg: '$ratings.avgRating' },
                avgPrice: { $avg: '$price' },
                minPrice: { $min: '$price' },
                maxPrice: { $max: '$price' }
            }
        }
    ]);

    res.status(200).json({
        satus: 'success',
        data: {
            stats
        }
    });
});