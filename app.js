const express = require('express');
const sellerRouter = require('./routes/prodRoutes');

const app = express();
app.use(express.json());

app.use('/api/v1/product', sellerRouter);

module.exports = app;