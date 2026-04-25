import {
	PieChart, Pie, Cell, Tooltip,
	ResponsiveContainer,
} from 'recharts';
import Card from '../../../shared/components/Card';
import { CHART_COLORS } from './analyticsData';

export default function UserActivityChart({ data }) {
	return (
		<Card className="analytics-chart analytics-chart--user-activity" padding="md">
			<h3 className="analytics-chart__title">User Activity</h3>
			<p className="analytics-chart__subtitle">Segmentation by visit frequency</p>
			<div className="analytics-chart__container analytics-chart__container--pie">
				<ResponsiveContainer width="100%" height="100%">
					<PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
						<Pie
							data={data}
							cx="50%"
							cy="50%"
							innerRadius="48%"
							outerRadius="76%"
							paddingAngle={3}
							dataKey="value"
							nameKey="name"
							stroke="var(--bg-card)"
							strokeWidth={3}
						>
							{data.map((_, index) => (
								<Cell
									key={`cell-${index}`}
									fill={CHART_COLORS.pie[index % CHART_COLORS.pie.length]}
								/>
							))}
						</Pie>
						<Tooltip
							contentStyle={{
								background: 'var(--bg-elevated)',
								border: '1px solid var(--border-subtle)',
								borderRadius: 'var(--radius-md)',
								fontSize: '0.875rem',
							}}
						/>
					</PieChart>
				</ResponsiveContainer>
			</div>

			<ul className="user-activity-legend" aria-label="User activity legend">
				{data.map((item, index) => (
					<li key={item.name} className="user-activity-legend__item">
						<span
							className="user-activity-legend__swatch"
							style={{ backgroundColor: CHART_COLORS.pie[index % CHART_COLORS.pie.length] }}
							aria-hidden="true"
						/>
						<span className="user-activity-legend__text">{item.name}</span>
					</li>
				))}
			</ul>
		</Card>
	);
}