const { supabaseAdmin } = require('../lib/supabaseAdmin');

/**
 * Finds all approved reservations where the guest never checked in and the
 * grace period (15 minutes past start_time) has elapsed. Marks them as
 * 'no_show' and increments no_show_count on the corresponding user.
 */
async function runAutoCancellation() {
	const now = new Date();
	const nowIso = now.toISOString();

	// Cutoff for no-show check: current time minus 15-minute grace period
	const cutoff = new Date(now - 15 * 60 * 1000);
	const cutoffTime = cutoff.toTimeString().slice(0, 8); // "HH:MM:SS"
	const todayDate = now.toISOString().slice(0, 10);     // "YYYY-MM-DD"
	const currentTime = now.toTimeString().slice(0, 8);   // "HH:MM:SS"

	// ── 1. Expire stale pending requests ──────────────────────────────────────
	// A pending reservation is expired if its date has passed, or if it's today
	// and its end_time is already in the past.
	const [{ data: pastDatePending }, { data: pastTimePending }] = await Promise.all([
		supabaseAdmin
			.from('reservations')
			.select('id')
			.eq('status', 'pending')
			.lt('reservation_date', todayDate),
		supabaseAdmin
			.from('reservations')
			.select('id')
			.eq('status', 'pending')
			.eq('reservation_date', todayDate)
			.lt('end_time', currentTime),
	]);

	const expiredPendingIds = [
		...(pastDatePending ?? []),
		...(pastTimePending ?? []),
	].map((r) => r.id);

	if (expiredPendingIds.length > 0) {
		const { error: expireError } = await supabaseAdmin
			.from('reservations')
			.update({ status: 'auto_cancelled' })
			.in('id', expiredPendingIds);

		if (expireError) {
			console.error('[auto-cancel] Failed to expire stale pending reservations:', expireError.message);
		} else {
			console.log(`[auto-cancel] ${nowIso} — expired ${expiredPendingIds.length} stale pending reservation(s).`);
		}
	}

	// ── 2. Mark approved reservations as no_show ───────────────────────────────
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
		if (expiredPendingIds.length === 0) {
			console.log(`[auto-cancel] ${nowIso} — nothing to do.`);
		}
		return;
	}

	const overdueIds = overdueReservations.map((r) => r.id);
	console.log(`[auto-cancel] ${nowIso} — marking ${overdueIds.length} reservation(s) as no_show:`, overdueIds);

	const { error: updateError } = await supabaseAdmin
		.from('reservations')
		.update({ status: 'no_show' })
		.in('id', overdueIds);

	if (updateError) {
		console.error('[auto-cancel] Failed to update reservation statuses:', updateError.message);
		return;
	}

	const userIds = [...new Set(overdueReservations.map((r) => r.user_id).filter(Boolean))];

	for (const userId of userIds) {
		const { error: rpcError } = await supabaseAdmin.rpc('increment_no_show_count', {
			target_user_id: userId,
		});

		if (rpcError) {
			console.error(`[auto-cancel] Failed to increment no_show_count for user ${userId}:`, rpcError.message);
		}
	}

	console.log(`[auto-cancel] Done. ${overdueIds.length} no_show, ${userIds.length} user(s) incremented.`);
}

module.exports = { runAutoCancellation };
