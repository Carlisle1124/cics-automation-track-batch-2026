// ============================================================
// Mock Data — UST CICS Learning Common Room
// Single-room system with 50-person capacity
// ============================================================

export const ROOM = {
  id: 'learning-common-room',
  name: 'Learning Common Room',
  capacity: 50,
  floor: '20th',
};

// Time slots for scheduling (8 AM to 7 PM, 1-hour blocks)
export const TIME_SLOTS = [
  { id: 'ts-08', label: '8:00 AM', hour: 8 },
  { id: 'ts-09', label: '9:00 AM', hour: 9 },
  { id: 'ts-10', label: '10:00 AM', hour: 10 },
  { id: 'ts-11', label: '11:00 AM', hour: 11 },
  { id: 'ts-12', label: '12:00 PM', hour: 12 },
  { id: 'ts-13', label: '1:00 PM', hour: 13 },
  { id: 'ts-14', label: '2:00 PM', hour: 14 },
  { id: 'ts-15', label: '3:00 PM', hour: 15 },
  { id: 'ts-16', label: '4:00 PM', hour: 16 },
  { id: 'ts-17', label: '5:00 PM', hour: 17 },
  { id: 'ts-18', label: '6:00 PM', hour: 18 },
  { id: 'ts-19', label: '7:00 PM', hour: 19 },
];

// Generate mock schedule data for a given date
export function generateScheduleForDate(date) {
  const dateStr = date.toISOString().split('T')[0];
  const seed = hashCode(dateStr);

  return TIME_SLOTS.map((slot) => {
    const rand = Math.abs(hashCode(`${seed}-${slot.id}`)) % 100;
    let status = 'available';
    if (rand < 25) status = 'booked';
    else if (rand < 35) status = 'pending';
    return { ...slot, status, date: dateStr };
  });
}

// Simple deterministic hash for consistent mock data
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}

// Pre-populated user reservations (no room references - single room)
export const INITIAL_RESERVATIONS = [
  {
    id: 'res-001',
    date: '2026-04-01',
    startTime: '10:00 AM',
    endTime: '11:00 AM',
    duration: '1 hour',
    status: 'upcoming',
    userId: 'user-001',
    userName: 'Juan Dela Cruz',
    createdAt: '2026-03-30T14:23:00Z',
  },
  {
    id: 'res-002',
    date: '2026-04-02',
    startTime: '2:00 PM',
    endTime: '3:00 PM',
    duration: '1 hour',
    status: 'upcoming',
    userId: 'user-001',
    userName: 'Juan Dela Cruz',
    createdAt: '2026-03-30T09:10:00Z',
  },
  {
    id: 'res-003',
    date: '2026-03-28',
    startTime: '9:00 AM',
    endTime: '10:00 AM',
    duration: '1 hour',
    status: 'completed',
    userId: 'user-002',
    userName: 'Maria Santos',
    createdAt: '2026-03-26T11:45:00Z',
  },
  {
    id: 'res-004',
    date: '2026-03-25',
    startTime: '3:00 PM',
    endTime: '4:00 PM',
    duration: '1 hour',
    status: 'cancelled',
    userId: 'user-001',
    userName: 'Juan Dela Cruz',
    createdAt: '2026-03-24T08:30:00Z',
  },
];

// Mock occupants currently in the room
export const INITIAL_OCCUPANTS = [
  { id: 'occ-001', name: 'Maria Santos', studentId: '2022-00123', enteredAt: '9:15 AM' },
  { id: 'occ-002', name: 'Carlos Reyes', studentId: '2022-00456', enteredAt: '9:30 AM' },
  { id: 'occ-003', name: 'Anna Lim', studentId: '2022-00789', enteredAt: '10:00 AM' },
  { id: 'occ-004', name: 'Jose Garcia', studentId: '2023-00101', enteredAt: '10:15 AM' },
  { id: 'occ-005', name: 'Patricia Cruz', studentId: '2023-00202', enteredAt: '10:45 AM' },
];

// Mock users for login simulation
export const MOCK_USERS = {
  student: {
    id: 'user-001',
    name: 'Juan Dela Cruz',
    studentId: '2022-00001',
    role: 'student',
  },
  admin: {
    id: 'admin-001',
    name: 'Admin User',
    studentId: 'ADMIN',
    role: 'admin',
  },
};
