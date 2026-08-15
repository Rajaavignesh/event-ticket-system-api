import AppError from '../errors/AppError.js';

const dangerousPropertyNames = new Set([
    '__proto__',
    'prototype',
    'constructor',
]);

const containsUnsafeKey = (value) => {
    if (!value || typeof value !== 'object') {
        return false;
    }

    if (Array.isArray(value)) {
        return value.some(containsUnsafeKey);
    }

    return Object.entries(value).some(
        ([key, childValue]) => {
            const keyIsUnsafe =
                key.startsWith('$') ||
                key.includes('.') ||
                dangerousPropertyNames.has(key);

            return (
                keyIsUnsafe ||
                containsUnsafeKey(childValue)
            );
        },
    );
};

const sanitizeRequest = (req, _res, next) => {
    const requestContainsUnsafeKey =
        containsUnsafeKey(req.body) ||
        containsUnsafeKey(req.query) ||
        containsUnsafeKey(req.params);

    if (requestContainsUnsafeKey) {
        throw new AppError(
            'Request contains unsafe object keys',
            400,
            'UNSAFE_INPUT',
        );
    }

    return next();
};

export {
    containsUnsafeKey,
    sanitizeRequest,
};