import { useEffect, useState } from 'react';
import { supabase } from '../../../data/supabaseClient';
import SlotIndicator from './SlotIndicator';
import './CapacityMap.css';

const ROOM_CAPACITY = 50;

export default function CapacityMap() {
	const [occupiedCount, setOccupiedCount] = useState(0);
	const [reservedCount, setReservedCount] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		async function loadCapacity() {
			setIsLoading(true);
			setError(null);

			try {
				const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format

				const { count: approvedCount, error: approvedError } = await supabase
					.from('reservations')
					.select('*', { count: 'exact', head: true })
					.eq('status', 'approved')
					.eq('reservation_date', today);

				if (approvedError) throw approvedError;

				const { count: checkedInCount, error: checkedInError } = await supabase
					.from('reservations')
					.select('*', { count: 'exact', head: true })
					.eq('status', 'checked_in')
					.eq('reservation_date', today);

				if (checkedInError) throw checkedInError;

				setReservedCount(Number(approvedCount ?? 0));
				setOccupiedCount(Number(checkedInCount ?? 0));
			} catch (err) {
				setError(err?.message ?? 'Failed to load capacity data');
			} finally {
				setIsLoading(false);
			}
		}

		loadCapacity();
	}, []);

	const vacantCount = Math.max(ROOM_CAPACITY - occupiedCount - reservedCount, 0);

	const slots = [
		...Array.from({ length: occupiedCount }, (_, i) => ({
			id: `slot-occupied-${i + 1}`,
			status: 'occupied',
		})),
		...Array.from({ length: reservedCount }, (_, i) => ({
			id: `slot-reserved-${i + 1}`,
			status: 'reserved',
		})),
		...Array.from({ length: vacantCount }, (_, i) => ({
			id: `slot-vacant-${i + 1}`,
			status: 'vacant',
		})),
	];

	return (
		<div className="capacity-map">
			<div className="capacity-map__header">
				<h3 className="capacity-map__title">Live Capacity Map</h3>

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
			</div>

			<div className="capacity-map__content">
				{error ? (
					<div className="capacity-map__error">{error}</div>
				) : (
					<>
						<div className="capacity-map__grid">
							{isLoading
								? Array.from({ length: ROOM_CAPACITY }, (_, i) => (
									<SlotIndicator key={`loading-slot-${i}`} status="vacant" slotId={`loading-slot-${i}`} />
								))
								: slots.map((slot) => (
									<SlotIndicator key={slot.id} status={slot.status} slotId={slot.id} />
								))}
						</div>

						<div className="capacity-map__stats">
							<div className="capacity-map__stat">
								<span className="capacity-map__stat-label">Occupied</span>
								<span className="capacity-map__stat-value">{occupiedCount}</span>
							</div>
							<div className="capacity-map__stat">
								<span className="capacity-map__stat-label">Reserved</span>
								<span className="capacity-map__stat-value">{reservedCount}</span>
							</div>
							<div className="capacity-map__stat">
								<span className="capacity-map__stat-label">Available</span>
								<span className="capacity-map__stat-value">{vacantCount}</span>
							</div>
						</div>
					</>
				)}
			</div>
		</div>
	);
}
