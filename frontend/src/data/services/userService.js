import { USE_MOCK } from '../../config/env';
import { supabase } from '../supabaseClient';
import { USERS } from '../mock/mockData';

function normalizeUser(user) {
	if (!user) return user;

	return {
		...user,
		role: user.role || 'student',
		student_id: user.student_id ?? null,
		no_show_count: Number(user.no_show_count ?? 0),
		is_account_suspended: Boolean(user.is_account_suspended),
		suspended_until: user.suspended_until ?? null,
	};
}

export async function getAllUsers() {
	if (USE_MOCK) {
		return USERS.map(normalizeUser);
	}

	const { data, error } = await supabase
		.from('users')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) throw new Error(`Failed to fetch users: ${error.message}`);
	return (data ?? []).map(normalizeUser);
}

export async function getUserById(userId) {
	if (USE_MOCK) {
		return normalizeUser(USERS.find((user) => user.id === userId) || null);
	}

	const { data, error } = await supabase
		.from('users')
		.select('*')
		.eq('id', userId)
		.single();

	if (error) throw new Error(`Failed to fetch user: ${error.message}`);
	return normalizeUser(data);
}

export async function createUser(userData) {
	const payload = normalizeUser({
		...userData,
		id: userData.id ?? crypto.randomUUID(),
		created_at: userData.created_at ?? new Date().toISOString(),
	});

	if (USE_MOCK) {
		USERS.unshift(payload);
		return payload;
	}

	const { data, error } = await supabase.from('users').insert(payload).select('*').single();

	if (error) throw new Error(`Failed to create user: ${error.message}`);
	return normalizeUser(data);
}

export async function updateUser(userId, updates) {
	const { id, created_at, ...rest } = updates;
	const payload = normalizeUser(rest);

	if (USE_MOCK) {
		const index = USERS.findIndex((user) => user.id === userId);
		if (index === -1) throw new Error('User not found');
		USERS[index] = normalizeUser({ ...USERS[index], ...payload });
		return USERS[index];
	}

	const { data, error } = await supabase
		.from('users')
		.update(payload)
		.eq('id', userId)
		.select('*')
		.single();

	if (error) throw new Error(`Failed to update user: ${error.message}`);
	return normalizeUser(data);
}

export async function deleteUser(userId) {
	if (USE_MOCK) {
		const index = USERS.findIndex((user) => user.id === userId);
		if (index === -1) throw new Error('User not found');
		USERS.splice(index, 1);
		return { id: userId };
	}

	const { error } = await supabase.from('users').delete().eq('id', userId);
	if (error) throw new Error(`Failed to delete user: ${error.message}`);
	return { id: userId };
}
