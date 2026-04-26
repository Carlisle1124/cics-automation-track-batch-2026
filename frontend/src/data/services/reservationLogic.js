import { supabase } from '../supabaseClient';

export async function validateReservation({ userId, reservationDate, durationHours }) {
	const [{ data: user }, { data: settings }] = await Promise.all([
		supabase
			.from('users')
			.select('is_account_suspended, suspended_until, no_show_count')
			.eq('id', userId)
			.single(),
		supabase.from('settings').select('advance_booking_days').eq('id', 1).single(),
	]);

	if (user?.is_account_suspended) {
		throw new Error('Your account is currently suspended and cannot make reservations.');
	}

	if (user?.suspended_until && new Date(user.suspended_until) > new Date()) {
		const until = new Date(user.suspended_until).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		});
		throw new Error(`Your account is suspended until ${until}.`);
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const resDate = new Date(`${reservationDate}T00:00:00`);

	if (resDate < today) {
		throw new Error('Cannot reserve a slot in the past.');
	}

	const advanceDays = settings?.advance_booking_days ?? 14;
	const maxDate = new Date(today);
	maxDate.setDate(maxDate.getDate() + advanceDays);

	if (resDate > maxDate) {
		throw new Error(`Reservations can only be made up to ${advanceDays} days in advance.`);
	}

	if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 3) {
		throw new Error('Please select a valid duration (1, 2, or 3 hours).');
	}

	const { data: existing } = await supabase
		.from('reservations')
		.select('id')
		.eq('user_id', userId)
		.eq('reservation_date', reservationDate)
		.in('status', ['pending', 'approved', 'checked_in'])
		.limit(1);

	if (existing?.length > 0) {
		throw new Error('You already have an active reservation on this date.');
	}
}
