import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const eventSchema = new Schema(
    {
        title: {
            type: String,
            required: [true, 'Event title is required'],
            trim: true,
            minlength: 2,
            maxlength: 200,
        },

        description: {
            type: String,
            required: [true, 'Event description is required'],
            trim: true,
            minlength: 2,
            maxlength: 5000,
        },

        date: {
            type: Date,
            required: [true, 'Event date is required'],
            index: true,
        },

        location: {
            type: String,
            required: [true, 'Event location is required'],
            trim: true,
            minlength: 2,
            maxlength: 300,
        },

        totalTickets: {
            type: Number,
            required: [true, 'Total ticket count is required'],
            min: [1, 'An event must have at least one ticket'],
            max: [1_000_000, 'Ticket count is too large'],
        },

        availableTickets: {
            type: Number,
            required: true,
            min: [0, 'Available tickets cannot be negative'],
        },

        metadata: {
            type: Schema.Types.Mixed,
            default: {},
        },

        createdBy: {
            type: String,
            required: true,
        },
    },
    {
        timestamps: true,
        strict: true,

        toJSON: {
            transform: (_document, returnedObject) => {
                delete returnedObject.__v;

                return returnedObject;
            },
        },
    },
);

eventSchema.index({
    date: 1,
    _id: 1,
});

const Event = model('Event', eventSchema);

export default Event;