import Event from '../models/mongodb/event.model.js';
import { writeAuditLog } from './audit.service.js';

const createEvent = async (
    eventData,
    {
        userId,
        ip,
    },
) => {
    const event = await Event.create({
        title: eventData.title,
        description: eventData.description,
        date: eventData.date,
        location: eventData.location,
        totalTickets: eventData.totalTickets,
        availableTickets: eventData.totalTickets,
        metadata: eventData.metadata ?? {},
        createdBy: userId,
    });

    await writeAuditLog({
        action: 'event.created',
        userId,
        ip,
        details: {
            eventId: event.id,
            title: event.title,
        },
    });

    return event;
};



const listEvents = async ({
    page = 1,
    limit = 10,
}) => {
    const skip = (page - 1) * limit;

    const [events, total] = await Promise.all([
        Event.find()
            .select('-__v')
            .sort({ date: 1 })
            .skip(skip)
            .limit(limit)
            .lean(),

        Event.countDocuments(),
    ]);

    return {
        events,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};

export { createEvent, listEvents };