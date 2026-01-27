const express = require('express');
const globalErrorHandler = require('./controllers/errorController')
const sellerRouter = require('./routes/prodRoutes');
const qs = require('qs');

const app = express();
app.use(express.json());

app.set('query parser', (str) => qs.parse(str));

app.use('/api/v1/product', sellerRouter);

app.get('/', (req, res) => {
    res.status(200).json({
            status: "ok",
            message: "Bean & Brew API is running"
        })
})

app.use(globalErrorHandler);

module.exports = app;