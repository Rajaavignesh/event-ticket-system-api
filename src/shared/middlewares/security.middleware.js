import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import environment from '../../config/env.js';
import AppError from '../errors/AppError.js';

const corsMiddleware = cors({
    origin: (origin, callback) => {
        if (!origin) {
            return callback(null, true);
        }

        if (environment.corsOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(
            new AppError(
                'Origin is not allowed',
                403,
                'CORS_ORIGIN_DENIED',
            ),
        );
    },

    methods: [
        'GET',
        'POST',
        'OPTIONS',
    ],

    allowedHeaders: [
        'Content-Type',
        'Authorization',
    ],
});

const createRateLimitResponse = (
    _req,
    res,
    _next,
    options,
) => {
    res.status(options.statusCode).json({
        error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Try again later.',
        },
    });
};

const apiRateLimiter = rateLimit({
    windowMs: environment.rateLimit.windowMs,
    limit: environment.rateLimit.maximumRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: createRateLimitResponse,
});

const authRateLimiter = rateLimit({
    windowMs: environment.rateLimit.windowMs,
    limit: environment.rateLimit.maximumAuthRequests,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: createRateLimitResponse,
});

export {
    corsMiddleware,
    apiRateLimiter,
    authRateLimiter,
};