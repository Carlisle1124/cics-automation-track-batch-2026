import { useEffect, useState } from 'react';
import { getAllReservations } from '../../data/services/reservationService';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import '../../features/reservations/components/ReservationsTable.css';
import './PendingRequests.css';

// Mock reservations for development / demo purposes
const MOCK_PENDING_RESERVATIONS = [
	{
		id: 'REQ-1001',
		userName: 'Ana Lopez',
		date: '2026-05-04',
		slotIds: ['09:00AM-10:00AM'],
		status: 'pending',
	},
	{
		id: 'REQ-1002',
		userName: 'Mark Reyes',
		date: '2026-05-06',
		slotIds: ['1:00PM-2:00PM'],
		status: 'pending',
	},
	{
		id: 'REQ-1003',
		userName: 'Sofia Cruz',
		date: '2026-05-08',
		slotIds: ['3:00PM-5:00PM'],
		status: 'pending',
	},
];

const CARD_DATE_FORMATTER = new Intl.DateTimeFormat('en-US', {
	weekday: 'short',
	month: 'short',
	day: 'numeric',
});

export default function PendingRequests() {
	const resolvedTableHeaders = ['Request ID', 'Student', 'Date', 'Time Slot(s)', 'Status'];
	const mockRecentlyResolved = [
		{
			id: 'RES-2001',
			userName: 'Diane Santos',
			date: '2026-04-30',
			slotIds: ['9:00AM-10:00AM'],
			status: 'approved',
		},
		{
			id: 'RES-2002',
			userName: 'James Cruz',
			date: '2026-04-29',
			slotIds: ['2:00PM-3:00PM'],
			status: 'declined',
		},
	];
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

	function parseReservationDate(dateValue) {
		if (!dateValue) return null;

		const isoDateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue));
		if (isoDateOnlyMatch) {
			const [, year, month, day] = isoDateOnlyMatch;
			return new Date(Number(year), Number(month) - 1, Number(day));
		}

		const parsedDate = new Date(dateValue);
		if (Number.isNaN(parsedDate.getTime())) return null;

		return new Date(
			parsedDate.getFullYear(),
			parsedDate.getMonth(),
			parsedDate.getDate()
		);
	}

	function formatReservationDate(dateValue) {
		const parsedDate = parseReservationDate(dateValue);
		if (!parsedDate) return String(dateValue ?? '');
		return CARD_DATE_FORMATTER.format(parsedDate);
	}

	function getRelativeDayMeta(dateValue) {
		const parsedDate = parseReservationDate(dateValue);
		if (!parsedDate) {
			return { label: 'Date unavailable', tone: 'neutral' };
		}

		const today = new Date();
		const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
		const millisecondsPerDay = 24 * 60 * 60 * 1000;
		const dayDifference = Math.round((parsedDate - todayStart) / millisecondsPerDay);

		if (dayDifference === 0) return { label: 'Today', tone: 'today' };
		if (dayDifference === 1) return { label: 'Tomorrow', tone: 'tomorrow' };
		if (dayDifference > 1) return { label: `In ${dayDifference} days`, tone: 'future' };
		if (dayDifference === -1) return { label: 'Yesterday', tone: 'past' };

		return { label: `${Math.abs(dayDifference)} days ago`, tone: 'past' };
	}

	// Use mock data for preview when actual pendingReservations is empty
	const useMockWhenEmpty = true;
	const displayReservations = (pendingReservations.length === 0 && useMockWhenEmpty)
		? MOCK_PENDING_RESERVATIONS
		: pendingReservations;
	const recentlyResolvedReservations = mockRecentlyResolved;

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

			<div className="pending-requests__cards-shell">
				<div className="pending-requests__section-header">
					<div className="pending-requests__section-copy">
						<div className="pending-requests__section-label">Pending Queue</div>
						<div className="pending-requests__section-description">
							{statusMessage || 'Review, approve, or decline requests submitted by students.'}
						</div>
					</div>
					<div className="pending-requests__section-controls">
						<div className="pending-requests__section-count">
							{displayReservations.length} request{displayReservations.length === 1 ? '' : 's'} pending
						</div>
					</div>
				</div>

				<div className="pending-requests__card-list">
					{displayReservations.length === 0 ? (
						<div className="pending-requests__empty">
							No pending requests right now.
						</div>
					) : (
						displayReservations.map((reservation) => {
							const relativeDay = getRelativeDayMeta(reservation.date);

							return (
							<div key={reservation.id} className="pending-requests__card">
								<div className="pending-requests__card-content">
									<div className="pending-requests__card-row">
										<div className="pending-requests__card-label">Request ID</div>
										<div className="pending-requests__card-value id">{reservation.id}</div>
									</div>
									<div className="pending-requests__card-row">
										<div className="pending-requests__card-label">Student</div>
										<div className="pending-requests__card-value name">{reservation.userName}</div>
									</div>
									<div className="pending-requests__card-row">
										<div className="pending-requests__card-label">Date</div>
										<div className="pending-requests__card-date">
											<div className="pending-requests__card-value date">
												{formatReservationDate(reservation.date)}
											</div>
											<span
												className={`pending-requests__date-helper pending-requests__date-helper--${relativeDay.tone}`}
											>
												{relativeDay.label}
											</span>
										</div>
									</div>
									<div className="pending-requests__card-row">
										<div className="pending-requests__card-label">Time Slots</div>
										<div className="pending-requests__card-value">{reservation.slotIds.join(', ')}</div>
									</div>
								</div>
								<div className="pending-requests__card-actions">
									<button type="button" className="pending-requests__action-btn pending-requests__action-btn--approve" onClick={() => handleAction('Approve', reservation.id)}>
										Approve
									</button>
									<button type="button" className="pending-requests__action-btn pending-requests__action-btn--decline" onClick={() => handleAction('Decline', reservation.id)}>
										Decline
									</button>
								</div>
							</div>
							);
						})
					)}
				</div>
			</div>

			<div className="reservations-table pending-requests-page__table-shell">
				<div className="reservations-table__header">
					<div className="pending-requests__section-copy">
						<div className="pending-requests__section-label">Recently Resolved</div>
						<div className="pending-requests__section-description">
							Latest approved or declined requests.
						</div>
					</div>
					<div className="pending-requests__section-controls">
						<div className="pending-requests__section-count">
							{recentlyResolvedReservations.length} request{recentlyResolvedReservations.length === 1 ? '' : 's'} resolved
						</div>
					</div>
				</div>

				<div className="reservations-table__wrapper">
					<table className="reservations-table__table">
						<thead>
							<tr className="table-header-row">
								{resolvedTableHeaders.map((header) => (
									<th key={header} className="table-header-cell">
										{header.toUpperCase()}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{recentlyResolvedReservations.length === 0 ? (
								<tr className="table-body-row">
									<td className="table-cell" colSpan={resolvedTableHeaders.length}>
										No recently resolved reservations.
									</td>
								</tr>
							) : (
								recentlyResolvedReservations.map((reservation) => (
									<tr key={reservation.id} className="table-body-row">
										<td className="table-cell">{reservation.id}</td>
										<td className="table-cell">{reservation.userName}</td>
										<td className="table-cell">{reservation.date}</td>
										<td className="table-cell">{reservation.slotIds.join(', ')}</td>
										<td className="table-cell">
											<span
												className={`pending-requests__resolved-status pending-requests__resolved-status--${reservation.status}`}
											>
												{reservation.status}
											</span>
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>

				<div className="reservations-table__footer">
					<div className="pagination-info">
						Displaying {recentlyResolvedReservations.length} resolved request{recentlyResolvedReservations.length === 1 ? '' : 's'}
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
