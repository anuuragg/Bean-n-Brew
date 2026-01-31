const userController = require('../controllers/userController');
const express = require('express');

const router = express.Router();

router.route('/')
    .get(userController.getAllUser);

module.exports = router;