import { formatMinutesToClock, getCurrentDateKey, isSameDate, toMinutes } from './time';
import { formatOccupancyLabel } from './occupancy';

export const AVAILABILITY_RULES = {
	operatingStartMinutes: 8 * 60,
	operatingEndMinutes: 17 * 60,
	slotLengthMinutes: 60,
	maxStayMinutes: 3 * 60,
	gracePeriodMinutes: 15,
	warningWindowMinutes: 10,
};

export function getSlotRange(slot) {
	return {
		startMinutes: toMinutes(slot?.start ?? slot?.time ?? 0),
		endMinutes: toMinutes(slot?.end ?? slot?.finish ?? slot?.time ?? 0),
	};
}

export function enrichAvailabilitySlot(slot, roomCapacity = 0) {
	const reservedCount = Number(slot?.reservedCount ?? 0);
	const capacity = Number(slot?.capacity ?? roomCapacity ?? 0);
	const available = Math.max(capacity - reservedCount, 0);
	const occupancyPercent = capacity > 0 ? Math.round((reservedCount / capacity) * 100) : 0;
	const availabilityPercent = capacity > 0 ? Math.round((available / capacity) * 100) : 0;
	const status = available === 0 ? 'full' : available <= 10 ? 'nearly full' : 'available';

	return {
		...slot,
		reservedCount,
		capacity,
		available,
		occupancyPercent,
		availabilityPercent,
		status,
		isAvailable: available > 0,
		isNearlyFull: status === 'nearly full',
		isFull: status === 'full',
	};
}

export function summarizeAvailabilitySlots(slots) {
	return slots.reduce(
		(accumulator, slot) => {
			accumulator.totalSlots += 1;
			accumulator.totalCapacity += slot.capacity;
			accumulator.totalReserved += slot.reservedCount;
			accumulator.totalAvailable += slot.available;

			if (slot.status === 'available') accumulator.availableSlots += 1;
			if (slot.status === 'nearly full') accumulator.nearlyFullSlots += 1;
			if (slot.status === 'full') accumulator.fullSlots += 1;

			return accumulator;
		},
		{
			totalSlots: 0,
			availableSlots: 0,
			nearlyFullSlots: 0,
			fullSlots: 0,
			totalCapacity: 0,
			totalReserved: 0,
			totalAvailable: 0,
		}
	);
}

export function finalizeAvailabilitySummary(summary) {
	const occupancyPercent = summary.totalCapacity > 0 ? Math.round((summary.totalReserved / summary.totalCapacity) * 100) : 0;
	const availabilityPercent = summary.totalCapacity > 0 ? Math.round((summary.totalAvailable / summary.totalCapacity) * 100) : 0;

	return {
		...summary,
		occupancyPercent,
		availabilityPercent,
	};
}

export function getCurrentTimeWindow(slots, referenceDate = new Date()) {
	const referenceMinutes = toMinutes(referenceDate);
	const currentSlot = slots.find((slot) => {
		const { startMinutes, endMinutes } = getSlotRange(slot);
		return referenceMinutes >= startMinutes && referenceMinutes < endMinutes;
	});

	const currentIndex = currentSlot ? slots.findIndex((slot) => slot.id === currentSlot.id) : -1;
	const nextSlot = currentIndex >= 0 ? slots[currentIndex + 1] ?? null : null;

	return {
		currentSlot,
		nextSlot,
		currentWindowStart: currentSlot ? currentSlot.start : null,
		currentWindowEnd: currentSlot ? currentSlot.end : null,
	};
}

export function getNextSlotAfter(slotId, slots) {
	if (!slotId || !Array.isArray(slots)) {
		return null;
	}

	const index = slots.findIndex((slot) => slot.id === slotId);
	return index >= 0 ? slots[index + 1] ?? null : null;
}

export function isWithinOperatingHours(referenceDate = new Date(), rules = AVAILABILITY_RULES) {
	const minutes = toMinutes(referenceDate);
	return minutes >= rules.operatingStartMinutes && minutes < rules.operatingEndMinutes;
}

export function buildAvailabilityCards({ currentSlot, nextSlot, summary, occupancy, pendingEntryQueue }) {
	const occupancyCapacity = occupancy?.capacity ?? summary.totalCapacity ?? 0;
	const activeOccupancyCount = occupancy?.activeCount ?? 0;
	const occupiedPercent = occupancy?.occupiedPercent ?? 0;
	const occupancyLabel = formatOccupancyLabel(activeOccupancyCount, occupancyCapacity);
	const queueCount = pendingEntryQueue?.count ?? 0;

	return [
		buildWindowCard(currentSlot, 'Slots Available Now'),
		buildWindowCard(nextSlot, 'Slots Available In 1 Hour'),
		{
			label: 'Pending Entry Queue',
			value: queueCount,
			progress: pendingEntryQueue?.reservationCount ?? queueCount,
			status: queueCount > 0 ? 'nearly full' : 'available',
			unit: 'people',
			description: `${pendingEntryQueue?.reservationCount ?? 0} reservations, ${pendingEntryQueue?.alertCount ?? 0} alerts`,
		},
		{
			label: 'Slots Occupied Now',
			value: occupancyLabel,
			unit: '',
			progress: occupiedPercent,
			status: occupancy?.status === 'full' ? 'full' : occupancy?.status === 'partial' ? 'nearly full' : 'available',
			description: activeOccupancyCount > 0 ? 'Active room occupancy' : 'No active check-ins',
		},
	];
}

function buildWindowCard(slot, label) {
	if (!slot) {
		return {
			label,
			value: 0,
			progress: 0,
			status: 'available',
			description: 'Outside operating hours',
		};
	}

	return {
		label,
		value: slot.status === 'available' ? slot.available : slot.reservedCount,
		progress: slot.occupancyPercent,
		status: slot.status,
		description: `${slot.start} - ${slot.end}`,
	};
}

export function getAvailabilityLegend() {
	return [
		{ label: 'Available', status: 'available', threshold: '< 80%' },
		{ label: 'Nearly full', status: 'nearly full', threshold: '80% - 99%' },
		{ label: 'Full', status: 'full', threshold: '100%' },
	];
}

export function getAvailabilityRules(room = {}, overrides = {}) {
	return {
		openTime: room.openTime,
		closeTime: room.closeTime,
		maxStayMinutes: overrides.maxStayMinutes ?? AVAILABILITY_RULES.maxStayMinutes,
		gracePeriodMinutes: overrides.gracePeriodMinutes ?? AVAILABILITY_RULES.gracePeriodMinutes,
		warningWindowMinutes: overrides.warningWindowMinutes ?? AVAILABILITY_RULES.warningWindowMinutes,
		slotLengthMinutes: overrides.slotLengthMinutes ?? AVAILABILITY_RULES.slotLengthMinutes,
	};
}

export function getCurrentWindowLabel(referenceDate = new Date(), rules = AVAILABILITY_RULES) {
	return isWithinOperatingHours(referenceDate, rules)
		? formatMinutesToClock(toMinutes(referenceDate))
		: 'Outside operating hours';
}

export function buildAvailabilityResponse({ date, room, slots, occupancy, pendingEntryQueue, referenceDate = new Date(), rules = AVAILABILITY_RULES }) {
	const summary = finalizeAvailabilitySummary(summarizeAvailabilitySlots(slots));
	const isToday = isSameDate(date, getCurrentDateKey(referenceDate));
	const { currentSlot, nextSlot } = isToday ? getCurrentTimeWindow(slots, referenceDate) : { currentSlot: null, nextSlot: null };

	return {
		date,
		room,
		slots,
		occupancy,
		pendingEntryQueue,
		summary,
		isToday,
		isWithinOperatingHours: isToday ? isWithinOperatingHours(referenceDate, rules) : true,
		windows: {
			current: currentSlot,
			next: nextSlot,
		},
		cards: buildAvailabilityCards({ currentSlot, nextSlot, summary, occupancy, pendingEntryQueue }),
		legend: getAvailabilityLegend(),
		rules: getAvailabilityRules(room, rules),
	};
}
