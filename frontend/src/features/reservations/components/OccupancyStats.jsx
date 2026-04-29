import './OccupancyStats.css';
import { CalendarBlankIcon } from '@phosphor-icons/react';
import { formatDate } from '../../../shared/utils/datetime';

export default function OccupancyStats({ slots, availableSlots, selectedDate }) {
  const dateToDisplay = selectedDate ?? new Date();

  return (
    <div className="occupancy-stats-wrapper">
      <div className="current-date-display">
        <div className="current-date-display__icon">
          <CalendarBlankIcon weight='duotone' />
        </div>
        <div className="current-date-display__value">{formatDate(dateToDisplay)}</div>
      </div>

      <div className="occupancy-stats">
            <div className="occupancy-stats__item-slots">
            <span className="occupancy-stats__slots-value">{slots.length}</span>
            <span className="occupancy-stats__slots-label">Slots</span>
            </div>
        
            <div className="occupancy-stats__item">
          <div className="occupancy-stats__legend-dot occupancy-stats__legend-dot--vacant" />
            <span className="occupancy-stats__value">{availableSlots}</span>
            <span className="occupancy-stats__label">Available</span>
            </div>
        

        
            <div className="occupancy-stats__item">
            <div className="occupancy-stats__legend-dot occupancy-stats__legend-dot--reserved" />
            <span className="occupancy-stats__value">{slots.filter((s) => s.status === 'busy').length}</span>
            <span className="occupancy-stats__label">Limited</span>
            </div>
        
        
        
            <div className="occupancy-stats__item">
          <div className="occupancy-stats__legend-dot occupancy-stats__legend-dot--occupied" />
            <span className="occupancy-stats__value">{slots.filter((s) => s.status === 'full').length}</span>
            <span className="occupancy-stats__label">Full</span>
            </div>
        
      </div>
    </div>
  );
}