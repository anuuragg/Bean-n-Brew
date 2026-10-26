const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const AppError = require('./utils/appError');

const globalErrorHandler = require('./controllers/errorController')
const prodRouter = require('./routes/prodRoutes');
const userRouter = require('./routes/userRoutes');
const cartRouter = require('./routes/cartRoutes');
const orderRouter = require('./routes/orderRoutes');
const paymentRouter = require('./routes/paymentRoutes');
const qs = require('qs');

const app = express();
app.use((req, res, next) => {
    const databaseReady = app.locals.databaseReady;
    if (!databaseReady) return next();
    databaseReady.then(() => next()).catch(next);
});
app.use(helmet());
const allowedOrigins = (process.env.FRONTEND_ORIGINS || 'http://localhost:3000,http://localhost:5173')
    .split(',').map(origin => origin.trim()).filter(Boolean);
app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new AppError('This origin is not allowed by CORS.', 403));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key']
}));
app.use('/api/v1/payments/razorpay/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use((req, res, next) => {
    if (!req.body) req.body = {};
    next();
});

app.set('query parser', (str) => qs.parse(str));

app.use(mongoSanitize({ skipRoutes: ['/api/v1/payments/razorpay/webhook'] }));

// Reject duplicate query keys to avoid HTTP parameter pollution. Express 5
// exposes req.query as a getter, so middleware must not replace it.
app.use((req, res, next) => {
    const params = new URL(req.originalUrl, 'http://localhost').searchParams;
    const seen = new Set();
    for (const key of params.keys()) {
        if (seen.has(key)) return next(new AppError(`Duplicate query parameter: ${key}`, 400));
        seen.add(key);
    }
    next();
});

const limiter = rateLimit({
    max: 100,
    windowMs: 60 * 60 * 1000,
    message: 'Too many requests from this IP, please try again in an hour!'
})
app.use('/api/v1/payments', paymentRouter);
app.use('/api', limiter);

app.use('/api/v1/product', prodRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/cart', cartRouter);
app.use('/api/v1/orders', orderRouter);

app.get('/', (req, res) => {
    res.status(200).json({
            status: "ok",
            message: "Bean & Brew API is running"
        })
})

app.use((req, res, next) => {
    next(new AppError(`Can't find ${req.originalUrl} on this server.`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
