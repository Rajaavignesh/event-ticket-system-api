import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const systemLogSchema = new Schema(
    {
        level: {
            type: String,
            enum: [
                'info',
                'warn',
                'error',
            ],
            default: 'info',
        },

        action: {
            type: String,
            required: true,
            trim: true,
        },

        userId: {
            type: String,
            default: null,
        },

        ip: {
            type: String,
            default: null,
        },

        details: {
            type: Schema.Types.Mixed,
            default: {},
        },
    },
    {
        timestamps: true,
        strict: true,
    },
);

systemLogSchema.index(
    {
        createdAt: 1,
    },
    {
        expireAfterSeconds: 60 * 60 * 24 * 90,
    },
);

const SystemLog = model(
    'SystemLog',
    systemLogSchema,
);

export default SystemLog;