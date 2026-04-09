import './SlotIndicator.css';

export default function SlotIndicator({ status = 'vacant', slotId }) {
	return (
		<div 
			className={`slot-indicator slot-indicator--${status}`} 
			title={`Slot ${slotId}: ${status}`}
		/>
	);
}