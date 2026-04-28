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