import { Sequelize } from 'sequelize';
import environment from './env.js';

const sequelize = new Sequelize(
    environment.mysql.database,
    environment.mysql.username,
    environment.mysql.password,
    {
        host: environment.mysql.host,
        port: environment.mysql.port,
        dialect: 'mysql',

        logging:
            environment.nodeEnv === 'development'
                ? (message) => console.log(`[SQL] ${message}`)
                : false,

        define: {
            timestamps: true,
            underscored: true,
        },

        pool: {
            max: 10,
            min: 0,
            acquire: 30_000,
            idle: 10_000,
        },
    },
);

const connectMySQL = async () => {
    await sequelize.authenticate();
    console.log('MySQL connection established');
};

export { sequelize, connectMySQL };