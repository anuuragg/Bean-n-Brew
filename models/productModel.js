const mongoose = require('mongoose');
const validator = require('validator');

const prodSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A prodcut must have a name'],
            unique: true,
            trim: true,
            maxlength: [40, 'A product name must be less than or equal to 40 characters'],
            minlenght: [10, 'A product name must be more than or equal to 10 characters'],
            validate: {
                validator: function(val){
                    return validator.isAlpha(val, 'en-US', {ignore: ' '});
                },
                message: 'A product name must only contain characters and spaces'
            }
        },
        brand: {
            type: String,
            required: [true, 'A product must have a brand'],
            trim: true
        },
        // slug: String,
        description: {
            type: String,
            required: [true, 'A product must have a description'],
            trim: true
        },
        beanType: {
            type: String,
            trim: true
        },
        price: {
            type: Number,
            required: [true, 'A product must have a price']
        },
        priceDiscount: {
            type: Number,
            validate: {
                validator: function(val){
                    return val < this.price;
                },
                message: 'Discount price ({VALUE}) should be below the regular price',
            }
        },
        weight: {
            type: Number,
            required: [true, "A product's weight must be defined"]
        },
        inventory: {
            stockQuantity: {
                type: Number,
                required: [true, 'A product stock quantity must be defined']
            },
            isAvailabe: {
                type: Boolean,
                required: [true, 'A product availability must be defined']
            }
        },
        media: {
            images: {
                type: [String],
                required: [true, 'A product must have its images']
            },
            thumbnail: {
                type: String,
                required: [true, 'A product must have a thumbnail']
            }
        },
        ratings: {
            avgRating: {
                type: Number,
                default: 4.5,
                min: [1.0, 'A rating must be more than 1.0'],
                max: [5.0, 'A rating must be less than 5.0']
            },
            reviewCount: {
                type: Number,
                default: 0
            }
        },
        tags: [String]
    }
)

const Product = mongoose.model('Product', prodSchema);

module.exports = Product;