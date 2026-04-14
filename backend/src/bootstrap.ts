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

async function boot() {
    logEnvironmentPresence();

    try {
        const { main } = await import('./server.js');
        await main();
    } catch (error) {
        console.error('Failed to boot DevLedger backend:', error);
        process.exit(1);
    }
}

boot();
