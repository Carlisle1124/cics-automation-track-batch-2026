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

function mapReservationRow(row) {
	if (!row) return row;

	return {
		id: row.id,
		userId: row.user_id ?? row.userId,
		reservationDate: row.reservation_date ?? row.reservationDate,
		startTime: row.start_time ?? row.startTime,
		endTime: row.end_time ?? row.endTime,
		durationHours: row.duration_hours ?? row.durationHours,
		status: row.status,
		denialReason: row.denial_reason ?? row.denialReason,
		createdBy: row.created_by ?? row.createdBy,
		createdAt: row.created_at ?? row.createdAt,
		approvedBy: row.approved_by ?? row.approvedBy,
		qrCode: row.qr_code ?? row.qrCode,
		expiresAt: row.expires_at ?? row.expiresAt,
	};
}

export async function getReservationsByUser(userId) {
	if (!userId) return [[], null];

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
				denial_reason,
				created_at,
				users:user_id (id, full_name, email, role)
			`)
			.eq('user_id', userId)
			.order('created_at', { ascending: false });

		if (error) throw error;

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
			denial_reason: reservation.denial_reason,
			created_at: reservation.created_at,
		}));

		return [reservations, null];
	} catch (error) {
		console.error('Error fetching reservations by user:', error);

		// Fallback to mock data for local/dev resilience.
		const matches = RESERVATIONS.filter((r) => r.userId === userId);
		const fallbackId = USERS.find((u) => u.role === 'student')?.id;
		const source = matches.length > 0 ? matches : RESERVATIONS.filter((r) => r.userId === fallbackId);

		const fallbackReservations = source.map((reservation) => {
			const enriched = enrichReservation(reservation);
			return {
				id: reservation.id,
				userId: reservation.userId,
				user_name: enriched.userName,
				user_role: enriched.userRole,
				room_name: enriched.roomName,
				reservation_date: reservation.date ?? null,
				start_time: null,
				end_time: null,
				status: reservation.status,
				denial_reason: reservation.denial_reason ?? null,
				created_at: reservation.createdAt ?? null,
			};
		});

		return [fallbackReservations, error];
	}
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
				denial_reason,
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
			denial_reason: reservation.denial_reason,
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
					// Handle DELETE events separately since the record no longer exists
					if (payload.eventType === 'DELETE') {
						onUpdate({
							type: 'DELETE',
							data: { id: payload.old?.id },
						});
						return;
					}

					const recordId = payload.new?.id || payload.old?.id;
					if (!recordId) {
						console.warn('No record ID found in payload:', payload);
						return;
					}

					const { data, error } = await supabase
						.from('reservations')
						.select(`
							id,
							user_id,
							reservation_date,
							start_time,
							end_time,
							status,
							denial_reason,
							created_at,
							users:user_id (id, full_name, email, role)
						`)
						.eq('id', recordId)
						.single();

					if (error) {
						console.error('Error fetching updated reservation:', error);
						return;
					}

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
							denial_reason: data.denial_reason,
							created_at: data.created_at,
						};

						onUpdate({
							type: payload.eventType,
							data: transformed,
						});
					}
				} catch (error) {
					console.error('Error processing real-time update:', error);
				}
			}
		)
		.subscribe((status) => {
			if (status === 'SUBSCRIBED') {
				console.log('[ReservationService] Real-time subscription established');
			} else if (status === 'CLOSED') {
				console.log('[ReservationService] Real-time subscription closed');
			} else if (status === 'CHANNEL_ERROR') {
				console.error('[ReservationService] Real-time subscription error');
			}
		});

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

export function createReservationForStudent(reservationInput) {
	return (async () => {
		const payload = {
			user_id: reservationInput.userId,
			reservation_date: reservationInput.reservationDate,
			start_time: reservationInput.startTime,
			end_time: reservationInput.endTime,
			status: reservationInput.status ?? 'approved',
			approved_by: reservationInput.approvedBy,
		};

		const { data, error } = await supabase
			.from('reservations')
			.insert(payload)
			.select(`
				id,
				user_id,
				reservation_date,
				start_time,
				end_time,
				status,
				approved_by,
				created_at
			`)
			.single();

		if (error) throw new Error(error.message);

		return mapReservationRow(data);
	})();
}

export async function cancelReservation(reservationId) {
	try {
		const updates = { status: 'cancelled_by_user' };

		const { data, error } = await supabase
			.from('reservations')
			.update(updates)
			.eq('id', reservationId)
			.select()
			.single();

		if (error) throw error;

		return mapReservationRow(data);
	} catch (err) {
		// Fallback to mock handler for local/dev environments
		console.warn('[reservationService] Supabase cancel failed, falling back to mock:', err?.message || err);
		return handleRequest(
			() => {
				let index = RESERVATIONS.findIndex((r) => r.id === reservationId);
				if (index === -1) {
					// Create a minimal fallback reservation so UI can continue to operate locally
					const fallback = {
						id: reservationId,
						userId: USERS[0]?.id ?? null,
						date: new Date().toISOString(),
						status: 'cancelled_by_user',
					};
					RESERVATIONS.unshift(fallback);
					index = 0;
				} else {
					RESERVATIONS[index] = {
						...RESERVATIONS[index],
						status: 'cancelled_by_user',
					};
				}
				return enrichReservation(RESERVATIONS[index]);
			},
			`/api/reservations/${encodeURIComponent(reservationId)}`,
			{
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ status: 'cancelled_by_user' }),
			}
		);
	}
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

function addHoursToTime(startTime, durationHours) {
	if (!startTime || !Number.isFinite(durationHours)) return null;

	const [hours = 0, minutes = 0, seconds = 0] = startTime.split(':').map(Number);
	const totalSeconds = hours * 3600 + minutes * 60 + seconds + durationHours * 3600;
	const normalizedSeconds = ((totalSeconds % 86400) + 86400) % 86400;
	const nextHours = Math.floor(normalizedSeconds / 3600);
	const nextMinutes = Math.floor((normalizedSeconds % 3600) / 60);
	const nextSeconds = normalizedSeconds % 60;

	return [nextHours, nextMinutes, nextSeconds].map((part) => String(part).padStart(2, '0')).join(':');
}

export async function updateHeldReservation({
	reservationId,
	userId,
	reservationDate,
	startTime,
	durationHours,
}) {
	const endTime = addHoursToTime(startTime, durationHours);

	const { data, error } = await supabase
		.from('reservations')
		.update({
			reservation_date: reservationDate,
			start_time: startTime,
			end_time: endTime,
		})
		.eq('id', reservationId)
		.eq('user_id', userId)
		.eq('status', 'held')
		.select('id, expires_at, start_time, end_time, reservation_date')
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

export async function approveHeldReservation({ reservationId, userId, approvedBy }) {
	const { data, error } = await supabase
		.from('reservations')
		.update({
			status: 'approved',
			expires_at: null,
			approved_by: approvedBy ?? null,
		})
		.eq('id', reservationId)
		.eq('user_id', userId)
		.eq('status', 'held')
		.select(`
			id,
			user_id,
			reservation_date,
			start_time,
			end_time,
			status,
			approved_by,
			created_at,
			expires_at
		`)
		.single();

	if (error) throw new Error(error.message);
	return mapReservationRow(data);
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

function getBackendUrl() {
	return import.meta.env.VITE_BACKEND_URL || '';
}

export async function releaseHeldReservation(reservationId) {
	const backendUrl = getBackendUrl();
	if (!backendUrl) {
		throw new Error('Missing backend URL for staff hold release');
	}

	const response = await fetch(`${backendUrl}/api/reservations/${encodeURIComponent(reservationId)}/release`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
		},
	});

	if (!response.ok) {
		const body = await response.json().catch(() => ({}));
		throw new Error(body.error || `Server error ${response.status}`);
	}

	return response.json();
}

export function releaseHeldReservationBeacon(reservationId) {
	const backendUrl = getBackendUrl();
	if (!backendUrl) return;

	fetch(`${backendUrl}/api/reservations/${encodeURIComponent(reservationId)}/release`, {
		method: 'DELETE',
		headers: {
			'Content-Type': 'application/json',
		},
		keepalive: true,
	});
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
