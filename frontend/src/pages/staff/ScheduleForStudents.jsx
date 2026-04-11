import { useEffect, useMemo, useState } from 'react';
import { getCurrentUser, getUsers } from '../../data/services/authService';
import { createReservation } from '../../data/services/reservationService';
import { ROOMS, TIME_SLOTS } from '../../data/mock/mockData';
import PageHeader from '../../shared/components/PageHeader';

export default function ScheduleForStudents() {
	const [staffUser, setStaffUser] = useState(null);
	const [students, setStudents] = useState([]);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [statusMessage, setStatusMessage] = useState('');
	const [formValues, setFormValues] = useState({
		studentId: '',
		date: new Date().toISOString().slice(0, 10),
		timeSlot: TIME_SLOTS[0]?.id ?? '',
		roomId: ROOMS[0]?.id ?? '',
		notes: '',
	});

	useEffect(() => {
		let active = true;

		async function loadData() {
			const [currentUser, allUsers] = await Promise.all([getCurrentUser(), getUsers()]);

			if (!active) return;

			setStaffUser(currentUser);
			const studentUsers = allUsers.filter((user) => user.role === 'student');
			setStudents(studentUsers);
			setFormValues((previous) => ({
				...previous,
				studentId: previous.studentId || studentUsers[0]?.id || '',
			}));
		}

		loadData();

		return () => {
			active = false;
		};
	}, []);

	const selectedStudent = useMemo(
		() => students.find((student) => student.id === formValues.studentId) ?? null,
		[formValues.studentId, students]
	);

	function updateField(field, value) {
		setFormValues((previous) => ({
			...previous,
			[field]: value,
		}));
	}

	async function handleSubmit(event) {
		event.preventDefault();

		if (!formValues.studentId) {
			setStatusMessage('Select a student to continue.');
			return;
		}

		setIsSubmitting(true);
		setStatusMessage('Creating reservation request...');
		const schedulingStaffId = staffUser?.id ?? null;
		const schedulingStaffName = staffUser?.name ?? null;

		try {
			const reservation = await createReservation({
				userId: formValues.studentId,
				roomId: formValues.roomId,
				date: formValues.date,
				slotIds: [formValues.timeSlot],
				notes: formValues.notes,
				scheduledByStaffId: schedulingStaffId,
				scheduledByStaffName: schedulingStaffName,
			});

			setStatusMessage(
				`Reservation ${reservation.id} created for ${selectedStudent?.name ?? 'the student'}.`
			);
			// TODO(backend): Persist staff scheduling metadata and audit logs
			// in a dedicated endpoint for "schedule-on-behalf" actions.
		} catch (error) {
			console.error('Failed to create a staff-scheduled reservation.', error);
			setStatusMessage('Unable to create the reservation right now.');
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<section style={{ padding: '2rem' }}>
			<PageHeader
				title="Schedule for Students"
				subtitle="Create a reservation on behalf of students who request scheduling help."
			/>

			<form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', marginTop: '1rem', maxWidth: '480px' }}>
				<label>
					<span>Student</span>
					<select
						value={formValues.studentId}
						onChange={(event) => updateField('studentId', event.target.value)}
						required
					>
						{students.map((student) => (
							<option key={student.id} value={student.id}>
								{student.name} ({student.studentId})
							</option>
						))}
					</select>
				</label>

				<label>
					<span>Date</span>
					<input
						type="date"
						value={formValues.date}
						onChange={(event) => updateField('date', event.target.value)}
						required
					/>
				</label>

				<label>
					<span>Time Slot</span>
					<select
						value={formValues.timeSlot}
						onChange={(event) => updateField('timeSlot', event.target.value)}
						required
					>
						{TIME_SLOTS.map((slot) => (
							<option key={slot.id} value={slot.id}>
								{slot.start} - {slot.end}
							</option>
						))}
					</select>
				</label>

				<label>
					<span>Room</span>
					<select
						value={formValues.roomId}
						onChange={(event) => updateField('roomId', event.target.value)}
						required
					>
						{ROOMS.map((room) => (
							<option key={room.id} value={room.id}>
								{room.name}
							</option>
						))}
					</select>
				</label>

				<label>
					<span>Notes</span>
					<textarea
						value={formValues.notes}
						onChange={(event) => updateField('notes', event.target.value)}
						rows={4}
						placeholder="Optional context for the student's request"
					/>
				</label>

				<button type="submit" disabled={isSubmitting}>
					{isSubmitting ? 'Saving...' : 'Create Reservation'}
				</button>
			</form>

			{selectedStudent ? (
				<p style={{ marginTop: '1rem' }}>
					Scheduling for: <strong>{selectedStudent.name}</strong>
				</p>
			) : null}
			{statusMessage ? <p style={{ marginTop: '0.75rem' }}>{statusMessage}</p> : null}
		</section>
	);
}
