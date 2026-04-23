import { useEffect, useState } from 'react';
import { getUsers } from '../../data/services/authService';
import { getAllReservations } from '../../data/services/reservationService';
import PageHeader from '../../shared/components/PageHeader';
import Card from '../../shared/components/Card';
import cicsLogo from '../../assets/CICS-Logo.webp';
import './Overview.css';

export default function Overview() {
	const [metrics, setMetrics] = useState([]);
	const [isPageLoading, setIsPageLoading] = useState(true);

	useEffect(() => {
		const previousTitle = document.title;
		document.title = 'Overview - UST CICS Learning Common Room';

		let active = true;

		async function loadMetrics() {
			try {
				const [users, reservations] = await Promise.all([
					getUsers(),
					getAllReservations(),
					new Promise((resolve) => setTimeout(resolve, 700)),
				]);

				if (!active) return;

				const totalUsers = users.length;
				const totalReservations = reservations.length;
				const activeCheckIns = reservations.filter((reservation) => reservation.status === 'checked_in').length;
				const confirmedReservations = reservations.filter((reservation) => reservation.status === 'confirmed').length;
				const confirmationProgress = totalReservations > 0
					? Math.round((confirmedReservations / totalReservations) * 100)
					: 0;

				setMetrics([
					{
						label: 'Total Users',
						value: String(totalUsers),
						description: 'All tracked portal accounts.',
					},
					{
						label: 'Total Reservations',
						value: String(totalReservations),
						description: 'All learning commons bookings.',
					},
					{
						label: 'Active Check-Ins',
						value: String(activeCheckIns),
						description: 'Currently checked-in users.',
					},
					{
						label: 'Confirmed Reservations',
						value: String(confirmedReservations),
						description: `${confirmedReservations} confirmed of ${totalReservations} bookings.`,
						progress: confirmationProgress,
					},
				]);
			} finally {
				if (active) {
					setIsPageLoading(false);
				}
			}
		}

		loadMetrics();

		return () => {
			active = false;
			document.title = previousTitle;
		};
	}, []);

	return (
		<section
			className={`dashboard-page admin-overview ${
				isPageLoading ? 'admin-overview--content-hidden' : 'admin-overview--content-visible'
			}`}
		>
			<PageHeader
				className="admin-overview__header"
				title="Admin Overview"
				subtitle="High-level operational snapshot for the learning commons."
			/>

			<div className="admin-overview__metrics">
				{metrics.map((metric) => (
					<Card
						key={metric.label}
						className="admin-overview__metric-card"
						padding="md"
						elevated
					>
						<div className="admin-overview__metric-label">{metric.label}</div>

						<div className="admin-overview__metric-value-row">
							<div className="admin-overview__metric-value">{metric.value}</div>
						</div>

						<div className="admin-overview__metric-description">
							{metric.description}
						</div>

						{typeof metric.progress === 'number' ? (
							<div className="admin-overview__progress" aria-hidden="true">
								<div
									className="admin-overview__progress-fill"
									style={{ width: `${Math.min(metric.progress, 100)}%` }}
								/>
							</div>
						) : null}
					</Card>
				))}
			</div>

			{isPageLoading ? (
				<div
					className="admin-overview-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading admin overview page"
				>
					<div className="admin-overview-transition__card">
						<img
							src={cicsLogo}
							alt="UST CICS logo"
							className="admin-overview-transition__logo"
						/>
						<div className="admin-overview-transition__loader" aria-hidden="true">
							<span></span>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
