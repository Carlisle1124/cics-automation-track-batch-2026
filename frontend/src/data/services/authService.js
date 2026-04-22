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
	const normalizedEmail = email.trim().toLowerCase();
	const trimmedPassword = password.trim();

	if (!normalizedEmail.endsWith('@ust.edu.ph')) {
		throw new Error('Only @ust.edu.ph emails are allowed.');
	}

	if (!trimmedPassword) {
		throw new Error('Please enter your password.');
	}

	const matchedUser = USERS.find(
		(user) => user.email.toLowerCase() === normalizedEmail
	);

	const localPart = normalizedEmail.split('@')[0];

	const fallbackName =
		localPart
			.split(/[._-]+/)
			.filter(Boolean)
			.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
			.join(' ') || 'UST User';

	const derivedRole =
		matchedUser?.role ||
		(localPart.includes('admin')
			? 'admin'
			: localPart.includes('staff')
				? 'staff'
				: 'student');

	return {
		id: matchedUser?.id ?? `mock-${localPart}`,
		full_name: matchedUser?.name ?? fallbackName,
		name: matchedUser?.name ?? fallbackName,
		email: normalizedEmail,
		role: derivedRole,
	};
}

export async function logout() {
	await supabase.auth.signOut();
	return null;
}

// Still mock — backend integration for user listing is out of scope for this step
export function getUsers() {
	return Promise.resolve(USERS);
}
