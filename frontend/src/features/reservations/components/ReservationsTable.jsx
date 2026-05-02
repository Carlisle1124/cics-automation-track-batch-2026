import { useEffect, useMemo, useRef, useState } from 'react';
import { cancelReservation, getReservationsByUser, subscribeToReservationChanges } from '../../../data/services/reservationService';
import { Info, MagnifyingGlass, X, CaretDown as CaretDownIcon, CaretUp as CaretUpIcon } from '@phosphor-icons/react';
import Modal from '../../../shared/components/Modal';
import './ReservationsTable.css';

const FILTER_TABS = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'ongoing', label: 'Ongoing' },
  { id: 'past', label: 'Past' },
  { id: 'all', label: 'All' },
];

const SORT_OPTIONS = ['Latest First', 'Earliest First', 'Status A-Z'];
const ITEMS_PER_PAGE = 8;

function safeDate(value) {
  const d = value ? new Date(value) : null;
  return d && !Number.isNaN(d.getTime()) ? d : null;
}

function toDisplayDate(reservation) {
  const value = reservation.reservation_date ?? reservation.reservationDate ?? reservation.date;
  const date = safeDate(value);
  return date
    ? date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : '—';
}

function toDisplayTime(timeValue) {
  if (!timeValue) return '—';
  const date = safeDate(`1970-01-01T${timeValue}`);
  if (!date) return String(timeValue);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getDuration(startTime, endTime) {
  if (!startTime || !endTime) return '—';

  const start = safeDate(`1970-01-01T${startTime}`);
  const end = safeDate(`1970-01-01T${endTime}`);
  if (!start || !end) return '—';

  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '—';

  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function statusBadgeClass(status) {
  switch (status) {
    case 'approved':
    case 'confirmed':
      return 'status-badge status-badge--confirmed';
    case 'completed':
      return 'status-badge status-badge--completed';
    case 'checked_in':
      return 'status-badge status-badge--checked-in';
    case 'cancelled':
    case 'cancelled_by_user':
      return 'status-badge status-badge--cancelled';
    case 'expired':
    case 'auto_cancelled':
      return 'status-badge status-badge--expired';
    case 'pending':
    default:
      return 'status-badge status-badge--pending';
  }
}

function formatStatusValue(status) {
  const s = status ?? 'pending';
  if (s === 'cancelled_by_user') return 'cancelled';
  return s;
}

function getReservationDate(reservation) {
  return safeDate(reservation.reservation_date ?? reservation.reservationDate ?? reservation.date);
}

function filterByTab(reservation, activeTab) {
  if (activeTab === 'all') return true;

  const now = new Date();
  const resDate = getReservationDate(reservation);
  if (!resDate) return activeTab === 'all';

  const startTime = reservation.start_time ?? reservation.startTime;
  const endTime = reservation.end_time ?? reservation.endTime;

  const startDateTime = startTime ? safeDate(`${resDate.toISOString().slice(0, 10)}T${startTime}`) : null;
  const endDateTime = endTime ? safeDate(`${resDate.toISOString().slice(0, 10)}T${endTime}`) : null;

  if (activeTab === 'ongoing') {
    if (startDateTime && endDateTime) {
      return now >= startDateTime && now <= endDateTime;
    }
    return now.toDateString() === resDate.toDateString();
  }

  if (activeTab === 'upcoming') {
    if (startDateTime) return now < startDateTime;
    return resDate >= new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  if (activeTab === 'past') {
    if (endDateTime) return now > endDateTime;
    return resDate < new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  return true;
}

export default function ReservationsTable({ userId }) {
  const [reservations, setReservations] = useState([]);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [sortBy, setSortBy] = useState('Latest First');
  const [sortColumn, setSortColumn] = useState('reservationDate');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);

  const sortMenuRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadReservations() {
      if (!userId) {
        setReservations([]);
        setIsLoading(false);
        return;
      }

      try {
        const [data] = await getReservationsByUser(userId);
        if (!active) return;
        setReservations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading reservations:', error);
        if (active) setReservations([]);
      } finally {
        if (active) setIsLoading(false);
      }
    }

    loadReservations();

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const subscription = subscribeToReservationChanges(({ type, data }) => {
      const ownerId = data?.userId ?? data?.user_id;
      if (userId && ownerId && ownerId !== userId) return;

      setReservations((prev) => {
        if (type === 'INSERT') return [data, ...prev];
        if (type === 'UPDATE') return prev.map((res) => (res.id === data.id ? { ...res, ...data } : res));
        if (type === 'DELETE') return prev.filter((res) => res.id !== data.id);
        return prev;
      });
    });

    return () => subscription.unsubscribe();
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    console.log('[ReservationsTable] Logged-in user reservations:', {
      userId,
      count: reservations.length,
      reservations,
    });
  }, [userId, reservations]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, sortColumn, sortDirection, sortBy]);

  useEffect(() => {
    if (!isSortMenuOpen) return;

    function handlePointerDown(event) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target)) {
        setIsSortMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') setIsSortMenuOpen(false);
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isSortMenuOpen]);

  const filteredReservations = useMemo(() => {
    const q = search.trim().toLowerCase();

    let list = reservations.filter((reservation) => filterByTab(reservation, activeTab));

    if (q) {
      list = list.filter((reservation) => {
        const haystack = [
          reservation.userName,
          reservation.user_name,
          reservation.user_email,
          reservation.roomName,
          reservation.room_name,
          reservation.status,
          reservation.reservationDate,
          reservation.reservation_date,
          reservation.date,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return haystack.includes(q);
      });
    }

    // Column-based sorting
    const dir = sortDirection === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      try {
        if (sortColumn === 'reservationDate') {
          const aDate = getReservationDate(a) ?? safeDate(a.createdAt ?? a.created_at) ?? new Date(0);
          const bDate = getReservationDate(b) ?? safeDate(b.createdAt ?? b.created_at) ?? new Date(0);
          return (aDate.getTime() - bDate.getTime()) * dir;
        }

        if (sortColumn === 'timeSlot') {
          const aVal = a.start_time ?? a.startTime ?? '';
          const bVal = b.start_time ?? b.startTime ?? '';
          return String(aVal).localeCompare(String(bVal)) * dir;
        }

        if (sortColumn === 'duration') {
          const aStart = safeDate(`1970-01-01T${a.start_time ?? a.startTime}`);
          const aEnd = safeDate(`1970-01-01T${a.end_time ?? a.endTime}`);
          const bStart = safeDate(`1970-01-01T${b.start_time ?? b.startTime}`);
          const bEnd = safeDate(`1970-01-01T${b.end_time ?? b.endTime}`);
          const aDur = aStart && aEnd ? aEnd.getTime() - aStart.getTime() : -Infinity;
          const bDur = bStart && bEnd ? bEnd.getTime() - bStart.getTime() : -Infinity;
          return (aDur - bDur) * dir;
        }

        if (sortColumn === 'status') {
          return String(a.status ?? '').localeCompare(String(b.status ?? '')) * dir;
        }

        return 0;
      } catch (e) {
        return 0;
      }
    });

    return list;
  }, [reservations, activeTab, search, sortBy, sortColumn, sortDirection]);

  const totalItems = filteredReservations.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedReservations = filteredReservations.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  function openCancelModal(reservation) {
    setCancelTarget(reservation);
    setShowCancelModal(true);
  }

  function closeCancelModal() {
    setShowCancelModal(false);
    setCancelTarget(null);
  }

  async function handleConfirmCancel() {
    if (!cancelTarget) return;

    try {
      await cancelReservation(cancelTarget.id);

      setReservations((prev) =>
        prev.map((item) =>
          item.id === cancelTarget.id
                ? {
                ...item,
                status: 'cancelled_by_user',
              }
            : item
        )
      );

      closeCancelModal();
    } catch (error) {
      console.error('Error cancelling reservation:', error);
      window.alert('Failed to cancel reservation. Please try again.');
    }
  }

  function handleOpenDetails(reservation) {
    setSelectedReservation(reservation);
  }

  function handleCloseDetails() {
    setSelectedReservation(null);
  }

  return (
    <div className="reservations-table table-shell reservations-table--student">
      <div className="reservations-table__header">
        <div className="reservations-table__tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className='tab-button__label'>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="reservations-table__search-wrap">
          <span className="reservations-table__search-icon" aria-hidden="true">
            <MagnifyingGlass size={16} weight="bold" />
          </span>
          <input
            name='search'
            type="search"
            className="reservations-table__search-input"
            placeholder="Search reservations..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search reservations"
          />
          {search ? (
            <button
              type="button"
              className="reservations-table__search-clear"
              aria-label="Clear search"
              onClick={() => setSearch('')}
            >
              <X size={14} weight="bold" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="reservations-table__wrapper">
        <table className="reservations-table__table">
          <thead>
            <tr className="table-header-row">
              <th className="table-header-cell">
                <button
                  type="button"
                  className="header-sort-btn"
                  onClick={() => {
                    if (sortColumn === 'reservationDate') setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortColumn('reservationDate');
                      setSortDirection('desc');
                    }
                  }}
                  aria-label="Sort by reservation date"
                >
                  Reservation Date
                  <span className="header-sort-icon" aria-hidden="true">
                    {sortColumn === 'reservationDate' && sortDirection === 'desc' ? (
                      <CaretDownIcon size={20} weight="duotone" />
                    ) : sortColumn === 'reservationDate' && sortDirection === 'asc' ? (
                      <CaretUpIcon size={20} weight="duotone" />
                    ) : (
                      <CaretDownIcon size={20} weight="duotone" style={{ opacity: 0.25 }} />
                    )}
                  </span>
                </button>
              </th>
              <th className="table-header-cell">
                <button
                  type="button"
                  className="header-sort-btn"
                  onClick={() => {
                    if (sortColumn === 'timeSlot') setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortColumn('timeSlot');
                      setSortDirection('asc');
                    }
                  }}
                  aria-label="Sort by time slot"
                >
                  Time Slot
                  <span className="header-sort-icon" aria-hidden="true">
                    {sortColumn === 'timeSlot' && sortDirection === 'desc' ? (
                      <CaretDownIcon size={20} weight="duotone" />
                    ) : sortColumn === 'timeSlot' && sortDirection === 'asc' ? (
                      <CaretUpIcon size={20} weight="duotone" />
                    ) : (
                      <CaretDownIcon size={20} weight="duotone" style={{ opacity: 0.25 }} />
                    )}
                  </span>
                </button>
              </th>
              <th className="table-header-cell">
                <button
                  type="button"
                  className="header-sort-btn"
                  onClick={() => {
                    if (sortColumn === 'duration') setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortColumn('duration');
                      setSortDirection('desc');
                    }
                  }}
                  aria-label="Sort by duration"
                >
                  Duration
                  <span className="header-sort-icon" aria-hidden="true">
                    {sortColumn === 'duration' && sortDirection === 'desc' ? (
                      <CaretDownIcon size={20} weight="duotone" />
                    ) : sortColumn === 'duration' && sortDirection === 'asc' ? (
                      <CaretUpIcon size={20} weight="duotone" />
                    ) : (
                      <CaretDownIcon size={20} weight="duotone" style={{ opacity: 0.25 }} />
                    )}
                  </span>
                </button>
              </th>
              <th className="table-header-cell">
                <button
                  type="button"
                  className="header-sort-btn"
                  onClick={() => {
                    if (sortColumn === 'status') setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                    else {
                      setSortColumn('status');
                      setSortDirection('asc');
                    }
                  }}
                  aria-label="Sort by status"
                >
                  Status
                  <span className="header-sort-icon" aria-hidden="true">
                    {sortColumn === 'status' && sortDirection === 'desc' ? (
                      <CaretDownIcon size={20} weight="duotone" />
                    ) : sortColumn === 'status' && sortDirection === 'asc' ? (
                      <CaretUpIcon size={20} weight="duotone" />
                    ) : (
                      <CaretDownIcon size={20} weight="duotone" style={{ opacity: 0.25 }} />
                    )}
                  </span>
                </button>
              </th>
              <th className="table-header-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr className="table-body-row">
                <td className="table-cell" colSpan={5}>
                  Loading reservations...
                </td>
              </tr>
            ) : paginatedReservations.length > 0 ? (
              paginatedReservations.map((reservation) => {
                const startTime = reservation.start_time ?? reservation.startTime;
                const endTime = reservation.end_time ?? reservation.endTime;
                const dateLabel = toDisplayDate(reservation);
                const startLabel = toDisplayTime(startTime);
                const endLabel = toDisplayTime(endTime);

                return (
                  <tr key={reservation.id} className="table-body-row">
                    <td className="table-cell">
                      <span className="date">{dateLabel}</span>
                    </td>
                    <td className="table-cell">
                      <span className="time"> 
                        <div className='time-pill'>{startLabel}</div> - 
                        <div className='time-pill'>{endLabel}</div>
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className="time">{getDuration(startTime, endTime)}</span>
                    </td>
                    <td className="table-cell">
                      <span className={statusBadgeClass(reservation.status)}>{String(formatStatusValue(reservation.status))}</span>
                    </td>
                    <td className="table-cell">
                      <div className="action-menu-container">
                        <button
                          type="button"
                          className="action-menu-btn"
                          aria-label="View reservation details"
                          onClick={() => handleOpenDetails(reservation)}
                        >
                          <Info size={16} weight="bold" />
                        </button>
                        {(reservation.status === 'pending' || reservation.status === 'approved' || reservation.status === 'confirmed') && (
                          <button
                            type="button"
                            className="action-menu-btn"
                            aria-label="Cancel reservation"
                            onClick={() => openCancelModal(reservation)}
                          >
                            <X size={16} weight="bold" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr className="table-body-row">
                <td className="table-cell" colSpan={5}>
                  No reservations found for the selected filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="reservations-table__footer">
        <div className="pagination-info">
          Displaying {paginatedReservations.length} of {totalItems} {totalItems === 1 ? 'reservation' : 'reservations'}
        </div>

        <div className="pagination-controls">
          <button
            type="button"
            className="pagination-btn"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={safePage === 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          <button
            type="button"
            className="pagination-btn"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={safePage === totalPages}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedReservation)}
        title="Reservation Details"
        onClose={handleCloseDetails}
        className="ui-modal--flexible reservations-table__details-modal"
      >
        {selectedReservation ? (
          <div className="reservations-table__details-content">
            <div className="reservations-table__details-row">
              <span className="reservations-table__details-label">Date</span>
              <span className="reservations-table__details-value">{toDisplayDate(selectedReservation)}</span>
            </div>
            <div className="reservations-table__details-row">
              <span className="reservations-table__details-label">Time</span>
              <span className="reservations-table__details-value">
                {toDisplayTime(selectedReservation.start_time ?? selectedReservation.startTime)} - {toDisplayTime(selectedReservation.end_time ?? selectedReservation.endTime)}
              </span>
            </div>
            <div className="reservations-table__details-row">
              <span className="reservations-table__details-label">Duration</span>
              <span className="reservations-table__details-value">
                {getDuration(selectedReservation.start_time ?? selectedReservation.startTime, selectedReservation.end_time ?? selectedReservation.endTime)}
              </span>
            </div>
            <div className="reservations-table__details-row">
              <span className="reservations-table__details-label">Status</span>
              <span className={statusBadgeClass(selectedReservation.status)}>
                {String(formatStatusValue(selectedReservation.status))}
              </span>
            </div>
            {selectedReservation.denial_reason ? (
              <div className="reservations-table__details-row reservations-table__details-row--stacked">
                <span className="reservations-table__details-label">Denial Reason</span>
                <p className="reservations-table__details-reason">{selectedReservation.denial_reason}</p>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
      <Modal
        isOpen={showCancelModal}
        title="Cancel Reservation"
        onClose={closeCancelModal}
        className="ui-modal--flexible reservations-table__cancel-modal"
      >
        {cancelTarget ? (
          <div className="reservations-table__cancel-content">
            <p>
              Are you sure you want to cancel the reservation on <strong>{toDisplayDate(cancelTarget)}</strong> at <strong>{toDisplayTime(cancelTarget.start_time ?? cancelTarget.startTime)} - {toDisplayTime(cancelTarget.end_time ?? cancelTarget.endTime)}</strong>?
            </p>
            <div className="reservations-table__modal-actions">
              <button type="button" className="btn btn--danger" onClick={handleConfirmCancel}>
                Confirm Cancel
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
