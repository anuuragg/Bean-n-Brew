const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');


exports.signup = catchAsync( async(req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    });

    newUser.password = undefined;
    newUser.role = undefined;
    newUser.active = undefined;

    res.status(200).json({
        status: 'success',
        data: {
            newUser
        }
    });
});


exports.login = catchAsync( async(req, res, next) => {
    const {email, password} = req.body;
    if (!email || !password){
       return next(new AppError('Missing credentials! please retry again', 404)); 
    } 

    const user = await User.findOne({email: email}).select('+password');

    if(!user || !(await user.correctPassword(password, user.password))){
        return next(new AppError('Invalid credentials! please retry again', 401));
    }

    user.password = undefined;
    user.role = undefined;
    user.active = undefined;

    res.status(200).json({
        status: 'success',
        data: {
            user
        }
    })
})