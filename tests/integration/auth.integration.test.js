import { randomUUID } from 'node:crypto';

import mongoose from 'mongoose';
import request from 'supertest';

import createApp from '../../src/app.js';
import { connectMongoDB } from '../../src/config/mongo.js';
import { sequelize } from '../../src/config/mysql.js';
import User from '../../src/models/mysql/user.model.js';

const app = createApp();

let testEmail;

const getToken = (response) => {
    return (
        response.body.token
        ?? response.body.data?.token
        ?? response.body.data?.accessToken
    );
};

beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error(
            'Integration tests can only run with NODE_ENV=test',
        );
    }

    await connectMongoDB();
    await sequelize.authenticate();
    await sequelize.sync();
});

afterAll(async () => {
    if (testEmail) {
        await User.destroy({
            where: {
                email: testEmail,
            },
        });
    }

    await sequelize.close();
    await mongoose.disconnect();
});

describe('Authentication API', () => {
    test('handles the complete secure authentication flow', async () => {
        testEmail = `auth-test-${randomUUID()}@example.com`;

        const password = 'StrongPassword123!';

        // Register
        const registerResponse = await request(app)
            .post('/api/v1/auth/register')
            .send({
                name: 'Authentication Test User',
                email: testEmail,
                password,
            });

        expect(registerResponse.status).toBe(201);

        const registeredUser =
            registerResponse.body.data?.user
            ?? registerResponse.body.user;

        expect(registeredUser).toBeDefined();
        expect(registeredUser.email).toBe(testEmail);
        expect(registeredUser.password).toBeUndefined();
        expect(registeredUser.passwordHash).toBeUndefined();

        // Login
        const loginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testEmail,
                password,
            });

        expect(loginResponse.status).toBe(200);

        const token = getToken(loginResponse);

        expect(token).toBeTruthy();

        const loginResponseText = JSON.stringify(loginResponse.body);

        expect(loginResponseText).not.toContain(password);
        expect(loginResponse.body.data?.user?.password).toBeUndefined();
        expect(loginResponse.body.data?.user?.passwordHash).toBeUndefined();

        // Access protected route using the JWT
        const profileResponse = await request(app)
            .get('/api/v1/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(profileResponse.status).toBe(200);

        // Duplicate email
        const duplicateResponse = await request(app)
            .post('/api/v1/auth/register')
            .send({
                name: 'Duplicate User',
                email: testEmail,
                password,
            });

        expect(duplicateResponse.status).toBe(409);

        // Incorrect password
        const invalidLoginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: testEmail,
                password: 'IncorrectPassword123!',
            });

        expect(invalidLoginResponse.status).toBe(401);

        // Missing JWT
        const unauthorizedResponse = await request(app)
            .get('/api/v1/auth/me');

        expect(unauthorizedResponse.status).toBe(401);
        expect(unauthorizedResponse.body.error.code)
            .toBe('AUTHENTICATION_REQUIRED');
    });
});