const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const express = require('express');

const router = express.Router();

router.route('/signup').post(authController.signup);
router.route('/login').post(authController.login);

router.route('/')
    .get(authController.protect, userController.getAllUser)

router.route('/:id')
    .get(userController.getUser)

module.exports = router;