const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const filterObj = (obj, ...allowedFields) => {
    const newObj = {};
    Object.keys(obj).forEach(el => {
        if(allowedFields.includes(el)) newObj[el] = obj[el];
    })

    return newObj;
}

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
});


exports.updateMe = catchAsync( async(req, res, next) => {
    if(req.body.password || req.body.passwordconfirm){
        return next(
            new AppError('This route is not for password updates. Please use /updateMyPassword.', 400)
        )
    }

    const filteredBody = filterObj(req.body, 'name', 'email');
    const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
        new: true,
        runValidators: true
    })

    res.status(200).json({
        status: 'success',
        data: updatedUser
    })
});


exports.deleteMe = catchAsync( async(req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, {active: false});

    res.status(200).json({
        status: 'success',
        data: null
    })
});