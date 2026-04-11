import { useEffect, useState } from 'react';
import { getCurrentUser } from '../../data/services/authService';
import { getReservationsByUser } from '../../data/services/reservationService';
import ReservationsTable from '../../features/reservations/components/ReservationsTable';
import PageHeader from '../../shared/components/PageHeader';

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
			<PageHeader
				title="My Reservations"
				subtitle={user ? `Review upcoming and past bookings for ${user.name}.` : 'Review upcoming and past bookings here.'}
			/>

			<div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
				<ReservationsTable userRole="student" userId={user?.id} />
			</div>
		</section>
	);
}
