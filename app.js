const express = require('express');
const sellerRouter = require('./routes/prodRoutes');
const qs = require('qs');

const app = express();
app.use(express.json());

app.set('query parser', (str) => qs.parse(str));

app.use('/api/v1/product', sellerRouter);

module.exports = app;