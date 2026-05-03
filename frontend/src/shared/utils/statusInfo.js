const STATUS_MAP = {
  available: {
    label: 'Available',
    className: 'timeslot-btn--available',
    icon: '✓',
  },
  busy: {
    label: 'Limited',
    className: 'timeslot-btn--limited',
    icon: '⚠',
  },
  'nearly full': {
    label: 'Limited',
    className: 'timeslot-btn--limited',
    icon: '⚠',
  },
  full: {
    label: 'Full',
    className: 'timeslot-btn--full',
    icon: '✕',
  },
};

export function getStatusInfo(status) {
  const normalizedStatus = String(status || 'available').toLowerCase();
  return STATUS_MAP[normalizedStatus] || STATUS_MAP.available;
}
