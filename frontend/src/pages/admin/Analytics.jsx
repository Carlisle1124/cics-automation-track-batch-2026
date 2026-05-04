import { useEffect, useState, useCallback } from 'react';
import {
	CalendarBlank,
	Clock,
	UsersThree,
	Export,
} from '@phosphor-icons/react';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import { getAnalyticsData } from '../../data/services/analyticsService';
import KPICard from './analytics/KPICard';
import ReservationTrendChart from './analytics/ReservationTrendChart';
import TimeSlotChart from './analytics/TimeSlotChart';
import UserActivityChart from './analytics/UserActivityChart';
import './analytics/Analytics.css';

const DATE_RANGES = [
	{ label: 'Today', value: 'today' },
	{ label: 'Week', value: 'week' },
	{ label: 'Month', value: 'month' },
];

export default function Analytics() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [range, setRange] = useState('week');

	const loadData = useCallback(async (selectedRange) => {
		setLoading(true);
		try {
			const analyticsData = await getAnalyticsData(selectedRange);
			setData(analyticsData);
		} catch (error) {
			console.error('Error loading analytics data:', error);
			setData(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		const previousTitle = document.title;
		document.title = 'Analytics - UST CICS Learning Common Room';

		loadData(range);

		return () => {
			document.title = previousTitle;
		};
	}, [range, loadData]);

	function handleRangeChange(value) {
		setRange(value);
	}

	return (
		<section
			className={`dashboard-page analytics-page ${
				loading ? 'analytics-page--content-hidden' : 'analytics-page--content-visible'
			}`}
		>
			<div className="analytics-page__header">
				<PageHeader
					className="analytics-page__page-header"
					title="Analytics"
					subtitle="Reservation insights and capacity metrics for Learning Common Rooms."
				/>
				<div className="analytics-page__controls">
					<div className="analytics-filter-group">
						{DATE_RANGES.map((r) => (
							<button
								key={r.value}
								className={`analytics-filter-btn${range === r.value ? ' analytics-filter-btn--active' : ''}`}
								onClick={() => handleRangeChange(r.value)}
							>
								{r.label}
							</button>
						))}
					</div>
					<button className="analytics-export-btn" title="Export (UI only)">
						<Export size={18} weight="bold" />
						Export
					</button>
				</div>
			</div>

			{data ? (
				<div className="analytics-page__content">
					<div className="analytics-page__kpis">
						<KPICard
							icon={CalendarBlank}
							label="Total Reservations"
							value={data.kpis.totalReservations.value}
							trend={data.kpis.totalReservations.trend}
						/>
						<KPICard
							icon={Clock}
							label="Peak Usage Time"
							value={data.kpis.peakUsageTime.value}
						/>
						<KPICard
							icon={UsersThree}
							label="Active Users"
							value={data.kpis.activeUsers.value}
							trend={data.kpis.activeUsers.trend}
						/>
					</div>

					<div className="analytics-page__charts">
						<ReservationTrendChart data={data.reservationTrend} range={range} />
					<TimeSlotChart data={data.timeSlotDistribution} range={range} />
						<UserActivityChart data={data.userActivity} />
					</div>
				</div>
			) : null}

			{loading ? (
				<div
					className="analytics-page-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading analytics page"
				>
					<div className="analytics-page-transition__card">
						<img
							src={cicsLogo}
							alt="UST CICS logo"
							className="analytics-page-transition__logo"
						/>
						<div className="analytics-page-transition__loader" aria-hidden="true">
							<span></span>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}