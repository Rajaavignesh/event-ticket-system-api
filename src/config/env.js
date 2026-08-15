import 'dotenv/config'

const requiredVariables = [
    'MYSQL_HOST',
    'MYSQL_DATABASE',
    'MYSQL_USER',
    'MYSQL_PASSWORD',
    'MONGODB_URI',
    'JWT_SECRET',
    'CORS_ORIGINS',
]


if (process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters');
}


const missingVariables = requiredVariables.filter((variableName) => !process.env[variableName])

if (missingVariables.length > 0) {
    throw new Error(`Missing environment variables: ${missingVariables.join(',')}`)
}

// Object.freeze() prevents accidental configuration changes while the application is running.
const environment = Object.freeze({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: process.env.PORT ?? 3000,


    mysql: Object.freeze({
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT ?? 3306),
        database: process.env.MYSQL_DATABASE,
        username: process.env.MYSQL_USER,
        password: process.env.MYSQL_PASSWORD,
    }),
    mongodbUri: process.env.MONGODB_URI,

    jwt: Object.freeze({
        secret: process.env.JWT_SECRET,
        expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    }),

    corsOrigins: process.env.CORS_ORIGINS
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),

    rateLimit: Object.freeze({
        windowMs: Number(
            process.env.RATE_LIMIT_WINDOW_MS ?? 900_000,
        ),

        maximumRequests: Number(
            process.env.RATE_LIMIT_MAX ?? 100,
        ),

        maximumAuthRequests: Number(
            process.env.AUTH_RATE_LIMIT_MAX ?? 10,
        ),
    })
})

export default environment

//Why centralize configuration?

// Instead of accessing process.env throughout the application, other files import one configuration object: