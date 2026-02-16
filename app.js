const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');

const globalErrorHandler = require('./controllers/errorController')
const prodRouter = require('./routes/prodRoutes');
const userRouter = require('./routes/userRoutes');
const qs = require('qs');
const { default: helmet } = require('helmet');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.set('query parser', (str) => qs.parse(str));

app.use(helmet());
app.use(mongoSanitize());
app.use(xss());

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
})
app.use('/api', limiter);

app.use(hpp({
    whitelist: ['duration', 'ratingsQuantity', 'ratingsAverage', 'price']
}))

app.use('/api/v1/product', prodRouter);
app.use('/api/v1/user', userRouter);

app.get('/', (req, res) => {
    res.status(200).json({
            status: "ok",
            message: "Bean & Brew API is running"
        })
})

app.use(globalErrorHandler);

module.exports = app;