import request from 'supertest';

import createApp from '../src/app.js';

const app = createApp();

describe('Express application', () => {
    test('GET /health returns the API status', async () => {
        const response = await request(app)
            .get('/health');

        expect(response.status).toBe(200);

        expect(response.body).toEqual({
            status: 'success',
            message: 'Event & Ticket System API is running',
        });
    });

    test('Helmet adds security headers', async () => {
        const response = await request(app)
            .get('/health');

        expect(response.headers['x-content-type-options']).toBe('nosniff');
        expect(response.headers['x-frame-options']).toBeDefined();
    });

    test('Unknown routes return a JSON 404 response', async () => {
        const response = await request(app)
            .get('/api/v1/unknown');

        expect(response.status).toBe(404);

        expect(response.body).toEqual({
            error: {
                code: 'ROUTE_NOT_FOUND',
                message: 'Route GET /api/v1/unknown was not found',
            },
        });
    });

    test('Unsafe object keys are rejected', async () => {
        const response = await request(app)
            .post('/api/v1/auth/register')
            .send({
                name: 'Unsafe User',
                email: {
                    $ne: null,
                },
                password: 'StrongPass123',
            });

        expect(response.status).toBe(400);
        expect(response.body.error.code).toBe('UNSAFE_INPUT');
    });
});