import SystemLog from '../models/mongodb/system-log.model.js';

const writeAuditLog = async ({
    level = 'info',
    action,
    userId = null,
    ip = null,
    details = {},
}) => {
    try {
        await SystemLog.create({
            level,
            action,
            userId,
            ip,
            details,
        });
    } catch (error) {
        console.error(
            'Audit log could not be written:',
            error.message,
        );
    }
};

export { writeAuditLog };