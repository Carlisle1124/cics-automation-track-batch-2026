export function normalizeMinutes(minutes) {
	const totalMinutes = Number(minutes) || 0;
	return ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
}

export function toMinutes(timeValue) {
	if (timeValue instanceof Date) {
		return timeValue.getHours() * 60 + timeValue.getMinutes();
	}

	if (typeof timeValue === 'number') {
		return normalizeMinutes(timeValue);
	}

	if (typeof timeValue !== 'string') {
		return 0;
	}

	const trimmedValue = timeValue.trim();
	if (!trimmedValue) {
		return 0;
	}

	if (trimmedValue.includes(':')) {
		const [hoursPart = '0', minutesPart = '0'] = trimmedValue.split(':');
		const hours = Number(hoursPart);
		const minutes = Number(minutesPart);
		return normalizeMinutes(hours * 60 + minutes);
	}

	return 0;
}

export function formatMinutesToClock(minutes, options = {}) {
	const normalizedMinutes = normalizeMinutes(minutes);
	const hours24 = Math.floor(normalizedMinutes / 60);
	const mins = normalizedMinutes % 60;
	const is24Hour = Boolean(options.use24HourFormat);

	if (is24Hour) {
		return `${String(hours24).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
	}

	const period = hours24 >= 12 ? 'PM' : 'AM';
	const hours12 = hours24 % 12 || 12;
	return `${String(hours12).padStart(2, '0')}:${String(mins).padStart(2, '0')} ${period}`;
}

export function getDateKey(date) {
	return new Date(date).toISOString().slice(0, 10);
}

export function isSameDate(dateA, dateB) {
	return getDateKey(dateA) === getDateKey(dateB);
}

export function getCurrentDateKey(referenceDate = new Date()) {
	return getDateKey(referenceDate);
}

export function getCurrentTimeLabel(referenceDate = new Date()) {
	return formatMinutesToClock(toMinutes(referenceDate));
}

export function compareSlots(slotA, slotB) {
	const timeA = toMinutes(slotA?.time ?? slotA?.start ?? 0);
	const timeB = toMinutes(slotB?.time ?? slotB?.start ?? 0);
	return timeA - timeB;
}

export function checkOverlap(slotA, slotB) {
	const startA = toMinutes(slotA?.start ?? slotA?.time ?? 0);
	const endA = toMinutes(slotA?.end ?? slotA?.endTime ?? slotA?.finish ?? slotA?.time ?? 0);
	const startB = toMinutes(slotB?.start ?? slotB?.time ?? 0);
	const endB = toMinutes(slotB?.end ?? slotB?.endTime ?? slotB?.finish ?? slotB?.time ?? 0);

	if (endA <= startA || endB <= startB) {
		return false;
	}

	return startA < endB && startB < endA;
}
