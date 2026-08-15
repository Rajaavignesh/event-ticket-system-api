import { Router } from 'express';
import {
    bookTicket,
    getMyTickets,
} from '../controllers/booking.controller.js';
import { createBookingValidation } from '../validations/booking.validation.js';
import { authenticate } from '../shared/middlewares/auth.middleware.js';
import validateRequest from '../shared/middlewares/validate.middleware.js';

const router = Router();

router.use(authenticate);

router.get(
    '/my-tickets',
    getMyTickets,
);

router.post(
    '/:eventId',
    createBookingValidation,
    validateRequest,
    bookTicket,
);

export default router;