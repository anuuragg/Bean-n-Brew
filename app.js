const express = require('express');
const sellerRouter = require('./routes/sellerRoutes');

const app = express();
app.use(express.json());

app.use('/api/v1/product', sellerRouter);

module.exports = app;