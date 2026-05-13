import { supabase, REMEMBER_ME_KEY } from '../supabaseClient';
import { unsuspendUserIfExpired } from './userService';

export async function getCurrentUser() {
	const { data: { session } } = await supabase.auth.getSession();
	if (!session?.user) return null;

	const { data, error } = await supabase
		.from('users')
		.select('id, full_name, role, email, student_id, created_at')
		.eq('id', session.user.id)
		.single();

	if (error || !data) return null;
	return { ...data, name: data.full_name };
}

export async function login(email, password, rememberMe = true) {
	// Must be set before signInWithPassword so the storage adapter routes the
	// token to the correct storage (localStorage vs sessionStorage).
	localStorage.setItem(REMEMBER_ME_KEY, String(rememberMe));

	const { data, error } = await supabase.auth.signInWithPassword({
		email,
		password,
	});

	if (error) throw new Error(`Auth error: ${error.message}`);

	const userId = data.user.id;

	let { data: userData, error: userError } = await supabase
		.from('users')
		.select('id, full_name, role, email, is_account_suspended, suspended_until')
		.eq('id', userId)
		.single();

	if (userError || !userData) {
		console.error('[login] users profile fetch failed:', userError?.code, userError?.message);
		await supabase.auth.signOut();
		throw new Error('Profile fetch error');
	}

	userData = await unsuspendUserIfExpired(userData);

	const now = new Date();
	const suspendedUntil = userData.suspended_until
		? new Date(userData.suspended_until)
		: null;

	const isSuspended =
		userData.is_account_suspended === true ||
		(suspendedUntil && suspendedUntil > now);

	if (isSuspended) {
		await supabase.auth.signOut();
		const untilLabel = suspendedUntil
			? suspendedUntil.toLocaleDateString('en-PH', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			})
			: null;
		const error = new Error(
			untilLabel
				? `Your account is suspended until ${untilLabel}. Please contact an administrator if you think this is a mistake.`
				: 'Your account is suspended. Please contact an administrator if you think this is a mistake.'
		);
		error.code = 'ACCOUNT_SUSPENDED';
		error.suspendedUntil = userData.suspended_until ?? null;
		throw error;
	}

	return { ...userData, name: userData.full_name };
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

// ─── User management (Supabase) ───────────────────────────

export async function getUsers() {
	const { data, error } = await supabase
		.from('users')
		.select('id, email, full_name, role, no_show_count, suspended_until, is_account_suspended, created_at, student_id')
		.order('created_at', { ascending: false });

	if (error) throw new Error(error.message);
	return data ?? [];
}

export async function updateUser(id, fields) {
	const allowed = ['full_name', 'email', 'student_id', 'role', 'no_show_count', 'is_account_suspended', 'suspended_until'];
	const payload = Object.fromEntries(
		Object.entries(fields).filter(([key]) => allowed.includes(key))
	);

	const { data, error } = await supabase
		.from('users')
		.update(payload)
		.eq('id', id)
		.select('id, email, full_name, role, no_show_count, suspended_until, is_account_suspended, created_at, student_id')
		.single();

	if (error) throw new Error(error.message);
	return data;
}

export async function deleteUser(id) {
	const { error } = await supabase
		.from('users')
		.delete()
		.eq('id', id);

	if (error) throw new Error(error.message);
}

export async function createUser(email, password, fullName, role, studentId) {
	const { data: authData, error: authError } = await supabase.auth.admin.createUser({
		email,
		password,
		email_confirm: true,
		user_metadata: { full_name: fullName, student_id: studentId ?? null },
	});

	if (authError) throw new Error(authError.message);

	const userId = authData.user.id;

	// The DB trigger should insert the profile row; if not, upsert to be safe.
	const { data, error } = await supabase
		.from('users')
		.upsert({
			id: userId,
			email,
			full_name: fullName,
			role: role ?? 'student',
			student_id: studentId ?? null,
		})
		.select('id, email, full_name, role, no_show_count, suspended_until, is_account_suspended, created_at, student_id')
		.single();

	if (error) throw new Error(error.message);
	return data;
}
