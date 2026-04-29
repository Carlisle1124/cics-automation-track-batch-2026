import { useState, useEffect, useCallback } from 'react';
import { getAvailabilityByDate } from '../services/availabilityService';
import { supabase } from '../../../data/supabaseClient';
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
	showRules = true,
	selectedSlotId,
	onSlotSelect,
}) {
	const [availability, setAvailability] = useState(null);
	const [loading, setLoading] = useState(true);

	const loadAvailability = useCallback(async () => {
		try {
			const todayAvailability = await getAvailabilityByDate(new Date());
			setAvailability(todayAvailability);
		} catch (error) {
			console.error('Failed to load availability:', error);
			setAvailability(null);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadAvailability();
	}, [loadAvailability]);

	// Real-time subscription to reservations changes
	useEffect(() => {
		const today = new Date().toISOString().slice(0, 10);
		const channel = supabase
			.channel(`availability-${today}`)
			.on(
				'postgres_changes',
				{
					event: '*',
					schema: 'public',
					table: 'reservations',
					filter: `reservation_date=eq.${today}`,
				},
				loadAvailability
			)
			.subscribe();

		return () => {
			supabase.removeChannel(channel);
		};
	}, [loadAvailability]);

	if (loading) {
		return (
			<div className="availability-panel">
				<div className="availability-panel__grid">
					{Array.from({ length: 4 }, (_, index) => (
						<Card key={index} className="availability-panel__card" padding="md" elevated>
							<div className="availability-panel__card-label availability-panel__card-label--loading"></div>
							<div className="availability-panel__card-value-row">
								<div className="availability-panel__card-value availability-panel__card-value--loading"></div>
							</div>
							<div className="availability-panel__card-description availability-panel__card-description--loading"></div>
						</Card>
					))}
				</div>
			</div>
		);
	}

	if (!availability) {
		return (
			<div className="availability-panel">
				<div className="availability-panel__grid">
					<Card className="availability-panel__card" padding="md" elevated>
						<div className="availability-panel__card-description">Unable to load availability data</div>
					</Card>
				</div>
			</div>
		);
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