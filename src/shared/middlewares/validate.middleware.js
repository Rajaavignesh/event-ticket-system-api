import { validationResult } from 'express-validator';
import AppError from '../errors/AppError.js';

const validateRequest = (req, _res, next) => {
    const result = validationResult(req);

    if (result.isEmpty()) {
        return next();
    }

    const details = result.array().map(({ path, msg }) => ({
        field: path,
        message: msg,
    }));

    return next(
        new AppError(
            'Request validation failed',
            422,
            'VALIDATION_ERROR',
            details,
        ),
    );
};

export default validateRequest;