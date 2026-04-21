import { supabase } from '../supabaseClient';
import { USERS } from '../mock/mockData';

export async function getCurrentUser() {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session?.user) return null;

	const { data, error } = await supabase
		.from('users')
		.select('id, full_name, role, email')
		.eq('id', session.user.id)
		.single();

	if (error || !data) return null;
	return data;
}

export async function login(email, password) {
	const { data, error } = await supabase.auth.signInWithPassword({ email, password });
	if (error) throw new Error(`Auth error: ${error.message}`);

	const { data: userData, error: userError } = await supabase
		.from('users')
		.select('id, full_name, role, email')
		.eq('id', data.user.id)
		.single();

	if (userError) throw new Error(`Profile fetch error: ${userError.message}`);
	return userData;
}

export async function logout() {
	await supabase.auth.signOut();
	return null;
}

// Still mock — backend integration for user listing is out of scope for this step
export function getUsers() {
	return Promise.resolve(USERS);
}
