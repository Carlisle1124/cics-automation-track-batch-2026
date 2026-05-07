import { useState } from 'react';
import SlotsBreakdown from '../../features/availability/components/SlotsBreakdown';
import PageHeader from '../../shared/components/PageHeader';
import './Schedule.css';

export default function Schedule() {
	const [selectedSlot, setSelectedSlot] = useState(null);

	const handleSlotSelect = (slotId) => {
		setSelectedSlot(slotId);
	};

	return (
		<section className="dashboard-page schedule-page">
			<div className='schedule-page__header'>
				<PageHeader
					className="page-header--sticky"
					title="Schedule"
					subtitle="Browse available time slots and reserve a spot for today."
				/>

				<div className="booking-rules" padding="lg" elevated>
					<div style={{ marginBottom: '1.5rem' }}>
						<h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Booking Rules</h3>
					</div>

					<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
						<div>
							<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-inverse)', opacity: '0.7', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Reservation Hours</span>
							<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-inverse)' }}>08:00 AM - 05:00 PM</span>
						</div>
						<div>
							<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-inverse)', opacity: '0.7', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Max Stay</span>
							<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-inverse)' }}>3 hours</span>
						</div>
						<div>
							<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-inverse)', opacity: '0.7', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Grace Period</span>
							<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-inverse)' }}>15 minutes</span>
						</div>
						<div>
							<span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-inverse)', opacity: '0.7', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Occupancy Length</span>
							<span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-inverse)' }}>1 hour (Hourly Basis)</span>
						</div>
					</div>
				</div>
			</div>

			<div className="schedule-page__content">
				<SlotsBreakdown onSlotSelect={handleSlotSelect} />
			</div>
		</section>
	);
}
