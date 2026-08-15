import { body, query } from 'express-validator';

const createEventValidation = [
    body('title')
        .isString()
        .withMessage('Title must be a string')
        .trim()
        .isLength({ min: 2, max: 200 })
        .withMessage('Title must contain between 2 and 200 characters'),

    body('description')
        .isString()
        .withMessage('Description must be a string')
        .trim()
        .isLength({ min: 2, max: 5000 })
        .withMessage(
            'Description must contain between 2 and 5000 characters',
        ),

    body('date')
        .isISO8601()
        .withMessage('Date must be a valid ISO 8601 date')
        .toDate()
        .custom((date) => {
            if (date <= new Date()) {
                throw new Error('Event date must be in the future');
            }

            return true;
        }),

    body('location')
        .isString()
        .withMessage('Location must be a string')
        .trim()
        .isLength({ min: 2, max: 300 })
        .withMessage(
            'Location must contain between 2 and 300 characters',
        ),

    body('totalTickets')
        .isInt({
            min: 1,
            max: 1_000_000,
        })
        .withMessage(
            'Total tickets must be an integer between 1 and 1000000',
        )
        .toInt(),

    body('metadata')
        .optional()
        .isObject()
        .withMessage('Metadata must be an object'),
];

const listEventsValidation = [
    query('page')
        .optional()
        .isInt({ min: 1 })
        .withMessage('Page must be a positive integer')
        .toInt(),

    query('limit')
        .optional()
        .isInt({
            min: 1,
            max: 100,
        })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
];
export { createEventValidation, listEventsValidation };