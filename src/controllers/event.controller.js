import { matchedData } from 'express-validator';
import { createEvent, listEvents } from '../services/event.service.js';

// admin access only

const store = async (req, res) => {
    const input = matchedData(req, {
        locations: ['body'],
    });

    const event = await createEvent(
        input,
        {
            userId: req.user.id,
            ip: req.ip,
        },
    );

    res.status(201).json({
        status: 'success',
        data: {
            event,
        },
    });
};

const index = async (req, res) => {
    const queryData = matchedData(req, {
        locations: ['query'],
    });

    const result = await listEvents(queryData);

    res.status(200).json({
        status: 'success',
        data: result,
    });
};

export { store, index };