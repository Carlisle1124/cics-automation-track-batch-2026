import { useEffect, useState } from 'react';
import {
	LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
	ResponsiveContainer,
} from 'recharts';
import Card from '../../../shared/components/Card';
import { CHART_COLORS } from './analyticsData';
import { getAnalyticsData } from '../../../data/services/analyticsService';

export default function ReservationTrendChart({ data, range = 'week' }) {
	const [chartData, setChartData] = useState(data ?? []);

	useEffect(() => {
		let active = true;

		if (data && data.length > 0) {
			return () => {
				active = false;
			};
		}

		async function loadTrend() {
			try {
				const analyticsData = await getAnalyticsData(range);
				if (active) {
					setChartData(analyticsData.reservationTrend || []);
				}
			} catch (error) {
				console.error('Error loading reservation trend data:', error);
				if (active) setChartData([]);
			}
		}

		loadTrend();
		return () => {
			active = false;
		};
	}, [data, range]);

	const displayData = data && data.length > 0 ? data : chartData;
	const xAxisDataKey = range === 'today' ? 'time' : 'date';
	const subtitle = range === 'today' ? 'Hourly reservation volume' : 'Daily reservation volume';

	return (
		<Card className="analytics-chart" padding="md">
			<h3 className="analytics-chart__title">Reservation Trends</h3>
			<p className="analytics-chart__subtitle">{subtitle}</p>
			<div className="analytics-chart__container">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={displayData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
						<XAxis dataKey={xAxisDataKey} tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
						<YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
						<Tooltip
							contentStyle={{
								background: 'var(--bg-elevated)',
								border: '1px solid var(--border-subtle)',
								borderRadius: 'var(--radius-md)',
								fontSize: '0.875rem',
							}}
						/>
						<Line
							type="monotone"
							dataKey="reservations"
							stroke={CHART_COLORS.primary}
							strokeWidth={2.5}
							dot={{ r: 4, fill: CHART_COLORS.primary }}
							activeDot={{ r: 6 }}
						/>
					</LineChart>
				</ResponsiveContainer>
			</div>
		</Card>
	);
}