import {
    connectMySQL,
    sequelize,
} from '../src/config/mysql.js';
import {
    connectMongoDB,
    disconnectMongoDB,
} from '../src/config/mongo.js';
import { reconcilePendingBookings } from '../src/services/booking.service.js';
import '../src/models/mysql/index.js';

const run = async () => {
    let failed = false;

    try {
        await Promise.all([
            connectMySQL(),
            connectMongoDB(),
        ]);

        const results =
            await reconcilePendingBookings();

        console.log(
            `Reconciled ${results.length} pending booking(s)`,
        );

        console.table(results);
    } catch (error) {
        failed = true;

        console.error(
            'Booking reconciliation failed:',
            error.message,
        );
    } finally {
        await Promise.allSettled([
            sequelize.close(),
            disconnectMongoDB(),
        ]);

        if (failed) {
            process.exitCode = 1;
        }
    }
};

run();