import { useState } from 'react';
import { Minus, Plus } from '@phosphor-icons/react';
import './TimelinePanel.css';
import { CheckFatIcon } from '@phosphor-icons/react';
import { isSlotDisabledByDuration } from '../../../data/services/reservationService';

export default function TimelinePanel({
  slots = [],
  selectedSlotId = null,
  hoveredSlotId: initialHoveredSlotId = null,
  loading = false,
  isSelectedDateToday = false,
  isSelectedDateInPast = false,
  currentTimeTop = '0%',
  currentHour = 0,
  activeHold = null,
  holdDuration = 1,
  closingTime = '17:00',
  onSlotClick = () => {},
  onHoveredSlotChange = () => {},
  onDurationChange = () => {},
  getStatusInfo = () => ({}),
  getCapacityPercent = () => 0,
  now = new Date(),
}) {
  const [hoveredSlotId, setHoveredSlotId] = useState(initialHoveredSlotId);

  const handleMouseEnter = (slotId) => {
    setHoveredSlotId(slotId);
    onHoveredSlotChange?.(slotId);
  };

  const handleMouseLeave = () => {
    setHoveredSlotId(null);
    onHoveredSlotChange?.(null);
  };

  const handleSlotSelect = (slotId) => {
    const slot = slots.find((s) => s.id === slotId);
    if (slot) {
      const slotHour = parseInt(slot.start.split(':')[0], 10);
      const isPast =
        isSelectedDateInPast ||
        (isSelectedDateToday &&
          (slotHour < currentHour ||
            (slotHour === currentHour && now.getMinutes() > 0)));
      
      // Check if slot is disabled due to duration exceeding closing time
      const isDisabledByDuration = isSlotDisabledByDuration({
        slotStartTime: slot.start,
        durationHours: holdDuration,
        closingTime,
      });
      
      if (!isPast && !isDisabledByDuration) {
        onSlotClick(slotId);
      }
    }
  };

  return (
    <div className="slots-breakdown__timeline-scroll">
    <div className="slots-breakdown__timeline">
        <div className="timeline__container">
        {isSelectedDateToday && (
            <div
            className="timeline__current-time"
            style={{ top: currentTimeTop }}
            >
            <div className="current-time__line" />
            <div className="current-time__dot" />
            <div className="current-time__label">
                {now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                })}
            </div>
            </div>
        )}

        {loading && slots.length === 0 && (
            <div
            style={{
                padding: '2rem',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.875rem',
            }}
            >
            Loading availability...
            </div>
        )}

        {slots.map((slot) => {
            const statusInfo = getStatusInfo(slot.status);
            const capacityPercent = getCapacityPercent(
            slot.reserved,
            slot.capacity
            );
            const isSelected = selectedSlotId === slot.id;
            const isHovered = hoveredSlotId === slot.id;
            const statusClassName = slot.status
            ? `timeline__slot--${slot.status}`
            : '';
            const slotHour = parseInt(slot.start.split(':')[0], 10);
            const isPast =
            isSelectedDateInPast ||
            (isSelectedDateToday &&
                (slotHour < currentHour ||
                (slotHour === currentHour && now.getMinutes() > 0)));

            // Check if slot is disabled due to duration exceeding closing time
            const isDisabledByDuration = isSlotDisabledByDuration({
              slotStartTime: slot.start,
              durationHours: holdDuration,
              closingTime,
            });

            return (
            <div key={slot.id} className='timeline-slot__wrapper'>
                <div
                    
                    className={`timeline__slot 
                        ${ isSelected ? 'timeline__slot--selected' 
                            : ''
                        } 
                        ${ isHovered ? 'timeline__slot--hovered' 
                            : ''
                        } 
                        ${ isPast ? 'timeline__slot--past' 
                            : ''
                        }
                        ${ isDisabledByDuration ? 'timeline__slot--disabled-duration' 
                            : ''
                        }
                        ${statusClassName}
                    }`}
                    onMouseEnter={() => handleMouseEnter(slot.id)}
                    onMouseLeave={handleMouseLeave}
                    onClick={() => !isPast && !isDisabledByDuration && handleSlotSelect(slot.id)}
                    role="button"
                    tabIndex={isPast || isDisabledByDuration ? -1 : 0}
                    onKeyDown={(e) => {
                    if (!isPast && !isDisabledByDuration && (e.key === 'Enter' || e.key === ' '))
                        handleSlotSelect(slot.id);
                    }}
                    title={isDisabledByDuration ? 'Not enough time remaining for selected duration' : ''}
                >
                    <div className="timeline__slot-time">
                    {slot.hour}
                    {isSelectedDateInPast && ' ✕'}
                    </div>
                    <div className="timeline__slot-content">
                        <div className="timeline__slot-body">
                            <div
                                className={`slot-card__status ${
                                    statusInfo.className || ''
                                }`}
                                >
                                <span className="slot-card__status-icon">
                                    {statusInfo.icon}
                                </span>
                                <span className="slot-card__status-label">
                                    {statusInfo.label}
                                </span>
                            </div>

                            <div className="timeline__capacity-bar">
                                <div
                                className={`capacity-bar__fill capacity-bar__fill--${slot.status}`}
                                style={{ width: `${capacityPercent}%` }}
                                />
                            </div>
                        </div>

                    <div className="timeline__availability">
                    {slot.available} slots
                    </div>
                    
                    <div
                        className={`timeline__slot-checkmark ${
                        isSelected ? 'timeline__slot-checkmark--visible' : ''
                        } ${statusClassName}`} 
                    >
                        <CheckFatIcon weight="fill" />
                    </div>
                    </div>
                </div>
            </div>
            );
        })}
        </div>
    </div>
    </div>
  );
}