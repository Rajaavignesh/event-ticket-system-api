import { Router } from 'express';
import { store, index } from '../controllers/event.controller.js';
import { createEventValidation, listEventsValidation } from '../validations/event.validation.js';
import {
    authenticate,
    requireAdmin,
} from '../shared/middlewares/auth.middleware.js';
import validateRequest from '../shared/middlewares/validate.middleware.js';

const router = Router();

router.post(
    '/',
    authenticate,
    requireAdmin,
    createEventValidation,
    validateRequest,
    store,
);

router.get(
    '/',
    listEventsValidation,
    validateRequest,
    index,
);

export default router;