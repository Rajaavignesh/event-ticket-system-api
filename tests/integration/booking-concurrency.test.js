import { randomUUID } from 'node:crypto';

import mongoose from 'mongoose';
import request from 'supertest';

import createApp from '../../src/app.js';
import { connectMongoDB } from '../../src/config/mongo.js';
import { sequelize } from '../../src/config/mysql.js';

import Event from '../../src/models/mongodb/event.model.js';
import Booking from '../../src/models/mysql/booking.model.js';
import User from '../../src/models/mysql/user.model.js';

const app = createApp();

const testEmails = [];
let testEventId;

const getToken = (response) => {
    return (
        response.body.token
        ?? response.body.data?.token
        ?? response.body.data?.accessToken
    );
};

const createAuthenticatedUser = async () => {
    const email = `booking-test-${randomUUID()}@example.com`;
    const password = 'StrongPassword123!';

    testEmails.push(email);

    const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
            name: 'Concurrency Test User',
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

    const user = await User.findOne({
        where: {
            email,
        },
    });

    expect(user).not.toBeNull();

    return {
        token,
        userId: user.id,
    };
};

beforeAll(async () => {
    if (process.env.NODE_ENV !== 'test') {
        throw new Error(
            'Integration tests can only run with NODE_ENV=test',
        );
    }

    await connectMongoDB();
    await sequelize.authenticate();

    // Creates missing tables only in event_ticket_test.
    await sequelize.sync();
});

afterEach(async () => {
    if (testEventId) {
        await Booking.destroy({
            where: {
                eventId: testEventId,
            },
        });

        await Event.deleteOne({
            _id: testEventId,
        });
    }

    if (testEmails.length > 0) {
        await User.destroy({
            where: {
                email: testEmails,
            },
        });
    }

    testEventId = undefined;
    testEmails.length = 0;
});

afterAll(async () => {
    await sequelize.close();
    await mongoose.disconnect();
});

describe('Booking concurrency', () => {
    test('only one user can book the final ticket', async () => {
        const firstUser = await createAuthenticatedUser();
        const secondUser = await createAuthenticatedUser();

        const event = await Event.create({
            title: 'Last Ticket Test Event',
            description: 'Event created for concurrency testing',
            date: new Date(Date.now() + 24 * 60 * 60 * 1000),
            location: 'Test Location',
            totalTickets: 1,
            availableTickets: 1,
            createdBy: firstUser.userId.toString(),
            metadata: {
                test: true,
            },
        });

        testEventId = event._id.toString();

        const bookingRequest = (token) => {
            return request(app)
                .post(`/api/v1/bookings/${testEventId}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                    eventId: testEventId,
                });
        };

        // These requests start together.
        const [firstResponse, secondResponse] = await Promise.all([
            bookingRequest(firstUser.token),
            bookingRequest(secondUser.token),
        ]);

        const responseStatuses = [
            firstResponse.status,
            secondResponse.status,
        ].sort((first, second) => first - second);

        // One succeeds and the other receives a conflict.
        expect(responseStatuses).toEqual([201, 409]);

        const updatedEvent = await Event.findById(testEventId).lean();

        expect(updatedEvent.totalTickets).toBe(1);
        expect(updatedEvent.availableTickets).toBe(0);

        const bookings = await Booking.findAll({
            where: {
                eventId: testEventId,
            },
            raw: true,
        });

        const confirmedBookings = bookings.filter(
            (booking) => booking.status === 'confirmed',
        );

        expect(confirmedBookings).toHaveLength(1);
    });
});

test('returns user bookings joined with MongoDB event details', async () => {
    const user = await createAuthenticatedUser();

    const eventTitle = `My Tickets Test Event ${randomUUID()}`;

    const event = await Event.create({
        title: eventTitle,
        description: 'Event created for My Tickets testing',
        date: new Date(Date.now() + 24 * 60 * 60 * 1000),
        location: 'Test Location',
        totalTickets: 2,
        availableTickets: 2,
        createdBy: user.userId.toString(),
        metadata: {
            test: true,
        },
    });

    testEventId = event._id.toString();

    const bookingResponse = await request(app)
        .post(`/api/v1/bookings/${testEventId}`)
        .set('Authorization', `Bearer ${user.token}`)

    expect(bookingResponse.status).toBe(201);

    const ticketsResponse = await request(app)
        .get('/api/v1/bookings/my-tickets')
        .set('Authorization', `Bearer ${user.token}`);

    expect(ticketsResponse.status).toBe(200);

    const tickets =
        ticketsResponse.body.data?.bookings
        ?? ticketsResponse.body.data?.tickets
        ?? ticketsResponse.body.bookings
        ?? ticketsResponse.body.tickets;

    expect(Array.isArray(tickets)).toBe(true);

    expect(tickets).toHaveLength(1);

    const matchingTicket = tickets[0];

    expect(matchingTicket).toBeDefined();

    const joinedEventTitle =
        matchingTicket.event?.title
        ?? matchingTicket.eventTitle
        ?? matchingTicket.title;

    expect(joinedEventTitle).toBe(eventTitle);

    const updatedEvent = await Event.findById(testEventId).lean();

    expect(updatedEvent.totalTickets).toBe(2);
    expect(updatedEvent.availableTickets).toBe(1);
});

test('rejects My Tickets requests without a JWT', async () => {
    const response = await request(app)
        .get('/api/v1/bookings/my-tickets');

    expect(response.status).toBe(401);

    expect(response.body.error.code)
        .toBe('AUTHENTICATION_REQUIRED');
});