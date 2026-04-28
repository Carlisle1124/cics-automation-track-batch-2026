import {
    checkOverlap,
    compareSlots,
    formatMinutesToClock,
    getCurrentDateKey,
    getCurrentTimeLabel,
    toMinutes,
} from './time';

function formatClockValue(timeValue, options = {}) {
    if (timeValue == null || timeValue === '') {
        return 'N/A';
    }

    const minutes = toMinutes(timeValue);
    return formatMinutesToClock(minutes, options);
}

export function formatTime(date, formatString) {
    const normalizedDate = new Date(date);

    if (formatString === 'YYYY-MM-DD') {
        return getCurrentDateKey(normalizedDate);
    }

    if (formatString === 'HH:mm') {
        return formatMinutesToClock(toMinutes(normalizedDate), { use24HourFormat: true });
    }

    const options = {};
    if (formatString.includes('YYYY')) options.year = 'numeric';
    if (formatString.includes('MM')) options.month = '2-digit';
    if (formatString.includes('DD')) options.day = '2-digit';
    if (formatString.includes('HH')) options.hour = '2-digit';
    if (formatString.includes('mm')) options.minute = '2-digit';

    return new Intl.DateTimeFormat('en-US', options).format(normalizedDate);
}

export function getCurrentDate() {
    return getCurrentDateKey();
}

export function getCurrentTime() {
    return getCurrentTimeLabel();
}

export function formatTimeOfDay(timeValue, options = {}) {
    return formatClockValue(timeValue, options);
}

export function formatTimeRange(startTime, endTime, options = {}) {
    const startLabel = formatClockValue(startTime, options);
    const endLabel = formatClockValue(endTime, options);

    if (startLabel === 'N/A' && endLabel === 'N/A') {
        return 'N/A';
    }

    return `${startLabel} - ${endLabel}`;
}

export { compareSlots, checkOverlap };
