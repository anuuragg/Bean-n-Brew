const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllUser = catchAsync(async (req, res, next) => {
    const users = await User.find();
    res.status(200).json({
        status: 'success',
        data: {
            users
        }
    })
});


exports.getUser = catchAsync( async(req, res, next) => {
    const user = await User.findById(req.params.id);
    if (!user) return next(new AppError('User not found, please try different ID'));
    
    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    })
})