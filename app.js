const express = require('express');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const mongoSanitize = require('@exortek/express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const AppError = require('./utils/appError');

const globalErrorHandler = require('./controllers/errorController')
const prodRouter = require('./routes/prodRoutes');
const userRouter = require('./routes/userRoutes');
const qs = require('qs');

const app = express();
app.use((req, res, next) => {
    const databaseReady = app.locals.databaseReady;
    if (!databaseReady) return next();
    databaseReady.then(() => next()).catch(next);
});
app.use(express.json());
app.use(cookieParser());

app.set('query parser', (str) => qs.parse(str));

app.use(helmet());
app.use(mongoSanitize());

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
app.use('/api', limiter);

app.use('/api/v1/product', prodRouter);
app.use('/api/v1/user', userRouter);

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
