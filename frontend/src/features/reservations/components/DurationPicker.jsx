import { useState } from 'react';
import { Minus, Plus } from '@phosphor-icons/react';
import './DurationPicker.css';

export default function DurationPicker({
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
      if (!isPast) {
        onSlotClick(slotId);
      }
    }
  };

  return (
    <div className="slots-breakdown__duration-picker">
        <span className="duration-picker__label">Duration</span>
        <div className="duration-picker__wrapper">
          <button
            type="button"
            className="minus-btn"
            onClick={() => onDurationChange?.(Math.max(1, holdDuration - 1))}
            disabled={holdDuration <= 1 || !!activeHold}
          >
            <Minus weight="bold" />
          </button>

          <div className="duration-picker">
            <div
              className="duration-picker__progress"
              style={{ width: `${(holdDuration / 3) * 100}%` }}
            >
              <span className="duration-picker__value">
                {holdDuration} hr{holdDuration > 1 ? 's' : ''}
              </span>
            </div>

            <div className="duration-picker__segments">
              {[1, 2, 3].map((h) => (
                <div
                  key={h}
                  className="duration-picker__segment"
                  data-selected={h <= holdDuration}
                  onClick={() => !activeHold && onDurationChange?.(h)}
                >
                  <span className="duration-picker__segment-label">
                    {h} hr{h > 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
            
          <button
            type="button"
            className="plus-btn"
            onClick={() => onDurationChange?.(Math.min(3, holdDuration + 1))}
            disabled={holdDuration >= 3 || !!activeHold}
          >
            <Plus weight="bold" />
          </button>
        </div>
      </div>
  );
}