import { body } from 'express-validator';

const registerValidation = [
    body('name')
        .isString()
        .withMessage('Name must be a string')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Name must contain between 2 and 100 characters'),

    body('email')
        .isEmail()
        .withMessage('A valid email address is required')
        .normalizeEmail(),

    body('password')
        .isString()
        .withMessage('Password must be a string')
        .isLength({ min: 10, max: 72 })
        .withMessage('Password must contain between 10 and 72 characters')
        .matches(/[a-z]/)
        .withMessage('Password must contain a lowercase letter')
        .matches(/[A-Z]/)
        .withMessage('Password must contain an uppercase letter')
        .matches(/[0-9]/)
        .withMessage('Password must contain a number'),
];

const loginValidation = [
    body('email')
        .isEmail()
        .withMessage('A valid email address is required')
        .normalizeEmail(),

    body('password')
        .isString()
        .withMessage('Password must be a string')
        .isLength({ min: 1, max: 72 })
        .withMessage('Password is required'),
];

export {
    registerValidation,
    loginValidation,
};