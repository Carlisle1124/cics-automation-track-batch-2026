import { useEffect, useMemo, useRef, useState } from 'react';
import { getAllReservations } from '../../data/services/reservationService';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import '../../features/reservations/components/ReservationsTable.css';
import './ManageReservations.css';

const FILTER_TABS = [
	{ id: 'all', label: 'All Entries' },
	{ id: 'pending', label: 'Pending' },
	{ id: 'confirmed', label: 'Confirmed' },
	{ id: 'completed', label: 'Completed' },
];

const SORT_OPTIONS = ['Latest First', 'Earliest First', 'Status A-Z'];
const ITEMS_PER_PAGE = 8;

export default function ManageReservations() {
	const [reservations, setReservations] = useState([]);
	const [activeTab, setActiveTab] = useState('all');
	const [sortBy, setSortBy] = useState('Latest First');
	const [currentPage, setCurrentPage] = useState(1);
	const [isPageLoading, setIsPageLoading] = useState(true);
	const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
	const sortMenuRef = useRef(null);

	useEffect(() => {
		const previousTitle = document.title;
		document.title = 'Reservations - UST CICS Learning Common Room';

		let active = true;

		async function loadReservations() {
			try {
				const [items] = await Promise.all([
					getAllReservations(),
					new Promise((resolve) => setTimeout(resolve, 700)),
				]);

				if (!active) return;

				setReservations(items);
			} finally {
				if (active) {
					setIsPageLoading(false);
				}
			}
		}

		loadReservations();

		return () => {
			active = false;
			document.title = previousTitle;
		};
	}, []);

	useEffect(() => {
		setCurrentPage(1);
		setIsSortMenuOpen(false);
	}, [activeTab, sortBy]);

	const filteredReservations = useMemo(() => {
		const scopedReservations = reservations.filter((reservation) => {
			if (activeTab === 'all') return true;
			return reservation.status === activeTab;
		});

		const sortedReservations = [...scopedReservations];

		if (sortBy === 'Latest First') {
			sortedReservations.sort(
				(a, b) => new Date(b.createdAt ?? b.date).getTime() - new Date(a.createdAt ?? a.date).getTime()
			);
		}

		if (sortBy === 'Earliest First') {
			sortedReservations.sort(
				(a, b) => new Date(a.createdAt ?? a.date).getTime() - new Date(b.createdAt ?? b.date).getTime()
			);
		}

		if (sortBy === 'Status A-Z') {
			sortedReservations.sort((a, b) => String(a.status ?? '').localeCompare(String(b.status ?? '')));
		}

		return sortedReservations;
	}, [reservations, activeTab, sortBy]);

	const totalItems = filteredReservations.length;
	const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
	const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
	const paginatedReservations = filteredReservations.slice(startIndex, startIndex + ITEMS_PER_PAGE);

	useEffect(() => {
		if (currentPage > totalPages) {
			setCurrentPage(totalPages);
		}
	}, [currentPage, totalPages]);

	function handleSortSelect(option) {
		setSortBy(option);
		setIsSortMenuOpen(false);
	}

	useEffect(() => {
		if (!isSortMenuOpen) return;

		function handlePointerDown(event) {
			if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
				setIsSortMenuOpen(false);
			}
		}

		function handleEscape(event) {
			if (event.key === 'Escape') {
				setIsSortMenuOpen(false);
			}
		}

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [isSortMenuOpen]);

	return (
		<section
			className={`dashboard-page admin-manage-reservations ${
				isPageLoading
					? 'admin-manage-reservations--content-hidden'
					: 'admin-manage-reservations--content-visible'
			}`}
		>
			<PageHeader
				className="admin-manage-reservations__header"
				title="Manage Reservations"
				subtitle="Review, approve, or cancel reservations here."
			/>

			<div className="reservations-table admin-manage-reservations__table-shell">
				<div className="reservations-table__header">
					<div className="reservations-table__tabs">
						{FILTER_TABS.map((tab) => (
							<button
								key={tab.id}
								type="button"
								className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
								onClick={() => setActiveTab(tab.id)}
							>
								{tab.label}
							</button>
						))}
					</div>

					<div className="reservations-table__controls">
						<div className="admin-manage-reservations__sort-control" ref={sortMenuRef}>
							<button
								type="button"
								id="admin-manage-reservations-sort-button"
								className={`admin-manage-reservations__sort-trigger ${
									isSortMenuOpen ? 'admin-manage-reservations__sort-trigger--open' : ''
								}`}
								aria-haspopup="listbox"
								aria-expanded={isSortMenuOpen}
								aria-controls="admin-manage-reservations-sort-menu"
								onClick={() => setIsSortMenuOpen((open) => !open)}
							>
								<span className="admin-manage-reservations__sort-trigger-label">{sortBy}</span>
								<span className="admin-manage-reservations__sort-trigger-icon" aria-hidden="true" />
							</button>

							{isSortMenuOpen ? (
								<div
									id="admin-manage-reservations-sort-menu"
									className="admin-manage-reservations__sort-menu"
									role="listbox"
									aria-labelledby="admin-manage-reservations-sort-button"
								>
									{SORT_OPTIONS.map((option) => (
										<button
											key={option}
											type="button"
											role="option"
											aria-selected={sortBy === option}
											className={`admin-manage-reservations__sort-option ${
												sortBy === option ? 'is-active' : ''
											}`}
											onClick={() => handleSortSelect(option)}
										>
											<span>{option}</span>
											<span className="admin-manage-reservations__sort-option-indicator" aria-hidden="true">
												{sortBy === option ? '✓' : ''}
											</span>
										</button>
									))}
								</div>
							) : null}
						</div>
					</div>
				</div>

				<div className="reservations-table__wrapper">
					<table className="reservations-table__table admin-manage-reservations__table">
						<thead>
							<tr className="table-header-row">
								<th className="table-header-cell">User</th>
								<th className="table-header-cell">Date</th>
								<th className="table-header-cell">Time</th>
								<th className="table-header-cell">Status</th>
							</tr>
						</thead>
						<tbody>
							{paginatedReservations.length > 0 ? (
								paginatedReservations.map((reservation) => (
									<tr key={reservation.id} className="table-body-row">
										<td className="table-cell">
											<div className="user-name">{reservation.user ?? reservation.userName ?? '—'}</div>
										</td>
										<td className="table-cell">
											<div className="date">{reservation.date ?? '—'}</div>
										</td>
										<td className="table-cell">
											<div className="time">
												{Array.isArray(reservation.slotIds) ? reservation.slotIds.join(', ') : '—'}
											</div>
										</td>
										<td className="table-cell">
											<span
												className={`admin-manage-reservations__status-badge admin-manage-reservations__status-badge--${String(
													reservation.status ?? 'pending'
												).replace(/_/g, '-')}`}
											>
												{reservation.status ?? 'pending'}
											</span>
										</td>
									</tr>
								))
							) : (
								<tr className="table-body-row">
									<td className="table-cell admin-manage-reservations__empty-state" colSpan={4}>
										No reservations found for the selected filter.
									</td>
								</tr>
							)}
						</tbody>
					</table>
				</div>

				<div className="reservations-table__footer">
					<div className="pagination-info">
						Displaying {paginatedReservations.length} of {totalItems} reservations
					</div>

					<div className="pagination-controls">
						<button
							type="button"
							className="pagination-btn"
							onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
							disabled={currentPage === 1}
							aria-label="Previous page"
						>
							‹
						</button>
						<button
							type="button"
							className="pagination-btn"
							onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
							disabled={currentPage === totalPages}
							aria-label="Next page"
						>
							›
						</button>
					</div>
				</div>
			</div>

			{isPageLoading ? (
				<div
					className="admin-manage-reservations-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading manage reservations page"
				>
					<div className="admin-manage-reservations-transition__card">
						<img
							src={cicsLogo}
							alt="UST CICS logo"
							className="admin-manage-reservations-transition__logo"
						/>
						<div className="admin-manage-reservations-transition__loader" aria-hidden="true">
							<span></span>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
