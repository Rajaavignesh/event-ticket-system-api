import { Router } from 'express';
import {
    login,
    register,
    getCurrentUser,
    registerAdmin
} from '../controllers/auth.controller.js';
import {
    loginValidation,
    registerValidation,
} from '../validations/auth.validation.js';
import validateRequest from '../shared/middlewares/validate.middleware.js';
import { authenticate } from '../shared/middlewares/auth.middleware.js';
const router = Router();

router.post(
    '/register',
    registerValidation,
    validateRequest,
    register,
);

router.post(
    '/login',
    loginValidation,
    validateRequest,
    login,
);

router.get(
    '/me',
    authenticate,
    getCurrentUser,
);

router.post(
    '/register/admin',
    registerValidation,
    validateRequest,
    registerAdmin,
);

export default router;