import { useState } from 'react';
import SlotsBreakdown from '../../features/availability/components/SlotsBreakdown';

export default function Schedule() {
	const [selectedSlot, setSelectedSlot] = useState(null);

	const handleSlotSelect = (slotId) => {
		setSelectedSlot(slotId);
	};

	return (
		<section style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
			<div>
				<h1 style={{ margin: '0 0 0.5rem 0', fontSize: '1.75rem', fontWeight: 600 }}>Schedule</h1>
				<p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
					Browse available time slots and reserve a spot for today.
				</p>
			</div>

			<div style={{ flex: 1, minHeight: 0, overflow: 'hidden', overflowY: 'auto' }}>
				<SlotsBreakdown onSlotSelect={handleSlotSelect} />
			</div>
		</section>
	);
}
