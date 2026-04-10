// ============================================================
// MOCK DATABASE — Learning Commons Reservation System
// Designed to simulate a real backend (relational structure)
// ============================================================

// =====================
// 🏫 ROOM CONFIG
// =====================
export const ROOMS = [
  {
    id: 'room-001',
    name: 'Learning Commons',
    capacity: 50,
    openTime: '08:00',
    closeTime: '17:00',
  },
];

// =====================
// 👤 USERS
// =====================
export const USERS = [
  {
    id: 'user-001',
    name: 'Juan Dela Cruz',
    email: 'juan@ust.edu.ph',
    studentId: '2022-00001',
    role: 'student',
    emailVerified: true,
    rememberMe: true,
    createdAt: '2026-04-01T08:00:00Z',
  },
  {
    id: 'user-002',
    name: 'Maria Santos',
    email: 'maria@ust.edu.ph',
    studentId: '2022-00002',
    role: 'student',
    emailVerified: true,
    rememberMe: false,
    createdAt: '2026-04-01T09:00:00Z',
  },
  {
    id: 'user-003',
    name: 'Carlos Mendoza',
    email: 'carlos@ust.edu.ph',
    studentId: '2022-00003',
    role: 'student',
    emailVerified: true,
    rememberMe: false,
    createdAt: '2026-05-01T09:00:00Z',
  },
  {
    id: 'admin-001',
    name: 'Admin User',
    email: 'admin@ust.edu.ph',
    role: 'admin',
    emailVerified: true,
  },
  {
    id: 'staff-001',
    name: 'Staff User',
    email: 'staff@ust.edu.ph',
    role: 'staff',
    emailVerified: true,
  },
];

// =====================
// ⏱️ TIME SLOTS (HOURLY)
// =====================
export const TIME_SLOTS = [
  { id: 'ts-08', start: '08:00', end: '09:00' },
  { id: 'ts-09', start: '09:00', end: '10:00' },
  { id: 'ts-10', start: '10:00', end: '11:00' },
  { id: 'ts-11', start: '11:00', end: '12:00' },
  { id: 'ts-12', start: '12:00', end: '01:00' },
  { id: 'ts-13', start: '13:00', end: '02:00' },
  { id: 'ts-14', start: '14:00', end: '03:00' },
  { id: 'ts-15', start: '15:00', end: '04:00' },
  { id: 'ts-16', start: '16:00', end: '05:00' },
];

// =====================
// 📊 SLOT AVAILABILITY
// (Tracks capacity usage per slot per date)
// =====================
export const SLOT_AVAILABILITY = [
  {
    id: 'sa-001',
    date: '2026-04-09',
    slotId: 'ts-10',
    roomId: 'room-001',
    reservedCount: 42,
    capacity: 50,
  },
  {
    id: 'sa-002',
    date: '2026-04-09',
    slotId: 'ts-11',
    roomId: 'room-001',
    reservedCount: 50,
    capacity: 50,
  },
];

// =====================
// 📖 RESERVATIONS
// =====================
export const RESERVATIONS = [
  {
    id: 'res-001',
    userId: 'user-001',
    roomId: 'room-001',

    date: '2026-04-09',
    slotIds: ['ts-10', 'ts-11'], // multi-hour booking

    status: 'confirmed',
    // pending | confirmed | checked_in | cancelled | expired | completed

    qrCode: 'QR-res-001',

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

    status: 'completed',

    qrCode: 'QR-res-002',

    checkInTime: '2026-04-09T09:05:00Z',
    createdAt: '2026-04-08T08:30:00Z',
  },
  {
    id: 'res-003',
    userId: 'user-003',
    roomId: 'room-001',
    date: '2026-04-10',
    slotIds: ['ts-13'],
    status: 'pending',
    qrCode: 'QR-res-003',
    checkInTime: null,
    createdAt: '2026-04-09T13:00:00Z',
  },
  {
    id: 'res-004',
    userId: 'user-001',
    roomId: 'room-001',
    date: '2026-04-11',
    slotIds: ['ts-09', 'ts-10'],
    status: 'pending',
    qrCode: 'QR-res-004',
    checkInTime: null,
    createdAt: '2026-04-09T14:20:00Z',
  },
];

// =====================
// 📨 REQUESTS
// =====================
export const REQUESTS = [
  {
    id: 'req-001',
    reservationId: 'res-003',
    requestedBy: 'user-003',
    requestType: 'new_reservation',
    status: 'pending',
    note: 'Needs 1-hour slot after class.',
    createdAt: '2026-04-09T13:00:00Z',
  },
  {
    id: 'req-002',
    reservationId: 'res-004',
    requestedBy: 'user-001',
    requestType: 'new_reservation',
    status: 'pending',
    note: 'Requested by student through staff assistance.',
    createdAt: '2026-04-09T14:20:00Z',
  },
  {
    id: 'req-003',
    reservationId: 'res-001',
    requestedBy: 'user-001',
    requestType: 'reschedule',
    status: 'approved',
    reviewedBy: 'staff-001',
    reviewedAt: '2026-04-09T10:00:00Z',
    note: 'Moved to an earlier slot due to schedule conflict.',
    createdAt: '2026-04-09T09:30:00Z',
  },
];

// =====================
// 🚶 OCCUPANCY (REAL-TIME)
// =====================
export const OCCUPANCY = [
  {
    id: 'occ-001',
    reservationId: 'res-001',
    userId: 'user-001',
    checkInTime: '2026-04-09T10:05:00Z',
    checkOutTime: null,
  },
];

// =====================
// 🔔 NOTIFICATIONS
// =====================
export const NOTIFICATIONS = [
  {
    id: 'notif-001',
    userId: 'user-001',
    type: 'REMINDER_ENDING_SOON',
    message: 'Your session ends in 15 minutes.',
    read: false,
    createdAt: '2026-04-09T10:45:00Z',
  },
  {
    id: 'notif-002',
    userId: 'user-001',
    type: 'GRACE_WARNING',
    message: 'Your reservation will expire in 5 minutes if you do not check in.',
    read: false,
    createdAt: '2026-04-09T10:10:00Z',
  },
];

// =====================
// ⏳ AVAILABILITY ALERTS (WAITLIST)
// =====================
export const AVAILABILITY_ALERTS = [
  {
    id: 'alert-001',
    userId: 'user-001',
    date: '2026-04-09',
    timeWindowMinutes: 15,
    status: 'active',
    createdAt: '2026-04-09T09:50:00Z',
  },
];

// =====================
// 👥 GROUP INVITES (OPTIONAL)
// =====================
export const GROUP_INVITES = [
  {
    id: 'grp-001',
    createdBy: 'user-001',
    invitedUserIds: ['user-002'],
    reservationId: 'res-001',
    status: 'pending',
  },
];
