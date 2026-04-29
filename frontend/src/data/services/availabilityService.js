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

export async function getAvailabilityByDate(date, referenceDate = new Date()) {
	const dateStr = formatDateStr(date);

	let settings = null;
	let override = null;

	try {
		const { data, error } = await supabase
			.from('settings')
			.select('default_occupancy_limit, default_open_time, default_close_time')
			.eq('id', 1)
			.maybeSingle();

		if (error) throw error;
		settings = data;
	} catch (err) {
		console.warn('Could not load settings, using defaults:', err?.message ?? err);
	}

	try {
		const { data, error } = await supabase
			.from('calendar_overrides')
			.select('is_closed, override_open_time, override_close_time, override_occupancy_limit')
			.eq('target_date', dateStr)
			.maybeSingle();

		if (error) throw error;
		override = data;
	} catch (err) {
		console.warn('Could not load calendar overrides:', err?.message ?? err);
	}

	if (override?.is_closed) {
		return { date: dateStr, slots: [], isClosed: true };
	}

	const capacity = override?.override_occupancy_limit ?? settings?.default_occupancy_limit ?? 50;
	const openTime = override?.override_open_time ?? settings?.default_open_time ?? '08:00:00';
	const closeTime = override?.override_close_time ?? settings?.default_close_time ?? '17:00:00';

	const { data: reservations, error } = await supabase
		.from('reservations')
		.select('id, start_time, end_time, status, user_id')
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

	// Calculate occupancy based on checked_in reservations
	const checkedInCount = (reservations ?? []).filter((r) => r.status === 'checked_in').length;
	const occupancyPercent = capacity > 0 ? Math.round((checkedInCount / capacity) * 100) : 0;
	const occupancy = {
		activeCount: checkedInCount,
		capacity,
		occupiedPercent: occupancyPercent,
		status: checkedInCount === 0 ? 'empty' : occupancyPercent >= 100 ? 'full' : occupancyPercent >= 80 ? 'partial' : 'available',
	};

	// Calculate available slots for the day (capacity - approved - checked_in)
	const approvedCount = (reservations ?? []).filter((r) => r.status === 'approved').length;
	const dailyAvailableSlots = Math.max(capacity - approvedCount - checkedInCount, 0);
	const dailyAvailabilityPercent = capacity > 0 ? Math.round((dailyAvailableSlots / capacity) * 100) : 0;

	// Calculate available slots for next hour
	// Get current time and next hour boundary
	const currentHours = String(referenceDate.getHours()).padStart(2, '0');
	const currentMinutes = String(referenceDate.getMinutes()).padStart(2, '0');
	const currentSeconds = String(referenceDate.getSeconds()).padStart(2, '0');
	const currentTimeStr = `${currentHours}:${currentMinutes}:${currentSeconds}`;
	
	const nextHour = (referenceDate.getHours() + 1) % 24;
	const nextHourStr = String(nextHour).padStart(2, '0') + ':00:00';
	
	// Count approved and checked_in reservations that overlap from current time to next hour boundary
	const nextHourOverlapCount = (reservations ?? []).filter((r) => {
		const isApprovedOrCheckedIn = r.status === 'approved' || r.status === 'checked_in';
		const overlapsWindow = r.start_time <= nextHourStr && r.end_time > currentTimeStr;
		return isApprovedOrCheckedIn && overlapsWindow;
	}).length;
	
	const nextHourAvailableSlots = Math.max(capacity - nextHourOverlapCount, 0);
	const nextHourAvailabilityPercent = capacity > 0 ? Math.round((nextHourAvailableSlots / capacity) * 100) : 0;

	return {
		date: dateStr,
		slots,
		isClosed: false,
		room: { capacity, openTime, closeTime },
		reservations,
		occupancy,
		dailyAvailability: {
			availableSlots: dailyAvailableSlots,
			capacity,
			availabilityPercent: dailyAvailabilityPercent,
			status: dailyAvailableSlots === 0 ? 'full' : dailyAvailabilityPercent <= 20 ? 'nearly full' : 'available',
		},
		nextHourAvailability: {
			availableSlots: nextHourAvailableSlots,
			capacity,
			availabilityPercent: nextHourAvailabilityPercent,
			status: nextHourAvailableSlots === 0 ? 'full' : nextHourAvailabilityPercent <= 20 ? 'nearly full' : 'available',
		},
	};
}
