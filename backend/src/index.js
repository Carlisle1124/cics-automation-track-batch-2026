require('dotenv').config();

const cron = require('node-cron');
const { runAutoCancellation } = require('./jobs/autoCancellation');
const { runHoldCleanup } = require('./jobs/holdCleanup');
const { runExtensionNotifier } = require('./jobs/extensionNotifier');

console.log('[server] CICS backend starting...');

// Marks reservations as no_show when check-in window passes
cron.schedule('* * * * *', () => {
	runAutoCancellation().catch((err) => {
		console.error('[server] Unhandled error in autoCancellation job:', err);
	});
});

// Deletes held reservations whose 5-minute window has expired
cron.schedule('* * * * *', () => {
	runHoldCleanup().catch((err) => {
		console.error('[server] Unhandled error in holdCleanup job:', err);
	});
});

// Emails users whose reservation ends in ~15 minutes (if < 3 hrs total)
cron.schedule('* * * * *', () => {
	runExtensionNotifier().catch((err) => {
		console.error('[server] Unhandled error in extensionNotifier job:', err);
	});
});

console.log('[server] All cron jobs scheduled (every 1 minute).');

if (process.env.NODE_ENV !== 'production') {
	const { startDevServer } = require('./devServer');
	startDevServer(3001);
}

console.log('[server] Running. Press Ctrl+C to stop.');
