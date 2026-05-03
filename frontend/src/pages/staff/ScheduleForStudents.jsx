import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUser, getUsers } from '../../data/services/authService';
import {
  approveHeldReservation,
  releaseSlot,
} from '../../data/services/reservationService';
import { getAvailabilityByDate } from '../../data/services/availabilityService';
import { supabase } from '../../data/supabaseClient';
import { useSlotHold } from '../../features/availability/hooks/useSlotHold';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import { formatTimeOfDay, formatTimeRange } from '../../shared/utils/datetime';
import { getStatusInfo } from '../../shared/utils/statusInfo';
import './ScheduleForStudents.css';

import FeedbackAlert from '../../shared/components/FeedbackAlert';

import { CalendarBlankIcon, ClockCountdownIcon } from '@phosphor-icons/react';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCountdown(secs) {
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
    // A slot becomes unavailable as soon as its start time is reached.
    const isPast = isToday && startTime && currentTimeStr >= startTime;

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

  const [selectedSlotId, setSelectedSlotId] = useState(null);
  const [duration, setDuration] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentQuery, setStudentQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    autoCloseDuration: null,
    });

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const studentMenuRef = useRef(null);
  const dateMenuRef = useRef(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState(null);

  // Formatted date for API calls
  const selectedDateValue = toInputDate(selectedDate);

  // Use the custom hook for slot holding - pass selectedStudentId as userId
  // Staff can bypass some validation rules
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
    setActiveHold,
    setHoldCountdown,
  } = useSlotHold({
    userId: selectedStudentId, // Use selectedStudentId instead of currentUser.id
    selectedDate,
    holdDuration: duration,
    selectedDateValue,
    onSlotSelect: (slotId) => {
      setSelectedSlotId(slotId);
    },
    skipValidation: true, // Staff can bypass validation rules
  });

  /* =========================
     LOAD USERS + INITIAL DATA
  ========================= */
  useEffect(() => {
    let active = true;

    async function load() {
      const [currentUser, allUsers] = await Promise.all([getCurrentUser(), getUsers()]);

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
    // Release hold when date changes
    if (activeHold) {
      releaseHoldManually();
    }
  }, [selectedDate]);

  // Realtime subscription for availability updates
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
        () => fetchAvailability(selectedDate)
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDateValue]);

  /* =========================
     FILTER STUDENTS
  ========================= */
  useEffect(() => {
    const selectedStudent = selectedStudentId
      ? students.find((student) => student.id === selectedStudentId)
      : null;

    if (!studentQuery) {
      setSuggestions(
        [...students]
          .sort((a, b) => {
            if (a.id === selectedStudent?.id) return -1;
            if (b.id === selectedStudent?.id) return 1;
            return String(a.full_name || a.name || '').localeCompare(String(b.full_name || b.name || ''));
          })
          .slice(0, 6)
      );
      return;
    }

    const q = studentQuery.toLowerCase();

    setSuggestions(
      [...students]
        .filter((s) => {
          const name = (s.full_name || s.name || '').toLowerCase();
          const id = String(s.student_id || '');
          return name.includes(q) || id.includes(q);
        })
        .sort((a, b) => {
          if (a.id === selectedStudent?.id) return -1;
          if (b.id === selectedStudent?.id) return 1;
          return String(a.full_name || a.name || '').localeCompare(String(b.full_name || b.name || ''));
        })
        .slice(0, 8)
    );
  }, [selectedStudentId, studentQuery, students]);

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
    return [...timeSlots].sort((a, b) => a.start.localeCompare(b.start));
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
  }, [duration, sortedSlots, selectedSlotId]);

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

  const selectedStudent = selectedStudentId
    ? students.find((student) => student.id === selectedStudentId)
    : null;
  const selectedStudentLabel =
    selectedStudent?.full_name || 'Selected student';

  const selectedStudentFirstName = selectedStudentLabel.split(' ')[0] || 'Student';

  const selecetedTimeRange = useMemo(() => {
    if (!selectedSlotId) return null;
    const index = sortedSlots.findIndex((s) => s.id === selectedSlotId);
    if (index === -1) return null;
    const rangeSlots = sortedSlots.slice(index, index + duration);
    if (rangeSlots.length < duration) return null;
    return `${formatTimeOfDay(rangeSlots[0].start)} - ${formatTimeOfDay(
      rangeSlots[rangeSlots.length - 1].end
    )}`;
  }, [selectedSlotId, duration, sortedSlots]);

  /* =========================
     HANDLERS
  ========================= */
  function handleDateSelect(value) {
    setSelectedDate(new Date(`${value}T00:00:00`));
    setSelectedSlotId(null);
    setHoldError('');
    setStatusMessage('');
    setOpenMenu(null);
    // Release hold when date changes
    if (activeHold) {
      releaseHoldManually();
    }
  }

  async function handleStudentSelect(student) {
    if (!student) return;

    // Release active hold when changing student
    if (activeHold) {
      await releaseHoldManually();
    }

    setSelectedStudentId(student.id);
    setStudentQuery(student.full_name || student.name || '');
    setSelectedSlotId(null);
    setHoldError('');
    setStatusMessage('');
    setOpenMenu(null);
  }

  async function handleSlotSelect(slotId) {
    const slot = sortedSlots.find((item) => item.id === slotId);
    if (!slot || holdLoading) return;

    // Guard: must select student first
    if (!selectedStudentId) {
      setHoldError('Please select a student before holding a slot.');
      return;
    }

    if (activeHold && selectedSlotId === slotId) return;

    setStatusMessage('');

    // If selecting a different slot, release the previous hold
    if (activeHold && selectedSlotId !== slotId) {
      await releaseHoldManually();
    }

    setSelectedSlotId(slotId);

    if (slot.available <= 0) {
      setHoldError('This slot is fully booked.');
      return;
    }

    if (!staffUser?.id) {
      setHoldError('Please log in as staff to create reservations.');
      return;
    }

    // Use the hook's handler
    try {
      await hookHandleSlotClick(slot);
      setStatusMessage(
        `Slot held for ${students.find((s) => s.id === selectedStudentId)?.full_name || 'student'}. Confirm before hold expires.`
      );
    } catch (err) {
      setSelectedSlotId(null);
      throw err;
    }
  }

  async function handleCancelHold() {
    await hookHandleCancelHold();
    setSelectedSlotId(null);
    setStatusMessage('');
    await fetchAvailability(selectedDate);
  }

  
const resetForm = async () => {
  const today = new Date();

  // 1. Reset core selection states
  setSelectedDate(today);
  setSelectedSlotId(null);

  // 2. Reset hold + UI state
  setActiveHold(null);
  setHoldCountdown(null);
  setHoldError('');
  setStatusMessage('');

  // 3. Reset student + duration
  setSelectedStudentId(null);
  setStudentQuery('');
  setDuration(1);

  // 4. Close menus
  setOpenMenu(null);

  // 5. Reset visible calendar month to current month
  setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));

  // 6. IMPORTANT: refresh slots for today
  await fetchAvailability(today);
};

  async function handleSubmit(e) {
    e.preventDefault();

    if (!selectedStudentId) {
      setHoldError('Please select a student.');
      return;
    }

    if (!activeHold) {
      setHoldError('Select a slot to place a hold first.');
      return;
    }

    if (!staffUser?.id) {
      setHoldError('Please log in as staff to confirm reservations.');
      return;
    }

    const selectedSlot = sortedSlots.find((s) => s.id === selectedSlotId);

    if (!selectedSlot) {
      setHoldError('Invalid slot selection.');
      return;
    }

    setStatusMessage('Creating reservation...');

    try {
      // For staff, directly approve the held reservation
      const reservation = await approveHeldReservation({
        reservationId: activeHold.id,
        userId: selectedStudentId,
        approvedBy: staffUser.id,
      });

      const studentName =
        students.find((student) => student.id === selectedStudentId)?.full_name ||
        students.find((student) => student.id === selectedStudentId)?.name ||
        'Selected student';

      //success alert modal
      setAlertState({
        isOpen: true,
        type: 'success',
        title: 'Reservation Confirmed',
        message: 'Your reservation has been successfully placed.',
        });

      //reset form and state after confirmation
      resetForm();

      setActiveHold(null);
      setHoldCountdown(null);
      setDuration(1);

      await fetchAvailability(selectedDate);
    } catch (err) {
      // Show error alert modal
      setAlertState({
        isOpen: true,
        type: 'error',
        title: 'Reservation Failed',
        message: err.message || 'Something went wrong.',
        autoCloseDuration: 5000,
        });
      setHoldError(err.message || 'Failed to create reservation');
      setStatusMessage('');
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
        <FeedbackAlert
        isOpen={alertState.isOpen}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
        confirmText="OK"
        autoCloseDuration={alertState.autoCloseDuration || 3000}
        onConfirm={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        onClose={() => setAlertState(prev => ({ ...prev, isOpen: false }))}
        />

      <PageHeader
        title="Create Reservation for Students"
        subtitle="Create a reservation on behalf of students who request scheduling help."
      />

      <div className="schedule-students__surface">
        <form onSubmit={handleSubmit} className="schedule-students__form" autoComplete="off">
          <div className='schedule-students__form-wrap'>
            <div className="schedule-students__field schedule-students__field">
              <span id="schedule-students-student-label" style={{ height: 'fit-content', padding: '0', margin: '0' }}>Student</span>
              <div className="schedule-students__menu-field search" ref={studentMenuRef}>
                <input
                  id="schedule-students-student-input"
                  name="student-search"
                  type="text"
                  value={studentQuery}
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
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
                          onClick={() => handleStudentSelect(student)}
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
                      onClick={() => !activeHold && setDuration(h)}
                      disabled={!!activeHold}
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
                const statusInfo = getStatusInfo(slot.status);
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
                    className={`schedule-students__timeslot-btn ${statusInfo.className}
                    ${isSelected ? 'is-active' : ''}
                    ${isInDurationRange ? 'is-in-duration-range' : ''}
                    ${isHoveredRange ? 'is-hover-range' : ''}
                    `}
                    onClick={() => handleSlotSelect(slot.id)}
                    onMouseEnter={() => setHoveredSlotIndex(idx)}
                    onMouseLeave={() => setHoveredSlotIndex(null)}
                  >
                    <div className="schedule-students__timeslot-timeblock">
                      <span className="schedule-students__timeslot-btn-start">
                        {formatTimeOfDay(slot.start)}
                      </span>
                      <span className="schedule-students__timeslot-btn-separator" aria-hidden="true" />
                      <span className="schedule-students__timeslot-btn-end">
                        {formatTimeOfDay(slot.end)}
                      </span>
                    </div>
                    <div className="schedule-students__timeslot-meta">
                      <span className="schedule-students__timeslot-btn-meta">
                        {slot.available} left
                      </span>
                      <div
                        className="schedule-students__timeslot-status"
                        aria-label={`Availability: ${statusInfo.label}`}
                      >
                        <span className="schedule-students__timeslot-status-label">
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="schedule-students__actions schedule-students__field--full footer">
            <div className="schedule-students__hold-info-wrap">
                {activeHold && holdCountdown !== null ? (
                <div className='schedule-students__hold-info'>

                    <div className='hold-info__status'>
                        <ClockCountdownIcon size={20} weight="bold" className='hold-info__status-icon' />
                        <span className='hold-info__status-timeslot'> {selecetedTimeRange} </span> time slot for <span className='hold-info__status-student'>{selectedStudentFirstName}</span> is held. 
                    </div>

                    <div className='hold-info__countdown'>
                        <div className='countdown__label'>
                            Confirm within
                        </div>
                        <div className='countdown__clock'>
                            {formatCountdown(holdCountdown)}
                        </div>
                    </div>
                    <div className='countdown__note'>
                        <strong>Note:</strong> Holding a slot does not guarantee the reservation until you confirm.
                    </div>

                </div>
                ) : null}
                
                {holdError ? <p className="schedule-students__message">{holdError}</p> : null}

            </div>
            <div className="schedule-students__actions-btns">
                {/* cancel held slot */}
                <button type="button" className="schedule-students__cancel-hold" onClick={handleCancelHold} disabled={!activeHold}>
                  Cancel Hold
                </button>

                {/* confirm reservation */}
                <button type="submit" className="schedule-students__submit" disabled={!activeHold || holdLoading} >
                  {holdLoading ? 'Saving...' : activeHold ? 'Confirm Reservation' : 'Select a slot'}
                </button>
            </div>
          </div>
        </form>
      </div>

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
