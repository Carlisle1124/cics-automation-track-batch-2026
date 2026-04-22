import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../../data/services/authService';

function getRoleRoute(role) {
	if (role === 'admin') return '/admin';
	if (role === 'staff') return '/staff';
	return '/dashboard';
}

export default function ProtectedRoute({ requiredRole, children }) {
	const [status, setStatus] = useState('loading');
	const [redirectTo, setRedirectTo] = useState(null);

	useEffect(() => {
		getCurrentUser().then((user) => {
			if (!user) {
				setStatus('unauthed');
				return;
			}
			if (requiredRole && user.role !== requiredRole) {
				setRedirectTo(getRoleRoute(user.role));
				setStatus('wrongRole');
				return;
			}
			setStatus('authed');
		});
	}, [requiredRole]);

	if (status === 'loading') return null;
	if (status === 'unauthed') return <Navigate to="/auth/login" replace />;
	if (status === 'wrongRole') return <Navigate to={redirectTo} replace />;
	return children;
}
