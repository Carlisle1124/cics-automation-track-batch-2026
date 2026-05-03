import { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../../../shared/components/Card';
import { getAvailabilityByDate } from '../../../data/services/availabilityService';
import { getCurrentUser } from '../../../data/services/authService';
import { supabase } from '../../../data/supabaseClient';
import { useSlotHold } from '../hooks/useSlotHold';
import './SlotsBreakdown.css';

import DatePicker from '../../reservations/components/DatePicker';
import TimelinePanel from '../../reservations/components/TimelinePanel';
import DurationPicker from '../../reservations/components/DurationPicker';
import OccupancyStats from '../../reservations/components/OccupancyStats';
import { getStatusInfo } from '../../../shared/utils/statusInfo';

const CAPACITY = 50;

function formatHour(time24) {
  const [hours] = time24.split(':');
  const hour = parseInt(hours, 10);
  const period = hour >= 12 ? 'PM' : 'AM';
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display} ${period}`;
}

function formatCountdown(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function parseDateValue(dateValue) {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime()) ? null : new Date(dateValue);
  }

  if (typeof dateValue === 'string') {
    const [year, month, day] = dateValue.split('-').map(Number);
    if (!year || !month || !day) return null;

    return new Date(year, month - 1, day);
  }

  const parsedDate = new Date(dateValue);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export default function SlotsBreakdown({ onSlotSelect = null }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [hoveredSlotId, setHoveredSlotId] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);

  const [currentUser, setCurrentUser] = useState(null);
  const [holdDuration, setHoldDuration] = useState(1);
  const [reservationSuccess, setReservationSuccess] = useState(false);

  const dateInputRef = useRef(null);

  // Format selected date for API calls
  const selectedDateValue = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, '0'),
    String(selectedDate.getDate()).padStart(2, '0'),
  ].join('-');

  // Use the custom hook for slot holding
  const {
    activeHold,
    holdCountdown,
    holdLoading,
    holdError,
    handleSlotClick: hookHandleSlotClick,
    handleConfirmReservation: hookHandleConfirmReservation,
    handleCancelHold: hookHandleCancelHold,
    releaseHoldManually,
    setHoldError,
  } = useSlotHold({
    userId: currentUser?.id,
    selectedDate,
    holdDuration,
    selectedDateValue,
    onSlotSelect: (slotId) => {
      setSelectedSlotId(slotId);
      if (onSlotSelect) onSlotSelect(slotId);
    },
    skipValidation: false,
  });

  // Load current user
  useEffect(() => {
    async function loadUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }
    loadUser().catch(() => {});
  }, []);

  // Load slots for selected date
  const loadSlots = useCallback(async () => {
    setLoading(true);
    try {
      const availability = await getAvailabilityByDate(selectedDate);
      const mappedSlots = availability.slots.map((slot) => ({
        id: slot.id,
        start: slot.start,
        end: slot.end,
        hour: formatHour(slot.start),
        status: slot.status === 'full' ? 'full' : slot.status === 'nearly full' ? 'busy' : 'available',
        reserved: slot.reservedCount || 0,
        capacity: slot.capacity || CAPACITY,
        available: slot.available ?? (CAPACITY - (slot.reservedCount || 0)),
      }));
      setSlots(mappedSlots);
    } catch (error) {
      console.error('Failed to load slots:', error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  // Realtime subscription for slot availability updates
  useEffect(() => {
    const channel = supabase
      .channel(`slots-${selectedDateValue}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `reservation_date=eq.${selectedDateValue}`,
        },
        loadSlots
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDateValue, loadSlots]);

  // When hold expires, reset UI and reload slots
  useEffect(() => {
    if (holdCountdown === 0 && activeHold === null) {
      setSelectedSlotId(null);
      loadSlots();
    }
  }, [holdCountdown, activeHold, loadSlots]);

  const now = new Date();
  const currentHour = now.getHours();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selectedDateNormalized = new Date(selectedDate);
  selectedDateNormalized.setHours(0, 0, 0, 0);

  const isSelectedDateInPast = selectedDateNormalized < today;
  const isSelectedDateToday = selectedDateNormalized.getTime() === today.getTime();

  const dayOfWeek = selectedDate.toLocaleString('default', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  // Wrapper for hook's handleSlotClick to also update local selectedSlotId
  const handleSlotClick = async (slotId) => {
    const slot = slots.find((s) => s.id === slotId);
    if (!slot) return;

    // If the slot is already held, don't click it
    if (activeHold && selectedSlotId === slotId) return;

    setReservationSuccess(false);

    // Release hold when selecting a different slot
    if (activeHold && selectedSlotId !== slotId) {
      await releaseHoldManually();
    }

    setSelectedSlotId(slotId);

    // Call the hook's handler
    try {
      await hookHandleSlotClick(slot);
    } catch (err) {
      setSelectedSlotId(null);
      throw err;
    }
  };

  // Wrapper for hook's handleConfirmReservation
  const handleConfirmReservation = async () => {
    if (!activeHold || holdLoading) return;

    const result = await hookHandleConfirmReservation();
    if (result?.success) {
      setReservationSuccess(true);
      setSelectedSlotId(null);
      loadSlots();
    }
  };

  // Wrapper for hook's handleCancelHold
  const handleCancelHold = async () => {
    await hookHandleCancelHold();
    setSelectedSlotId(null);
    setReservationSuccess(false);
    loadSlots();
  };

  // Handle date change
  const handleDateChange = (event) => {
    const nextDate = parseDateValue(event.target.value);
    if (nextDate) {
      setSelectedDate(nextDate);
      setSelectedSlotId(null);
      setHoldError('');
      setReservationSuccess(false);
      if (activeHold) {
        releaseHoldManually();
      }
    }
  };

  const handleToday = () => {
    setSelectedDate(new Date());
    setSelectedSlotId(null);
    setHoldError('');
    setReservationSuccess(false);
    if (activeHold) {
      releaseHoldManually();
    }
  };

  // Handler for DatePicker component (receives date string YYYY-MM-DD)
  const handleDateChangeFromPicker = (dateString) => {
    const nextDate = parseDateValue(dateString);
    if (nextDate) {
      setSelectedDate(nextDate);
      setSelectedSlotId(null);
      setHoldError('');
      setReservationSuccess(false);
      if (activeHold) {
        releaseHoldManually();
      }
    }
  };

  // Opens the hidden native date picker
  const openDatePicker = () => {
    if (dateInputRef.current) {
      dateInputRef.current.click();
    }
  };

  const getCapacityPercent = (reserved, capacity) =>
    Math.round((reserved / (capacity || CAPACITY)) * 100);

  const availableSlots = slots.filter((s) => s.status === 'available').length;
  const minutesSinceStart = Math.max(0, Math.min(540, (now.getHours() - 8) * 60 + now.getMinutes()));
  const currentTimeTop = `${(minutesSinceStart / 540) * 100}%`;

  return (
    <div className="slots-breakdown">

      {/* Timeline */}
      <Card as="div" className="slots-breakdown__timeline-card">
        <OccupancyStats 
          slots={slots}
          availableSlots={availableSlots}
          selectedDate={selectedDate}
        />
        <TimelinePanel
          slots={slots}
          selectedSlotId={selectedSlotId}
          hoveredSlotId={hoveredSlotId}
          loading={loading}
          isSelectedDateToday={isSelectedDateToday}
          isSelectedDateInPast={isSelectedDateInPast}
          currentTimeTop={currentTimeTop}
          currentHour={currentHour}
          activeHold={activeHold}
          holdDuration={holdDuration}
          onSlotClick={handleSlotClick}
          onHoveredSlotChange={setHoveredSlotId}
          onDurationChange={setHoldDuration}
          getStatusInfo={getStatusInfo}
          getCapacityPercent={getCapacityPercent}
          now={now}
        />
      </Card>

      {/* Sidebar */}
      <div className="slots-breakdown__sidebar-wrap">
        <Card as="aside" className="slots-breakdown__sidebar-card">
          <div className="slots-breakdown__sidebar-scroll">
            <div className="slots-breakdown__sidebar">

              <div className="sidebar__content-wrapper">
                <div className="sidebar__msg">
                  <ul className="sidebar__msg-list">
                    <li className="sidebar__msg-item">First select date and duration before selecting a timeslot.</li>
                    <li className="sidebar__msg-item">Reservations will still be confirmed by staff after submission.</li>
                  </ul>
                </div>
                {/* Date picker */}
                <DatePicker
                  selectedDate={selectedDate}
                  onDateChange={handleDateChangeFromPicker}
                  onToday={handleToday}
                  onOpenPicker={openDatePicker}
                  inputRef={dateInputRef}
                />

                <DurationPicker
                  slots={slots}
                  selectedSlotId={selectedSlotId}
                  hoveredSlotId={hoveredSlotId}
                  loading={loading}
                  isSelectedDateToday={isSelectedDateToday}
                  isSelectedDateInPast={isSelectedDateInPast}
                  currentTimeTop={currentTimeTop}
                  currentHour={currentHour}
                  activeHold={activeHold}
                  holdDuration={holdDuration}
                  onSlotClick={handleSlotClick}
                  onHoveredSlotChange={setHoveredSlotId}
                  onDurationChange={setHoldDuration}
                  getStatusInfo={getStatusInfo}
                  getCapacityPercent={getCapacityPercent}
                  now={now}
                />

                {/* Stats */}
                <div className="sidebar__stats">
                  {/* Success */}
                  {reservationSuccess && (
                    <div className="sidebar__selection-info">
                      <div className="selection-info selection-info--success">
                        <div className="selection-success__icon">✓</div>
                        <h4 className="selection-info__title">Reservation Submitted!</h4>
                        <p className="selection-success__msg">
                          Your reservation is pending staff approval.
                        </p>
                        <button
                          className="selection-info__btn"
                          onClick={() => {
                            setReservationSuccess(false);
                            setSelectedSlotId(null);
                            setHoldError('');
                          }}
                        >
                          Reserve Another
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Stand-alone error (no slot selected) */}
                  {holdError && !selectedSlotId && !reservationSuccess && (
                    <div className="warning-message" style={{ marginTop: '0.5rem' }}>
                      {holdError}
                    </div>
                  )}

                  {/* Selected slot panel */}
                  {!reservationSuccess &&
                    selectedSlotId &&
                    (() => {
                      const selectedSlot = slots.find((s) => s.id === selectedSlotId);
                      if (!selectedSlot) return null;
                      const statusInfo = getStatusInfo(selectedSlot.status);

                      return (
                        <div className="sidebar__selection-info">
                          <div className="selection-info">
                            <h4 className="selection-info__title">
                              {activeHold
                                ? 'Slot Held'
                                : holdLoading
                                ? 'Holding Slot...'
                                : 'Selected Slot'}
                            </h4>

                            <div className="selection-info__details">
                              <div className="info-row">
                                <span className="info-label">Time</span>
                                <span className="info-value">{selectedSlot.hour}</span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">Range</span>
                                <span className="info-value">
                                  {selectedSlot.start.slice(0, 5)} — {selectedSlot.end.slice(0, 5)}
                                </span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">Duration</span>
                                <span className="info-value">
                                  {holdDuration} hour{holdDuration > 1 ? 's' : ''}
                                </span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">Status</span>
                                <span className={`status-badge ${statusInfo.className}`}>
                                  {statusInfo.label}
                                </span>
                              </div>
                              <div className="info-row">
                                <span className="info-label">Available</span>
                                <span className="info-value">
                                  {selectedSlot.available}/{selectedSlot.capacity}
                                </span>
                              </div>
                            </div>

                            <div className="selection-info__capacity">
                              <div
                                className={`capacity-bar__fill capacity-bar__fill--${selectedSlot.status}`}
                                style={{
                                  width: `${getCapacityPercent(
                                    selectedSlot.reserved,
                                    selectedSlot.capacity
                                  )}%`,
                                }}
                              />
                            </div>

                            {/* Countdown */}
                            {activeHold && holdCountdown !== null && (
                              <div className="hold-countdown">
                                <div className="hold-countdown__timer">
                                  {formatCountdown(holdCountdown)}
                                </div>
                                <p className="hold-countdown__msg">
                                  Slot held. Confirm before time runs out.
                                </p>
                              </div>
                            )}

                            {/* Error inline */}
                            {holdError && (
                              <div className="warning-message">{holdError}</div>
                            )}

                            {/* Full warning */}
                            {selectedSlot.available === 0 && !activeHold && !holdLoading && (
                              <div className="warning-message">This slot is fully booked.</div>
                            )}

                            {/* Actions */}
                            {activeHold ? (
                              <div className="selection-info__actions">
                                <button
                                  className="selection-info__btn"
                                  onClick={handleConfirmReservation}
                                  disabled={holdLoading}
                                >
                                  {holdLoading ? 'Confirming...' : 'Confirm Reservation'}
                                </button>
                                <button
                                  className="selection-info__btn selection-info__btn--secondary"
                                  onClick={handleCancelHold}
                                  disabled={holdLoading}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              holdLoading && (
                                <button className="selection-info__btn" disabled>
                                  Holding...
                                </button>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })()}
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
