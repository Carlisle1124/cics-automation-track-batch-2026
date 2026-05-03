import { useEffect, useState } from 'react';
import { getCurrentUser } from '../../data/services/authService';
import ReservationsTable from '../../features/reservations/components/ReservationsTable';
import {
  FILTER_TABS,
  ITEMS_PER_PAGE,
  SORT_OPTIONS,
  filterByTab,
  formatStatusValue,
  getDuration,
  getReservationDate,
  safeDate,
  statusBadgeClass,
  toDisplayDate,
  toDisplayTime,
} from '../../features/reservations/services/reservationsConfig';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import './Reservations.css';

import { TableIcon, SquaresFourIcon } from '@phosphor-icons/react';

export {
  FILTER_TABS,
  ITEMS_PER_PAGE,
  SORT_OPTIONS,
  filterByTab,
  formatStatusValue,
  getDuration,
  getReservationDate,
  safeDate,
  statusBadgeClass,
  toDisplayDate,
  toDisplayTime,
};

export default function Reservations() {
	const [user, setUser] = useState(null);
	const [isPageLoading, setIsPageLoading] = useState(true);
	const [viewMode, setViewMode] = useState('table');

	useEffect(() => {
		const previousTitle = document.title;
		document.title = 'Reservations - UST CICS Learning Common Room';

		let active = true;

		async function loadReservations() {
			try {
				const [currentUser] = await Promise.all([
					getCurrentUser(),
					new Promise((resolve) => setTimeout(resolve, 700)),
				]);

				if (!active) return;

				setUser(currentUser);
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

	return (
		<section
			className={`dashboard-page student-reservations ${
				isPageLoading
					? 'student-reservations--content-hidden'
					: 'student-reservations--content-visible'
			}`}
		>
			<PageHeader
				className="page-header--student-sticky"
				title="My Reservations"
				subtitle={user ? `Review upcoming and past bookings for ${user.full_name}.` : 'Review upcoming and past bookings here.'}
			/>

			<div className="student-reservations__toggle-view">
				<button
					type="button"
					className={`student-reservations__view-toggle ${viewMode === 'table' ? 'student-reservations__view-toggle--active' : ''}`}
					aria-pressed={viewMode === 'table'}
					onClick={() => setViewMode('table')}
				>
					<TableIcon size={18} weight="bold" aria-hidden="true" style={{ marginRight: '0.5rem' }} />
					Table view
				</button>
				<button
					type="button"
					className={`student-reservations__view-toggle ${viewMode === 'grid' ? 'student-reservations__view-toggle--active' : ''}`}
					aria-pressed={viewMode === 'grid'}
					onClick={() => setViewMode('grid')}
				>
					<SquaresFourIcon size={18} weight="bold" aria-hidden="true" style={{ marginRight: '0.5rem' }} />
					Grid view
				</button>
			</div>
			<ReservationsTable userRole="student" userId={user?.id} viewMode={viewMode} />

			{isPageLoading ? (
				<div
					className="student-reservations-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading student reservations page"
				>
					<div className="student-reservations-transition__card">
						<img
							src={cicsLogo}
							alt="UST CICS logo"
							className="student-reservations-transition__logo"
						/>
						<div className="student-reservations-transition__loader" aria-hidden="true">
							<span></span>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
