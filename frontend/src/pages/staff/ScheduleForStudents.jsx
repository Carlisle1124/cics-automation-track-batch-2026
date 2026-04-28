import { useEffect, useMemo, useRef, useState } from 'react';
import { getCurrentUser, getUsers } from '../../data/services/authService';
import { createReservation } from '../../data/services/reservationService';
import { ROOMS, TIME_SLOTS } from '../../data/mock/mockData';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import './ScheduleForStudents.css';

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function toInputDate(date) {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');

	return `${year}-${month}-${day}`;
}

function formatDateLabel(value) {
	if (!value) return 'Select date';

	const date = new Date(`${value}T00:00:00`);

	if (Number.isNaN(date.getTime())) return 'Select date';

	return date.toLocaleDateString('en-US', {
		month: '2-digit',
		day: '2-digit',
		year: 'numeric',
	});
}

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
	const [isPageLoading, setIsPageLoading] = useState(true);
	const [openMenu, setOpenMenu] = useState(null);
	const [visibleMonth, setVisibleMonth] = useState(() => {
		const today = new Date();

		return new Date(today.getFullYear(), today.getMonth(), 1);
	});

	const studentMenuRef = useRef(null);
	const dateMenuRef = useRef(null);
	const timeSlotMenuRef = useRef(null);

	useEffect(() => {
		const previousTitle = document.title;
		document.title = 'Schedule for Students - UST CICS Learning Common Room';

		let active = true;

		async function loadData() {
			try {
				const [currentUser, allUsers] = await Promise.all([
					getCurrentUser(),
					getUsers(),
					new Promise((resolve) => setTimeout(resolve, 700)),
				]);

				if (!active) return;

				setStaffUser(currentUser);

				const studentUsers = allUsers.filter((user) => user.role === 'student');
				setStudents(studentUsers);
				setFormValues((previous) => ({
					...previous,
					studentId: previous.studentId || studentUsers[0]?.id || '',
				}));
			} finally {
				if (active) {
					setIsPageLoading(false);
				}
			}
		}

		loadData();

		return () => {
			active = false;
			document.title = previousTitle;
		};
	}, []);

	const selectedStudent = useMemo(
		() => students.find((student) => student.id === formValues.studentId) ?? null,
		[formValues.studentId, students]
	);

	const selectedTimeSlot = useMemo(
		() => TIME_SLOTS.find((slot) => slot.id === formValues.timeSlot) ?? null,
		[formValues.timeSlot]
	);

	const visibleMonthLabel = useMemo(
		() =>
			visibleMonth.toLocaleDateString('en-US', {
				month: 'long',
				year: 'numeric',
			}),
		[visibleMonth]
	);

	const calendarDays = useMemo(() => {
		const year = visibleMonth.getFullYear();
		const month = visibleMonth.getMonth();
		const firstDayOfMonth = new Date(year, month, 1);
		const startDate = new Date(year, month, 1 - firstDayOfMonth.getDay());

		return Array.from({ length: 42 }, (_, index) => {
			const date = new Date(startDate);
			date.setDate(startDate.getDate() + index);

			const value = toInputDate(date);

			return {
				value,
				label: date.getDate(),
				isCurrentMonth: date.getMonth() === month,
				isSelected: value === formValues.date,
			};
		});
	}, [formValues.date, visibleMonth]);

	useEffect(() => {
		if (!openMenu) return;

		function handlePointerDown(event) {
			const menuRefs = [studentMenuRef, dateMenuRef, timeSlotMenuRef];
			const isInsideMenu = menuRefs.some((menuRef) =>
				menuRef.current?.contains(event.target)
			);

			if (!isInsideMenu) {
				setOpenMenu(null);
			}
		}

		function handleEscape(event) {
			if (event.key === 'Escape') {
				setOpenMenu(null);
			}
		}

		document.addEventListener('mousedown', handlePointerDown);
		document.addEventListener('touchstart', handlePointerDown);
		document.addEventListener('keydown', handleEscape);

		return () => {
			document.removeEventListener('mousedown', handlePointerDown);
			document.removeEventListener('touchstart', handlePointerDown);
			document.removeEventListener('keydown', handleEscape);
		};
	}, [openMenu]);

	function updateField(field, value) {
		setFormValues((previous) => ({
			...previous,
			[field]: value,
		}));
	}

	function toggleMenu(menuName) {
		setOpenMenu((currentMenu) => (currentMenu === menuName ? null : menuName));
	}

	function moveVisibleMonth(amount) {
		setVisibleMonth((previous) => {
			const nextMonth = new Date(previous);
			nextMonth.setMonth(previous.getMonth() + amount);

			return new Date(nextMonth.getFullYear(), nextMonth.getMonth(), 1);
		});
	}

	function handleDateSelect(value) {
		updateField('date', value);
		setOpenMenu(null);
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
		<section
			className={`schedule-students-page ${
				isPageLoading
					? 'schedule-students-page--content-hidden'
					: 'schedule-students-page--content-visible'
			}`}
		>
			<PageHeader
				title="Schedule for Students"
				subtitle="Create a reservation on behalf of students who request scheduling help."
			/>

			<div className="schedule-students__surface">
				<form className="schedule-students__form" onSubmit={handleSubmit}>
					<div className="schedule-students__field schedule-students__field--full">
						<span id="schedule-students-student-label">Student</span>

						<div className="schedule-students__menu-field" ref={studentMenuRef}>
							<button
								type="button"
								className={`schedule-students__menu-trigger ${
									openMenu === 'student' ? 'schedule-students__menu-trigger--open' : ''
								}`}
								aria-haspopup="listbox"
								aria-expanded={openMenu === 'student'}
								aria-labelledby="schedule-students-student-label"
								onClick={() => toggleMenu('student')}
							>
								<span className="schedule-students__menu-trigger-label">
									{selectedStudent
										? `${selectedStudent.name} (${selectedStudent.studentId})`
										: 'Select a student'}
								</span>
								<span className="schedule-students__menu-trigger-icon" aria-hidden="true" />
							</button>

							{openMenu === 'student' ? (
								<div className="schedule-students__menu" role="listbox">
									{students.length > 0 ? (
										students.map((student) => (
											<button
												key={student.id}
												type="button"
												role="option"
												aria-selected={formValues.studentId === student.id}
												className={`schedule-students__menu-option ${
													formValues.studentId === student.id ? 'is-active' : ''
												}`}
												onClick={() => {
													updateField('studentId', student.id);
													setOpenMenu(null);
												}}
											>
												<span>{student.name} ({student.studentId})</span>
												<span className="schedule-students__menu-option-indicator" aria-hidden="true">
													{formValues.studentId === student.id ? '✓' : ''}
												</span>
											</button>
										))
									) : (
										<div className="schedule-students__menu-empty">No students available.</div>
									)}
								</div>
							) : null}
						</div>
					</div>

					<div className="schedule-students__field">
						<span id="schedule-students-date-label">Date</span>

						<div className="schedule-students__menu-field" ref={dateMenuRef}>
							<button
								type="button"
								className={`schedule-students__menu-trigger schedule-students__date-trigger ${
									openMenu === 'date' ? 'schedule-students__menu-trigger--open' : ''
								}`}
								aria-haspopup="dialog"
								aria-expanded={openMenu === 'date'}
								aria-labelledby="schedule-students-date-label"
								onClick={() => toggleMenu('date')}
							>
								<span className="schedule-students__menu-trigger-label">
									{formatDateLabel(formValues.date)}
								</span>
								<span className="schedule-students__date-trigger-icon" aria-hidden="true">▦</span>
							</button>

							{openMenu === 'date' ? (
								<div className="schedule-students__date-menu" role="dialog" aria-label="Choose reservation date">
									<div className="schedule-students__calendar-header">
										<button
											type="button"
											className="schedule-students__calendar-nav"
											onClick={() => moveVisibleMonth(-1)}
											aria-label="Previous month"
										>
											‹
										</button>

										<div className="schedule-students__calendar-month">{visibleMonthLabel}</div>

										<button
											type="button"
											className="schedule-students__calendar-nav"
											onClick={() => moveVisibleMonth(1)}
											aria-label="Next month"
										>
											›
										</button>
									</div>

									<div className="schedule-students__calendar-grid schedule-students__calendar-grid--weekdays">
										{WEEKDAY_LABELS.map((day) => (
											<span key={day}>{day}</span>
										))}
									</div>

									<div className="schedule-students__calendar-grid">
										{calendarDays.map((day) => (
											<button
												key={day.value}
												type="button"
												className={`schedule-students__calendar-day ${
													day.isCurrentMonth ? '' : 'schedule-students__calendar-day--muted'
												} ${day.isSelected ? 'schedule-students__calendar-day--selected' : ''}`}
												onClick={() => handleDateSelect(day.value)}
											>
												{day.label}
											</button>
										))}
									</div>

									<div className="schedule-students__calendar-footer">
										<button
											type="button"
											className="schedule-students__calendar-today"
											onClick={() => handleDateSelect(toInputDate(new Date()))}
										>
											Today
										</button>
									</div>
								</div>
							) : null}
						</div>
					</div>

					<div className="schedule-students__field">
						<span id="schedule-students-time-label">Time Slot</span>

						<div className="schedule-students__menu-field" ref={timeSlotMenuRef}>
							<button
								type="button"
								className={`schedule-students__menu-trigger ${
									openMenu === 'timeSlot' ? 'schedule-students__menu-trigger--open' : ''
								}`}
								aria-haspopup="listbox"
								aria-expanded={openMenu === 'timeSlot'}
								aria-labelledby="schedule-students-time-label"
								onClick={() => toggleMenu('timeSlot')}
							>
								<span className="schedule-students__menu-trigger-label">
									{selectedTimeSlot
										? `${selectedTimeSlot.start} - ${selectedTimeSlot.end}`
										: 'Select a time slot'}
								</span>
								<span className="schedule-students__menu-trigger-icon" aria-hidden="true" />
							</button>

							{openMenu === 'timeSlot' ? (
								<div className="schedule-students__menu" role="listbox">
									{TIME_SLOTS.map((slot) => (
										<button
											key={slot.id}
											type="button"
											role="option"
											aria-selected={formValues.timeSlot === slot.id}
											className={`schedule-students__menu-option ${
												formValues.timeSlot === slot.id ? 'is-active' : ''
											}`}
											onClick={() => {
												updateField('timeSlot', slot.id);
												setOpenMenu(null);
											}}
										>
											<span>{slot.start} - {slot.end}</span>
											<span className="schedule-students__menu-option-indicator" aria-hidden="true">
												{formValues.timeSlot === slot.id ? '✓' : ''}
											</span>
										</button>
									))}
								</div>
							) : null}
						</div>
					</div>

					<label className="schedule-students__field schedule-students__field--full">
						<span>Notes</span>
						<textarea
							value={formValues.notes}
							onChange={(event) => updateField('notes', event.target.value)}
							rows={4}
							placeholder="Optional context for the student's request"
						/>
					</label>

					<div className="schedule-students__actions schedule-students__field--full">
						<button type="submit" className="schedule-students__submit" disabled={isSubmitting}>
							{isSubmitting ? 'Saving...' : 'Create Reservation'}
						</button>
					</div>
				</form>
			</div>

			{selectedStudent ? (
				<p className="schedule-students__status">
					Scheduling for: <strong>{selectedStudent.name}</strong>
				</p>
			) : null}
			{statusMessage ? <p className="schedule-students__message">{statusMessage}</p> : null}
			{isPageLoading ? (
				<div
					className="schedule-students-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading schedule for students page"
				>
					<div className="schedule-students-transition__card">
						<img
							src={cicsLogo}
							alt="UST CICS logo"
							className="schedule-students-transition__logo"
						/>
						<div className="schedule-students-transition__loader" aria-hidden="true">
							<span></span>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
