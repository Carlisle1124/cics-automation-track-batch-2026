import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUser, getUsers } from '../../data/services/authService';
import { createReservationForStudent } from '../../data/services/reservationService';
import { getAvailabilityByDate } from '../../data/services/availabilityService';
import { validateReservation } from '../../data/services/reservationLogic';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import { formatTimeOfDay, formatTimeRange } from '../../shared/utils/datetime';
import './ScheduleForStudents.css';

import { CalendarBlankIcon } from '@phosphor-icons/react';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/* =========================
   SLOT MAPPING (FIXED)
========================= */
function normalizeTime(t) {
  if (!t) return '00:00:00';
  return t.length === 5 ? `${t}:00` : t;
}

function mapAvailabilitySlots(avail, referenceDate, selectedDateStr) {
  const now = referenceDate || new Date();
  const todayStr = toInputDate(new Date());
  const isToday = selectedDateStr === todayStr;
  const currentTimeStr = now.toTimeString().slice(0, 8);

  return (avail.slots || []).map((slot) => {
    const reservedCount = slot.reservedCount ?? 0;
    const capacity = slot.capacity ?? (avail.room?.capacity ?? 50);

    let available =
      typeof slot.available === 'number'
        ? slot.available
        : Math.max(capacity - reservedCount, 0);

    let status =
      slot.status ||
      (available === 0 ? 'full' : available <= 10 ? 'nearly full' : 'available');

    // Normalize times first for consistent comparison
    const endTime = normalizeTime(slot.end);
    const startTime = normalizeTime(slot.start);
    const isPast = isToday && endTime && currentTimeStr >= endTime;

    if (isPast) {
      available = 0;
      status = 'full';
    }

    return {
      ...slot,
      start: startTime,
      end: endTime,
      reservedCount,
      capacity,
      available,
      status,
      isPast,
    };
  });
}

export default function ScheduleForStudents() {
  const [staffUser, setStaffUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [timeSlots, setTimeSlots] = useState([]);
  const [backendReservations, setBackendReservations] = useState([]);

  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [duration, setDuration] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const studentMenuRef = useRef(null);
  const dateMenuRef = useRef(null);

  const [hoveredSlotIndex, setHoveredSlotIndex] = useState(null);

  /* =========================
     LOAD USERS + INITIAL DATA
  ========================= */
  useEffect(() => {
    let active = true;

    async function load() {
      const [currentUser, allUsers] = await Promise.all([
        getCurrentUser(),
        getUsers(),
      ]);

      if (!active) return;

      setStaffUser(currentUser);

      const studentUsers = (allUsers || []).filter(
        (u) => u.role === 'student' || u.role?.toLowerCase?.() === 'student'
      );

      setStudents(studentUsers);

      // initial availability
      await fetchAvailability(selectedDate);
      setIsPageLoading(false);
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  /* =========================
     FETCH AVAILABILITY (FIXED)
  ========================= */
  async function fetchAvailability(date) {
    try {
      const dateStr = toInputDate(date);
      const avail = await getAvailabilityByDate(dateStr, date);

      const mapped = mapAvailabilitySlots(avail, new Date(), dateStr);

      setTimeSlots(mapped);
      setBackendReservations(avail.reservations || []);

    } catch (err) {
      console.warn('Availability error:', err?.message ?? err);
      setTimeSlots([]);
    }
  }

  /* =========================
     REFRESH WHEN DATE CHANGES
  ========================= */
  useEffect(() => {
    setSelectedSlotId(null);
    fetchAvailability(selectedDate);
  }, [selectedDate]);

  /* =========================
     FILTER STUDENTS
  ========================= */
  useEffect(() => {
    if (!studentQuery) {
      setSuggestions(students.slice(0, 6));
      return;
    }

    const q = studentQuery.toLowerCase();

    setSuggestions(
      students
        .filter((s) => {
          const name = (s.full_name || s.name || '').toLowerCase();
          const id = String(s.student_id || '');
          return name.includes(q) || id.includes(q);
        })
        .slice(0, 8)
    );
  }, [studentQuery, students]);

  /* =========================
     CLOSE MENU ON OUTSIDE CLICK
  ========================= */
  useEffect(() => {
    if (!openMenu) return;

    function handlePointerDown(event) {
      const isInsideStudent = studentMenuRef.current && studentMenuRef.current.contains(event.target);
      const isInsideDate = dateMenuRef.current && dateMenuRef.current.contains(event.target);
      if (!isInsideStudent && !isInsideDate) {
        setOpenMenu(null);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setOpenMenu(null);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [openMenu]);

  /* =========================
     SLOT VALIDATION
  ========================= */
  const sortedSlots = useMemo(() => {
    return [...timeSlots].sort((a, b) =>
      a.start.localeCompare(b.start)
    );
  }, [timeSlots]);

  const selectedStartIndex = useMemo(
    () => sortedSlots.findIndex((s) => s.id === selectedSlotId),
    [selectedSlotId, sortedSlots]
  );

  const hoveredStartIndex = hoveredSlotIndex;

function isInHoverRange(idx) {
  if (hoveredStartIndex == null) return false;

  return (
    idx >= hoveredStartIndex &&
    idx < hoveredStartIndex + duration &&
    isSlotAvailableByDuration(hoveredStartIndex)
  );
}

  useEffect(() => {
    if (!selectedSlotId) return;

    const index = sortedSlots.findIndex((s) => s.id === selectedSlotId);

    if (index === -1 || !isSlotAvailableByDuration(index)) {
        setSelectedSlotId(null);
    }
    }, [duration, sortedSlots]);

  function isSlotAvailableByDuration(index) {
  const needed = sortedSlots.slice(index, index + duration);
  if (needed.length < duration) return false;

  for (const slot of needed) {
    if (!slot || slot.isPast) return false;

    // ONLY rely on capacity
    if (slot.available <= 0) return false;
  }

  return true;
}

  /* =========================
     DATE PICKER HELPERS
  ========================= */
  function getMaxDate(today) {
    const max = new Date(today);
    max.setDate(max.getDate() + 30);
    return max;
  }

  function isDateDisabled(date, today, maxDate) {
    return date < today || date > maxDate;
  }

  function moveVisibleMonth(amount) {
    setVisibleMonth((previous) => {
      const nextMonth = new Date(previous);
      nextMonth.setMonth(previous.getMonth() + amount);
      return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
    });
  }

  function toggleMenu(menuName) {
    setOpenMenu((currentMenu) => (currentMenu === menuName ? null : menuName));
  }

  const visibleMonthLabel = useMemo(
    () =>
      visibleMonth.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [visibleMonth]
  );

  const calendarDays = useMemo(() => {
    const year = visibleMonth.getFullYear();
    const month = visibleMonth.getMonth();
    const firstDayOfMonth = new Date(year, month, 1);
    const startDate = new Date(year, month, 1 - firstDayOfMonth.getDay());

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      const value = toInputDate(date);

      return {
        value,
        label: date.getDate(),
        isCurrentMonth: date.getMonth() === month,
        isSelected: value === toInputDate(selectedDate),
      };
    });
  }, [selectedDate, visibleMonth]);

  const selectedDateSummary = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    const diffTime = selected.getTime() - today.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let badge = '';
    if (diffDays === 0) {
      badge = 'Today';
    } else if (diffDays === 1) {
      badge = 'Tomorrow';
    } else if (diffDays > 1 && diffDays <= 30) {
      badge = `In ${diffDays} days`;
    } else if (diffDays < 0) {
      badge = 'Past date';
    } else {
      badge = selectedDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }

    const label = selectedDate.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    return {
      label,
      badge,
    };
  }, [selectedDate]);

  /* =========================
     HANDLERS
  ========================= */
  function handleDateSelect(value) {
    setSelectedDate(new Date(`${value}T00:00:00`));
    setSelectedSlotId(null);
    setOpenMenu(null);
  }

  function handleSlotSelect(slotId) {
    setSelectedSlotId(slotId);
  }

async function handleSubmit(e) {
  e.preventDefault();

  if (!selectedStudentId) {
    setStatusMessage('Please select a student.');
    return;
  }

  if (!selectedSlotId) {
    setStatusMessage('Please select a time slot.');
    return;
  }

  const selectedSlot = sortedSlots.find((s) => s.id === selectedSlotId);
  const startIndex = sortedSlots.findIndex((s) => s.id === selectedSlotId);

  if (!selectedSlot || startIndex < 0) {
    setStatusMessage('Invalid slot selection.');
    return;
  }

  // compute end time AFTER slot is confirmed
  const endTime =
    sortedSlots[startIndex + duration - 1]?.end ||
    selectedSlot.end;

  setIsSubmitting(true);
  setStatusMessage('Creating reservation...');

  try {
    await validateReservation({
      userId: selectedStudentId,
      reservationDate: toInputDate(selectedDate),
      durationHours: duration,
    });

    const reservation = await createReservationForStudent({
      userId: selectedStudentId,
      reservationDate: toInputDate(selectedDate),
      startTime: selectedSlot.start,
      endTime,
      approvedBy: staffUser.id,
    });

    const studentName = students.find((student) => student.id === selectedStudentId)?.full_name ||
      students.find((student) => student.id === selectedStudentId)?.name ||
      'Selected student';
    const createdAtLabel = reservation.created_at
      ? new Date(reservation.created_at).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : null;

    setStatusMessage(
      `Reservation saved for ${studentName} (ID: ${reservation.id})${createdAtLabel ? ` at ${createdAtLabel}` : ''}. Status: ${reservation.status ?? 'approved'}.`
    );

    setSelectedSlotId(null);
    setDuration(1);

    await fetchAvailability(selectedDate);

  } catch (err) {
    setStatusMessage(err.message || 'Failed to create reservation');
  } finally {
    setIsSubmitting(false);
  }
}

  /* =========================
     UI
  ========================= */
  return (
    <section
      className={`schedule-students-page ${
        isPageLoading
          ? 'schedule-students-page--content-hidden'
          : 'schedule-students-page--content-visible'
      }`}
    >
      <PageHeader
        title="Create Reservation for Students"
        subtitle="Create a reservation on behalf of students who request scheduling help."
      />


      <div className="schedule-students__surface">
        <form onSubmit={handleSubmit} className="schedule-students__form">
            <div className='schedule-students__form-wrap'>
                <div className="schedule-students__field schedule-students__field">
                    <span id="schedule-students-student-label">Student</span>
                    <div className="schedule-students__menu-field" ref={studentMenuRef}>
                    <input
                        id="schedule-students-student-input"
                        type="text"
                        value={studentQuery}
                        onChange={(e) => {
                        setStudentQuery(e.target.value);
                        setOpenMenu('student');
                        }}
                        onFocus={() => setOpenMenu('student')}
                        placeholder="Search by name or student number"
                        aria-autocomplete="list"
                        aria-expanded={openMenu === 'student'}
                        aria-controls="schedule-students-student-list"
                    />
                    {openMenu === 'student' && (
                        <div
                        className="schedule-students__menu"
                        role="listbox"
                        id="schedule-students-student-list"
                        >
                        {suggestions.length > 0 ? (
                            suggestions.map((student) => (
                            <button
                                key={student.id}
                                type="button"
                                role="option"
                                aria-selected={selectedStudentId === student.id}
                                className={`schedule-students__menu-option ${
                                selectedStudentId === student.id ? 'is-active' : ''
                                }`}
                                onClick={() => {
                                setSelectedStudentId(student.id);
                                setStudentQuery(student.full_name || student.name || '');
                                setOpenMenu(null);
                                }}
                            >
                                <span>
                                {student.full_name || student.name} ({student.student_id || 'N/A'})
                                </span>
                                <span
                                className="schedule-students__menu-option-indicator"
                                aria-hidden="true"
                                >
                                {selectedStudentId === student.id ? '✓' : ''}
                                </span>
                            </button>
                            ))
                        ) : (
                            <div className="schedule-students__menu-empty">No matching students.</div>
                        )}
                        </div>
                    )}
                    </div>
                </div>

                <div className="schedule-students__field">
                    <span id="schedule-students-date-label">Date</span>
                    <div className="schedule-students__menu-field date" ref={dateMenuRef}>
                        <button
                            type="button"
                            className={`schedule-students__menu-trigger schedule-students__date-trigger ${
                                openMenu === 'date' ? 'schedule-students__menu-trigger--open' : ''
                            }`}
                            aria-haspopup="dialog"
                            aria-expanded={openMenu === 'date'}
                            aria-labelledby="schedule-students-date-label"
                            onClick={() => toggleMenu('date')}
                        >
                            <div className="selected-date__formatted" aria-live="polite">
                                <span className="selected-date__formatted-label">{selectedDateSummary.label}</span>
                                <span className="selected-date__formatted-badge">{selectedDateSummary.badge}</span>
                            </div>
                            <span className="schedule-students__date-trigger-icon" aria-hidden="true">
                                <CalendarBlankIcon size={20} weight='duotone' />
                            </span>
                        </button>

                        {openMenu === 'date' && (
                            <div className="schedule-students__date-menu" role="dialog" aria-label="Choose reservation date">
                                <div className="schedule-students__calendar-header">
                                    <button
                                        type="button"
                                        className="schedule-students__calendar-nav"
                                        onClick={() => moveVisibleMonth(-1)}
                                        aria-label="Previous month"
                                    >
                                        ‹
                                    </button>
                                    <div className="schedule-students__calendar-month">{visibleMonthLabel}</div>
                                    <button
                                        type="button"
                                        className="schedule-students__calendar-nav"
                                        onClick={() => moveVisibleMonth(1)}
                                        aria-label="Next month"
                                    >
                                        ›
                                    </button>
                                </div>
                                <div className="schedule-students__calendar-grid schedule-students__calendar-grid--weekdays">
                                    {WEEKDAY_LABELS.map((d) => (
                                        <span key={d}>{d}</span>
                                    ))}
                                </div>
                                <div className="schedule-students__calendar-grid">
                                    {calendarDays.map((day) => {
                                        const today = new Date();
                                        today.setHours(0, 0, 0, 0);
                                        const maxDate = getMaxDate(today);
                                        const disabled = isDateDisabled(new Date(day.value), today, maxDate);
                                        return (
                                            <button
                                                key={day.value}
                                                type="button"
                                                disabled={disabled}
                                                className={`schedule-students__calendar-day ${
                                                    day.isCurrentMonth ? '' : 'schedule-students__calendar-day--muted'
                                                } ${day.isSelected ? 'schedule-students__calendar-day--selected' : ''} ${
                                                    disabled ? 'schedule-students__calendar-day--disabled' : ''
                                                }`}
                                                onClick={() => handleDateSelect(day.value)}
                                                aria-label={`${
                                                    new Date(day.value).toLocaleString('default', {
                                                        weekday: 'long',
                                                        month: 'short',
                                                        day: 'numeric',
                                                    })
                                                }${disabled ? ' (unavailable)' : ''}`}
                                            >
                                                {day.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <div className="schedule-students__calendar-footer">
                                    <button
                                        type="button"
                                        className="schedule-students__calendar-today"
                                        onClick={() => handleDateSelect(toInputDate(new Date()))}
                                    >
                                        Today
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="schedule-students__field schedule-students__field">
                    <span>Duration</span>
                    <div className="schedule-students__duration-options">
                    <div
                        className="schedule-students__duration-progress"
                        style={{ width: `${(duration / 3) * 100}%` }}
                    />
                    <div className="schedule-students__duration-segments">
                        {[1, 2, 3].map((h) => (
                        <button
                            type="button"
                            key={h}
                            onClick={() => setDuration(h)}
                            className={`schedule-students__duration-segment ${
                            duration === h ? 'is-active' : ''
                            }`}
                        >
                            <span className="schedule-students__duration-segment-label">
                            {h}h
                            </span>
                        </button>
                        ))}
                    </div>
                    </div>
                </div>
            </div>

          <div className="schedule-students__field schedule-students__field--full">
            <span>Time Slots</span>
            <div className="schedule-students__timeslot-grid">
              {sortedSlots.map((slot, idx) => {
                const disabled = !isSlotAvailableByDuration(idx);
                const isSelected = selectedSlotId === slot.id;
                const isInDurationRange =
                  selectedStartIndex >= 0 &&
                  idx >= selectedStartIndex &&
                  idx < selectedStartIndex + duration;
                  const isHoveredRange = isInHoverRange(idx);

                return (
                  <button
                    key={slot.id}
                    type="button"
                    disabled={disabled}
                    className={`schedule-students__timeslot-btn
                    ${isSelected ? 'is-active' : ''}
                    ${isInDurationRange ? 'is-in-duration-range' : ''}
                    ${isHoveredRange ? 'is-hover-range' : ''}
                    `}
                    onClick={() => handleSlotSelect(slot.id)}
                    onMouseEnter={() => setHoveredSlotIndex(idx)}
                    onMouseLeave={() => setHoveredSlotIndex(null)}
                  >
                    <span className="schedule-students__timeslot-btn-time">
                      {formatTimeOfDay(slot.start)}
                    </span>
                    <span className="schedule-students__timeslot-btn-range">
                      {formatTimeRange(slot.start, slot.end)}
                    </span>
                    <span className="schedule-students__timeslot-btn-meta">
                      {slot.available} left · {slot.status}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="schedule-students__actions schedule-students__field--full">
            <button type="submit" className="schedule-students__submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Create Reservation'}
            </button>
          </div>
        </form>
      </div>

      {statusMessage ? <p className="schedule-students__message">{statusMessage}</p> : null}

      {isPageLoading ? (
        <div
          className="schedule-students-transition"
          role="status"
          aria-live="polite"
          aria-label="Loading schedule for students page"
        >
          <div className="schedule-students-transition__card">
            <img src={cicsLogo} alt="UST CICS logo" className="schedule-students-transition__logo" />
            <div className="schedule-students-transition__loader" aria-hidden="true">
              <span />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}