// import createApp from "./app.js"
// import environment from './config/env.js';
// import { connectMySQL, sequelize } from './config/mysql.js';
// import { connectMongoDB, disconnectMongoDB } from "./config/mongo.js";
// import './models/mysql/index.js';

// const startServer = async () => {

//     try {

//         await Promise.all([
//             connectMySQL(),
//             connectMongoDB(),
//         ]);

//         const app = createApp()

//         const server = app.listen(environment.port, () => {
//             console.log(
//                 `API running in ${environment.nodeEnv} mode at http://localhost:${environment.port}`,
//             );
//         });

//         const shutdown = (signal) => {
//             console.log(`${signal} received. Starting graceful shutdown.`);

//             server.close(async () => {
//                 await sequelize.close();
//                 console.log('HTTP server and MySQL connections closed.');
//                 process.exit(0);
//             });
//         };

//     } catch (error) {
//         // console.log.error('Application started failed:', error.message)
//         console.error('Application startup failed:', error.message);

//         await Promise.allSettled([
//             sequelize.close(),
//             disconnectMongoDB(),
//         ]);
//         process.exit(1)
//     }
// }

// startServer();


import createApp from './app.js';
import env from './config/env.js';
import { connectMySQL, sequelize } from './config/mysql.js';
import { connectMongoDB, disconnectMongoDB } from "./config/mongo.js";

const startServer = async () => {
    try {
        await connectMongoDB();
        await sequelize.authenticate();

        console.log('MySQL connection established');

        const app = createApp();

        app.listen(env.port, () => {
            console.log(`Server running on port ${env.port}`);
        });
    } catch (error) {
        console.error('Application startup failed:', error.message);
        process.exit(1);
    }
};

startServer();