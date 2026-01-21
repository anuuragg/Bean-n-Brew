const express = require('express');
const sellerRouter = require('./routes/sellerRoutes');

const app = express();

app.use('/api/v1/seller', sellerRouter);

module.exports = app;