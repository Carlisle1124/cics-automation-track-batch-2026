import { supabase } from '../supabaseClient';

function formatDateStr(date) {
	const d = new Date(date);
	return [
		d.getFullYear(),
		String(d.getMonth() + 1).padStart(2, '0'),
		String(d.getDate()).padStart(2, '0'),
	].join('-');
}

function generateHourSlots(openTime, closeTime) {
	const slots = [];
	const openHour = parseInt(openTime.split(':')[0], 10);
	const closeHour = parseInt(closeTime.split(':')[0], 10);
	for (let h = openHour; h < closeHour; h++) {
		const start = `${String(h).padStart(2, '0')}:00:00`;
		const end = `${String(h + 1).padStart(2, '0')}:00:00`;
		slots.push({ id: `slot-${h}`, start, end });
	}
	return slots;
}

export async function getAvailabilityByDate(date) {
	const dateStr = formatDateStr(date);

	const [{ data: settings }, { data: override }] = await Promise.all([
		supabase
			.from('settings')
			.select('default_occupancy_limit, default_open_time, default_close_time')
			.eq('id', 1)
			.single(),
		supabase
			.from('calendar_overrides')
			.select('is_closed, override_open_time, override_close_time, override_occupancy_limit')
			.eq('target_date', dateStr)
			.maybeSingle(),
	]);

	if (override?.is_closed) {
		return { date: dateStr, slots: [], isClosed: true };
	}

	const capacity = override?.override_occupancy_limit ?? settings?.default_occupancy_limit ?? 50;
	const openTime = override?.override_open_time ?? settings?.default_open_time ?? '08:00:00';
	const closeTime = override?.override_close_time ?? settings?.default_close_time ?? '17:00:00';

	const { data: reservations, error } = await supabase
		.from('reservations')
		.select('start_time, end_time')
		.eq('reservation_date', dateStr)
		.in('status', ['pending', 'approved', 'checked_in', 'held']);

	if (error) throw new Error(error.message);

	const slots = generateHourSlots(openTime, closeTime).map((slot) => {
		const reservedCount = (reservations ?? []).filter(
			(r) => r.start_time <= slot.start && r.end_time > slot.start
		).length;
		const available = Math.max(capacity - reservedCount, 0);
		const status = available === 0 ? 'full' : available <= 10 ? 'nearly full' : 'available';
		return { ...slot, reservedCount, capacity, available, status };
	});

	return {
		date: dateStr,
		slots,
		isClosed: false,
		room: { capacity, openTime, closeTime },
	};
}
