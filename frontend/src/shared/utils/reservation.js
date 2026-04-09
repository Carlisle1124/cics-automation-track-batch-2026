import { getNextSlotAfter } from './availability';
import { formatMinutesToClock, toMinutes } from './time.js';

export function isSlotAvailable(slot) {
	return Boolean(slot && slot.available > 0);
}

export function getReservationEndMinutes(reservation, slotCatalog = []) {
	if (!reservation?.slotIds?.length) {
		return null;
	}

	const lastSlotId = reservation.slotIds[reservation.slotIds.length - 1];
	const lastSlot = slotCatalog.find((slot) => slot.id === lastSlotId);

	if (!lastSlot) {
		return null;
	}

	return toMinutes(lastSlot.end ?? lastSlot.finish ?? lastSlot.time);
}

export function formatReservationWindow(slotIds, slotCatalog = []) {
	if (!Array.isArray(slotIds) || slotIds.length === 0) {
		return '';
	}

	const firstSlot = slotCatalog.find((slot) => slot.id === slotIds[0]);
	const lastSlot = slotCatalog.find((slot) => slot.id === slotIds[slotIds.length - 1]);

	if (!firstSlot || !lastSlot) {
		return '';
	}

	return `${firstSlot.start ?? formatMinutesToClock(firstSlot.time)} - ${lastSlot.end ?? formatMinutesToClock(lastSlot.time)}`;
}

export function canReserveForDuration(slotIds, options = {}) {
	const maxSlots = options.maxSlots ?? 3;
	const slotCatalog = options.slotCatalog ?? [];

	if (!Array.isArray(slotIds) || slotIds.length === 0 || slotIds.length > maxSlots) {
		return false;
	}

	return slotIds.every((slotId) => slotCatalog.some((slot) => slot.id === slotId));
}

export function isWithinGracePeriod(reservation, referenceDate = new Date(), options = {}) {
	const gracePeriodMinutes = options.gracePeriodMinutes ?? 15;
	const deadlineSource = reservation?.expiryTime ?? reservation?.graceExpiresAt;

	if (!deadlineSource) {
		return false;
	}

	const deadline = new Date(deadlineSource).getTime();
	const now = referenceDate.getTime();

	return now >= deadline - gracePeriodMinutes * 60 * 1000 && now <= deadline;
}

export function canExtendReservation(reservation, availability, referenceDate = new Date(), options = {}) {
	const gracePeriodMinutes = options.gracePeriodMinutes ?? 15;
	const slotCatalog = availability?.slots ?? options.slotCatalog ?? [];

	if (!reservation?.slotIds?.length || slotCatalog.length === 0) {
		return false;
	}

	const reservationEndMinutes = getReservationEndMinutes(reservation, slotCatalog);
	if (reservationEndMinutes === null) {
		return false;
	}

	const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();
	const isInLastGraceWindow = currentMinutes >= reservationEndMinutes - gracePeriodMinutes && currentMinutes <= reservationEndMinutes;
	if (!isInLastGraceWindow) {
		return false;
	}

	const lastSlotId = reservation.slotIds[reservation.slotIds.length - 1];
	const nextSlot = getNextSlotAfter(lastSlotId, slotCatalog);
	if (!nextSlot) {
		return false;
	}

	return isSlotAvailable(nextSlot);
}

export function getReservationStartMinutes(reservation, slotCatalog = []) {
	if (!reservation?.slotIds?.length) {
		return null;
	}

	const firstSlotId = reservation.slotIds[0];
	const firstSlot = slotCatalog.find((slot) => slot.id === firstSlotId);

	if (!firstSlot) {
		return null;
	}

	return toMinutes(firstSlot.start ?? firstSlot.time);
}

export function isReservationPendingEntry(reservation, referenceDate = new Date(), slotCatalog = []) {
	if (!reservation || !Array.isArray(reservation.slotIds) || reservation.slotIds.length === 0) {
		return false;
	}

	if (!['pending', 'confirmed'].includes(reservation.status)) {
		return false;
	}

	if (reservation.checkInTime) {
		return false;
	}

	if (reservation.expiryTime) {
		const expiryTime = new Date(reservation.expiryTime).getTime();
		if (Number.isFinite(expiryTime) && referenceDate.getTime() > expiryTime) {
			return false;
		}
	}

	if (slotCatalog.length === 0) {
		return true;
	}

	const reservationStartMinutes = getReservationStartMinutes(reservation, slotCatalog);
	const reservationEndMinutes = getReservationEndMinutes(reservation, slotCatalog);
	const currentMinutes = referenceDate.getHours() * 60 + referenceDate.getMinutes();

	if (reservationEndMinutes === null) {
		return reservationStartMinutes === null || currentMinutes <= reservationStartMinutes;
	}

	return currentMinutes <= reservationEndMinutes;
}

export function summarizePendingEntryQueue(reservations = [], alerts = [], slotCatalog = [], referenceDate = new Date()) {
	const todayKey = referenceDate.toISOString().slice(0, 10);
	const userIds = new Set();
	let reservationCount = 0;
	let alertCount = 0;

	reservations.forEach((reservation) => {
		if (reservation?.date !== todayKey) {
			return;
		}

		if (!isReservationPendingEntry(reservation, referenceDate, slotCatalog)) {
			return;
		}

		reservationCount += 1;
		if (reservation.userId) {
			userIds.add(reservation.userId);
		}
	});

	alerts.forEach((alert) => {
		if (alert?.date !== todayKey || alert?.status !== 'active') {
			return;
		}

		alertCount += 1;
		if (alert.userId) {
			userIds.add(alert.userId);
		}
	});

	return {
		count: userIds.size,
		reservationCount,
		alertCount,
		userIds: Array.from(userIds),
	};
}


