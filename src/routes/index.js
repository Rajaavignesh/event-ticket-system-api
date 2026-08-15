// import { Router } from 'express';
// import authRoutes from './auth.routes.js';
// import eventRoutes from './event.routes.js';
// import bookingRoutes from './booking.routes.js';

// const router = Router();

// router.use('/auth', authRoutes);
// router.use('/events', eventRoutes);
// router.use('/bookings', bookingRoutes)

// export default router;




import { Router } from 'express';
import authRoutes from './auth.routes.js';
import bookingRoutes from './booking.routes.js';
import eventRoutes from './event.routes.js';
import { authRateLimiter } from '../shared/middlewares/security.middleware.js';

const router = Router();

router.use(
    '/auth',
    authRateLimiter,
    authRoutes,
);

router.use('/events', eventRoutes);
router.use('/bookings', bookingRoutes);

export default router;