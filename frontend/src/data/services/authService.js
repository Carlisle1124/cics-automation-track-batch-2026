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

export async function registerUser(email, password, fullName, studentId) {
	if (!fullName?.trim()) throw new Error('Full name is required.');
	if (!email?.trim()) throw new Error('Email is required.');

	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			emailRedirectTo: `${window.location.origin}/auth/verify`,
			data: {
				full_name: fullName,
				student_id: studentId,
			},
		},
	});

	if (error) throw new Error(error.message);
	return data;
}

export async function verifyEmailFromUrl() {
	const hash = window.location.hash.replace('#', '');
	const search = window.location.search;
	const hashParams = Object.fromEntries(new URLSearchParams(hash));
	const searchParams = Object.fromEntries(new URLSearchParams(search));

	const errorCode = hashParams.error || searchParams.error;
	const errorDesc = hashParams.error_description || searchParams.error_description;

	if (errorCode || errorDesc) {
		const desc = decodeURIComponent((errorDesc || '').replace(/\+/g, ' '));
		const isExpiredOrInvalid =
			desc.toLowerCase().includes('expired') || desc.toLowerCase().includes('invalid');

		throw new Error(
			isExpiredOrInvalid
				? 'This verification link has expired or is no longer valid. Please request a new one.'
				: 'The verification link could not be processed. Please try again or request a new link.'
		);
	}

	// Allow Supabase time to exchange the token from the URL hash
	await new Promise((r) => setTimeout(r, 800));

	const { data: { session } } = await supabase.auth.getSession();
	if (!session?.user) {
		throw new Error(
			'We could not confirm your email address. The link may have already been used or expired.'
		);
	}

	const { data: userData } = await supabase
		.from('users')
		.select('role')
		.eq('id', session.user.id)
		.single();

	return { user: session.user, role: userData?.role ?? 'student' };
}

// Still mock — backend integration for user listing is out of scope for this step
export function getUsers() {
	return Promise.resolve(USERS);
}
