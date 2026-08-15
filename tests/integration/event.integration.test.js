import { randomUUID } from 'node:crypto';

import mongoose from 'mongoose';
import request from 'supertest';

import createApp from '../../src/app.js';
import { connectMongoDB } from '../../src/config/mongo.js';
import { sequelize } from '../../src/config/mysql.js';

import Event from '../../src/models/mongodb/event.model.js';
import User from '../../src/models/mysql/user.model.js';

const app = createApp();

const testEmails = [];
const testEventIds = [];

const getToken = (response) => {
    return (
        response.body.token
        ?? response.body.data?.token
        ?? response.body.data?.accessToken
    );
};

const registerAndLogin = async (email, password) => {
    const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
            name: 'Event Test User',
            email,
            password,
        });

    expect(registerResponse.status).toBe(201);

    const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
            email,
            password,
        });

    expect(loginResponse.status).toBe(200);

    const token = getToken(loginResponse);

    expect(token).toBeTruthy();

    return token;
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
    if (testEventIds.length > 0) {
        await Event.deleteMany({
            _id: {
                $in: testEventIds,
            },
        });
    }

    if (testEmails.length > 0) {
        await User.destroy({
            where: {
                email: testEmails,
            },
        });
    }

    await sequelize.close();
    await mongoose.disconnect();
});

describe('Event Management API', () => {
    test('enforces admin access and lists events with pagination', async () => {
        const suffix = randomUUID();
        const password = 'StrongPassword123!';

        const regularEmail = `event-user-${suffix}@example.com`;
        const adminEmail = `event-admin-${suffix}@example.com`;

        testEmails.push(regularEmail, adminEmail);

        const regularToken = await registerAndLogin(
            regularEmail,
            password,
        );

        // Register the future administrator.
        await registerAndLogin(adminEmail, password);

        // Promote the user directly in the isolated test database.
        await User.update(
            {
                role: 'admin',
            },
            {
                where: {
                    email: adminEmail,
                },
            },
        );

        // Login again so the new JWT contains the admin role.
        const adminLoginResponse = await request(app)
            .post('/api/v1/auth/login')
            .send({
                email: adminEmail,
                password,
            });

        expect(adminLoginResponse.status).toBe(200);

        const adminToken = getToken(adminLoginResponse);

        expect(adminToken).toBeTruthy();

        const eventPayload = {
            title: `Integration Test Event ${suffix}`,
            description: 'An event created by the integration test',
            date: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            location: 'Test Conference Hall',
            totalTickets: 2,
            metadata: {
                tags: [
                    'node.js',
                    'mongodb',
                ],
                guestSpeakers: [
                    {
                        name: 'Test Speaker',
                        topic: 'API Testing',
                    },
                ],
                seatingChartUrl:
                    'https://example.com/seating-chart.png',
            },
        };

        // Anonymous users cannot create events.
        const anonymousResponse = await request(app)
            .post('/api/v1/events')
            .send(eventPayload);

        expect(anonymousResponse.status).toBe(401);

        // Authenticated regular users cannot create events.
        const regularUserResponse = await request(app)
            .post('/api/v1/events')
            .set('Authorization', `Bearer ${regularToken}`)
            .send(eventPayload);

        expect(regularUserResponse.status).toBe(403);
        expect(regularUserResponse.body.error.code)
            .toBe('ADMIN_ACCESS_REQUIRED');

        // Administrators can create events.
        const createResponse = await request(app)
            .post('/api/v1/events')
            .set('Authorization', `Bearer ${adminToken}`)
            .send(eventPayload);

        expect(createResponse.status).toBe(201);

        const createdEvent =
            createResponse.body.data?.event
            ?? createResponse.body.event;

        expect(createdEvent).toBeDefined();
        expect(createdEvent.title).toBe(eventPayload.title);
        expect(createdEvent.totalTickets).toBe(2);
        expect(createdEvent.availableTickets).toBe(2);
        expect(createdEvent.metadata.guestSpeakers[0].name)
            .toBe('Test Speaker');

        const createdEventId =
            createdEvent.id
            ?? createdEvent._id;

        expect(createdEventId).toBeTruthy();

        testEventIds.push(createdEventId);

        // Event listing is public and paginated.
        const listResponse = await request(app)
            .get('/api/v1/events')
            .query({
                page: 1,
                limit: 5,
            });

        expect(listResponse.status).toBe(200);

        const events =
            listResponse.body.data?.events
            ?? listResponse.body.events
            ?? listResponse.body.data;

        expect(Array.isArray(events)).toBe(true);
        expect(events.length).toBeLessThanOrEqual(5);

        expect(
            events.some(
                (event) =>
                    (event.id ?? event._id) === createdEventId,
            ),
        ).toBe(true);
    });
});