import {
	CalendarBlank,
	CaretDown as CaretDownIcon,
	CaretUp as CaretUpIcon,
	Clock,
	ClockCounterClockwise,
	Info,
	MapPin,
	Timer,
	User,
	X,
} from '@phosphor-icons/react';
import {
  formatStatusValue,
  getDuration,
	safeDate,
  statusBadgeClass,
  toDisplayDate,
  toDisplayTime,
} from '../services/reservationsConfig';
import './ReservationsGrid.css';

export default function ReservationsGrid({
	reservations = [],
	isLoading = false,
	sortColumn,
	sortDirection,
	onSortColumnChange,
	onSortDirectionChange,
	onOpenDetails,
	onOpenCancel,
}) {
	function formatReservationCode(reservation) {
		const rawCode = reservation.reservation_code ?? reservation.reservationCode ?? reservation.code;
		if (rawCode) return String(rawCode).startsWith('#') ? String(rawCode) : `#${String(rawCode)}`;
		return `#RES-${String(reservation.id)}`;
	}

	function formatRoleLabel(reservation) {
		const role = reservation.user_role ?? reservation.userRole ?? 'student';
		return String(role)
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (character) => character.toUpperCase());
	}

	function formatCreatedAt(createdAt) {
		const date = safeDate(createdAt);
		if (!date) return '—';

		return date.toLocaleTimeString('en-US', {
			hour: 'numeric',
			minute: '2-digit',
			hour12: true,
		});
	}

	function handleSort(column, defaultDirection) {
		if (sortColumn === column) {
			onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc');
			return;
		}

		onSortColumnChange(column);
		onSortDirectionChange(defaultDirection);
	}
	if (isLoading) {
		return <div className="reservations-grid__state">Loading reservations...</div>;
	}

	if (!reservations.length) {
		return <div className="reservations-grid__state">No reservations found for the selected filter.</div>;
	}

	return (
		<div className="reservations-grid" aria-label="Reservation cards">
			<div className="reservations-grid__sortbar" aria-label="Sort reservations">
				<button
					type="button"
					className="reservations-grid__sortbutton"
					onClick={() => handleSort('reservationDate', 'desc')}
				>
					Reservation Date
					<span className="reservations-grid__sorticon" aria-hidden="true">
						{sortColumn === 'reservationDate' && sortDirection === 'desc' ? (
							<CaretDownIcon size={18} weight="duotone" />
						) : sortColumn === 'reservationDate' && sortDirection === 'asc' ? (
							<CaretUpIcon size={18} weight="duotone" />
						) : (
							<CaretDownIcon size={18} weight="duotone" style={{ opacity: 0.25 }} />
						)}
					</span>
				</button>
				<button
					type="button"
					className="reservations-grid__sortbutton"
					onClick={() => handleSort('timeSlot', 'asc')}
				>
					Time Slot
					<span className="reservations-grid__sorticon" aria-hidden="true">
						{sortColumn === 'timeSlot' && sortDirection === 'desc' ? (
							<CaretDownIcon size={18} weight="duotone" />
						) : sortColumn === 'timeSlot' && sortDirection === 'asc' ? (
							<CaretUpIcon size={18} weight="duotone" />
						) : (
							<CaretDownIcon size={18} weight="duotone" style={{ opacity: 0.25 }} />
						)}
					</span>
				</button>
				<button
					type="button"
					className="reservations-grid__sortbutton"
					onClick={() => handleSort('duration', 'desc')}
				>
					Duration
					<span className="reservations-grid__sorticon" aria-hidden="true">
						{sortColumn === 'duration' && sortDirection === 'desc' ? (
							<CaretDownIcon size={18} weight="duotone" />
						) : sortColumn === 'duration' && sortDirection === 'asc' ? (
							<CaretUpIcon size={18} weight="duotone" />
						) : (
							<CaretDownIcon size={18} weight="duotone" style={{ opacity: 0.25 }} />
						)}
					</span>
				</button>
				<button
					type="button"
					className="reservations-grid__sortbutton"
					onClick={() => handleSort('status', 'asc')}
				>
					Status
					<span className="reservations-grid__sorticon" aria-hidden="true">
						{sortColumn === 'status' && sortDirection === 'desc' ? (
							<CaretDownIcon size={18} weight="duotone" />
						) : sortColumn === 'status' && sortDirection === 'asc' ? (
							<CaretUpIcon size={18} weight="duotone" />
						) : (
							<CaretDownIcon size={18} weight="duotone" style={{ opacity: 0.25 }} />
						)}
					</span>
				</button>
			</div>

			{reservations.map((reservation) => {
				const startTime = reservation.start_time ?? reservation.startTime;
				const endTime = reservation.end_time ?? reservation.endTime;
				const canCancel = reservation.status === 'pending' || reservation.status === 'approved' || reservation.status === 'confirmed';
				const userName = reservation.user_name ?? reservation.userName ?? 'Unknown User';
				const roomName = reservation.room_name ?? reservation.roomName ?? 'Learning Commons';
				const createdAt = formatCreatedAt(reservation.created_at ?? reservation.createdAt);
				const codeLabel = formatReservationCode(reservation);

				return (
					<article key={reservation.id} className="reservations-grid__card">
						<div className="reservations-grid__card-header">
							<div className="reservations-grid__status-wrap">
								<span className={statusBadgeClass(reservation.status)}>{String(formatStatusValue(reservation.status))}</span>
							</div>
						</div>

						<div className="reservations-grid__body">
							<div className="reservations-grid__line">
								<CalendarBlank size={16} weight="bold" />
								<strong className="reservations-grid__line-text">{toDisplayDate(reservation)}</strong>
							</div>

							<div className="reservations-grid__line">
								<Clock size={16} weight="bold" />
								<span className="reservations-grid__line-text">
									{toDisplayTime(startTime)} – {toDisplayTime(endTime)}
								</span>
							</div>

							<div className="reservations-grid__line">
								<Timer size={16} weight="bold" />
								<span className="reservations-grid__line-text">Duration: {getDuration(startTime, endTime)}</span>
							</div>

							<div className="reservations-grid__line reservations-grid__line--subtle">
								<ClockCounterClockwise size={16} weight="bold" />
								<span className="reservations-grid__line-text">Created at: {createdAt}</span>
							</div>
						</div>

						<div className="reservations-grid__actions">
							<button
								type="button"
								className="reservations-grid__action"
								aria-label="View reservation details"
								onClick={() => onOpenDetails(reservation)}
							>
								<Info size={16} weight="bold" />
								<span>View</span>
							</button>
							<button
								type="button"
								className="reservations-grid__action reservations-grid__action--danger"
								aria-label="Cancel reservation"
								disabled={!canCancel}
								onClick={() => {
									if (canCancel) onOpenCancel(reservation);
								}}
							>
								<X size={16} weight="bold" />
								<span>Cancel</span>
							</button>
						</div>
					</article>
				);
			})}
		</div>
	);
}