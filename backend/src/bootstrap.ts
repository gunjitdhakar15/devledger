const requiredEnvKeys = [
    'NODE_ENV',
    'PORT',
    'HOST',
    'MONGODB_URI',
    'JWT_SECRET',
    'JWT_ACCESS_EXPIRY',
    'JWT_REFRESH_EXPIRY',
    'FRONTEND_URL',
];

function logEnvironmentPresence() {
    const envStatus = Object.fromEntries(
        requiredEnvKeys.map((key) => [
            key,
            process.env[key] ? 'set' : 'missing',
        ])
    );

    console.log('DevLedger boot environment check:', envStatus);
}

process.on('uncaughtException', (error) => {
    console.error('Fatal uncaught exception during boot:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('Fatal unhandled rejection during boot:', reason);
    process.exit(1);
});

logEnvironmentPresence();

import('./server.js').catch((error) => {
    console.error('Failed to import server entrypoint:', error);
    process.exit(1);
});
