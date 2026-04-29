import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../../../data/supabaseClient';
import SlotIndicator from './SlotIndicator';
import './CapacityMap.css';

const ROOM_CAPACITY = 50;
const OPERATING_START_HOUR = 8; // 08:00
const OPERATING_END_HOUR = 17; // 17:00

export default function CapacityMap() {
	const [occupiedCount, setOccupiedCount] = useState(0);
	const [reservedCount, setReservedCount] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [mapTitle, setMapTitle] = useState('Live Capacity Map');
	const [targetDate, setTargetDate] = useState('');

	const loadCapacity = useCallback(async (dateStr) => {
		setIsLoading(true);
		setError(null);

		try {
			const { data: reservations, error: fetchError } = await supabase
				.from('reservations')
				.select('id, start_time, end_time, status')
				.eq('reservation_date', dateStr)
				.in('status', ['approved', 'checked_in']);

			if (fetchError) throw fetchError;

			// Filter by operating hours (08:00:00 to 17:00:00)
			const filteredReservations = (reservations ?? []).filter((r) => {
				const startTime = r.start_time || '00:00:00';
				const endTime = r.end_time || '00:00:00';
				// Include if reservation overlaps with operating hours
				return startTime < '17:00:00' && endTime > '08:00:00';
			});

			const approvedCount = filteredReservations.filter((r) => r.status === 'approved').length;
			const checkedInCount = filteredReservations.filter((r) => r.status === 'checked_in').length;

			setReservedCount(approvedCount);
			setOccupiedCount(checkedInCount);
		} catch (err) {
			setError(err?.message ?? 'Failed to load capacity data');
		} finally {
			setIsLoading(false);
		}
	}, []);

	// Determine which date to display based on current time
	useEffect(() => {
		const now = new Date();
		const currentHour = now.getHours();
		const isWithinOperatingHours = currentHour >= OPERATING_START_HOUR && currentHour < OPERATING_END_HOUR;

		let dateToUse;
		let title;

		if (isWithinOperatingHours) {
			// Within operating hours, show today
			dateToUse = now.toISOString().slice(0, 10);
			title = 'Live Capacity Map';
		} else {
			// Outside operating hours, show tomorrow
			const tomorrow = new Date(now);
			tomorrow.setDate(tomorrow.getDate() + 1);
			dateToUse = tomorrow.toISOString().slice(0, 10);
			const formattedDate = tomorrow.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
			title = `Capacity Map for ${formattedDate}`;
		}

		setTargetDate(dateToUse);
		setMapTitle(title);
		loadCapacity(dateToUse);
	}, [loadCapacity]);

	// Real-time subscription to reservations changes
	useEffect(() => {
		if (!targetDate) return;

		const channel = supabase
			.channel(`capacity-${targetDate}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'reservations',
					filter: `reservation_date=eq.${targetDate}`,
				},
				() => loadCapacity(targetDate)
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [targetDate, loadCapacity]);

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
				<h3 className="capacity-map__title">{mapTitle}</h3>

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
