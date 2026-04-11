import Card from '../../../shared/components/Card';
import './AvailabilityPanel.css';

function cx(...classes) {
	return classes.filter(Boolean).join(' ');
}

function getLegendClass(status) {
	if (status === 'full') return 'availability-panel__legend-dot--full';
	if (status === 'nearly full') return 'availability-panel__legend-dot--nearly-full';
	return 'availability-panel__legend-dot--available';
}

export default function AvailabilityPanel({
	availability,
	showRules = true,
	selectedSlotId,
	onSlotSelect,
}) {
	if (!availability) {
		return null;
	}

	return (
		<div className="availability-panel">
			<div className="availability-panel__grid">
					{availability.cards.map((card, index) => (
						<Card
							key={card.label}
							className="availability-panel__card"
							padding="md"
							elevated
						>
						<div className="availability-panel__card-label">{card.label}</div>
							<div className="availability-panel__card-value-row">
							<div className="availability-panel__card-value">{card.value}</div>
								<div className="availability-panel__card-unit">{card.unit ?? ''}</div>
						</div>
							<div className="availability-panel__card-description">{card.description}</div>

							{index === 3 ? (
								<div className="availability-panel__progress" aria-hidden="true">
									<div
										className="availability-panel__progress-fill"
										style={{ width: `${Math.min(card.progress, 100)}%` }}
									/>
								</div>
							) : null}
					</Card>
				))}
			</div>

			
		</div>
	);
}
// ============================================================
// Card component to show availability statuses for the day, with a progress BAR and color gradient for availability status
// e.g.: 
// 13 slots occupied = ~25% full
// 25 slots occupied = ~50% full
// 38 slots occupied = ~75% full
// 50 slots occupied = 100% full
// gradient from yellow (available) to red (full)
// 4 cards: _ SLOTS AVAIABLE NOW, _ SLOTS AVAIABLE IN 1 HOUR, _ SLOTS RESERVED NOW, the progress bar should reflect the % of slots reserved for that time period
// ============================================================

