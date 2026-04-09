import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../../shared/components/Button';
import Modal from '../../../shared/components/Modal';
import Tabs from '../../../shared/components/Tabs';
import { getCurrentUser } from '../../../data/services/authService';
import { createReservation } from '../../../data/services/reservationService';
import { ROOMS, TIME_SLOTS, USERS } from '../../../data/mock/mockData';
import './ReserveButton.css';

export default function ReserveButton({ isAvailable = true, onClick = null, role = 'student' }) {
	const navigate = useNavigate();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [currentUser, setCurrentUser] = useState(null);
	const [formData, setFormData] = useState({
		date: new Date().toISOString().slice(0, 10),
		timeSlot: TIME_SLOTS[0]?.id ?? '',
		roomId: ROOMS[0]?.id ?? '',
		notes: '',
		inviteMode: 'self',
	});
	const [inviteSearch, setInviteSearch] = useState('');
	const [selectedInvitees, setSelectedInvitees] = useState([]);
	const [submitMessage, setSubmitMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	useEffect(() => {
		let active = true;

		async function loadUser() {
			const user = await getCurrentUser();
			if (!active) return;
			setCurrentUser(user);
		}

		loadUser();

		return () => {
			active = false;
		};
	}, []);

	const selectedRoom = useMemo(
		() => ROOMS.find((room) => room.id === formData.roomId) ?? ROOMS[0] ?? null,
		[formData.roomId]
	);

	const inviteCandidates = useMemo(() => {
		const query = inviteSearch.trim().toLowerCase();

		return USERS.filter((user) => user.role === 'student' && user.id !== currentUser?.id)
			.filter((user) => !selectedInvitees.some((invitee) => invitee.id === user.id))
			.filter((user) => {
				if (!query) return true;
				return [user.name, user.email, user.studentId]
					.filter(Boolean)
					.some((field) => field.toLowerCase().includes(query));
			});
	}, [currentUser?.id, inviteSearch, selectedInvitees]);

	function handleClick(event) {
		if (onClick) {
			onClick(event);
			return;
		}

		setIsModalOpen(true);
		setSubmitMessage('');
	}

	function handleChange(key, value) {
		setFormData((prev) => ({
			...prev,
			[key]: value,
		}));
	}

	function addInvitee(user) {
		setSelectedInvitees((prev) => [...prev, user]);
		setInviteSearch('');
	}

	function removeInvitee(userId) {
		setSelectedInvitees((prev) => prev.filter((invitee) => invitee.id !== userId));
	}

	async function handleSubmit(event) {
		event.preventDefault();

		if (!currentUser) {
			setSubmitMessage('Please wait while we load your account.');
			return;
		}

		setIsSubmitting(true);
		setSubmitMessage('Submitting reservation...');

		const invitees = formData.inviteMode === 'invite' ? selectedInvitees : [];

		if (formData.inviteMode === 'invite' && invitees.length === 0) {
			setSubmitMessage('Search and add at least one student to invite others.');
			setIsSubmitting(false);
			return;
		}

		try {
			const createdReservation = await createReservation({
				userId: currentUser.id,
				roomId: formData.roomId,
				date: formData.date,
				slotIds: [formData.timeSlot],
				notes: formData.notes,
				reservationMode: formData.inviteMode,
				invitees,
			});

			setSubmitMessage(`Reservation created successfully: ${createdReservation.id}`);
		} catch (error) {
			setSubmitMessage('Unable to create reservation right now. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			<Button
				className="reserve-fab"
				onClick={handleClick}
				disabled={!isAvailable}
				aria-label={isAvailable ? 'Reserve a slot' : 'No slots available'}
				style={{
					width: 'auto',
				}}
			>
				<span className="reserve-fab__icon">+</span>
				<span className="reserve-fab__label">{isAvailable ? 'Reserve' : 'Full'}</span>
			</Button>

			<Modal
				isOpen={isModalOpen}
				title="Reserve a Slot"
				onClose={() => setIsModalOpen(false)}
			>
				<form className="reserve-modal-form" onSubmit={handleSubmit}>
					<Tabs
						ariaLabel="Reservation mode"
						tabs={[
							{ value: 'self', label: 'Self Only' },
							{ value: 'invite', label: 'Invite Others' },
						]}
						value={formData.inviteMode}
						onChange={(value) => handleChange('inviteMode', value)}
						className="reserve-modal-form__tabs"
					/>

					<div className="reserve-modal-form__summary">
						<p>Booking for: <strong>{currentUser?.name ?? 'Current user'}</strong></p>
						<p>Role: <strong>{role}</strong></p>
					</div>

					{formData.inviteMode === 'invite' ? (
						<div className="reserve-modal-form__search-box">
							<label className="reserve-modal-field">
								<span>Search Students</span>
								<input
									type="text"
									value={inviteSearch}
									onChange={(event) => setInviteSearch(event.target.value)}
									placeholder="Search by name, email, or student ID"
								/>
							</label>

							{selectedInvitees.length > 0 ? (
								<div className="reserve-modal-form__chips" aria-label="Selected invitees">
									{selectedInvitees.map((invitee) => (
										<button
											type="button"
											key={invitee.id}
											className="reserve-modal-form__chip"
											onClick={() => removeInvitee(invitee.id)}
											aria-label={`Remove ${invitee.name}`}
										>
											<span>{invitee.name}</span>
											<span aria-hidden="true">×</span>
										</button>
									))}
								</div>
							) : null}

							{inviteCandidates.length > 0 ? (
								<div className="reserve-modal-form__search-results" role="listbox" aria-label="Student search results">
									{inviteCandidates.map((user) => (
										<button
											type="button"
											key={user.id}
											className="reserve-modal-form__result"
											onClick={() => addInvitee(user)}
										>
											<div className="reserve-modal-form__result-main">
												<strong>{user.name}</strong>
												<span>{user.email}</span>
											</div>
											<div className="reserve-modal-form__result-meta">{user.studentId}</div>
										</button>
									))}
								</div>
							) : (
								<p className="reserve-modal-form__hint">No matching students found.</p>
							)}
						</div>
					) : null}

					<label className="reserve-modal-field">
						<span>Date</span>
						<input type="date" value={formData.date} onChange={(event) => handleChange('date', event.target.value)} required />
					</label>

					<label className="reserve-modal-field">
						<span>Time Slot</span>
						<select value={formData.timeSlot} onChange={(event) => handleChange('timeSlot', event.target.value)}>
							{TIME_SLOTS.map((slot) => (
								<option key={slot.id} value={slot.id}>
									{slot.start} - {slot.end}
								</option>
							))}
						</select>
					</label>

					<label className="reserve-modal-field">
						<span>Room</span>
						<select value={formData.roomId} onChange={(event) => handleChange('roomId', event.target.value)}>
							{ROOMS.map((room) => (
								<option key={room.id} value={room.id}>
									{room.name}
								</option>
							))}
						</select>
					</label>

					<label className="reserve-modal-field">
						<span>Notes</span>
						<textarea
							rows="4"
							value={formData.notes}
							onChange={(event) => handleChange('notes', event.target.value)}
							placeholder="Optional message for your reservation"
						/>
					</label>

					<div className="reserve-modal-form__meta">
						<span>Selected room capacity: {selectedRoom?.capacity ?? 0}</span>
						<span>Available now: {isAvailable ? 'Yes' : 'No'}</span>
					</div>

					<div className="reserve-modal-form__actions">
						<button type="button" className="reserve-modal-form__secondary" onClick={() => setIsModalOpen(false)}>
							Cancel
						</button>
						<button type="submit" className="reserve-modal-form__primary" disabled={!isAvailable || isSubmitting}>
							{isSubmitting ? 'Saving...' : 'Confirm Reservation'}
						</button>
					</div>

					{submitMessage ? <p className="reserve-modal-form__message">{submitMessage}</p> : null}
				</form>
			</Modal>
		</>
	);
}
