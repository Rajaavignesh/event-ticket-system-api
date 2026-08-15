import {
    DataTypes,
    Model,
} from 'sequelize';
import { sequelize } from '../../config/mysql.js';

class Booking extends Model { }

Booking.init(
    {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
            allowNull: false,
        },

        userId: {
            type: DataTypes.UUID,
            allowNull: false,
            field: 'user_id',
        },

        eventId: {
            type: DataTypes.STRING(24),
            allowNull: false,
            field: 'event_id',
        },

        status: {
            type: DataTypes.ENUM(
                'pending',
                'confirmed',
                'failed',
                'cancelled',
            ),
            allowNull: false,
            defaultValue: 'pending',
        },

        failureReason: {
            type: DataTypes.STRING(255),
            allowNull: true,
            field: 'failure_reason',
        },

        bookedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
            field: 'booked_at',
        },
    },
    {
        sequelize,
        modelName: 'Booking',
        tableName: 'bookings',
        timestamps: true,
        underscored: true,

        indexes: [
            {
                unique: true,
                fields: [
                    'user_id',
                    'event_id',
                ],
            },
            {
                fields: ['status', 'updated_at'],
            },
        ],
    },
);

export default Booking;