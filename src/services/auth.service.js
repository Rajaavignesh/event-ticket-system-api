import bcrypt from 'bcryptjs';
import User from '../models/mysql/user.model.js';
import AppError from '../shared/errors/AppError.js';
import jwt from 'jsonwebtoken';
import environment from '../config/env.js';
import { writeAuditLog } from './audit.service.js';

const BCRYPT_ROUNDS = 12

const registerUser = async ({ name, email, password }, {
    ip = null,
}) => {

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({
        where: {
            email: normalizedEmail,
            role: 'user'
        },
    });

    if (existingUser) {
        throw new AppError(
            'Email is already registered',
            409,
            'EMAIL_ALREADY_EXISTS',
        );
    }

    const passwordHash = await bcrypt.hash(
        password,
        BCRYPT_ROUNDS,
    );

    const user = await User.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role: 'user',
    });

    await writeAuditLog({
        action: 'user.registered',
        userId: user.id,
        ip,
    });

    return user;
}

const adminRegister = async ({ name, email, password }, {
    ip = null,
}) => {

    const normalizedEmail = email.toLowerCase();

    const existingUser = await User.findOne({
        where: {
            email: normalizedEmail,
            role: 'admin'
        },
    });

    if (existingUser) {
        throw new AppError(
            'Email is already registered',
            409,
            'EMAIL_ALREADY_EXISTS',
        );
    }

    const passwordHash = await bcrypt.hash(
        password,
        BCRYPT_ROUNDS,
    );

    const user = await User.create({
        name,
        email: normalizedEmail,
        passwordHash,
        role: 'admin',
    });

    await writeAuditLog({
        action: 'admin.registered',
        userId: user.id,
        ip,
    });

    return user;
}

const loginUser = async ({ email, password }, {
    ip = null,
}) => {

    const normalizedEmail = email.toLowerCase();

    const user = await User.unscoped().findOne({
        where: {
            email: normalizedEmail,
        },
    });

    if (!user) {

        await writeAuditLog({
            level: 'warn',
            action: 'authentication.failed',
            ip,
            details: {
                email: normalizedEmail,
                reason: 'Unknown email',
            },
        });

        throw new AppError(
            'Invalid email or password',
            401,
            'INVALID_CREDENTIALS',
        );
    }

    const passwordMatches = await bcrypt.compare(
        password,
        user.passwordHash,
    );

    if (!passwordMatches) {

        await writeAuditLog({
            level: 'warn',
            action: 'authentication.failed',
            userId: user.id,
            ip,
            details: {
                email: normalizedEmail,
                reason: 'Incorrect password',
            },
        });

        throw new AppError(
            'Invalid email or password',
            401,
            'INVALID_CREDENTIALS',
        );
    }

    const token = jwt.sign(
        {},
        environment.jwt.secret,
        {
            subject: user.id,
            expiresIn: environment.jwt.expiresIn,
            algorithm: 'HS256',
        },
    );

    await writeAuditLog({
        action: 'authentication.succeeded',
        userId: user.id,
        ip,
    });


    return {
        token,
        tokenType: 'Bearer',
        expiresIn: environment.jwt.expiresIn,
        user,
    };

}

export { registerUser, loginUser, adminRegister };