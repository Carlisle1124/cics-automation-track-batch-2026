import SlotIndicator from './SlotIndicator';
import './CapacityMap.css';

export default function CapacityMap() {
	// Hardcoded dummy data
	const ROOM_CAPACITY = 50;
	const OCCUPIED_COUNT = 12;
	const RESERVED_COUNT = 8;
	const VACANT_COUNT = ROOM_CAPACITY - OCCUPIED_COUNT - RESERVED_COUNT;

	// Generate dummy slots in order: occupied → reserved → vacant
	const slots = [
		// Occupied slots (red)
		...Array.from({ length: OCCUPIED_COUNT }, (_, i) => ({
			id: `slot-occupied-${i + 1}`,
			status: 'occupied',
		})),
		// Reserved slots (striped yellow)
		...Array.from({ length: RESERVED_COUNT }, (_, i) => ({
			id: `slot-reserved-${i + 1}`,
			status: 'reserved',
		})),
		// Vacant slots (gray)
		...Array.from({ length: VACANT_COUNT }, (_, i) => ({
			id: `slot-vacant-${i + 1}`,
			status: 'vacant',
		})),
	];

	return (
		<div className="capacity-map">
			<div className="capacity-map__header">
				<h3 className="capacity-map__title">Live Capacity Map</h3>
				<div className="capacity-map__meta">
					<span className="capacity-map__status-badge">ACTIVE SESSION</span>
				</div>
			</div>

			<div className="capacity-map__legend">
				<div className="capacity-map__legend-item">
					<div className="capacity-map__legend-dot capacity-map__legend-dot--vacant" />
					<span>AVAILABLE</span>
				</div>
				<div className="capacity-map__legend-item">
					<div className="capacity-map__legend-dot capacity-map__legend-dot--reserved" />
					<span>RESERVED</span>
				</div>
				<div className="capacity-map__legend-item">
					<div className="capacity-map__legend-dot capacity-map__legend-dot--occupied" />
					<span>FULL</span>
				</div>
			</div>

			<div className="capacity-map__content">
				<div className="capacity-map__grid">
					{slots.map((slot) => (
						<SlotIndicator key={slot.id} status={slot.status} slotId={slot.id} />
					))}
				</div>

				<div className="capacity-map__stats">
					<div className="capacity-map__stat">
						<span className="capacity-map__stat-label">Occupied</span>
						<span className="capacity-map__stat-value">{OCCUPIED_COUNT}</span>
					</div>
					<div className="capacity-map__stat">
						<span className="capacity-map__stat-label">Reserved</span>
						<span className="capacity-map__stat-value">{RESERVED_COUNT}</span>
					</div>
					<div className="capacity-map__stat">
						<span className="capacity-map__stat-label">Available</span>
						<span className="capacity-map__stat-value">{VACANT_COUNT}</span>
					</div>
				</div>
			</div>
		</div>
	);
}
