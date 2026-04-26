import { useEffect, useRef, useState } from 'react';
import Button from '../../../shared/components/Button';
import Modal from '../../../shared/components/Modal';
import { getCurrentUser } from '../../../data/services/authService';
import { holdSlot, confirmSlot, releaseSlot } from '../../../data/services/reservationService';
import { validateReservation } from '../../../data/services/reservationLogic';
import './ReserveButton.css';

// Generate 08:00 – 16:00 start times (latest start that allows at least 1 hr before close)
const HOUR_OPTIONS = Array.from({ length: 9 }, (_, i) => {
	const h = 8 + i;
	const value = `${String(h).padStart(2, '0')}:00:00`;
	const label = h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`;
	return { value, label };
});

function formatHour12(hour) {
	if (hour < 12) return `${hour}:00 AM`;
	if (hour === 12) return '12:00 PM';
	return `${hour - 12}:00 PM`;
}

function computeEndLabel(startTimeStr, durationHours) {
	const startHour = parseInt(startTimeStr.split(':')[0], 10);
	return formatHour12(startHour + Number(durationHours));
}

function formatCountdown(secs) {
	const m = Math.floor(secs / 60);
	const s = secs % 60;
	return `${m}:${String(s).padStart(2, '0')}`;
}

export default function ReserveButton({ isAvailable = true, onClick = null, role = 'student' }) {
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [currentUser, setCurrentUser] = useState(null);

	// 'form' | 'holding' | 'confirmed'
	const [phase, setPhase] = useState('form');

	const [formData, setFormData] = useState({
		date: new Date().toISOString().slice(0, 10),
		startTime: HOUR_OPTIONS[0].value,
		duration: 1,
	});

	const [activeHold, setActiveHold] = useState(null);
	const [holdCountdown, setHoldCountdown] = useState(null);
	const [confirmedReservation, setConfirmedReservation] = useState(null);
	const [errorMessage, setErrorMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const activeHoldRef = useRef(null);
	const currentUserRef = useRef(null);
	const todayStr = new Date().toISOString().slice(0, 10);

	useEffect(() => {
		activeHoldRef.current = activeHold;
	}, [activeHold]);

	useEffect(() => {
		currentUserRef.current = currentUser;
	}, [currentUser]);

	useEffect(() => {
		let active = true;
		getCurrentUser().then((u) => { if (active) setCurrentUser(u); }).catch(() => {});
		return () => { active = false; };
	}, []);

	// Release hold on unmount
	useEffect(() => {
		return () => {
			const hold = activeHoldRef.current;
			const uid = currentUserRef.current?.id;
			if (hold && uid) releaseSlot(hold.id, uid).catch(() => {});
		};
	}, []);

	// Countdown tick
	useEffect(() => {
		if (holdCountdown === null) return;
		if (holdCountdown <= 0) {
			const hold = activeHoldRef.current;
			const uid = currentUserRef.current?.id;
			if (hold && uid) releaseSlot(hold.id, uid).catch(() => {});
			setActiveHold(null);
			setHoldCountdown(null);
			setPhase('form');
			setErrorMessage('Your hold expired. Please try again.');
			return;
		}
		const timer = setTimeout(() => setHoldCountdown((c) => c - 1), 1000);
		return () => clearTimeout(timer);
	}, [holdCountdown]);

	function handleClick(event) {
		if (onClick) {
			onClick(event);
			return;
		}
		setIsModalOpen(true);
		setPhase('form');
		setErrorMessage('');
		setConfirmedReservation(null);
	}

	function handleClose() {
		// Release hold if closing modal mid-hold
		if (activeHold) {
			releaseSlot(activeHold.id, currentUser?.id).catch(() => {});
			setActiveHold(null);
			setHoldCountdown(null);
		}
		setIsModalOpen(false);
		setPhase('form');
		setErrorMessage('');
		setConfirmedReservation(null);
	}

	function handleMakeAnother() {
		setPhase('form');
		setConfirmedReservation(null);
		setErrorMessage('');
		setFormData({
			date: new Date().toISOString().slice(0, 10),
			startTime: HOUR_OPTIONS[0].value,
			duration: 1,
			notes: '',
		});
	}

	function handleChange(key, value) {
		setFormData((prev) => ({ ...prev, [key]: value }));
	}

	async function handleHoldSubmit(event) {
		event.preventDefault();

		if (!currentUser) {
			setErrorMessage('Please wait while we load your account.');
			return;
		}

		setIsSubmitting(true);
		setErrorMessage('');

		try {
			await validateReservation({
				userId: currentUser.id,
				reservationDate: formData.date,
				durationHours: Number(formData.duration),
			});

			const held = await holdSlot({
				userId: currentUser.id,
				reservationDate: formData.date,
				startTime: formData.startTime,
				durationHours: Number(formData.duration),
			});

			setActiveHold({ id: held.id });
			const secs = held?.expires_at
				? Math.max(0, Math.round((new Date(held.expires_at) - Date.now()) / 1000))
				: 300;
			setHoldCountdown(secs);
			setPhase('holding');
		} catch (err) {
			setErrorMessage(err.message || 'Could not hold this slot. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleConfirm() {
		if (!activeHold || isSubmitting) return;
		setIsSubmitting(true);
		setErrorMessage('');
		try {
			const confirmed = await confirmSlot(activeHold.id, currentUser?.id);
			setConfirmedReservation(confirmed);
			setActiveHold(null);
			setHoldCountdown(null);
			setPhase('confirmed');
		} catch (err) {
			setErrorMessage(err.message || 'Could not confirm reservation. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleCancelHold() {
		if (activeHold) {
			await releaseSlot(activeHold.id, currentUser?.id).catch(() => {});
		}
		setActiveHold(null);
		setHoldCountdown(null);
		setPhase('form');
		setErrorMessage('');
	}

	const selectedOption = HOUR_OPTIONS.find((o) => o.value === formData.startTime) ?? HOUR_OPTIONS[0];

	return (
		<>
			<Button
				className="reserve-fab"
				onClick={handleClick}
				disabled={!isAvailable}
				aria-label={isAvailable ? 'Reserve a slot' : 'No slots available'}
				style={{ width: 'auto' }}
			>
				<div className="fab-wrapper">
					<span className="reserve-fab__icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
							<path d="M12 5v14M5 12h14" />
						</svg>
					</span>
					<span className="reserve-fab__label">{isAvailable ? 'Reserve' : 'Full'}</span>
				</div>
			</Button>

			<Modal isOpen={isModalOpen} title="Reserve a Slot" onClose={handleClose}>
				{/* ── Confirmed ── */}
				{phase === 'confirmed' && confirmedReservation && (
					<div className="reserve-success">
						<div className="reserve-success__icon" aria-hidden="true">✓</div>
						<h3 className="reserve-success__title">Reservation Submitted!</h3>
						<p className="reserve-success__detail">
							{new Date(confirmedReservation.reservation_date + 'T00:00:00').toLocaleDateString(
								'en-US',
								{ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
							)}
						</p>
						<p className="reserve-success__detail">
							{confirmedReservation.start_time?.slice(0, 5)} –{' '}
							{confirmedReservation.end_time?.slice(0, 5)}
						</p>
						<p className="reserve-success__ref">Ref: {confirmedReservation.id?.slice(0, 8)}…</p>
						<div className="reserve-modal-form__actions" style={{ marginTop: '1.5rem' }}>
							<button type="button" className="reserve-modal-form__secondary" onClick={handleMakeAnother}>
								Make Another
							</button>
							<button type="button" className="reserve-modal-form__primary" onClick={handleClose}>
								Close
							</button>
						</div>
					</div>
				)}

				{/* ── Holding (countdown) ── */}
				{phase === 'holding' && (
					<div className="reserve-holding">
						<div className="reserve-holding__header">
							<h3 className="reserve-holding__title">Slot Reserved!</h3>
							<p className="reserve-holding__subtitle">Confirm before the timer runs out.</p>
						</div>

						<div className="reserve-holding__detail">
							<span className="reserve-holding__detail-label">Date</span>
							<span className="reserve-holding__detail-value">
								{new Date(formData.date + 'T00:00:00').toLocaleDateString('en-US', {
									weekday: 'short',
									month: 'short',
									day: 'numeric',
								})}
							</span>
						</div>
						<div className="reserve-holding__detail">
							<span className="reserve-holding__detail-label">Time</span>
							<span className="reserve-holding__detail-value">{selectedOption.label} – {computeEndLabel(formData.startTime, formData.duration)}</span>
						</div>
						<div className="reserve-holding__detail">
							<span className="reserve-holding__detail-label">Duration</span>
							<span className="reserve-holding__detail-value">
								{formData.duration} hour{formData.duration > 1 ? 's' : ''}
							</span>
						</div>

						{holdCountdown !== null && (
							<div className="reserve-holding__countdown">
								<div className="reserve-holding__timer">{formatCountdown(holdCountdown)}</div>
								<p className="reserve-holding__timer-label">remaining to confirm</p>
							</div>
						)}

						{errorMessage && (
							<p className="reserve-modal-form__message reserve-modal-form__message--error">
								{errorMessage}
							</p>
						)}

						<div className="reserve-modal-form__actions">
							<button
								type="button"
								className="reserve-modal-form__secondary"
								onClick={handleCancelHold}
								disabled={isSubmitting}
							>
								Cancel
							</button>
							<button
								type="button"
								className="reserve-modal-form__primary"
								onClick={handleConfirm}
								disabled={isSubmitting}
							>
								{isSubmitting ? 'Confirming...' : 'Confirm Reservation'}
							</button>
						</div>
					</div>
				)}

				{/* ── Form ── */}
				{phase === 'form' && (
					<form className="reserve-modal-form" onSubmit={handleHoldSubmit}>
						<div className="reserve-modal-form__summary">
							<div className="booking-rules" padding="lg" elevated>
								<div style={{ marginBottom: '1.5rem' }}>
									<h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>
										Booking Rules
									</h3>
								</div>
								<div
									style={{
										display: 'grid',
										gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
										gap: '1.5rem',
									}}
								>
									{[
										{ label: 'Reservation Hours', value: '08:00 AM - 05:00 PM' },
										{ label: 'Max Stay', value: '3 hours' },
										{ label: 'Grace Period', value: '15 minutes' },
										{ label: 'Hold Window', value: '5 minutes' },
									].map(({ label, value }) => (
										<div key={label}>
											<span
												style={{
													fontSize: '0.75rem',
													fontWeight: 500,
													color: '#595959',
													textTransform: 'uppercase',
													letterSpacing: '0.05em',
													display: 'block',
													marginBottom: '0.5rem',
												}}
											>
												{label}
											</span>
											<span style={{ fontSize: '1rem', fontWeight: 600, color: '#1a1a1a' }}>
												{value}
											</span>
										</div>
									))}
								</div>
							</div>
						</div>

						<label className="reserve-modal-field">
							<span>Date</span>
							<input
								type="date"
								value={formData.date}
								min={todayStr}
								onChange={(e) => handleChange('date', e.target.value)}
								required
							/>
						</label>

						<div className="reserve-modal-field">
							<span>Start Time</span>
							<div className="reserve-time-row">
								<select
									value={formData.startTime}
									onChange={(e) => handleChange('startTime', e.target.value)}
								>
									{HOUR_OPTIONS.map((opt) => (
										<option key={opt.value} value={opt.value}>
											{opt.label}
										</option>
									))}
								</select>
								<div className="reserve-time-end">
									<span className="reserve-time-end__label">Ends at</span>
									<span className="reserve-time-end__value">
										{computeEndLabel(formData.startTime, formData.duration)}
									</span>
								</div>
							</div>
						</div>

						<label className="reserve-modal-field">
							<span>Duration</span>
							<select
								value={formData.duration}
								onChange={(e) => handleChange('duration', Number(e.target.value))}
							>
								<option value={1}>1 hour</option>
								<option value={2}>2 hours</option>
								<option value={3}>3 hours</option>
							</select>
						</label>

						{errorMessage && (
							<p className="reserve-modal-form__message reserve-modal-form__message--error">
								{errorMessage}
							</p>
						)}

						<div className="reserve-modal-form__actions">
							<button type="button" className="reserve-modal-form__secondary" onClick={handleClose}>
								Cancel
							</button>
							<button
								type="submit"
								className="reserve-modal-form__primary"
								disabled={!isAvailable || isSubmitting}
							>
								{isSubmitting ? 'Processing...' : 'Proceed'}
							</button>
						</div>
					</form>
				)}
			</Modal>
		</>
	);
}
