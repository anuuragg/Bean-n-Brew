const mongoose = require('mongoose');
const validator = require('validator');
const slugify = require('slugify');

const prodSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'A prodcut must have a name'],
            unique: true,
            trim: true,
            maxlength: [40, 'A product name must be less than or equal to 40 characters'],
            minlength: [10, 'A product name must be more than or equal to 10 characters'],
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
        slug: String,
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
            required: [true, 'A product must have a price'],
            min: [0.01, 'A product price must be greater than zero']
        },
        priceDiscount: {
            type: Number,
            min: [0, 'Discount price cannot be negative'],
            validate: {
                validator: function(val){
                    return val < this.price;
                },
                message: 'Discount price ({VALUE}) should be below the regular price',
            }
        },
        weight: {
            type: Number,
            required: [true, "A product's weight must be defined"],
            min: [0.01, 'Product weight must be greater than zero']
        },
        inventory: {
            stockQuantity: {
                type: Number,
                required: [true, 'A product stock quantity must be defined'],
                min: [0, 'Stock quantity cannot be negative']
            },
            isAvailable: {
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
                default: 0,
                min: [0, 'A rating must be zero or higher'],
                max: [5.0, 'A rating must be less than 5.0']
            },
            reviewCount: {
                type: Number,
                default: 0
            }
        },
        tags: [String]
    }, { timestamps: true }
);

prodSchema.pre('save', function(){
    this.slug = slugify(this.name, {lower: true});
});

prodSchema.pre('findOneAndUpdate', function(){
    const update = this.getUpdate();
    const name = update.name || update.$set?.name;
    if (name) {
        const slug = slugify(name, {lower: true});
        if (update.$set) update.$set.slug = slug;
        else update.slug = slug;
    }
});


const Product = mongoose.model('Product', prodSchema);

module.exports = Product;
