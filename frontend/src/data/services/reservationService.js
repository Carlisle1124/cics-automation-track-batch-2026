import { handleRequest } from './baseService';
import { RESERVATIONS, ROOMS, USERS } from '../mock/mockData';

function enrichReservation(reservation) {
	const user = USERS.find((item) => item.id === reservation.userId);
	const room = ROOMS.find((item) => item.id === reservation.roomId);

	return {
		...reservation,
		userName: user?.name ?? 'Unknown user',
		userRole: user?.role ?? 'student',
		roomName: room?.name ?? 'Learning Commons',
	};
}

export function getReservationsByUser(userId) {
	return handleRequest(
		() => RESERVATIONS.filter((reservation) => reservation.userId === userId).map(enrichReservation),
		`/api/reservations?userId=${encodeURIComponent(userId)}`
	);
}

export function getAllReservations() {
	return handleRequest(
		() => RESERVATIONS.map(enrichReservation),
		'/api/reservations'
	);
}

export function createReservation(reservationInput) {
	return handleRequest(
		() => {
			const reservation = {
				id: `res-${String(RESERVATIONS.length + 1).padStart(3, '0')}`,
				status: 'pending',
				qrCode: `QR-res-${String(RESERVATIONS.length + 1).padStart(3, '0')}`,
				checkInTime: null,
				createdAt: new Date().toISOString(),
				...reservationInput,
			};

			RESERVATIONS.unshift(reservation);
			return enrichReservation(reservation);
		},
		'/api/reservations',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(reservationInput),
		}
	);
}
