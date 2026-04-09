import { handleRequest } from './baseService';
import { USERS } from '../mock/mockData';

const CURRENT_USER_KEY = 'lc-current-user-id';

function getStoredUserId() {
	return localStorage.getItem(CURRENT_USER_KEY);
}

function setStoredUserId(userId) {
	localStorage.setItem(CURRENT_USER_KEY, userId);
}

function clearStoredUserId() {
	localStorage.removeItem(CURRENT_USER_KEY);
}

function getDefaultUser() {
	return USERS.find((user) => user.role === 'student') ?? USERS[0] ?? null;
}

export function getCurrentUser() {
	return handleRequest(
		() => {
			const storedUserId = getStoredUserId();
			return USERS.find((user) => user.id === storedUserId) ?? getDefaultUser();
		},
		'/api/auth/me'
	);
}

export function login(email) {
	return handleRequest(
		() => {
			const user = USERS.find((item) => item.email === email) ?? getDefaultUser();
			if (user) {
				setStoredUserId(user.id);
			}
			return user;
		},
		'/api/auth/login',
		{
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ email }),
		}
	);
}

export function logout() {
	return handleRequest(
		() => {
			clearStoredUserId();
			return null;
		},
		'/api/auth/logout',
		{ method: 'POST' }
	);
}

export function getUsers() {
	return handleRequest(() => USERS, '/api/users');
}