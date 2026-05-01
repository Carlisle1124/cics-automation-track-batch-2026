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

export async function getAllReservations() {
	try {
		const { data, error } = await supabase
			.from('reservations')
			.select(`
				id,
				user_id,
				reservation_date,
				start_time,
				end_time,
				status,
				created_at,
				users:user_id (id, full_name, email, role)
			`)
			.order('created_at', { ascending: false });

		if (error) throw error;

		// Transform the data to match expected format
		const reservations = (data || []).map((reservation) => ({
			id: reservation.id,
			userId: reservation.user_id,
			user_name: reservation.users?.full_name || 'Unknown User',
			user_email: reservation.users?.email,
			user_role: reservation.users?.role,
			reservation_date: reservation.reservation_date,
			start_time: reservation.start_time,
			end_time: reservation.end_time,
			status: reservation.status,
			created_at: reservation.created_at,
		}));

		return [reservations, null];
	} catch (error) {
		console.error('Error fetching reservations:', error);
		return [[], error];
	}
}

export function subscribeToReservationChanges(onUpdate) {
	const subscription = supabase
		.channel('reservations-changes')
		.on(
			'postgres_changes',
			{
				event: '*',
				schema: 'public',
				table: 'reservations',
			},
			async (payload) => {
				// Fetch the updated reservation with user data
				try {
					const { data, error } = await supabase
						.from('reservations')
						.select(`
							id,
							user_id,
							reservation_date,
							start_time,
							end_time,
							status,
							created_at,
							users:user_id (id, full_name, email, role)
						`)
						.eq('id', payload.new?.id || payload.old?.id)
						.single();

					if (error) throw error;

					if (data) {
						const transformed = {
							id: data.id,
							userId: data.user_id,
							user_name: data.users?.full_name || 'Unknown User',
							user_email: data.users?.email,
							user_role: data.users?.role,
							reservation_date: data.reservation_date,
							start_time: data.start_time,
							end_time: data.end_time,
							status: data.status,
							created_at: data.created_at,
						};

						onUpdate({
							type: payload.eventType,
							data: transformed,
						});
					} else if (payload.eventType === 'DELETE') {
						onUpdate({
							type: 'DELETE',
							data: { id: payload.old?.id },
						});
					}
				} catch (error) {
					console.error('Error processing real-time update:', error);
				}
			}
		)
		.subscribe();

	return subscription;
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

// Synchronous fire-and-forget release for beforeunload.
// keepalive: true guarantees the request completes even after the tab closes.
export function releaseSlotBeacon(reservationId, userId, accessToken) {
	const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
	const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
	fetch(
		`${supabaseUrl}/rest/v1/reservations?id=eq.${reservationId}&user_id=eq.${userId}&status=eq.held`,
		{
			method: 'DELETE',
			headers: { apikey: supabaseKey, Authorization: `Bearer ${accessToken}` },
			keepalive: true,
		}
	);
}
