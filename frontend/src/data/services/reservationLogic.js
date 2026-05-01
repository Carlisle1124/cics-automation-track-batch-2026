import { supabase } from '../supabaseClient';

export function getWeekBounds(reservationDate) {
	const d = new Date(`${reservationDate}T00:00:00`);
	const dayOfWeek = d.getDay(); // 0=Sun … 6=Sat
	const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
	const monday = new Date(d);
	monday.setDate(monday.getDate() - daysFromMonday);
	const sunday = new Date(monday);
	sunday.setDate(sunday.getDate() + 6);
	return {
		mondayStr: monday.toISOString().slice(0, 10),
		sundayStr: sunday.toISOString().slice(0, 10),
	};
}

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

	const resDate = new Date(`${reservationDate}T00:00:00`);

	// No Sunday reservations
	if (resDate.getDay() === 0) {
		throw new Error('Reservations are not available on Sundays.');
	}

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	if (resDate < today) {
		throw new Error('Cannot reserve a slot in the past.');
	}

	const advanceDays = settings?.advance_booking_days ?? 30;
	const maxDate = new Date(today);
	maxDate.setDate(maxDate.getDate() + advanceDays);

	if (resDate > maxDate) {
		throw new Error(`Reservations can only be made up to ${advanceDays} days in advance.`);
	}

	if (!Number.isInteger(durationHours) || durationHours < 1 || durationHours > 3) {
		throw new Error('Please select a valid duration (1, 2, or 3 hours).');
	}

	// Daily limit — max 2 per day
	const { data: dailyRes } = await supabase
		.from('reservations')
		.select('id')
		.eq('user_id', userId)
		.eq('reservation_date', reservationDate)
		.in('status', ['pending', 'approved', 'checked_in']);

	if ((dailyRes?.length ?? 0) >= 2) {
		throw new Error('You have reached the 2-reservation limit for this day.');
	}

	// Weekly limit — max 5 per Mon–Sun week
	const { mondayStr, sundayStr } = getWeekBounds(reservationDate);

	const { data: weeklyRes } = await supabase
		.from('reservations')
		.select('id')
		.eq('user_id', userId)
		.gte('reservation_date', mondayStr)
		.lte('reservation_date', sundayStr)
		.in('status', ['pending', 'approved', 'checked_in']);

	if ((weeklyRes?.length ?? 0) >= 5) {
		throw new Error('You have reached the 5-reservation limit for this week. Your limit resets next Monday.');
	}
}
