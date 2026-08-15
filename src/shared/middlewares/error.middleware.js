import {
    UniqueConstraintError,
    ValidationError,
} from 'sequelize';

const notFound = (req, res) => {
    res.status(404).json({
        error: {
            code: 'ROUTE_NOT_FOUND',
            message: `Route ${req.method} ${req.originalUrl} was not found`,
        },
    });
};

const errorHandler = (error, _req, res, _next) => {
    let statusCode = error.statusCode ?? 500;

    let code =
        typeof error.code === 'string'
            ? error.code
            : 'INTERNAL_ERROR';

    let message =
        error.message ?? 'Unexpected server error';

    let details = error.details ?? null;

    if (error instanceof UniqueConstraintError) {
        statusCode = 409;
        code = 'RESOURCE_ALREADY_EXISTS';
        message = 'The resource already exists';
    }

    if (error instanceof ValidationError) {
        statusCode = 422;
        code = 'DATABASE_VALIDATION_ERROR';
        message = 'Database validation failed';

        details = error.errors.map((item) => ({
            field: item.path,
            message: item.message,
        }));
    }

    if (statusCode >= 500) {
        console.error(error);

        if (!error.isOperational) {
            code = 'INTERNAL_ERROR';
            message = 'Unexpected server error';
            details = null;
        }
    }

    const response = {
        error: {
            code,
            message,
        },
    };

    if (details) {
        response.error.details = details;
    }

    res.status(statusCode).json(response);
};

export {
    notFound,
    errorHandler,
};