import {
	AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
	ResponsiveContainer,
} from 'recharts';
import Card from '../../../shared/components/Card';
import { CHART_COLORS } from './analyticsData';

export default function TimeSlotChart({ data }) {
	return (
		<Card className="analytics-chart" padding="md">
			<h3 className="analytics-chart__title">Time Slot Distribution</h3>
			<p className="analytics-chart__subtitle">Usage frequency across time slots</p>
			<div className="analytics-chart__container">
				<ResponsiveContainer width="100%" height="100%">
					<AreaChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
						<CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
						<XAxis dataKey="slot" tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
						<YAxis tick={{ fontSize: 12 }} stroke="var(--text-secondary)" />
						<Tooltip
							contentStyle={{
								background: 'var(--bg-elevated)',
								border: '1px solid var(--border-subtle)',
								borderRadius: 'var(--radius-md)',
								fontSize: '0.875rem',
							}}
						/>
						<Area
							type="monotone"
							dataKey="students"
							stackId="1"
							stroke={CHART_COLORS.primary}
							fill={CHART_COLORS.primaryLight}
							fillOpacity={0.4}
						/>
						<Area
							type="monotone"
							dataKey="staff"
							stackId="1"
							stroke={CHART_COLORS.secondary}
							fill={CHART_COLORS.secondaryLight}
							fillOpacity={0.4}
						/>
					</AreaChart>
				</ResponsiveContainer>
			</div>
		</Card>
	);
}