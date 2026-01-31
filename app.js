const express = require('express');
const globalErrorHandler = require('./controllers/errorController')
const prodRouter = require('./routes/prodRoutes');
const userRouter = require('./routes/userRoutes');
const qs = require('qs');

const app = express();
app.use(express.json());

app.set('query parser', (str) => qs.parse(str));

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