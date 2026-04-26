import {
	LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
	ResponsiveContainer,
} from 'recharts';
import Card from '../../../shared/components/Card';
import { CHART_COLORS } from './analyticsData';

export default function ReservationTrendChart({ data }) {
	return (
		<Card className="analytics-chart" padding="md">
			<h3 className="analytics-chart__title">Reservation Trends</h3>
			<p className="analytics-chart__subtitle">Hourly reservation volume</p>
			<div className="analytics-chart__container">
				<ResponsiveContainer width="100%" height="100%">
					<LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
						<XAxis dataKey="time" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
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