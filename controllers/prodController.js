const Product = require('../models/productModel');
const apiFeatures = require('../utils/APIFeatures');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllProducts = catchAsync(async (req, res) => {
    const features = new apiFeatures(Product.find(), req.query)
        .filter()
        .sort()
        .limitFields()
        .paginate();
    const [products, total] = await Promise.all([
        features.query,
        Product.countDocuments(features.filterQuery)
    ]);
    res.status(200).json({
        status: 'success',
        results: products.length,
        pagination: {
            page: features.page,
            limit: features.limit,
            total,
            totalPages: Math.ceil(total / features.limit),
            hasNextPage: features.page * features.limit < total,
            hasPreviousPage: features.page > 1
        },
        data: {
            products
        },
    });
});

exports.getProduct = catchAsync (async (req, res) => {
    const product = await Product.findById(req.params.id);
    if (!product) throw new AppError('Product not found.', 404);
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
            product: newProduct
        },
    });
});

exports.updateProduct = catchAsync (async (req, res) => {
    const currentProduct = await Product.findById(req.params.id);
    if (!currentProduct) throw new AppError('Product not found.', 404);
    const nextPrice = Object.hasOwn(req.body, 'price') ? req.body.price : currentProduct.price;
    const nextDiscount = Object.hasOwn(req.body, 'priceDiscount') ? req.body.priceDiscount : currentProduct.priceDiscount;
    if (nextDiscount != null && Number(nextDiscount) >= Number(nextPrice)) {
        throw new AppError('Discount price must be lower than the product price.', 400);
    }
    const updatedProd = await Product.findByIdAndUpdate(req.params.id, req.body,{
        new: true,
        runValidators: true,
    });
    if (!updatedProd) throw new AppError('Product not found.', 404);

    res.status(200).json({
        status: 'success',
        data: {
            product: updatedProd
        }
    });
});

exports.deleteProduct = catchAsync (async (req, res) => {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) throw new AppError('Product not found.', 404);
    res.status(204).end();
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
        status: 'success',
        data: {
            stats
        }
    });
});
