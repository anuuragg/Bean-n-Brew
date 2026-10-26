const AppError = require('../utils/appError');

const handleCastErrorDB = err => {
    const message = `Invalid: ${err.path}: ${err.value}`;
    return new AppError(message, 400);
}

const handleDuplicateFieldsDB = err => {
    const value = Object.values(err.keyValue || {})[0] || 'value';
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
}

const handleValidationErrorDB = err => {
    const errors = Object.values(err.errors).map(el => el.message)
    const message = `Invalid input data. ${errors.join('. ')}`
    return new AppError(message, 400);
}


const sendErrorDev = (err, res) => {
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack
    })
}

const sendErrorProd = (err, res) => {
    if (err.isOperational){
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        });
    } else {
        console.log(err);

        res.status(500).json({
            status: 'error',
            message: 'something went very wrong!'
        })
    }
}


module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';
    
    const env = (process.env.NODE_ENV || 'development').trim();
    if(env === 'development'){
        sendErrorDev(err, res);
    } else if(env === 'production'){
        let error = err;

        if(error.name === 'CastError') error = handleCastErrorDB(error);
        if(error.code === 11000) error = handleDuplicateFieldsDB(error);
        if(error.name === 'ValidationError') error = handleValidationErrorDB(error);
        if (error.type === 'entity.parse.failed') error = new AppError('Invalid JSON in request body.', 400);
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            error = new AppError('Your authentication token is invalid or expired. Please log in again.', 401);
        }

        sendErrorProd(error, res);
    } else {
        sendErrorProd(err, res);
    }
};
