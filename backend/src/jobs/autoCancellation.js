const { supabaseAdmin } = require('../lib/supabaseAdmin');

/**
 * Finds all approved reservations where the guest never checked in and the
 * grace period (15 minutes past start_time) has elapsed. Marks them as
 * 'no_show' and increments no_show_count on the corresponding user.
 */
async function runAutoCancellation() {
	const now = new Date().toISOString();

	// Cutoff = current time minus 15-minute grace period, formatted as HH:MM:SS
	// start_time is a Postgres `time` column so it only accepts this format
	const cutoff = new Date(Date.now() - 15 * 60 * 1000);
	const cutoffTime = cutoff.toTimeString().slice(0, 8); // "HH:MM:SS"
	const todayDate = cutoff.toISOString().slice(0, 10);  // "YYYY-MM-DD"

	// Fetch reservations that are past the 15-minute grace window and never checked in
	const { data: overdueReservations, error: fetchError } = await supabaseAdmin
		.from('reservations')
		.select('id, user_id')
		.eq('status', 'approved')
		.is('actual_check_in', null)
		.eq('reservation_date', todayDate)
		.lt('start_time', cutoffTime);

	if (fetchError) {
		console.error('[auto-cancel] Failed to fetch overdue reservations:', fetchError.message);
		return;
	}

	if (!overdueReservations || overdueReservations.length === 0) {
		console.log(`[auto-cancel] ${now} — no overdue reservations.`);
		return;
	}

	const overdueIds = overdueReservations.map((r) => r.id);
	console.log(`[auto-cancel] ${now} — marking ${overdueIds.length} reservation(s) as no_show:`, overdueIds);

	// Mark all overdue reservations as no_show
	const { error: updateError } = await supabaseAdmin
		.from('reservations')
		.update({ status: 'no_show' })
		.in('id', overdueIds);

	if (updateError) {
		console.error('[auto-cancel] Failed to update reservation statuses:', updateError.message);
		return;
	}

	// Increment no_show_count for each affected user (null user_id = guest, skip)
	const userIds = [...new Set(overdueReservations.map((r) => r.user_id).filter(Boolean))];

	for (const userId of userIds) {
		const { error: rpcError } = await supabaseAdmin.rpc('increment_no_show_count', {
			target_user_id: userId,
		});

		if (rpcError) {
			console.error(`[auto-cancel] Failed to increment no_show_count for user ${userId}:`, rpcError.message);
		}
	}

	console.log(`[auto-cancel] Done. Updated ${overdueIds.length} reservation(s), ${userIds.length} user(s).`);
}

module.exports = { runAutoCancellation };
