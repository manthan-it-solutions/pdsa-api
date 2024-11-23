const authController = require('../controllers/authControllers')
const authMiddleware = require('../middlewere/authMiddleware')
const admin = require('../middlewere/authMiddleware')
const { body,check, validationResult } = require('express-validator');
const ErrorHandler = require('../utilities/errorHandler')

const express = require('express')


const router = express.Router()

const validateChangePassword = [
    check('oldPassword').notEmpty().trim().withMessage('Current Password Id is required'),
    check('newPassword').notEmpty().trim().withMessage('New Password Id is required'),
    check('confirmPassword').notEmpty().trim().withMessage('Confirm Password is required')
    .custom((value, { req }) => value === req.body.newPassword).withMessage('Passwords do not match'),

    (req, res, next) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        const error = errors?.array()?.length ? errors.array()[0] : "Internal server error."
        console.log('error: ', errors);
        return next(new ErrorHandler(error?.msg, 400))
      }
      next();
    }
];


router.post('/log-in', authController.logIn)
router.get('/me',authMiddleware, authController.me)
router.post('/execute-query', authMiddleware, admin, authController.query)
router.put('/change-password',validateChangePassword,authMiddleware, authController.changePassword);




module.exports = router