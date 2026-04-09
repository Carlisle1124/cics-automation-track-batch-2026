import { getAvailabilityByDate as fetchAvailabilityByDate } from '../../../data/services/availabilityService';
import {
	buildAvailabilityResponse,
	enrichAvailabilitySlot,
	getCurrentWindowLabel as getCurrentWindowLabelUtil,
} from '../../../shared/utils/availability';
import {
	canExtendReservation as canExtendReservationUtil,
	canReserveForDuration as canReserveForDurationUtil,
	formatReservationWindow as formatReservationWindowUtil,
	getReservationEndMinutes as getReservationEndMinutesUtil,
	isSlotAvailable as isSlotAvailableUtil,
	isWithinGracePeriod as isWithinGracePeriodUtil,
	summarizePendingEntryQueue,
} from '../../../shared/utils/reservation';

export async function getAvailabilityByDate(date, referenceDate = new Date()) {
	const rawAvailability = await fetchAvailabilityByDate(date);
	const slots = rawAvailability.slots.map((slot) => enrichAvailabilitySlot(slot, rawAvailability.room.capacity));
	const pendingEntryQueue = summarizePendingEntryQueue(
		rawAvailability.reservations ?? [],
		rawAvailability.availabilityAlerts ?? [],
		slots,
		referenceDate
	);

	return buildAvailabilityResponse({
		date: rawAvailability.date,
		room: rawAvailability.room,
		slots,
		occupancy: rawAvailability.occupancy,
		pendingEntryQueue,
		referenceDate,
		rules: {
			maxStayMinutes: 3 * 60,
			gracePeriodMinutes: 15,
			warningWindowMinutes: 10,
			slotLengthMinutes: 60,
		},
	});
}

export async function getSlotAvailability(date, slotId, referenceDate = new Date()) {
	const availability = await getAvailabilityByDate(date, referenceDate);
	return availability.slots.find((slot) => slot.id === slotId) ?? null;
}

export async function getAvailableSlots(date, referenceDate = new Date()) {
	const availability = await getAvailabilityByDate(date, referenceDate);
	return availability.slots.filter((slot) => slot.isAvailable);
}

export async function getUnavailableSlots(date, referenceDate = new Date()) {
	const availability = await getAvailabilityByDate(date, referenceDate);
	return availability.slots.filter((slot) => !slot.isAvailable);
}

export async function getAvailabilitySummary(date, referenceDate = new Date()) {
	const availability = await getAvailabilityByDate(date, referenceDate);
	return availability.summary;
}

export async function getAvailabilityCards(date, referenceDate = new Date()) {
	const availability = await getAvailabilityByDate(date, referenceDate);
	return availability.cards;
}

export function isSlotAvailable(slot) {
	return isSlotAvailableUtil(slot);
}

export function canExtendReservation(reservation, availability, referenceDate = new Date()) {
	return canExtendReservationUtil(reservation, availability, referenceDate);
}

export function canReserveForDuration(slotIds) {
	return canReserveForDurationUtil(slotIds, { maxSlots: 3 });
}

export function formatReservationWindow(slotIds) {
	return formatReservationWindowUtil(slotIds);
}

export function getCurrentWindowLabel(referenceDate = new Date()) {
	return getCurrentWindowLabelUtil(referenceDate);
}

export function getReservationEndMinutes(reservation, slotCatalog = []) {
	return getReservationEndMinutesUtil(reservation, slotCatalog);
}

export function isWithinGracePeriod(reservation, referenceDate = new Date()) {
	return isWithinGracePeriodUtil(reservation, referenceDate);
}