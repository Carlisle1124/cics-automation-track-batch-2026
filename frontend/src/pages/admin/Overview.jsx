import { useEffect, useState } from 'react';
import { getUsers } from '../../data/services/authService';
import { getAllReservations } from '../../data/services/reservationService';

export default function Overview() {
	const [metrics, setMetrics] = useState(null);

	useEffect(() => {
		let active = true;

		async function loadMetrics() {
			const [users, reservations] = await Promise.all([getUsers(), getAllReservations()]);
			const activeCheckIns = reservations.filter((reservation) => reservation.status === 'checked_in').length;
			const availableSlots = reservations.filter((reservation) => reservation.status === 'confirmed').length;

			if (!active) return;

			setMetrics([
				{ label: 'Total Users', value: String(users.length) },
				{ label: 'Total Reservations', value: String(reservations.length) },
				{ label: 'Active Check-ins', value: String(activeCheckIns) },
				{ label: 'Confirmed Reservations', value: String(availableSlots) },
			]);
		}

		loadMetrics();

		return () => {
			active = false;
		};
	}, []);

	if (!metrics) {
		return <section style={{ padding: '2rem' }}>Loading admin overview...</section>;
	}

	return (
		<section style={{ padding: '2rem' }}>
			<h2>Admin Overview</h2>
			<p>High-level operational snapshot for the learning commons.</p>
			<div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', marginTop: '1.5rem' }}>
				{metrics.map((metric) => (
					<article key={metric.label}>
						<strong>{metric.label}</strong>
						<p>{metric.value}</p>
					</article>
				))}
			</div>
		</section>
	);
}
