import { useEffect, useState } from 'react';
import { getAllReservations } from '../../data/services/reservationService';

export default function ManageReservations() {
	const [reservations, setReservations] = useState([]);

	useEffect(() => {
		let active = true;

		async function loadReservations() {
			const items = await getAllReservations();

			if (!active) return;

			setReservations(items);
		}

		loadReservations();

		return () => {
			active = false;
		};
	}, []);

	return (
		<section style={{ padding: '2rem' }}>
			<h2>Manage Reservations</h2>
			<p>Review, approve, or cancel reservations here.</p>
			<table>
				<thead>
					<tr>
						<th>User</th>
						<th>Date</th>
						<th>Time</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{reservations.map((reservation) => (
						<tr key={reservation.id}>
							<td>{reservation.user}</td>
							<td>{reservation.date}</td>
							<td>{reservation.slotIds.join(', ')}</td>
							<td>{reservation.status}</td>
						</tr>
					))}
				</tbody>
			</table>
		</section>
	);
}
