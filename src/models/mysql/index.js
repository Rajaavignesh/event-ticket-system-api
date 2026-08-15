import User from './user.model.js';
import Booking from './booking.model.js';

User.hasMany(Booking, {
    foreignKey: 'userId',
    as: 'bookings',
});

Booking.belongsTo(User, {
    foreignKey: 'userId',
    as: 'user',
});

export {
    User,
    Booking,
};