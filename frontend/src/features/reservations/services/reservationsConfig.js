export const FILTER_TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
];

export const SORT_OPTIONS = ['Latest First', 'Earliest First', 'Status A-Z'];
export const ITEMS_PER_PAGE = 8;

export function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function getReservationDate(reservation) {
  return safeDate(reservation.reservation_date ?? reservation.reservationDate ?? reservation.date);
}

export function toDisplayDate(reservation) {
  const value = reservation.reservation_date ?? reservation.reservationDate ?? reservation.date;
  const date = safeDate(value);
  return date
    ? date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
}

export function toDisplayTime(timeValue) {
  if (!timeValue) return '—';

  const date = safeDate(`1970-01-01T${timeValue}`);
  if (!date) return String(timeValue);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function getDuration(startTime, endTime) {
  if (!startTime || !endTime) return '—';

  const start = safeDate(`1970-01-01T${startTime}`);
  const end = safeDate(`1970-01-01T${endTime}`);
  if (!start || !end) return '—';

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '—';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function statusBadgeClass(status) {
  switch (status) {
    case 'approved':
    case 'confirmed':
      return 'status-badge status-badge--confirmed';
    case 'completed':
      return 'status-badge status-badge--completed';
    case 'checked_in':
      return 'status-badge status-badge--checked-in';
    case 'cancelled':
    case 'cancelled_by_user':
      return 'status-badge status-badge--cancelled';
    case 'expired':
    case 'auto_cancelled':
      return 'status-badge status-badge--expired';
    case 'pending':
    default:
      return 'status-badge status-badge--pending';
  }
}

export function formatStatusValue(status) {
  const s = status ?? 'pending';
  if (s === 'cancelled_by_user') return 'cancelled';
  return s;
}

export function filterByTab(reservation, activeTab) {
  if (activeTab === 'all') return true;

  const now = new Date();
  const resDate = getReservationDate(reservation);
  if (!resDate) return activeTab === 'all';

  const startTime = reservation.start_time ?? reservation.startTime;
  const endTime = reservation.end_time ?? reservation.endTime;

  const startDateTime = startTime ? safeDate(`${resDate.toISOString().slice(0, 10)}T${startTime}`) : null;
  const endDateTime = endTime ? safeDate(`${resDate.toISOString().slice(0, 10)}T${endTime}`) : null;

  if (activeTab === 'ongoing') {
    if (startDateTime && endDateTime) {
      return now >= startDateTime && now <= endDateTime;
    }
    return now.toDateString() === resDate.toDateString();
  }

  if (activeTab === 'upcoming') {
    if (startDateTime) return now < startDateTime;
    return resDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (activeTab === 'past') {
    if (endDateTime) return now > endDateTime;
    return resDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return true;
}