import { useEffect, useState } from 'react';
import { getAllReservations } from '../../data/services/reservationService';

export default function PendingRequests() {
	const tableHeaders = ['Request ID', 'Student', 'Date', 'Time Slot(s)', 'Actions'];
	const [pendingReservations, setPendingReservations] = useState([]);
	const [statusMessage, setStatusMessage] = useState('');

	useEffect(() => {
		let active = true;

		async function loadPendingReservations() {
			const reservations = await getAllReservations();

			if (!active) return;

			setPendingReservations(
				reservations.filter((reservation) => reservation.status === 'pending')
			);
		}

		loadPendingReservations();

		return () => {
			active = false;
		};
	}, []);

	function handleAction(action, reservationId) {
		setStatusMessage(`${action} queued for ${reservationId}.`);
		// TODO(backend): Replace this local message with a PATCH call
		// to /api/reservations/:id to approve/decline/reschedule pending requests.
	}

	return (
		<section style={{ padding: '2rem' }}>
			<h2>Pending Requests</h2>
			<p>Approve, decline, or reschedule requests submitted by students.</p>
			{statusMessage ? <p>{statusMessage}</p> : null}
			<table>
				<thead>
					<tr>
						{tableHeaders.map((header) => (
							<th key={header}>{header}</th>
						))}
					</tr>
				</thead>
				<tbody>
					{pendingReservations.map((reservation) => (
						<tr key={reservation.id}>
							<td>{reservation.id}</td>
							<td>{reservation.userName}</td>
							<td>{reservation.date}</td>
							<td>{reservation.slotIds.join(', ')}</td>
							<td style={{ display: 'flex', gap: '0.5rem' }}>
								<button
									type="button"
									onClick={() => handleAction('Approve', reservation.id)}
								>
									Approve
								</button>
								<button
									type="button"
									onClick={() => handleAction('Decline', reservation.id)}
								>
									Decline
								</button>
								<button
									type="button"
									onClick={() => handleAction('Reschedule', reservation.id)}
								>
									Reschedule
								</button>
							</td>
						</tr>
					))}
					{pendingReservations.length === 0 ? (
						<tr>
							<td colSpan={tableHeaders.length}>No pending requests right now.</td>
						</tr>
					) : null}
				</tbody>
			</table>
		</section>
	);
}
