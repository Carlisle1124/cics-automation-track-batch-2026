import { supabase } from '../supabaseClient';
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
		() => {
			const matches = RESERVATIONS.filter((r) => r.userId === userId);
			if (matches.length > 0) return matches.map(enrichReservation);

			// Real Supabase UUID won't match mock IDs — fall back to the default mock student
			const fallbackId = USERS.find((u) => u.role === 'student')?.id;
			return RESERVATIONS.filter((r) => r.userId === fallbackId).map(enrichReservation);
		},
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

export function cancelReservation(reservationId) {
	return handleRequest(
		() => {
			const index = RESERVATIONS.findIndex((r) => r.id === reservationId);
			if (index === -1) throw new Error('Reservation not found');
			RESERVATIONS[index] = { ...RESERVATIONS[index], status: 'cancelled' };
			return enrichReservation(RESERVATIONS[index]);
		},
		`/api/reservations/${encodeURIComponent(reservationId)}`,
		{
			method: 'PATCH',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ status: 'cancelled' }),
		}
	);
}

export async function holdSlot({ userId, reservationDate, startTime, durationHours }) {
	const { error: rpcError } = await supabase.rpc('hold_reservation_slot', {
		p_user_id: userId,
		p_reservation_date: reservationDate,
		p_start_time: startTime,
		p_duration_hours: durationHours,
	});
	if (rpcError) throw new Error(rpcError.message);

	// Fetch the actual held row rather than relying on whatever the RPC returned
	const { data, error } = await supabase
		.from('reservations')
		.select('id, expires_at')
		.eq('user_id', userId)
		.eq('reservation_date', reservationDate)
		.eq('start_time', startTime)
		.eq('status', 'held')
		.single();

	if (error) throw new Error(error.message);
	return data;
}

export async function confirmSlot(reservationId, userId) {
	const { data, error } = await supabase
		.from('reservations')
		.update({ status: 'pending', expires_at: null })
		.eq('id', reservationId)
		.eq('user_id', userId)
		.eq('status', 'held')
		.select()
		.single();
	if (error) throw new Error(error.message);
	return data;
}

export async function releaseSlot(reservationId, userId) {
	const { error } = await supabase
		.from('reservations')
		.delete()
		.eq('id', reservationId)
		.eq('user_id', userId)
		.eq('status', 'held');
	if (error) throw new Error(error.message);
}
