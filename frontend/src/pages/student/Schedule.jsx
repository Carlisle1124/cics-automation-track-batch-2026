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
			<PageHeader
				className="page-header--student-sticky"
				title="Schedule"
				subtitle="Browse available time slots and reserve a spot for today."
			/>

			<SlotsBreakdown onSlotSelect={handleSlotSelect} />
		</section>
	);
}
