const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const express = require('express');
const rateLimit = require('express-rate-limit');

const router = express.Router();
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { status: 'fail', message: 'Too many authentication attempts. Try again in 15 minutes.' }
});

router.route('/signup').post(authRateLimit, authController.signup);
router.route('/login').post(authRateLimit, authController.login);
router.route('/logout').post(authController.protect, authController.logout);
router.route('/me').get(authController.protect, userController.getMe);

router.route('/forgotPassword').post(authRateLimit, authController.forgotPassword);
router.route('/resetPassword/:token').post(authRateLimit, authController.resetPassword);

router.route('/updateMyPassword').patch(
    authController.protect,
    authController.updatePassword
);

router.route('/updateMe').patch(authController.protect, userController.updateMe);

router.route('/deleteMe').patch(authController.protect, userController.deleteMe);

router.route('/')
    .get(authController.protect, authController.restrictTo('admin'), userController.getAllUser)

router.route('/:id')
    .get(authController.protect, authController.restrictTo('admin'), userController.getUser)

module.exports = router;
