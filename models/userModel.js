const mongoose = require('mongoose');
const validator = require('validator');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please tell us your name!']
    },
    email: {
        type: String,
        required: [true, 'Please provide your email!'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    photo: String,
    role: {
        type: String,
        enum: ['admin', 'user'],
        default: 'user'
    },
    password: {
        type: String,
        required: [true, 'Please enter a password'],
        minlength: 8,
        select: false
    },
    passwordConfirm: {
        type: String,
        required: true,
        validate: {
            validator: function(el){
                return el === this.password;
            },
            message: 'Passwords do not match, please retry again!'
        }
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwrodResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false
    }
});


const User = mongoose.model('User', userSchema);
module.exports = User;