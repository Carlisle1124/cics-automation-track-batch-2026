import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateScheduleForDate } from '../data/mockData';
import { useApp } from '../context/AppContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import Spinner from '../components/ui/Spinner';
import './Schedule.css';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getNext7Days() {
  const days = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function formatDate(d) {
  return d.toISOString().split('T')[0];
}

export default function Schedule() {
  const navigate = useNavigate();
  const { room, occupants, checkAvailability, createReservation } = useApp();

  const dates = useMemo(() => getNext7Days(), []);

  const [selectedDate, setSelectedDate] = useState(dates[0]);
  const [selectedSlot, setSelectedSlot] = useState(null);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);

  const schedule = useMemo(
    () => generateScheduleForDate(selectedDate),
    [selectedDate]
  );

  const endHour = selectedSlot ? selectedSlot.hour + 1 : null;
  const endLabel = endHour
    ? endHour === 12
      ? '12:00 PM'
      : endHour > 12
        ? `${endHour - 12}:00 PM`
        : `${endHour}:00 AM`
    : '';

  function handleSlotClick(slot) {
    if (slot.status !== 'available') return;
    setSelectedSlot(slot.id === selectedSlot?.id ? null : slot);
    setConfirmResult(null);
  }

  function handleReserve() {
    setModalOpen(true);
    setConfirming(false);
    setConfirmResult(null);
  }

  async function handleConfirm() {
    setConfirming(true);
    setConfirmResult(null);
    const result = await checkAvailability(formatDate(selectedDate), selectedSlot);
    if (result.available) {
      createReservation(formatDate(selectedDate), selectedSlot);
      setConfirmResult('success');
    } else {
      setConfirmResult('conflict');
    }
    setConfirming(false);
  }

  function handleGoToConfirmation() {
    navigate('/confirmation', {
      state: {
        date: formatDate(selectedDate),
        startTime: selectedSlot.label,
        endTime: endLabel,
        duration: '1 hour',
      },
    });
  }

  return (
    <div>
      {/* Room Info */}
      <div className="schedule__room-info">
        <div>
          <div className="schedule__room-name">{room.name}</div>
          <div className="schedule__room-detail">
            Capacity: {room.capacity} &middot; Current occupants: {occupants.length}
          </div>
        </div>
      </div>

      {/* Date Strip */}
      <div className="schedule__calendar">
        <div className="schedule__calendar-label">Select Date</div>
        <div className="schedule__date-strip">
          {dates.map((d) => (
            <button
              key={d.toISOString()}
              className={`schedule__date-btn ${
                formatDate(d) === formatDate(selectedDate) ? 'schedule__date-btn--active' : ''
              }`}
              onClick={() => {
                setSelectedDate(d);
                setSelectedSlot(null);
                setConfirmResult(null);
              }}
            >
              <span className="schedule__date-day">{DAYS_OF_WEEK[d.getDay()]}</span>
              <span className="schedule__date-num">{d.getDate()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="schedule__legend">
        <span>
          <span className="schedule__legend-dot" style={{ background: '#bbf7d0' }} />
          Available
        </span>
        <span>
          <span className="schedule__legend-dot" style={{ background: '#fecaca' }} />
          Booked
        </span>
        <span>
          <span className="schedule__legend-dot" style={{ background: '#fef08a' }} />
          Pending
        </span>
      </div>

      {/* Time Slots */}
      <div className="schedule__slots-title">Available Time Slots</div>
      <div className="schedule__slots-grid">
        {schedule.map((slot) => (
          <div
            key={slot.id}
            className={`time-slot time-slot--${
              selectedSlot?.id === slot.id ? 'selected' : slot.status
            }`}
            onClick={() => handleSlotClick(slot)}
            title={
              slot.status === 'booked'
                ? 'This slot is booked'
                : slot.status === 'pending'
                  ? 'Pending confirmation'
                  : 'Click to select'
            }
          >
            {slot.label}
          </div>
        ))}
      </div>

      {/* Summary Panel */}
      {selectedSlot && (
        <div className="schedule__summary">
          <h3>Booking Summary</h3>
          <div className="schedule__summary-row">
            <span className="schedule__summary-label">Date</span>
            <span className="schedule__summary-value">{formatDate(selectedDate)}</span>
          </div>
          <div className="schedule__summary-row">
            <span className="schedule__summary-label">Time</span>
            <span className="schedule__summary-value">
              {selectedSlot.label} - {endLabel}
            </span>
          </div>
          <div className="schedule__summary-row">
            <span className="schedule__summary-label">Duration</span>
            <span className="schedule__summary-value">1 hour</span>
          </div>
          <div className="schedule__summary-actions">
            <Button onClick={handleReserve}>Confirm Reservation</Button>
            <Button variant="secondary" onClick={() => setSelectedSlot(null)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          if (!confirming) setModalOpen(false);
        }}
        title="Confirm Your Reservation"
      >
        {confirming && <Spinner text="Checking availability..." />}

        {!confirming && !confirmResult && (
          <div>
            <div className="schedule__summary-row">
              <span className="schedule__summary-label">Date</span>
              <span className="schedule__summary-value">{formatDate(selectedDate)}</span>
            </div>
            <div className="schedule__summary-row">
              <span className="schedule__summary-label">Time</span>
              <span className="schedule__summary-value">
                {selectedSlot?.label} - {endLabel}
              </span>
            </div>
            <div className="schedule__summary-row">
              <span className="schedule__summary-label">Duration</span>
              <span className="schedule__summary-value">1 hour</span>
            </div>
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <Button onClick={handleConfirm}>Confirm Reservation</Button>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        {!confirming && confirmResult === 'success' && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: 6 }}>Reservation Confirmed</h3>
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem', marginBottom: 18 }}>
              Your time slot has been reserved.
            </p>
            <Button onClick={handleGoToConfirmation}>View Details</Button>
          </div>
        )}

        {!confirming && confirmResult === 'conflict' && (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ marginBottom: 6, color: 'var(--red-dark)' }}>Slot No Longer Available</h3>
            <p style={{ color: 'var(--neutral-500)', fontSize: '0.875rem', marginBottom: 18 }}>
              This slot was taken. Please pick another time.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                setModalOpen(false);
                setSelectedSlot(null);
              }}
            >
              Choose Another Slot
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
