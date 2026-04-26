const { supabaseAdmin } = require('../lib/supabaseAdmin');

async function runHoldCleanup() {
	const { data, error } = await supabaseAdmin
		.from('reservations')
		.update({ status: 'auto_cancelled', expires_at: null })
		.eq('status', 'held')
		.lt('expires_at', new Date().toISOString())
		.select('id');

	if (error) {
		console.error('[hold-cleanup] Error:', error.message);
		return;
	}

	if (data?.length > 0) {
		console.log(`[hold-cleanup] Auto-cancelled ${data.length} expired hold(s).`);
	}
}

module.exports = { runHoldCleanup };
