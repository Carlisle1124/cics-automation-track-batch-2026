import { supabase } from '../supabaseClient';
import { handleRequest } from './baseService';

function normalizeReferenceDate(referenceDate) {
	if (!referenceDate) return new Date();

	if (referenceDate instanceof Date) {
		return new Date(referenceDate);
	}

	if (typeof referenceDate === 'string') {
		const [year, month, day] = referenceDate.split('-').map(Number);
		if (year && month && day) {
			return new Date(year, month - 1, day);
		}
	}

	return new Date(referenceDate);
}

// Helper function to get date range for analytics
function getDateRange(range, referenceDate) {
	const now = normalizeReferenceDate(referenceDate);
	now.setHours(0, 0, 0, 0);
	const start = new Date(now);

	switch (range) {
		case 'day':
		case 'today':
			start.setHours(0, 0, 0, 0);
			break;
		case 'week':
			start.setDate(now.getDate() - 6);
			start.setHours(0, 0, 0, 0);
			break;
		case 'month':
			start.setDate(now.getDate() - 29);
			start.setHours(0, 0, 0, 0);
			break;
		default:
			start.setDate(now.getDate() - 6); // default to 7-day window
			start.setHours(0, 0, 0, 0);
	}

	return {
		start: start.toISOString().split('T')[0],
		end: now.toISOString().split('T')[0]
	};
}

// Calculate peak usage time from hourly data
function calculatePeakUsageTime(hourlyData) {
	if (!hourlyData || hourlyData.length === 0) return 'No data';

	let maxHour = null;
	let maxReservations = 0;

	hourlyData.forEach(hour => {
		if (hour.reservations > maxReservations) {
			maxReservations = hour.reservations;
			maxHour = hour;
		}
	});

	if (!maxHour || maxReservations === 0) return 'No activity';

	const hour = parseInt(maxHour.time.split(':')[0]);
	const nextHour = hour + 1;
	return `${hour.toString().padStart(2, '0')}:00 – ${nextHour.toString().padStart(2, '0')}:00`;
}

function formatDateLabel(date, range) {
	if (range === 'week') {
		return date.toLocaleDateString('en-US', { weekday: 'short' });
	}
	if (range === 'month') {
		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
	return date.toISOString().split('T')[0];
}

function enumerateDates(start, end) {
	const dates = [];
	const current = new Date(start);
	while (current <= end) {
		dates.push(new Date(current));
		current.setDate(current.getDate() + 1);
	}
	return dates;
}

function buildReservationTrend(range, reservations, startDate, endDate) {
	const dateKeys = enumerateDates(new Date(startDate), new Date(endDate));

	if (range === 'today') {
		const timeLabels = [
			'08:00', '09:00', '10:00', '11:00', '12:00',
			'13:00', '14:00', '15:00', '16:00', '17:00'
		];
		const hourlyData = Object.fromEntries(timeLabels.map((time) => [time, 0]));

		reservations?.forEach((reservation) => {
			const startHour = reservation.start_time?.split(':')[0];
			const endHour = reservation.end_time?.split(':')[0];

			if (startHour && endHour) {
				const start = parseInt(startHour);
				const end = parseInt(endHour);

				for (let hour = start; hour < end; hour++) {
					const timeKey = `${hour.toString().padStart(2, '0')}:00`;
					if (hourlyData[timeKey] !== undefined) {
						hourlyData[timeKey]++;
					}
				}
			}
		});

		return timeLabels.map((time) => ({ label: time, time, reservations: hourlyData[time] }));
	}

	return dateKeys.map((date) => {
		const key = date.toISOString().split('T')[0];
		const count = (reservations || []).filter((reservation) => reservation.reservation_date === key).length;
		return {
			label: formatDateLabel(date, range),
			reservations: count,
			date: key,
		};
	});
}

// Calculate user activity distribution
function buildTimeSlotDistribution(range, reservations, startDate, endDate) {
	if (range === 'today') {
		const timeLabels = [
			'08:00', '09:00', '10:00', '11:00', '12:00',
			'13:00', '14:00', '15:00', '16:00', '17:00'
		];

		return timeLabels.map((slot) => {
			const slotReservations = (reservations || []).filter((reservation) => {
				const startHour = reservation.start_time?.split(':')[0];
				const endHour = reservation.end_time?.split(':')[0];

				if (!startHour || !endHour) return false;

				const start = parseInt(startHour, 10);
				const end = parseInt(endHour, 10);
				const hour = parseInt(slot.split(':')[0], 10);

				return hour >= start && hour < end;
			});

			return {
				label: slot,
				students: slotReservations.filter(r => r.users?.role === 'student').length,
				staff: slotReservations.filter(r => r.users?.role === 'staff').length,
			};
		});
	}

	const dates = enumerateDates(new Date(startDate), new Date(endDate));
	return dates.map((date) => {
		const key = date.toISOString().split('T')[0];
		const slotReservations = (reservations || []).filter((reservation) => reservation.reservation_date === key);
		return {
			label: formatDateLabel(date, range),
			date: key,
			students: slotReservations.filter(r => r.users?.role === 'student').length,
			staff: slotReservations.filter(r => r.users?.role === 'staff').length,
		};
	});
}

function calculateUserActivity(reservations) {
	const userReservationCounts = {};

	reservations.forEach(res => {
		const userId = res.user_id;
		userReservationCounts[userId] = (userReservationCounts[userId] || 0) + 1;
	});

	const categories = {
		frequent: 0, // 5+ per week
		regular: 0,  // 2-4 per week
		occasional: 0, // 1 per week
		rare: 0      // <1 per week
	};

	Object.values(userReservationCounts).forEach(count => {
		const weeklyCount = count; // Assuming the range is weekly
		if (weeklyCount >= 5) categories.frequent++;
		else if (weeklyCount >= 2) categories.regular++;
		else if (weeklyCount >= 1) categories.occasional++;
		else categories.rare++;
	});

	return [
		{ name: 'Frequent (5+ / wk)', value: categories.frequent },
		{ name: 'Regular (2-4 / wk)', value: categories.regular },
		{ name: 'Occasional (1 / wk)', value: categories.occasional },
		{ name: 'Rare (< 1 / wk)', value: categories.rare }
	];
}

export async function getAnalyticsData(range = 'week', referenceDate) {
	return handleRequest(async () => {
		const { start, end } = getDateRange(range, referenceDate);

		// Fetch reservations within date range
		const { data: reservations, error } = await supabase
			.from('reservations')
			.select(`
				id,
				user_id,
				reservation_date,
				start_time,
				end_time,
				status,
				created_at,
				users:user_id (id, full_name, email, role)
			`)
			.gte('reservation_date', start)
			.lte('reservation_date', end)
			.in('status', ['approved', 'checked_in', 'completed']);

		if (error) throw error;

		console.log(`Analytics: Found ${reservations?.length || 0} reservations for range ${start} to ${end}`);

		// Calculate KPIs
		const totalReservations = reservations?.length || 0;
		const activeUsers = new Set(reservations?.map(r => r.user_id) || []).size;

		const reservationTrend = buildReservationTrend(range, reservations, start, end);

	// Calculate hourly trend for peak usage time only
	const hourlyData = {};
	const timeLabels = [
		'08:00', '09:00', '10:00', '11:00', '12:00',
		'13:00', '14:00', '15:00', '16:00', '17:00'
	];

	timeLabels.forEach(time => {
		hourlyData[time] = 0;
	});

	reservations?.forEach(reservation => {
		const startHour = reservation.start_time?.split(':')[0];
		const endHour = reservation.end_time?.split(':')[0];

		if (startHour && endHour) {
			const start = parseInt(startHour);
			const end = parseInt(endHour);

			for (let hour = start; hour < end; hour++) {
				const timeKey = `${hour.toString().padStart(2, '0')}:00`;
				if (hourlyData[timeKey] !== undefined) {
					hourlyData[timeKey]++;
				}
			}
		}
	});

	const hourlyTrend = timeLabels.map(time => ({
		label: time,
		time,
		reservations: hourlyData[time] || 0
	}));

	// Calculate time slot distribution (students vs staff)
	const timeSlotDistribution = buildTimeSlotDistribution(range, reservations, start, end);

	// Calculate user activity
	const userActivity = calculateUserActivity(reservations || []);

	// Calculate trends (mock for now, could be compared to previous period)
	const totalTrend = '+12%'; // This would need historical data
	const activeUsersTrend = '+8%';

	const kpis = {
		totalReservations: {
			value: totalReservations,
			trend: totalTrend
		},
		peakUsageTime: {
			value: calculatePeakUsageTime(hourlyTrend),
			trend: null
		},
		activeUsers: {
			value: activeUsers,
			trend: activeUsersTrend
		}
	};

	return {
		kpis,
		reservationTrend,
		hourlyTrend,
		timeSlotDistribution,
		userActivity
	};
	});
}

export async function getHistoricalAnalyticsData(range = 'week', referenceDate) {
	return getAnalyticsData(range, referenceDate);
}