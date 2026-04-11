
import { useState } from 'react';
import './SlotsBreakdown.css';

// Hardcoded hourly slots for the day
const HOURLY_SLOTS = [
  { id: 'ts-08', start: '08:00', end: '09:00', hour: '8 AM', status: 'available', reserved: 2 },
  { id: 'ts-09', start: '09:00', end: '10:00', hour: '9 AM', status: 'available', reserved: 5 },
  { id: 'ts-10', start: '10:00', end: '11:00', hour: '10 AM', status: 'busy', reserved: 42 },
  { id: 'ts-11', start: '11:00', end: '12:00', hour: '11 AM', status: 'full', reserved: 50 },
  { id: 'ts-12', start: '12:00', end: '13:00', hour: '12 PM', status: 'available', reserved: 8 },
  { id: 'ts-13', start: '13:00', end: '14:00', hour: '1 PM', status: 'available', reserved: 15 },
  { id: 'ts-14', start: '14:00', end: '15:00', hour: '2 PM', status: 'busy', reserved: 38 },
  { id: 'ts-15', start: '15:00', end: '16:00', hour: '3 PM', status: 'available', reserved: 12 },
  { id: 'ts-16', start: '16:00', end: '17:00', hour: '4 PM', status: 'available', reserved: 3 },
];

const CAPACITY = 50;

export default function SlotsBreakdown({ onSlotSelect = null }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [hoveredSlotId, setHoveredSlotId] = useState(null);

  // Get current time
  const now = new Date();
  const currentHour = now.getHours();

  const dayOfWeek = selectedDate.toLocaleString('default', { weekday: 'short', month: 'short', day: 'numeric' });
  const selectedDateValue = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, '0'),
    String(selectedDate.getDate()).padStart(2, '0'),
  ].join('-');

  const handleSlotClick = (slotId) => {
    setSelectedSlotId(slotId);
    if (onSlotSelect) {
      onSlotSelect(slotId);
    }
  };

  const handleDateChange = (event) => {
    const nextDate = new Date(event.target.value);
    if (!Number.isNaN(nextDate.getTime())) {
      setSelectedDate(nextDate);
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
  };

  const getStatusInfo = (status) => {
    const statusMap = {
      available: {
        label: 'Available',
        className: 'slot-card__status--available',
        icon: '✓',
      },
      busy: {
        label: 'Limited',
        className: 'slot-card__status--busy',
        icon: '⚠',
      },
      full: {
        label: 'Full',
        className: 'slot-card__status--full',
        icon: '✕',
      },
    };
    return statusMap[status] || statusMap.available;
  };

  const getAvailableCount = (reserved) => {
    return Math.max(0, CAPACITY - reserved);
  };

  const getCapacityPercent = (reserved) => {
    return Math.round((reserved / CAPACITY) * 100);
  };

  // Calculate stats for selected day
  const availableSlots = HOURLY_SLOTS.filter(s => s.status === 'available').length;
  const minutesSinceStart = Math.max(0, Math.min(540, (now.getHours() - 8) * 60 + now.getMinutes()));
  const currentTimeTop = `${(minutesSinceStart / 540) * 100}%`;

  return (
    <div className="slots-breakdown">
      {/* Main Content */}
      <div className="slots-breakdown__main">
        {/* Timeline */}
        <div className="slots-breakdown__timeline-wrap">
          <div className="slots-breakdown__timeline">
          {/* Hourly Timeline */}
          <div className="timeline__container">
            {/* Current time indicator */}
            <div className="timeline__current-time" style={{ top: currentTimeTop }}>
              <div className="current-time__line" />
              <div className="current-time__dot" />
              <div className="current-time__label">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
            </div>

            {/* Hours */}
            {HOURLY_SLOTS.map((slot, index) => {
              const statusInfo = getStatusInfo(slot.status);
              const availableCount = getAvailableCount(slot.reserved);
              const capacityPercent = getCapacityPercent(slot.reserved);
              const isSelected = selectedSlotId === slot.id;
              const isHovered = hoveredSlotId === slot.id;
              const slotHour = 8 + index;
              const isPast = slotHour < currentHour || (slotHour === currentHour && now.getMinutes() > 0);

              return (
                <div
                  key={slot.id}
                  className={`timeline__slot ${isSelected ? 'timeline__slot--selected' : ''} ${isHovered ? 'timeline__slot--hovered' : ''} ${isPast ? 'timeline__slot--past' : ''}`}
                  onMouseEnter={() => setHoveredSlotId(slot.id)}
                  onMouseLeave={() => setHoveredSlotId(null)}
                  onClick={() => !isPast && handleSlotClick(slot.id)}
                  role="button"
                  tabIndex={isPast ? -1 : 0}
                  onKeyDown={(e) => {
                    if (!isPast && (e.key === 'Enter' || e.key === ' ')) {
                      handleSlotClick(slot.id);
                    }
                  }}
                >
                  {/* Time label */}
                  <div className="timeline__slot-time">{slot.hour}</div>

                  {/* Slot card content */}
                  <div className="timeline__slot-content">
                    {/* Status and availability */}
                    <div className="timeline__slot-header">
                      <div className={`slot-card__status ${statusInfo.className}`}>
                        <span className="slot-card__status-icon">{statusInfo.icon}</span>
                        <span className="slot-card__status-label">{statusInfo.label}</span>
                      </div>
                      <span className="timeline__availability">{availableCount} seats</span>
                    </div>

                    {/* Capacity bar */}
                    <div className="timeline__capacity-bar">
                      <div
                        className={`capacity-bar__fill capacity-bar__fill--${slot.status}`}
                        style={{ width: `${capacityPercent}%` }}
                      />
                    </div>

                    {/* Selection checkmark */}
                    <div className={`timeline__slot-checkmark ${isSelected ? 'timeline__slot-checkmark--visible' : ''}`}>✓</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="slots-breakdown__sidebar-wrap">
        <div className="slots-breakdown__sidebar">
          {/* Header moved above sidebar content */}
          <div className="timeline__header">
            <div>
              <div className="timeline__date">{dayOfWeek}</div>
              <p className="timeline__subtitle">Select an available time slot for your reservation</p>
            </div>
          </div>

          {/* Content Wrapper */}
          <div className="sidebar__content-wrapper">
            {/* Calendar */}
            <div className="sidebar__calendar">
              <label className="calendar__label" htmlFor="slots-date-picker">Pick reservation date</label>
              <input
                id="slots-date-picker"
                className="calendar__input"
                type="date"
                value={selectedDateValue}
                onChange={handleDateChange}
              />

              <p className="calendar__selected-date">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>

              <button className="calendar__today-btn" onClick={handleToday}>
                Today
              </button>
            </div>

            {/* Availability Stats */}
            <div className="sidebar__stats">
            <h4 className="stats__title">Availability Stats</h4>

            <div className="stats__card">
              <div className="stat-row">
                <span className="stat-label">Total Slots</span>
                <span className="stat-value">{HOURLY_SLOTS.length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Available</span>
                <span className="stat-value stat-value--available">{availableSlots}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Limited</span>
                <span className="stat-value stat-value--busy">{HOURLY_SLOTS.filter(s => s.status === 'busy').length}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Full</span>
                <span className="stat-value stat-value--full">{HOURLY_SLOTS.filter(s => s.status === 'full').length}</span>
              </div>
            </div>

            {selectedSlotId && (
              <div className="sidebar__selection-info">
                {(() => {
                  const selectedSlot = HOURLY_SLOTS.find(s => s.id === selectedSlotId);
                  const statusInfo = getStatusInfo(selectedSlot.status);
                  const availableCount = getAvailableCount(selectedSlot.reserved);

                  return (
                    <div className="selection-info">
                      <h4 className="selection-info__title">Selected Slot</h4>

                      <div className="selection-info__details">
                        <div className="info-row">
                          <span className="info-label">Time</span>
                          <span className="info-value">{selectedSlot.hour}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Range</span>
                          <span className="info-value">{selectedSlot.start} — {selectedSlot.end}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Status</span>
                          <span className={`status-badge ${statusInfo.className}`}>{statusInfo.label}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-label">Available</span>
                          <span className="info-value">{availableCount}/{CAPACITY}</span>
                        </div>
                      </div>

                      <div className="selection-info__capacity">
                        <div className="capacity-bar">
                          <div
                            className={`capacity-bar__fill capacity-bar__fill--${selectedSlot.status}`}
                            style={{ width: `${getCapacityPercent(selectedSlot.reserved)}%` }}
                          />
                        </div>
                      </div>

                      {availableCount === 0 && (
                        <div className="warning-message">
                          This slot is fully booked.
                        </div>
                      )}

                      <button
                        className="selection-info__btn"
                        disabled={availableCount === 0}
                      >
                        Reserve This Slot
                      </button>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>          </div>        </div>
      </div>
    </div>
  );
}