import { useState } from 'react';
import SlotsBreakdown from '../../features/availability/components/SlotsBreakdown';
import PageHeader from '../../shared/components/PageHeader';

export default function Schedule() {
	const [selectedSlot, setSelectedSlot] = useState(null);

	const handleSlotSelect = (slotId) => {
		setSelectedSlot(slotId);
	};

	return (
		<section style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
			<PageHeader
				title="Schedule"
				subtitle="Browse available time slots and reserve a spot for today."
			/>

			<div style={{ flex: 1, minHeight: 0, overflow: 'hidden', overflowY: 'auto' }}>
				<SlotsBreakdown onSlotSelect={handleSlotSelect} />
			</div>
		</section>
	);
}
