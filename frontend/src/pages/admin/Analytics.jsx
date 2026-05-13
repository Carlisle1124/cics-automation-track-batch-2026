import { useEffect, useState, useCallback } from 'react';
import {
	CalendarBlank,
	Clock,
	UsersThree,
	Export,
} from '@phosphor-icons/react';
import { jsPDF } from 'jspdf';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import { getHistoricalAnalyticsData } from '../../data/services/analyticsService';
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

function getRangeLabel(value) {
	return DATE_RANGES.find((rangeOption) => rangeOption.value === value)?.label ?? value;
}

function getRangeDates(range, referenceDate = new Date()) {
	const end = new Date(referenceDate);
	end.setHours(0, 0, 0, 0);

	const start = new Date(end);
	if (range === 'week') {
		start.setDate(end.getDate() - 6);
	} else if (range === 'month') {
		start.setDate(end.getDate() - 29);
	}

	return { start, end };
}

function getDefaultReferenceDateValue() {
	return new Date().toISOString().slice(0, 10);
}

function parseReferenceDate(value) {
	if (!value) return new Date();
	const [year, month, day] = value.split('-').map(Number);
	if (year && month && day) {
		return new Date(year, month - 1, day);
	}

	return new Date(value);
}

function formatDisplayDate(date) {
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	});
}

function formatDateKey(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
}

function getAnalyzedPeriodLabel(range, referenceDate = new Date()) {
	const { start, end } = getRangeDates(range, referenceDate);
	if (range === 'today') {
		return formatDisplayDate(end);
	}

	return `${formatDisplayDate(start)} - ${formatDisplayDate(end)}`;
}

function formatRangeHeading(range, data) {
	if (range === 'today') {
		return 'Today';
	}

	if (range === 'week') {
		return 'Past 7 Days';
	}

	if (range === 'month') {
		return 'Past 30 Days';
	}

	return getRangeLabel(range);
}

function addWrappedLines(doc, lines, x, y, maxWidth, lineHeight) {
	let currentY = y;

	lines.forEach((line) => {
		const wrappedLines = doc.splitTextToSize(line, maxWidth);
		doc.text(wrappedLines, x, currentY);
		currentY += wrappedLines.length * lineHeight;
	});

	return currentY;
}

function addSection(doc, title, items, y) {
	const pageHeight = doc.internal.pageSize.getHeight();
	const margin = 14;
	const contentWidth = doc.internal.pageSize.getWidth() - margin * 2;
	const lineHeight = 6;

	if (y + 12 > pageHeight - margin) {
		doc.addPage();
		y = margin;
	}

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(13);
	doc.text(title, margin, y);
	y += 6;

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);

	items.forEach((item) => {
		const bulletLine = `• ${item}`;
		const wrappedLines = doc.splitTextToSize(bulletLine, contentWidth);

		if (y + wrappedLines.length * lineHeight > pageHeight - margin) {
			doc.addPage();
			y = margin;
		}

		doc.text(wrappedLines, margin, y);
		y += wrappedLines.length * lineHeight;
	});

	return y + 2;
}

function ensurePageSpace(doc, y, requiredHeight, margin = 14) {
	const pageHeight = doc.internal.pageSize.getHeight();
	if (y + requiredHeight > pageHeight - margin) {
		doc.addPage();
		return margin;
	}

	return y;
}

function drawSectionHeader(doc, title, subtitle, y, margin = 14) {
	doc.setFont('helvetica', 'bold');
	doc.setFontSize(13);
	doc.text(title, margin, y);
	if (subtitle) {
		doc.setFont('helvetica', 'normal');
		doc.setFontSize(9);
		doc.text(subtitle, margin, y + 5);
	}

	return subtitle ? y + 10 : y + 6;
}

function shouldShowAxisLabel(index, total) {
	if (total <= 12) return true;
	const step = Math.ceil(total / 10);
	return index % step === 0 || index === total - 1;
}

function drawBarChart(doc, { title, subtitle, labels, values, color = [190, 21, 46], y }) {
	const margin = 14;
	const chartWidth = doc.internal.pageSize.getWidth() - margin * 2;
	const chartHeight = 60;
	const labelAreaHeight = 7;
	const topPadding = 10;
	const bottomPadding = 10;
	const leftPadding = 8;
	const rightPadding = 8;
	const innerWidth = chartWidth - leftPadding - rightPadding;
	const innerHeight = chartHeight - topPadding - bottomPadding;
	const maxValue = Math.max(...values, 0) || 1;
	const safeCount = Math.max(labels.length, 1);
	const slotWidth = innerWidth / safeCount;
	const barGap = safeCount > 16 ? 1 : 2;
	const rawBarWidth = slotWidth - barGap;
	const barWidth = Math.max(1.4, Math.min(8, rawBarWidth));

	y = ensurePageSpace(doc, y, chartHeight + 20, margin);
	y = drawSectionHeader(doc, title, subtitle, y, margin);

	doc.setDrawColor(222, 226, 230);
	doc.setLineWidth(0.2);
	doc.line(margin, y + chartHeight, margin + chartWidth, y + chartHeight);

	labels.forEach((label, index) => {
		const value = values[index] ?? 0;
		const barHeight = (value / maxValue) * innerHeight;
		const x = margin + leftPadding + index * slotWidth + (slotWidth - barWidth) / 2;
		const barY = y + chartHeight - bottomPadding - barHeight;

		doc.setFillColor(...color);
		doc.roundedRect(x, barY, barWidth, barHeight, 0.8, 0.8, 'F');

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		if (shouldShowAxisLabel(index, labels.length)) {
			const displayLabel = label.length > 8 ? `${label.slice(0, 8)}…` : label;
			doc.text(displayLabel, x + barWidth / 2, y + chartHeight + 4, { align: 'center' });
		}
		doc.text(String(value), x + barWidth / 2, barY - 1.5, { align: 'center' });
	});

	return y + chartHeight + labelAreaHeight + 6;
}

function drawGroupedBarChart(doc, { title, subtitle, labels, seriesA, seriesB, labelA, labelB, colorA = [190, 21, 46], colorB = [193, 160, 92], y }) {
	const margin = 14;
	const chartWidth = doc.internal.pageSize.getWidth() - margin * 2;
	const chartHeight = 66;
	const topPadding = 10;
	const bottomPadding = 12;
	const leftPadding = 8;
	const rightPadding = 8;
	const innerWidth = chartWidth - leftPadding - rightPadding;
	const innerHeight = chartHeight - topPadding - bottomPadding;
	const maxValue = Math.max(...seriesA, ...seriesB, 0) || 1;
	const safeCount = Math.max(labels.length, 1);
	const slotWidth = innerWidth / safeCount;
	const barWidth = Math.min(8, slotWidth * 0.28);

	y = ensurePageSpace(doc, y, chartHeight + 24, margin);
	y = drawSectionHeader(doc, title, subtitle, y, margin);

	doc.setDrawColor(222, 226, 230);
	doc.setLineWidth(0.2);
	doc.line(margin, y + chartHeight, margin + chartWidth, y + chartHeight);

	labels.forEach((label, index) => {
		const xCenter = margin + leftPadding + slotWidth * index + slotWidth / 2;
		const firstHeight = ((seriesA[index] ?? 0) / maxValue) * innerHeight;
		const secondHeight = ((seriesB[index] ?? 0) / maxValue) * innerHeight;
		const firstX = xCenter - barWidth - 1;
		const secondX = xCenter + 1;
		const firstY = y + chartHeight - bottomPadding - firstHeight;
		const secondY = y + chartHeight - bottomPadding - secondHeight;

		doc.setFillColor(...colorA);
		doc.roundedRect(firstX, firstY, barWidth, firstHeight, 0.8, 0.8, 'F');
		doc.setFillColor(...colorB);
		doc.roundedRect(secondX, secondY, barWidth, secondHeight, 0.8, 0.8, 'F');

		doc.setFont('helvetica', 'normal');
		doc.setFontSize(8);
		if (shouldShowAxisLabel(index, labels.length)) {
			const displayLabel = label.length > 7 ? `${label.slice(0, 7)}…` : label;
			doc.text(displayLabel, xCenter, y + chartHeight + 4, { align: 'center' });
		}
	});

	const legendY = y + chartHeight + 9;
	doc.setFontSize(9);
	doc.setFillColor(...colorA);
	doc.rect(margin, legendY - 3, 4, 4, 'F');
	doc.text(labelA, margin + 6, legendY);
	doc.setFillColor(...colorB);
	doc.rect(margin + 42, legendY - 3, 4, 4, 'F');
	doc.text(labelB, margin + 48, legendY);

	return legendY + 8;
}

function exportAnalyticsPdf(range, data, referenceDateValue) {
	const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
	const margin = 14;
	const pageWidth = doc.internal.pageSize.getWidth();
	const contentWidth = pageWidth - margin * 2;
	const generatedAt = new Date();
	const referenceDate = parseReferenceDate(referenceDateValue);
	const { start: periodStart } = getRangeDates(range, referenceDate);
	const fileName = `analytics-${range}-${formatDateKey(periodStart)}.pdf`;
	const analyzedPeriod = getAnalyzedPeriodLabel(range, referenceDate);
	let y = margin;

	doc.setFont('helvetica', 'bold');
	doc.setFontSize(18);
	doc.text('UST CICS Learning Common Room', margin, y);
	y += 8;

	doc.setFontSize(15);
	doc.text('Analytics Report', margin, y);
	y += 8;

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(10);
	doc.text(`Range: ${formatRangeHeading(range, data)}`, margin, y);
	y += 5;
	doc.text(`Period analyzed: ${analyzedPeriod}`, margin, y);
	y += 5;
	doc.text(`Generated at: ${generatedAt.toLocaleString()}`, margin, y);
	y += 8;

	doc.setFontSize(10);
	y = addWrappedLines(
		doc,
		['This report reflects the analytics currently shown on screen for the selected time range.'],
		margin,
		y,
		contentWidth,
		5,
	);
	y += 2;

	y = addSection(
		doc,
		'Key Metrics',
		[
			`Total Reservations: ${data.kpis.totalReservations.value}${data.kpis.totalReservations.trend ? ` (${data.kpis.totalReservations.trend})` : ''}`,
			`Peak Usage Time: ${data.kpis.peakUsageTime.value}`,
			`Active Users: ${data.kpis.activeUsers.value}${data.kpis.activeUsers.trend ? ` (${data.kpis.activeUsers.trend})` : ''}`,
		],
		y,
	);

	const reservationLabels = (data.reservationTrend || []).map((entry) => entry.label ?? entry.date ?? entry.time ?? 'Entry');
	const reservationValues = (data.reservationTrend || []).map((entry) => entry.reservations ?? 0);
	y = drawBarChart(doc, {
		title: 'Reservation Trend',
		subtitle: range === 'today' ? 'Hourly reservations' : 'Reservations over the selected period',
		labels: reservationLabels,
		values: reservationValues,
		y,
	});

	const timeSlotLabels = (data.timeSlotDistribution || []).map((entry) => entry.label ?? 'Slot');
	const studentValues = (data.timeSlotDistribution || []).map((entry) => entry.students ?? 0);
	const staffValues = (data.timeSlotDistribution || []).map((entry) => entry.staff ?? 0);
	y = drawGroupedBarChart(doc, {
		title: 'Time Slot Distribution',
		subtitle: range === 'today' ? 'Hourly usage split by user role' : 'Daily usage split by user role',
		labels: timeSlotLabels,
		seriesA: studentValues,
		seriesB: staffValues,
		labelA: 'Students',
		labelB: 'Staff',
		y,
	});

	const userActivityLabels = (data.userActivity || []).map((entry) => entry.name ?? 'Category');
	const userActivityValues = (data.userActivity || []).map((entry) => entry.value ?? 0);
	y = drawBarChart(doc, {
		title: 'User Activity',
		subtitle: 'Visit frequency distribution',
		labels: userActivityLabels,
		values: userActivityValues,
		color: [91, 67, 5],
		y,
	});

	doc.save(fileName);
}

export default function Analytics() {
	const [data, setData] = useState(null);
	const [loading, setLoading] = useState(true);
	const [range, setRange] = useState('week');
 	const [referenceDateValue, setReferenceDateValue] = useState(getDefaultReferenceDateValue());
	const analyzedPeriodLabel = getAnalyzedPeriodLabel(range, parseReferenceDate(referenceDateValue));

	const loadData = useCallback(async (selectedRange, selectedReferenceDate) => {
		setLoading(true);
		try {
			const analyticsData = await getHistoricalAnalyticsData(selectedRange, selectedReferenceDate);
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

		loadData(range, referenceDateValue);

		return () => {
			document.title = previousTitle;
		};
	}, [range, referenceDateValue, loadData]);

	function handleRangeChange(value) {
		setRange(value);
	}

	function handleReferenceDateChange(event) {
		setReferenceDateValue(event.target.value);
	}

	function handleExport() {
		if (!data) return;

		exportAnalyticsPdf(range, data, referenceDateValue);
	}

	return (
		<section
			className={`dashboard-page analytics-page ${
				loading ? 'analytics-page--content-hidden' : 'analytics-page--content-visible'
			}`}
		>
			<div className="analytics-page__header">
				<div className="analytics-page__title-group">
					<PageHeader
						title="Analytics"
						subtitle="Reservation insights and capacity metrics for Learning Common Rooms."
					/>
					<p className="analytics-period-label" aria-live="polite">
						Period analyzed: <strong>{analyzedPeriodLabel}</strong>
					</p>
				</div>
				<div className="analytics-page__controls">
					<label className="analytics-history-filter" htmlFor="analytics-reference-date">
						<span className="analytics-history-filter__label">As of</span>
						<input
							id="analytics-reference-date"
							type="date"
							className="analytics-history-filter__input"
							value={referenceDateValue}
							onChange={handleReferenceDateChange}
						/>
					</label>
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
					<button className="analytics-export-btn" title="Export current analytics data as PDF" onClick={handleExport} disabled={loading || !data}>
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