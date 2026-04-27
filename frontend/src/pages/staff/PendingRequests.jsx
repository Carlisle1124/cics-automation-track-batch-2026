import { useEffect, useState } from 'react';
import { getAllReservations } from '../../data/services/reservationService';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import '../../features/reservations/components/ReservationsTable.css';
import './PendingRequests.css';

export default function PendingRequests() {
	const tableHeaders = ['Request ID', 'Student', 'Date', 'Time Slot(s)', 'Actions'];
	const [pendingReservations, setPendingReservations] = useState([]);
	const [statusMessage, setStatusMessage] = useState('');
	const [isPageLoading, setIsPageLoading] = useState(true);

	useEffect(() => {
		const previousTitle = document.title;
		document.title = 'Pending Requests - UST CICS Learning Common Room';

		let active = true;

		async function loadPendingReservations() {
			try {
				const [reservations] = await Promise.all([
					getAllReservations(),
					new Promise((resolve) => setTimeout(resolve, 700)),
				]);

				if (!active) return;

				setPendingReservations(
					reservations.filter((reservation) => reservation.status === 'pending')
				);
			} finally {
				if (active) {
					setIsPageLoading(false);
				}
			}
		}

		loadPendingReservations();

		return () => {
			active = false;
			document.title = previousTitle;
		};
	}, []);

	function handleAction(action, reservationId) {
		setStatusMessage(`${action} queued for ${reservationId}.`);
		// TODO(backend): Replace this local message with a PATCH call
		// to /api/reservations/:id to approve/decline/reschedule pending requests.
	}

	return (
		<section
			className={`dashboard-page pending-requests-page ${
				isPageLoading
					? 'pending-requests-page--content-hidden'
					: 'pending-requests-page--content-visible'
			}`}
		>
			<PageHeader
				className="pending-requests-page__header"
				title="Pending Requests"
				subtitle="Approve or decline requests submitted by students."
			/>
			<div className="reservations-table pending-requests-page__table-shell">
				<div className="reservations-table__header">
					<div className="pending-requests-page__queue-copy">
						<div className="pending-requests-page__queue-label">
							Pending Queue
						</div>
						<div className="pending-requests-page__queue-description">
							{statusMessage || 'Review, approve, or decline requests submitted by students.'}
						</div>
					</div>
					<div className="reservations-table__controls">
						<div className="pending-requests-page__count">
							{pendingReservations.length} request{pendingReservations.length === 1 ? '' : 's'} pending
						</div>
					</div>
				</div>

				<div className="reservations-table__wrapper">
					<table className="reservations-table__table">
						<thead>
							<tr className="table-header-row">
								{tableHeaders.map((header) => (
									<th key={header} className="table-header-cell">
										{header.toUpperCase()}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{pendingReservations.map((reservation) => (
								<tr key={reservation.id} className="table-body-row">
									<td className="table-cell">
										<div className="user-name">{reservation.id}</div>
									</td>
									<td className="table-cell">
										<div className="user-name">{reservation.userName}</div>
									</td>
									<td className="table-cell">
										<div className="date">{reservation.date}</div>
									</td>
									<td className="table-cell">
										<div className="time">{reservation.slotIds.join(', ')}</div>
									</td>
									<td className="table-cell">
										<div className="pending-requests__actions">
											<button type="button" className="pending-requests__action-btn" onClick={() => handleAction('Approve', reservation.id)}>
												Approve
											</button>
											<button type="button" className="pending-requests__action-btn" onClick={() => handleAction('Decline', reservation.id)}>
												Decline
											</button>
										</div>
									</td>
								</tr>
							))}
							{pendingReservations.length === 0 ? (
								<tr className="table-body-row">
									<td className="table-cell" colSpan={tableHeaders.length}>
										No pending requests right now.
									</td>
								</tr>
							) : null}
						</tbody>
					</table>
				</div>

				<div className="reservations-table__footer">
					<div className="pagination-info">
						Displaying {pendingReservations.length} pending request{pendingReservations.length === 1 ? '' : 's'}
					</div>
					<div className="pagination-controls">
						<button
							type="button"
							className="pagination-btn"
							disabled
							aria-label="Previous page"
						>
							‹
						</button>
						<button
							type="button"
							className="pagination-btn"
							disabled
							aria-label="Next page"
						>
							›
						</button>
					</div>
				</div>
			</div>

			{isPageLoading ? (
				<div
					className="pending-requests-page-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading pending requests page"
				>
					<div className="pending-requests-page-transition__card">
						<img
							src={cicsLogo}
							alt="UST CICS logo"
							className="pending-requests-page-transition__logo"
						/>
						<div className="pending-requests-page-transition__loader" aria-hidden="true">
							<span></span>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
