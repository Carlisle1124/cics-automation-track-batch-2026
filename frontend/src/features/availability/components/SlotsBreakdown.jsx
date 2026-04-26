
import { useState, useEffect } from 'react';
import Card from '../../../shared/components/Card';
import { getAvailabilityByDate } from '../../../data/services/availabilityService';
import './SlotsBreakdown.css';

const CAPACITY = 50;

// Helper to format hour from 24-hour time
function formatHour(time24) {
  const [hours] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display} ${period}`;
}

export default function SlotsBreakdown({ onSlotSelect = null }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [hoveredSlotId, setHoveredSlotId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch slots when selected date changes
  useEffect(() => {
    async function loadSlots() {
      setLoading(true);
      try {
        const availability = await getAvailabilityByDate(selectedDate);
        // Map service slots to component format
        const mappedSlots = availability.slots.map((slot) => ({
          id: slot.id,
          start: slot.start,
          end: slot.end,
          hour: formatHour(slot.start),
          status: slot.status === 'full' ? 'full' : slot.status === 'nearly full' ? 'busy' : 'available',
          reserved: slot.reservedCount || 0,
          capacity: slot.capacity || CAPACITY,
          available: slot.available || (CAPACITY - (slot.reservedCount || 0)),
        }));
        setSlots(mappedSlots);
      } catch (error) {
        console.error('Failed to load slots:', error);
        setSlots([]);
      } finally {
        setLoading(false);
      }
    }
    loadSlots();
  }, [selectedDate]);

  // Get current time and compare dates
  const now = new Date();
  const currentHour = now.getHours();
  
  // Normalize dates to compare only date portion (no time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateNormalized = new Date(selectedDate);
  selectedDateNormalized.setHours(0, 0, 0, 0);
  
  const isSelectedDateInPast = selectedDateNormalized < today;
  const isSelectedDateToday = selectedDateNormalized.getTime() === today.getTime();
  const isSelectedDateInFuture = selectedDateNormalized > today;

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
  const availableSlots = slots.filter(s => s.status === 'available').length;
  const minutesSinceStart = Math.max(0, Math.min(540, (now.getHours() - 8) * 60 + now.getMinutes()));
  const currentTimeTop = `${(minutesSinceStart / 540) * 100}%`;

  return (
    <div className="slots-breakdown">
      {/* Main Content */}
        <Card as="div" className="slots-breakdown__timeline-card">
          <div className="slots-breakdown__timeline-scroll">
            <div className="slots-breakdown__timeline">
              {/* Hourly Timeline */}
              <div className="timeline__container">
                {/* Current time indicator - only show for today */}
                {isSelectedDateToday && (
                  <div className="timeline__current-time" style={{ top: currentTimeTop }}>
                    <div className="current-time__line" />
                    <div className="current-time__dot" />
                    <div className="current-time__label">{now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                )}

                {/* Hours */}
                {slots.map((slot, index) => {
                  const statusInfo = getStatusInfo(slot.status);
                  const availableCount = slot.available;
                  const capacityPercent = getCapacityPercent(slot.reserved);
                  const isSelected = selectedSlotId === slot.id;
                  const isHovered = hoveredSlotId === slot.id;
                  const slotHour = 8 + index;
                  // Mark as past if: date is in past, OR (date is today AND hour has passed)
                  const isPast = isSelectedDateInPast || (isSelectedDateToday && (slotHour < currentHour || (slotHour === currentHour && now.getMinutes() > 0)));

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
                      <div className="timeline__slot-time">{slot.hour}{isSelectedDateInPast && ' ✕'}</div>

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
        </Card>


      {/* Sidebar */}
      <div className="slots-breakdown__sidebar-wrap">
        <Card as="aside" className="slots-breakdown__sidebar-card">
          <div className="slots-breakdown__sidebar-scroll">
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
                      <span className="stat-value">{slots.length}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Available</span>
                      <span className="stat-value stat-value--available">{availableSlots}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Limited</span>
                      <span className="stat-value stat-value--busy">{slots.filter(s => s.status === 'busy').length}</span>
                    </div>
                    <div className="stat-row">
                      <span className="stat-label">Full</span>
                      <span className="stat-value stat-value--full">{slots.filter(s => s.status === 'full').length}</span>
                    </div>
                  </div>

                  {selectedSlotId && (
                    <div className="sidebar__selection-info">
                      {(() => {
                        const selectedSlot = slots.find(s => s.id === selectedSlotId);
                        const statusInfo = getStatusInfo(selectedSlot.status);
                        const availableCount = selectedSlot.available;

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
                                <span className="info-value">{availableCount}/{selectedSlot.capacity}</span>
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
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}