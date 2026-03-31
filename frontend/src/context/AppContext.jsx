import { createContext, useContext, useState, useCallback } from 'react';
import {
  INITIAL_RESERVATIONS,
  INITIAL_OCCUPANTS,
  ROOM,
  MOCK_USERS,
  generateScheduleForDate,
} from '../data/mockData';

const AppContext = createContext(null);

let nextResId = 5;
let nextOccId = 6;

export function AppProvider({ children }) {
  // Auth state
  const [user, setUser] = useState(null);

  // Core state
  const [reservations, setReservations] = useState(INITIAL_RESERVATIONS);
  const [occupants, setOccupants] = useState(INITIAL_OCCUPANTS);

  // Login / logout
  const login = useCallback((role) => {
    setUser(MOCK_USERS[role]);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  // Check availability (simulated delay)
  const checkAvailability = useCallback((date, timeSlot) => {
    return new Promise((resolve) => {
      const delay = 800 + Math.random() * 400;
      setTimeout(() => {
        const schedule = generateScheduleForDate(new Date(date));
        const slot = schedule.find((s) => s.id === timeSlot.id);
        if (slot && slot.status === 'available') {
          resolve({ available: true });
        } else {
          resolve({ available: false, reason: 'This slot has been taken.' });
        }
      }, delay);
    });
  }, []);

  // Create reservation
  const createReservation = useCallback(
    (date, timeSlot) => {
      const endHour = timeSlot.hour + 1;
      const endLabel =
        endHour === 12
          ? '12:00 PM'
          : endHour > 12
            ? `${endHour - 12}:00 PM`
            : `${endHour}:00 AM`;

      const newRes = {
        id: `res-${String(nextResId++).padStart(3, '0')}`,
        date,
        startTime: timeSlot.label,
        endTime: endLabel,
        duration: '1 hour',
        status: 'upcoming',
        userId: user?.id || 'user-001',
        userName: user?.name || 'Juan Dela Cruz',
        createdAt: new Date().toISOString(),
      };

      setReservations((prev) => [newRes, ...prev]);
      return newRes;
    },
    [user]
  );

  // Cancel reservation
  const cancelReservation = useCallback((resId) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: 'cancelled' } : r))
    );
  }, []);

  // Edit reservation time (admin)
  const editReservation = useCallback((resId, newStartTime, newEndTime) => {
    setReservations((prev) =>
      prev.map((r) =>
        r.id === resId ? { ...r, startTime: newStartTime, endTime: newEndTime } : r
      )
    );
  }, []);

  // Add reservation manually (admin)
  const addReservationManual = useCallback((date, startTime, endTime, userName) => {
    const newRes = {
      id: `res-${String(nextResId++).padStart(3, '0')}`,
      date,
      startTime,
      endTime,
      duration: '1 hour',
      status: 'upcoming',
      userId: `manual-${Date.now()}`,
      userName,
      createdAt: new Date().toISOString(),
    };
    setReservations((prev) => [newRes, ...prev]);
    return newRes;
  }, []);

  // Remove occupant (admin)
  const removeOccupant = useCallback((occId) => {
    setOccupants((prev) => prev.filter((o) => o.id !== occId));
  }, []);

  // Add occupant (simulate entry)
  const addOccupant = useCallback((name, studentId) => {
    if (occupants.length >= ROOM.capacity) return false;
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const h = hours % 12 || 12;
    const timeStr = `${h}:${String(minutes).padStart(2, '0')} ${ampm}`;
    setOccupants((prev) => [
      ...prev,
      {
        id: `occ-${String(nextOccId++).padStart(3, '0')}`,
        name,
        studentId,
        enteredAt: timeStr,
      },
    ]);
    return true;
  }, [occupants.length]);

  return (
    <AppContext.Provider
      value={{
        user,
        login,
        logout,
        reservations,
        occupants,
        room: ROOM,
        checkAvailability,
        createReservation,
        cancelReservation,
        editReservation,
        addReservationManual,
        removeOccupant,
        addOccupant,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
