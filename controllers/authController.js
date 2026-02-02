const jwt = require('jsonwebtoken');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');

const signToken = id => {
    return jwt.sign({id: id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id);
    const cookieOptions = {
        expiresIn: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 1000
        ),
        httpOnly: true
    }

    if(process.env.NODE_ENV === 'production') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);

    user.password = undefined;
    user.role = undefined;
    user.active = undefined;

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user
        }
    });
}


exports.signup = catchAsync( async(req, res, next) => {
    const newUser = await User.create({
        name: req.body.name,
        email: req.body.email,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm
    });

    createSendToken(newUser, 201, res);
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

    createSendToken(user, 200, res);
});


exports.protect = catchAsync( async(req, res, next) => {
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    }

    if(!token || token === 'null') return next(new AppError('You are not logged in! Please login to get access.', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if(!user) return next(new AppError('The user belonging to this token does no longer exist.', 401));

    if(user.changedPasswordAfter(decoded.iat)){
        return next( new AppError('You recently changed your password! please login again', 401))
    }

    req.user = user;
    next();
});