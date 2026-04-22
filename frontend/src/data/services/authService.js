import { supabase } from '../supabaseClient';
import { USERS } from '../mock/mockData';

const MOCK_AUTH_STORAGE_KEY = 'learning-commons-mock-user';

function getStoredMockUser() {
	if (typeof window === 'undefined') return null;

	try {
		const rawUser = window.localStorage.getItem(MOCK_AUTH_STORAGE_KEY);
		return rawUser ? JSON.parse(rawUser) : null;
	} catch {
		return null;
	}
}

function setStoredMockUser(user) {
	if (typeof window === 'undefined') return;

	try {
		window.localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(user));
	} catch {
		// frontend-only mock auth fallback
	}
}

function clearStoredMockUser() {
	if (typeof window === 'undefined') return;

	try {
		window.localStorage.removeItem(MOCK_AUTH_STORAGE_KEY);
	} catch {
		// frontend-only mock auth fallback
	}
}

export async function getCurrentUser() {
	const storedMockUser = getStoredMockUser();

	try {
		const { data: { session } } = await supabase.auth.getSession();

		if (session?.user) {
			const { data, error } = await supabase
				.from('users')
				.select('id, full_name, role, email')
				.eq('id', session.user.id)
				.single();

			if (!error && data) {
				const normalizedUser = {
					...data,
					name: data.full_name ?? 'UST User',
				};

				setStoredMockUser(normalizedUser);
				return normalizedUser;
			}
		}
	} catch {
		// keep frontend-only mock auth working even without backend auth
	}

	return storedMockUser;
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

	const mockUser = {
		id: matchedUser?.id ?? `mock-${localPart}`,
		full_name: matchedUser?.name ?? fallbackName,
		name: matchedUser?.name ?? fallbackName,
		email: normalizedEmail,
		role: derivedRole,
		studentId: matchedUser?.studentId ?? null,
		emailVerified: matchedUser?.emailVerified ?? true,
		rememberMe: matchedUser?.rememberMe ?? true,
		createdAt: matchedUser?.createdAt ?? new Date().toISOString(),
	};

	setStoredMockUser(mockUser);
	return mockUser;
}

export async function logout() {
	clearStoredMockUser();

	try {
		await supabase.auth.signOut();
	} catch {
		// frontend-only mock auth fallback
	}

	return null;
}

// Still mock — backend integration for user listing is out of scope for this step
export function getUsers() {
	return Promise.resolve(USERS);
}
