import { matchedData } from 'express-validator';
import {
    bookTicket as bookTicketService,
    getMyTickets as getMyTicketsService,
} from '../services/booking.service.js';

const bookTicket = async (req, res) => {
    const { eventId } = matchedData(req, {
        locations: ['params'],
    });

    const result = await bookTicketService({
        userId: req.user.id,
        eventId,
        ip: req.ip,
    });

    res.status(201).json({
        status: 'success',
        data: result,
    });
};

const getMyTickets = async (req, res) => {

    const tickets = await getMyTicketsService(
        req.user.id,
    );

    res.status(200).json({
        status: 'success',
        data: {
            tickets,
        },
    });
};

export {
    bookTicket,
    getMyTickets,
};