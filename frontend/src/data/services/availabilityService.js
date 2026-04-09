import { handleRequest } from './baseService';
import { ROOMS, SLOT_AVAILABILITY, TIME_SLOTS, OCCUPANCY, RESERVATIONS, AVAILABILITY_ALERTS } from '../mock/mockData';
import { summarizeOccupancy } from '../../shared/utils/occupancy';

function formatDate(date) {
	return new Date(date).toISOString().slice(0, 10);
}

function buildAvailability(date) {
	const dateKey = formatDate(date);
	const room = ROOMS[0];

	const slots = TIME_SLOTS.map((slot) => {
		const record = SLOT_AVAILABILITY.find(
			(item) => item.date === dateKey && item.slotId === slot.id && item.roomId === room.id
		);

		const reservedCount = record?.reservedCount ?? 0;
		const capacity = record?.capacity ?? room.capacity;
		const available = Math.max(capacity - reservedCount, 0);
		const status = available === 0 ? 'full' : available <= 10 ? 'nearly full' : 'available';

		return {
			...slot,
			reservedCount,
			capacity,
			available,
			status,
		};
	});

	return {
		date: dateKey,
		room,
		slots,
		occupancy: summarizeOccupancy(OCCUPANCY, room.capacity),
		reservations: RESERVATIONS,
		availabilityAlerts: AVAILABILITY_ALERTS,
	};
}

export function getAvailabilityByDate(date) {
	return handleRequest(
		() => buildAvailability(date),
		`/api/availability?date=${formatDate(date)}`
	);
}
