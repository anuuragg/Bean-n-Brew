const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const sendEmail = require('../utils/email');

const signToken = (id, version = 0) => {
    return jwt.sign({ id, version }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN
    });
};

exports.restrictTo = (...roles) => {
    return (req, res, next) => {
        if(!roles.includes(req.user.role)){
            return next(
                new AppError('You do not have persmission to perform this action', 403)
            );
        }

        next();
    }
}

const createSendToken = (user, statusCode, res) => {
    const token = signToken(user._id, user.tokenVersion || 0);
    const cookieOptions = {
        expires: new Date(
            Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        path: '/'
    }

    if(process.env.NODE_ENV === 'production' || process.env.VERCEL || cookieOptions.sameSite === 'none') cookieOptions.secure = true;

    res.cookie('jwt', token, cookieOptions);
    const publicUser = {
        _id: user._id,
        id: user.id,
        name: user.name,
        email: user.email,
        photo: user.photo,
        role: user.role || 'user'
    };

    res.status(statusCode).json({
        status: 'success',
        token,
        data: {
            user: publicUser
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
       return next(new AppError('Email and password are required.', 400));
    } 

    const user = await User.findOne({email: email, active: { $ne: false }}).select('+password +tokenVersion +role');

    if(!user || !(await user.correctPassword(password, user.password))){
        return next(new AppError('Invalid credentials! please retry again', 401));
    }

    createSendToken(user, 200, res);
});

exports.logout = catchAsync(async (req, res, next) => {
    await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } });
    res.clearCookie('jwt', {
        httpOnly: true,
        sameSite: process.env.COOKIE_SAME_SITE || 'lax',
        secure: process.env.NODE_ENV === 'production' || Boolean(process.env.VERCEL) || process.env.COOKIE_SAME_SITE === 'none',
        path: '/'
    });
    res.status(200).json({ status: 'success', message: 'Logged out.' });
});


exports.protect = catchAsync( async(req, res, next) => {
    let token;
    if(req.headers.authorization && /^Bearer\s/i.test(req.headers.authorization)){
        token = req.headers.authorization.split(/\s+/)[1];
    }
    if (!token && req.cookies) token = req.cookies.jwt;

    if(!token || token === 'null') return next(new AppError('You are not logged in! Please login to get access.', 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('+role +active +tokenVersion');

    if(!user) return next(new AppError('The user belonging to this token does no longer exist.', 401));
    if (!user.active) return next(new AppError('This account is no longer active.', 401));
    if ((decoded.version || 0) !== user.tokenVersion) return next(new AppError('Your session has ended. Please log in again.', 401));

    if(user.changedPasswordAfter(decoded.iat)){
        return next( new AppError('You recently changed your password! please login again', 401))
    }

    req.user = user;
    next();
});


exports.forgotPassword = catchAsync( async(req, res, next) => {
    const user = await User.findOne({email: req.body.email});
    if (!user) {
        return res.status(200).json({
            status: 'success',
            message: 'If an account exists for this email, password reset instructions have been sent.'
        });
    }

    const resetToken = user.createPasswordResetToken();
    await user.save({validateBeforeSave: false});

    const resetURL = process.env.FRONTEND_APP_URL
        ? `${process.env.FRONTEND_APP_URL.replace(/\/$/, '')}/reset-password?token=${resetToken}`
        : `${req.protocol}://${req.get('host')}/api/v1/user/resetPassword/${resetToken}`;
    
    const message = `Forgot your password? submit a POST request with your new password and passwordConfirm to: ${resetURL}\nIf you didn't forget your password, please ignore this email!`;

    try{
        await sendEmail({
            email: user.email,
            subject: 'Your password reset token (Only valid for 10 mins)',
            message
        });

        res.status(200).json({
            status: 'success',
            message: 'If an account exists for this email, password reset instructions have been sent.'
        });

    } catch(err){
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({validateBeforeSave: false});

        return next(new AppError('There was an error sending the email. Try again later', 500));
    }

});


exports.resetPassword = catchAsync( async(req, res, next) => {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: {$gt: Date.now()}
    }).select('+tokenVersion +role');

    if (!user) return next(new AppError('Token is invalid or expired', 400));

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    createSendToken(user, 200, res);
});


exports.updatePassword = catchAsync( async(req, res, next) => {
    if (!req.body.currentPassword || !req.body.password || !req.body.passwordConfirm) {
        return next(new AppError('Current password, password, and passwordConfirm are required.', 400));
    }
    const user = await User.findById(req.user.id).select('+password +tokenVersion +role');

    if(!await user.correctPassword(req.body.currentPassword, user.password)){
    return next(new AppError('Invalid credentials! Please try again', 400));
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;

    await user.save();

    createSendToken(user, 200, res);

})
