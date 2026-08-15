// // import express from "express";
// // import apiRoutes from './routes/index.js';
// // import {
// //     errorHandler,
// //     notFound,
// // } from './shared/middlewares/error.middleware.js';

// // const createApp = () => {

// //     const app = express()

// //     //removes the Express identification header.
// //     app.disable('x-powered-by')
// //     //parses JSON bodies and prevents clients from sending excessively large JSON requests.
// //     app.use(express.json({ limit: '100kb' }));

// //     app.get('/health', (_req, res) => {
// //         res.status(200).json({
// //             status: "Ok",
// //             message: "Event Ticket API is running",
// //             timestamp: new Date().toISOString(),
// //         })
// //     })

// //     app.use('/api/v1', apiRoutes);

// //     app.use(notFound);
// //     app.use(errorHandler);


// //     return app;
// // }

// // export default createApp;



// import express from 'express';
// import helmet from 'helmet';
// import apiRoutes from './routes/index.js';
// import {
//     errorHandler,
//     notFound,
// } from './shared/middlewares/error.middleware.js';
// import { sanitizeRequest } from './shared/middlewares/sanitize.middleware.js';
// import {
//     apiRateLimiter,
//     corsMiddleware,
// } from './shared/middlewares/security.middleware.js';

// const createApp = () => {
//     const app = express();

//     app.disable('x-powered-by');

//     app.use(helmet());
//     app.use(corsMiddleware);

//     app.use(
//         express.json({
//             limit: '100kb',
//         }),
//     );

//     app.use(sanitizeRequest);

//     app.get('/health', (_req, res) => {
//         res.status(200).json({
//             status: 'success',
//             message: 'Event Ticket API is running',
//             timestamp: new Date().toISOString(),
//         });
//     });

//     app.use(
//         '/api/v1',
//         apiRateLimiter,
//         apiRoutes,
//     );

//     app.use(notFound);
//     app.use(errorHandler);

//     return app;
// };

// export default createApp;


import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import authRoutes from './routes/auth.routes.js';
import eventRoutes from './routes/event.routes.js';
import bookingRoutes from './routes/booking.routes.js';

import {
    notFound,
    errorHandler,
} from './shared/middlewares/error.middleware.js';

import {
    apiRateLimiter,
    corsMiddleware,
} from './shared/middlewares/security.middleware.js';
import { sanitizeRequest } from './shared/middlewares/sanitize.middleware.js';

const createApp = () => {
    const app = express();

    app.disable('x-powered-by');

    app.use(helmet());
    app.use(cors());
    app.use(apiRateLimiter);
    app.use(express.json({ limit: '10kb' }));
    app.use(sanitizeRequest);

    app.get('/health', (req, res) => {
        res.status(200).json({
            status: 'success',
            message: 'Event & Ticket System API is running',
        });
    });

    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/events', eventRoutes);
    app.use('/api/v1/bookings', bookingRoutes);

    app.use(notFound);
    app.use(errorHandler);

    return app;
};

export default createApp;