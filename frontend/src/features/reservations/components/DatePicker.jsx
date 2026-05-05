import { CaretLeft, CaretRight } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import './DatePicker.css';

// Utility: Add days to a date
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Utility: Get N consecutive dates starting from windowStart
function getDayWindow(windowStart, daysToShow) {
  return Array.from({ length: daysToShow }, (_, i) => addDays(windowStart, i));
}

// Utility: Get 5 consecutive dates starting from windowStart (for backwards compatibility)
function getFiveDayWindow(windowStart) {
  return getDayWindow(windowStart, 5);
}

// Utility: Get day of week abbreviation
function getDayOfWeekName(date) {
  return date.toLocaleString('default', { weekday: 'short' });
}

// Utility: Format date as YYYY-MM-DD
function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Utility: Normalize date to start of day (00:00:00)
function normalizeDate(date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function addMonths(date, months) {
  const result = new Date(date);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  return normalizeDate(result);
}

function getStartOfMonth(date) {
  const result = new Date(date);
  result.setDate(1);
  return normalizeDate(result);
}

function getDaysInMonthGrid(monthDate) {
  const startOfMonth = getStartOfMonth(monthDate);
  const startDay = startOfMonth.getDay();
  const firstCellDate = addDays(startOfMonth, -startDay);

  return Array.from({ length: 42 }, (_, index) => addDays(firstCellDate, index));
}

function formatMonthLabel(date) {
  return date.toLocaleString('default', {
    month: 'long',
    year: 'numeric',
  });
}

// Utility: Check if two dates are the same day
function isSameDay(date1, date2) {
  return (
    date1.getDate() === date2.getDate() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getFullYear() === date2.getFullYear()
  );
}

function getMaxDate(today) {
  const max = new Date(today);
  max.setDate(max.getDate() + 30);
  return max;
}

function isDateDisabled(date, today, maxDate) {
  const d = normalizeDate(date);
  if (d < today) return true;
  if (d > maxDate) return true;
  if (date.getDay() === 0) return true; // Sunday
  return false;
}

function getAlignedFiveDayBlockStart(date, anchorDate) {
  const dayInMs = 24 * 60 * 60 * 1000;
  const normalizedDate = normalizeDate(date);
  const normalizedAnchor = normalizeDate(anchorDate);
  const diffDays = Math.floor((normalizedDate - normalizedAnchor) / dayInMs);
  const blockOffset = Math.floor(diffDays / 5) * 5;

  return addDays(normalizedAnchor, blockOffset);
}

// Helper function to determine visible days count based on screen width
function getVisibleDaysCount(width) {
  if (width < 480) return 1;
  if (width < 1025) return 3;
  return 5;
}

export default function DatePicker({
  selectedDate,
  onDateChange,
  onToday,
}) {
  // windowStartDate is the first day shown in the grid (always starts from today)
  const [windowStartDate, setWindowStartDate] = useState(() => {
    return normalizeDate(new Date());
  });
  
  // Show/hide the native date input
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [popoverMonth, setPopoverMonth] = useState(() => getStartOfMonth(selectedDate));
  const [gridDirection, setGridDirection] = useState('next');
  const [renderCalendar, setRenderCalendar] = useState(false);
  const [visibleDaysCount, setVisibleDaysCount] = useState(() => getVisibleDaysCount(window.innerWidth));
  
  const popoverRef = useRef(null);
  const popoverTriggerRef = useRef(null);

  // Get day window based on visible days count
  const dayWindow = getDayWindow(windowStartDate, visibleDaysCount);

  // Get month/year from selected date
  const monthYear = formatMonthLabel(selectedDate);
  const popoverMonthLabel = formatMonthLabel(popoverMonth);
  const monthGridDays = getDaysInMonthGrid(popoverMonth);
  const today = normalizeDate(new Date());
  const maxDate = getMaxDate(today);

  // Handle window resize to update visible days count
  useEffect(() => {
    const handleResize = () => {
      setVisibleDaysCount(getVisibleDaysCount(window.innerWidth));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handlePreviousWeek = () => {
    setGridDirection('prev');
    setWindowStartDate(prev => {
      const next = addDays(prev, -visibleDaysCount);
      return normalizeDate(next) < today ? today : next;
    });
  };

  const handleNextWeek = () => {
    setGridDirection('next');
    setWindowStartDate(prev => addDays(prev, visibleDaysCount));
  };

  const handleDayClick = (date) => {
    if (isDateDisabled(date, today, maxDate)) return;
    onDateChange(formatDateValue(date));
  };

  const handleToday = () => {
    // Reset window to today and call parent callback
    setWindowStartDate(normalizeDate(new Date()));
    setPopoverMonth(getStartOfMonth(new Date()));
    setShowDatePicker(false);
    onToday();
  };

  const handleOpenPicker = () => {
    setShowDatePicker((isOpen) => {
      const nextIsOpen = !isOpen;
      if (nextIsOpen) {
        setRenderCalendar(true);
        setPopoverMonth(getStartOfMonth(selectedDate));
      }
      return nextIsOpen;
    });
  };

  const handlePopoverDateSelect = (date) => {
    if (isDateDisabled(date, today, maxDate)) return;
    onDateChange(formatDateValue(date));
    setWindowStartDate(getAlignedFiveDayBlockStart(date, today));
    setPopoverMonth(getStartOfMonth(date));
    setShowDatePicker(false);
  };

  const handlePopoverPreviousMonth = () => {
    setPopoverMonth((current) => addMonths(current, -1));
  };

  const handlePopoverNextMonth = () => {
    setPopoverMonth((current) => addMonths(current, 1));
  };

  useEffect(() => {
    if (!showDatePicker) {
      return;
    }

    const handleDocumentMouseDown = (event) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target) &&
        popoverTriggerRef.current &&
        !popoverTriggerRef.current.contains(event.target)
      ) {
        setShowDatePicker(false);
      }
    };

    const handleDocumentKeyDown = (event) => {
      if (event.key === 'Escape') {
        setShowDatePicker(false);
      }
    };

    document.addEventListener('mousedown', handleDocumentMouseDown);
    document.addEventListener('keydown', handleDocumentKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleDocumentMouseDown);
      document.removeEventListener('keydown', handleDocumentKeyDown);
    };
  }, [showDatePicker]);

  useEffect(() => {
    if (showDatePicker) {
      return;
    }

    const closeTimer = window.setTimeout(() => {
      setRenderCalendar(false);
    }, 180);

    return () => window.clearTimeout(closeTimer);
  }, [showDatePicker]);

  const formattedSelectedDate = (date) => {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  return (
    <div className="sidebar__calendar">
      <label className="calendar__label">
        Pick reservation date
      </label>

    {/* quick date select */}
      <div className="date-picker-wrapper">
        <div className="date-picker__header">
          <span className="current-month-year">{monthYear}</span>
        </div>

        <div className="quick-date-select-wrapper">
          <button
            type="button"
            className="previous-day-btn"
            aria-label={visibleDaysCount === 1 ? 'Previous day' : `Previous ${visibleDaysCount} days`}
            onClick={handlePreviousWeek}
            disabled={normalizeDate(windowStartDate) <= today}
          >
            <CaretLeft weight="bold" />
          </button>

          <div
            key={`${windowStartDate.getTime()}-${gridDirection}`}
            className={`days-grid days-grid--${gridDirection}`}
          >
            {dayWindow.map((date) => {
              const isSelected = isSameDay(date, selectedDate);
              const disabled = isDateDisabled(date, today, maxDate);

              return (
                <button
                  key={formatDateValue(date)}
                  type="button"
                  className={[
                    isSelected ? 'day-btn__selected' : 'day-btn',
                    disabled ? 'day-btn--disabled' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => handleDayClick(date)}
                  disabled={disabled}
                  aria-label={`${date.toLocaleString('default', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric',
                  })}${disabled ? ' (unavailable)' : ''}`}
                >
                  <span className="day-btn__date">{date.getDate()}</span>
                  <span className="day-btn__weekday">{getDayOfWeekName(date)}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="next-day-btn"
            aria-label={visibleDaysCount === 1 ? 'Next day' : `Next ${visibleDaysCount} days`}
            onClick={handleNextWeek}
          >
            <CaretRight weight="bold" />
          </button>
        </div>

        {/* today and full calendar buttons */}
        <div className="date-picker__footer">
            <div className="date-picker__actions">
                <button
                    type="button"
                    className="action today-btn"
                    onClick={handleToday}
                >
                    Today
                </button>
            
                <button 
                    className='action open-calendar-btn' 
                  onClick={handleOpenPicker}
                >
                    {formattedSelectedDate} Open Calendar
                </button>
            </div>

            {renderCalendar && (
              <div
                ref={popoverRef}
                className={`calendar-expanded calendar-expanded--${showDatePicker ? 'open' : 'closed'}`}
                role="dialog"
                aria-modal="true"
                aria-label="Calendar date picker"
                aria-hidden={!showDatePicker}
              >
                <div className="inline-calendar-expanded__header">
                  <button
                    type="button"
                    className="inline-calendar-expanded__nav"
                    aria-label="Previous month"
                    onClick={handlePopoverPreviousMonth}
                  >
                    <CaretLeft weight="bold" />
                  </button>
                  <span className="inline-calendar-expanded__month">{popoverMonthLabel}</span>
                  <button
                    type="button"
                    className="inline-calendar-expanded__nav"
                    aria-label="Next month"
                    onClick={handlePopoverNextMonth}
                  >
                    <CaretRight weight="bold" />
                  </button>
                </div>

                <div className="inline-calendar-expanded__grid">
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                    <span key={day}>{day}</span>
                  ))}

                  {monthGridDays.map((date) => {
                    const isCurrentMonth = date.getMonth() === popoverMonth.getMonth();
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, today);
                    const disabled = isDateDisabled(date, today, maxDate);
                    return (
                      <button
                        key={formatDateValue(date)}
                        type="button"
                        className={[
                          'inline-calendar-expanded__day',
                          isCurrentMonth ? '' : 'inline-calendar-expanded__day--outside',
                          isSelected ? 'inline-calendar-expanded__day--selected' : '',
                          isToday ? 'inline-calendar-expanded__day--today' : '',
                          disabled ? 'inline-calendar-expanded__day--disabled' : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => handlePopoverDateSelect(date)}
                        disabled={disabled}
                        aria-disabled={disabled}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
        </div>


      </div>
    </div>
    );
}