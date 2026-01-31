const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getAllUser = catchAsync(async (req, res) => {
    const users = await User.find();
    res.status(200).json({
        status: 'success',
        data: {
            users
        }
    })
});

