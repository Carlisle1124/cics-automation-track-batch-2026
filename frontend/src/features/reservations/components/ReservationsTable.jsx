import { useState } from 'react';
import './ReservationsTable.css';

// Extended mock data matching the structure in mockData.js
const USERS_DATA = [
  { id: 'user-001', name: 'Juan Dela Cruz', studentId: '2022-00001' },
  { id: 'user-002', name: 'Maria Santos', studentId: '2022-00002' },
  { id: 'user-003', name: 'Carlos Mendoza', studentId: '2022-00003' },
  { id: 'user-004', name: 'Ana Garcia', studentId: '2022-00004' },
  { id: 'user-005', name: 'Luis Torres', studentId: '2022-00005' },
  { id: 'user-006', name: 'Rosa Rivera', studentId: '2022-00006' },
];

const ROOMS_DATA = [
  { id: 'room-001', name: 'Learning Commons' },
];

const TIME_SLOTS_DATA = {
  'ts-08': { start: '08:00', end: '09:00' },
  'ts-09': { start: '09:00', end: '10:00' },
  'ts-10': { start: '10:00', end: '11:00' },
  'ts-11': { start: '11:00', end: '12:00' },
  'ts-12': { start: '12:00', end: '13:00' },
  'ts-13': { start: '13:00', end: '14:00' },
  'ts-14': { start: '14:00', end: '15:00' },
  'ts-15': { start: '15:00', end: '16:00' },
  'ts-16': { start: '16:00', end: '17:00' },
};

const RESERVATIONS_DATA = [
  {
    id: 'res-001',
    userId: 'user-001',
    roomId: 'room-001',
    date: '2026-04-09',
    slotIds: ['ts-10', 'ts-11'],
    status: 'confirmed',
    checkInTime: null,
    expiryTime: '2026-04-09T10:15:00Z',
    createdAt: '2026-04-08T09:00:00Z',
  },
  {
    id: 'res-002',
    userId: 'user-002',
    roomId: 'room-001',
    date: '2026-04-09',
    slotIds: ['ts-09'],
    status: 'checked_in',
    checkInTime: '2026-04-09T09:05:00Z',
    createdAt: '2026-04-08T08:30:00Z',
  },
  {
    id: 'res-003',
    userId: 'user-003',
    roomId: 'room-001',
    date: '2026-04-08',
    slotIds: ['ts-14', 'ts-15'],
    status: 'completed',
    checkInTime: '2026-04-08T14:02:00Z',
    createdAt: '2026-04-07T10:00:00Z',
  },
  {
    id: 'res-004',
    userId: 'user-004',
    roomId: 'room-001',
    date: '2026-04-09',
    slotIds: ['ts-13'],
    status: 'pending',
    checkInTime: null,
    expiryTime: '2026-04-09T12:45:00Z',
    createdAt: '2026-04-09T12:00:00Z',
  },
  {
    id: 'res-005',
    userId: 'user-005',
    roomId: 'room-001',
    date: '2026-04-08',
    slotIds: ['ts-12'],
    status: 'completed',
    checkInTime: '2026-04-08T12:08:00Z',
    createdAt: '2026-04-07T09:30:00Z',
  },
  {
    id: 'res-006',
    userId: 'user-006',
    roomId: 'room-001',
    date: '2026-04-07',
    slotIds: ['ts-08', 'ts-09', 'ts-10'],
    status: 'completed',
    checkInTime: '2026-04-07T08:05:00Z',
    createdAt: '2026-04-06T14:00:00Z',
  },
];

const TABS = [
  { id: 'all', label: 'All Entries' },
  { id: 'confirmed', label: 'Upcoming' },
  { id: 'completed', label: 'Past Reservations' },
];

const SORT_OPTIONS = ['Latest First', 'Earliest First', 'User A-Z'];

export default function ReservationsTable({ userRole = 'student', userId = null }) {
  const [activeTab, setActiveTab] = useState('all');
  const [sortBy, setSortBy] = useState('Latest First');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Get user name by ID
  const getUserName = (userId) => {
    const user = USERS_DATA.find(u => u.id === userId);
    return user ? user.name : 'Unknown User';
  };

  // Get student ID by user ID
  const getStudentId = (userId) => {
    const user = USERS_DATA.find(u => u.id === userId);
    return user ? user.studentId : 'N/A';
  };

  // Get room name by ID
  const getRoomName = (roomId) => {
    const room = ROOMS_DATA.find(r => r.id === roomId);
    return room ? room.name : 'Unknown Room';
  };

  // Format time range from slot IDs
  const formatTimeRange = (slotIds) => {
    if (!slotIds || slotIds.length === 0) return 'N/A';
    const firstSlot = TIME_SLOTS_DATA[slotIds[0]];
    const lastSlot = TIME_SLOTS_DATA[slotIds[slotIds.length - 1]];
    if (!firstSlot || !lastSlot) return 'N/A';
    return `${firstSlot.start} — ${lastSlot.end}`;
  };

  // Filter data based on role and active tab
  let filteredData = RESERVATIONS_DATA.filter(item => {
    // If student, only show their reservations
    if (userRole === 'student' && userId) {
      if (item.userId !== userId) return false;
    }
    // Apply tab filter
    if (activeTab === 'all') return true;
    if (activeTab === 'confirmed') return ['pending', 'confirmed', 'checked_in'].includes(item.status);
    if (activeTab === 'completed') return item.status === 'completed';
    return true;
  });

  // Sort data
  if (sortBy === 'Latest First') {
    filteredData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortBy === 'Earliest First') {
    filteredData.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortBy === 'User A-Z') {
    filteredData.sort((a, b) => getUserName(a.userId).localeCompare(getUserName(b.userId)));
  }

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'PENDING', className: 'status-badge status-badge--pending' },
      confirmed: { label: 'CONFIRMED', className: 'status-badge status-badge--confirmed' },
      checked_in: { label: 'CHECKED IN', className: 'status-badge status-badge--checked-in' },
      completed: { label: 'COMPLETED', className: 'status-badge status-badge--completed' },
      cancelled: { label: 'CANCELLED', className: 'status-badge status-badge--cancelled' },
      expired: { label: 'EXPIRED', className: 'status-badge status-badge--expired' },
    };
    return statusMap[status] || statusMap.pending;
  };

  const formatCheckInTime = (checkInTime) => {
    if (!checkInTime) return '—';
    return new Date(checkInTime).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="reservations-table">
      {/* Header with tabs and sort */}
      <div className="reservations-table__header">
        <div className="reservations-table__tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'tab-button--active' : ''}`}
              onClick={() => {
                setActiveTab(tab.id);
                setCurrentPage(1);
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="reservations-table__controls">
          <select
            className="sort-dropdown"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {SORT_OPTIONS.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="reservations-table__wrapper">
        <table className="reservations-table__table">
          <thead>
            <tr className="table-header-row">
              <th className="table-header-cell">USER</th>
              <th className="table-header-cell">STUDENT ID</th>
              <th className="table-header-cell">ROOM</th>
              <th className="table-header-cell">DATE & TIME</th>
              <th className="table-header-cell">CHECK-IN</th>
              <th className="table-header-cell">STATUS</th>
              <th className="table-header-cell">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paginatedData.map(reservation => {
              const statusInfo = getStatusBadge(reservation.status);
              return (
                <tr key={reservation.id} className="table-body-row">
                  <td className="table-cell">
                    <div className="user-name">{getUserName(reservation.userId)}</div>
                  </td>
                  <td className="table-cell">
                    <div className="student-id">{getStudentId(reservation.userId)}</div>
                  </td>
                  <td className="table-cell">
                    <div className="room-name">{getRoomName(reservation.roomId)}</div>
                  </td>
                  <td className="table-cell">
                    <div className="date-time">
                      <div className="date">{new Date(reservation.date).toLocaleDateString()}</div>
                      <div className="time">{formatTimeRange(reservation.slotIds)}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <div className="check-in-time">{formatCheckInTime(reservation.checkInTime)}</div>
                  </td>
                  <td className="table-cell">
                    <span className={statusInfo.className}>{statusInfo.label}</span>
                  </td>
                  <td className="table-cell">
                    <button className="action-menu-btn" aria-label="More actions">
                      ⋮
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer with pagination */}
      <div className="reservations-table__footer">
        <div className="pagination-info">
          Displaying {Math.min(itemsPerPage, paginatedData.length)} of {totalItems} reservations
        </div>
        <div className="pagination-controls">
          <button
            className="pagination-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            aria-label="Previous page"
          >
            ‹
          </button>
          <button
            className="pagination-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}
