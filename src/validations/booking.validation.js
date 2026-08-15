import { param } from 'express-validator';

const createBookingValidation = [
    param('eventId')
        .isMongoId()
        .withMessage('Event ID must be a valid MongoDB ObjectId'),
];

export { createBookingValidation };