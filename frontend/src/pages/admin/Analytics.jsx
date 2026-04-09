import { useEffect, useState } from 'react';
import { getAllReservations } from '../../data/services/reservationService';

export default function Analytics() {
	const [analytics, setAnalytics] = useState(null);

	useEffect(() => {
		let active = true;

		async function loadAnalytics() {
			const reservations = await getAllReservations();
			const confirmedReservations = reservations.filter((reservation) => reservation.status === 'confirmed').length;
			const checkedInReservations = reservations.filter((reservation) => reservation.status === 'checked_in').length;

			if (!active) return;

			setAnalytics([
				{ label: 'Peak Hour', value: '10:00 AM' },
				{ label: 'Confirmed Reservations', value: String(confirmedReservations) },
				{ label: 'Checked-In Reservations', value: String(checkedInReservations) },
			]);
		}

		loadAnalytics();

		return () => {
			active = false;
		};
	}, []);

	if (!analytics) {
		return <section style={{ padding: '2rem' }}>Loading analytics...</section>;
	}

	return (
		<section style={{ padding: '2rem' }}>
			<h2>Analytics</h2>
			<p>Usage trends and capacity metrics will be expanded here.</p>
			<ul>
				{analytics.map((item) => (
					<li key={item.label}>
						{item.label}: {item.value}
					</li>
				))}
			</ul>
		</section>
	);
}
