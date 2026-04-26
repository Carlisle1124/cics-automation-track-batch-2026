const { supabaseAdmin } = require('../lib/supabaseAdmin');

async function expireHolds() {
	const pastTime = new Date(Date.now() - 61 * 1000).toISOString();
	const { data, error } = await supabaseAdmin
		.from('reservations')
		.update({ expires_at: pastTime })
		.eq('status', 'held')
		.select('id');
	if (error) throw new Error(error.message);
	return { updated: data?.length ?? 0 };
}

async function simulateEndingSoon({ userId }) {
	if (!userId) throw new Error('userId is required');

	const today = new Date().toISOString().slice(0, 10);
	const nowMs = Date.now();
	// end_time = now + 15 min, start_time = now - 45 min → exactly 1 hr duration (< 3 hr limit)
	const newEndTime = new Date(nowMs + 15 * 60 * 1000).toTimeString().slice(0, 8);
	const newStartTime = new Date(nowMs - 45 * 60 * 1000).toTimeString().slice(0, 8);

	const { data: reservations, error: fetchError } = await supabaseAdmin
		.from('reservations')
		.select('id')
		.eq('user_id', userId)
		.in('status', ['approved', 'checked_in'])
		.order('created_at', { ascending: false })
		.limit(1);

	if (fetchError) throw new Error(fetchError.message);
	if (!reservations?.length) throw new Error('No active (approved/checked_in) reservation found for this user');

	const { error: updateError } = await supabaseAdmin
		.from('reservations')
		.update({ reservation_date: today, start_time: newStartTime, end_time: newEndTime })
		.eq('id', reservations[0].id);

	if (updateError) throw new Error(updateError.message);
	return { reservationId: reservations[0].id, newStartTime, newEndTime };
}

async function simulateNoShow({ userId }) {
	if (!userId) throw new Error('userId is required');

	const today = new Date().toISOString().slice(0, 10);
	// start_time = 20 min ago (past the 15-min grace window)
	const newStartTime = new Date(Date.now() - 20 * 60 * 1000).toTimeString().slice(0, 8);

	const { data: reservations, error: fetchError } = await supabaseAdmin
		.from('reservations')
		.select('id')
		.eq('user_id', userId)
		.in('status', ['pending', 'approved'])
		.order('created_at', { ascending: false })
		.limit(1);

	if (fetchError) throw new Error(fetchError.message);
	if (!reservations?.length) throw new Error('No pending/approved reservation found for this user');

	// Also force status to 'approved' — autoCancellation only checks approved rows
	const { error: updateError } = await supabaseAdmin
		.from('reservations')
		.update({ reservation_date: today, start_time: newStartTime, status: 'approved', actual_check_in: null })
		.eq('id', reservations[0].id);

	if (updateError) throw new Error(updateError.message);
	return { reservationId: reservations[0].id, newStartTime };
}

async function nukeReservations({ userId }) {
	if (!userId) throw new Error('userId is required');

	const { data, error } = await supabaseAdmin
		.from('reservations')
		.delete()
		.eq('user_id', userId)
		.select('id');

	if (error) throw new Error(error.message);
	return { deleted: data?.length ?? 0 };
}

module.exports = { expireHolds, simulateEndingSoon, simulateNoShow, nukeReservations };
