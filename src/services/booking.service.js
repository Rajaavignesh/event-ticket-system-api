import { sequelize } from '../config/mysql.js';
import Booking from '../models/mysql/booking.model.js';
import Event from '../models/mongodb/event.model.js';
import AppError from '../shared/errors/AppError.js';
import mongoose from 'mongoose';
import { writeAuditLog } from './audit.service.js';
import {
    Op,
    UniqueConstraintError,
} from 'sequelize';


const wait = (milliseconds) => {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds);
    });
};

const isMySQLDeadlock = (error) => {
    const errorCode =
        error.original?.code
        ?? error.parent?.code;

    return errorCode === 'ER_LOCK_DEADLOCK';
};

const retryOnDeadlock = async (
    operation,
    maximumAttempts = 3,
) => {
    for (
        let attempt = 1;
        attempt <= maximumAttempts;
        attempt += 1
    ) {
        try {
            return await operation();
        } catch (error) {
            const shouldRetry =
                isMySQLDeadlock(error)
                && attempt < maximumAttempts;

            if (!shouldRetry) {
                throw error;
            }

            const delay =
                attempt * 50
                + Math.floor(Math.random() * 50);

            await wait(delay);
        }
    }

    throw new Error('Deadlock retry unexpectedly exhausted');
};

const beginBooking = async ({
    userId,
    eventId,
}) => {
    try {
        return await sequelize.transaction(
            async (transaction) => {
                const existingBooking = await Booking.findOne({
                    where: {
                        userId,
                        eventId,
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                if (existingBooking?.status === 'confirmed') {
                    throw new AppError(
                        'You have already booked this event',
                        409,
                        'ALREADY_BOOKED',
                    );
                }

                if (existingBooking?.status === 'pending') {
                    throw new AppError(
                        'A booking for this event is already in progress',
                        409,
                        'BOOKING_IN_PROGRESS',
                    );
                }

                if (existingBooking) {
                    await existingBooking.update(
                        {
                            status: 'pending',
                            failureReason: null,
                            bookedAt: new Date(),
                        },
                        {
                            transaction,
                        },
                    );

                    return existingBooking;
                }

                return Booking.create(
                    {
                        userId,
                        eventId,
                        status: 'pending',
                    },
                    {
                        transaction,
                    },
                );
            },
        );
    } catch (error) {
        if (error instanceof UniqueConstraintError) {
            throw new AppError(
                'A booking for this event already exists',
                409,
                'BOOKING_IN_PROGRESS',
            );
        }

        throw error;
    }
};

const identifyInventoryFailure = async (eventId) => {
    const event = await Event.findById(eventId)
        .select('date availableTickets')
        .lean();

    if (!event) {
        throw new AppError(
            'Event was not found',
            404,
            'EVENT_NOT_FOUND',
        );
    }

    if (event.date <= new Date()) {
        throw new AppError(
            'Past events cannot be booked',
            409,
            'EVENT_ENDED',
        );
    }

    throw new AppError(
        'The event is sold out',
        409,
        'EVENT_SOLD_OUT',
    );
};

const bookTicket = async ({
    userId,
    eventId,
    ip
}) => {

    const booking = await retryOnDeadlock(() => {
        return beginBooking({
            userId,
            eventId,
        });
    });

    let inventoryReserved = false;

    try {
        const event = await Event.findOneAndUpdate(
            {
                _id: eventId,
                date: {
                    $gt: new Date(),
                },
                availableTickets: {
                    $gt: 0,
                },
                reservations: {
                    $not: {
                        $elemMatch: {
                            bookingId: booking.id,
                        },
                    },
                },
            },
            {
                $inc: {
                    availableTickets: -1,
                },
                $push: {
                    reservations: {
                        bookingId: booking.id,
                        userId,
                        reservedAt: new Date(),
                    },
                },
            },
            {
                new: true,
                runValidators: true,
            },
        );

        if (!event) {
            await Booking.update(
                {
                    status: 'failed',
                    failureReason: 'Event is unavailable',
                },
                {
                    where: {
                        id: booking.id,
                        status: 'pending',
                    },
                },
            );

            return identifyInventoryFailure(eventId);
        }

        inventoryReserved = true;

        const confirmedBooking = await sequelize.transaction(
            async (transaction) => {
                const currentBooking = await Booking.findByPk(
                    booking.id,
                    {
                        transaction,
                        lock: transaction.LOCK.UPDATE,
                    },
                );

                if (
                    !currentBooking ||
                    currentBooking.status !== 'pending'
                ) {
                    throw new AppError(
                        'Booking state changed unexpectedly',
                        409,
                        'BOOKING_STATE_CONFLICT',
                    );
                }

                await currentBooking.update(
                    {
                        status: 'confirmed',
                        failureReason: null,
                    },
                    {
                        transaction,
                    },
                );

                return currentBooking;
            },
        );

        inventoryReserved = false;

        await writeAuditLog({
            action: 'ticket.booked',
            userId,
            ip,
            details: {
                bookingId: confirmedBooking.id,
                eventId,
            },
        });

        return {
            booking: confirmedBooking,

            event: {
                id: event.id,
                title: event.title,
                availableTickets: event.availableTickets,
            },
        };
    } catch (error) {
        if (inventoryReserved) {
            try {
                await Event.updateOne(
                    {
                        _id: eventId,
                        'reservations.bookingId': booking.id,
                    },
                    {
                        $inc: {
                            availableTickets: 1,
                        },
                        $pull: {
                            reservations: {
                                bookingId: booking.id,
                            },
                        },
                    },
                );

                await Booking.update(
                    {
                        status: 'failed',
                        failureReason:
                            error.code ?? 'Booking confirmation failed',
                    },
                    {
                        where: {
                            id: booking.id,
                            status: 'pending',
                        },
                    },
                );
            } catch (compensationError) {
                console.error(
                    'Booking compensation failed:',
                    compensationError,
                );
            }
        }

        throw error;
    }
};

const getMyTickets = async (userId) => {
    const bookings = await Booking.findAll({
        where: {
            userId,
            status: 'confirmed',
        },

        order: [
            ['bookedAt', 'DESC'],
        ],

        raw: true,
    });

    if (bookings.length === 0) {
        return [];
    }

    const eventIds = bookings
        .map((booking) => booking.eventId)
        .filter((eventId) => mongoose.isValidObjectId(eventId));

    const events = await Event.find({
        _id: {
            $in: eventIds,
        },
    })
        .select(
            'title date location totalTickets availableTickets',
        )
        .lean();

    const eventsById = new Map(
        events.map((event) => [
            event._id.toString(),
            event,
        ]),
    );

    return bookings.map((booking) => {
        const event = eventsById.get(booking.eventId);

        return {
            id: booking.id,
            status: booking.status,
            bookedAt: booking.bookedAt,
            createdAt: booking.createdAt,

            event: event
                ? {
                    id: event._id,
                    title: event.title,
                    date: event.date,
                    location: event.location,
                    totalTickets: event.totalTickets,
                    availableTickets: event.availableTickets,
                }
                : {
                    id: booking.eventId,
                    title: 'Event unavailable',
                },
        };
    });
};

const reconcilePendingBookings = async ({
    olderThanMilliseconds = 60_000,
    limit = 100,
} = {}) => {
    const cutoffTime = new Date(
        Date.now() - olderThanMilliseconds,
    );

    const pendingBookings = await Booking.findAll({
        where: {
            status: 'pending',

            updatedAt: {
                [Op.lt]: cutoffTime,
            },
        },

        order: [
            ['updatedAt', 'ASC'],
        ],

        limit,
    });

    const results = [];

    for (const booking of pendingBookings) {
        const reservationExists = await Event.exists({
            _id: booking.eventId,

            'reservations.bookingId': booking.id,
        });

        if (reservationExists) {
            await Booking.update(
                {
                    status: 'confirmed',
                    failureReason: null,
                },
                {
                    where: {
                        id: booking.id,
                        status: 'pending',
                    },
                },
            );

            await writeAuditLog({
                action: 'booking.reconciled',
                userId: booking.userId,
                details: {
                    bookingId: booking.id,
                    eventId: booking.eventId,
                    result: 'confirmed',
                },
            });

            results.push({
                bookingId: booking.id,
                action: 'confirmed',
            });

            continue;
        }

        await Booking.update(
            {
                status: 'failed',
                failureReason:
                    'Interrupted before inventory reservation',
            },
            {
                where: {
                    id: booking.id,
                    status: 'pending',
                },
            },
        );

        await writeAuditLog({
            level: 'warn',
            action: 'booking.reconciled',
            userId: booking.userId,
            details: {
                bookingId: booking.id,
                eventId: booking.eventId,
                result: 'failed',
            },
        });

        results.push({
            bookingId: booking.id,
            action: 'failed',
        });
    }

    return results;
};

export { bookTicket, getMyTickets, reconcilePendingBookings };