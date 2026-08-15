import jwt from 'jsonwebtoken';
import environment from '../../config/env.js';
import User from '../../models/mysql/user.model.js';
import AppError from '../errors/AppError.js';

const authenticate = async (req, _res, next) => {
    const authorizationHeader = req.get('authorization');

    if (!authorizationHeader) {
        throw new AppError(
            'Authentication is required',
            401,
            'AUTHENTICATION_REQUIRED',
        );
    }

    const [scheme, token] = authorizationHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
        throw new AppError(
            'Authorization header must use Bearer token',
            401,
            'INVALID_AUTHORIZATION_HEADER',
        );
    }

    let payload;

    try {
        payload = jwt.verify(
            token,
            environment.jwt.secret,
            {
                algorithms: ['HS256'],
            },
        );
    } catch (_error) {
        throw new AppError(
            'Token is invalid or expired',
            401,
            'INVALID_TOKEN',
        );
    }

    if (!payload.sub) {
        throw new AppError(
            'Token does not contain a user identifier',
            401,
            'INVALID_TOKEN',
        );
    }

    const user = await User.findByPk(payload.sub);

    if (!user) {
        throw new AppError(
            'The token user no longer exists',
            401,
            'INVALID_TOKEN',
        );
    }

    req.user = user;

    return next();
};

const requireAdmin = (req, _res, next) => {
    if (req.user.role !== 'admin') {
        throw new AppError(
            'Administrator access is required',
            403,
            'ADMIN_ACCESS_REQUIRED',
        );
    }

    return next();
};

export {
    authenticate,
    requireAdmin,
};