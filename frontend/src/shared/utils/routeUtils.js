export function getRoleRoute(role) {
	if (role === 'admin') return '/admin';
	if (role === 'staff') return '/staff';
	return '/dashboard';
}
