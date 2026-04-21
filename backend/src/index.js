require('dotenv').config();

const cron = require('node-cron');
const { runAutoCancellation } = require('./jobs/autoCancellation');

console.log('[server] CICS backend starting...');

// Run every minute — checks for reservations past the 15-min grace period
cron.schedule('* * * * *', () => {
	runAutoCancellation().catch((err) => {
		console.error('[server] Unhandled error in autoCancellation job:', err);
	});
});

console.log('[server] Auto-cancellation cron job scheduled (every 1 minute).');
console.log('[server] Running. Press Ctrl+C to stop.');
