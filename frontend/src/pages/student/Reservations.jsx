import { useEffect, useState } from 'react';
import { getCurrentUser } from '../../data/services/authService';
import { getReservationsByUser } from '../../data/services/reservationService';
import ReservationsTable from '../../features/reservations/components/ReservationsTable';

export default function Reservations() {
	const [user, setUser] = useState(null);

	useEffect(() => {
		let active = true;

		async function loadReservations() {
			const currentUser = await getCurrentUser();

			if (!active) return;

			setUser(currentUser);
		}

		loadReservations();

		return () => {
			active = false;
		};
	}, []);

	return (
		<section style={{ padding: '2rem', display: 'flex', flexDirection: 'column', height: '100%', gap: '1.5rem' }}>
			<div>
				<h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 600 }}>My Reservations</h2>
				<p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
					{user ? `Review upcoming and past bookings for ${user.name}.` : 'Review upcoming and past bookings here.'}
				</p>
			</div>

			<div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
				<ReservationsTable userRole="student" userId={user?.id} />
			</div>
		</section>
	);
}
