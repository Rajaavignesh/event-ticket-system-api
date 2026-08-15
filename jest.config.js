export default {
    testEnvironment: 'node',
    clearMocks: true,
    transform: {},
    testTimeout: 30000,
    collectCoverageFrom: [
        'src/**/*.js',
        '!src/server.js',
    ],
};