import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, logout } from '../../data/services/authService';
import '../styles/Topbar.css';

export default function Topbar({ title = 'Dashboard', subtitle = '' }) {
	const navigate = useNavigate();
	const [user, setUser] = useState(null);
	const [isLoggingOut, setIsLoggingOut] = useState(false);

	useEffect(() => {
		let active = true;

		async function loadUser() {
			const currentUser = await getCurrentUser();

			if (!active) return;

			setUser(currentUser);
		}

		loadUser();

		return () => {
			active = false;
		};
	}, []);

	async function handleLogout() {
		setIsLoggingOut(true);
		await logout();
		navigate('/auth/login', { replace: true });
	}

	return (
		<header className="app-topbar">
			<div className="app-topbar__copy">
				<p className="app-topbar__eyebrow">Learning Commons Portal</p>
				<h1 className="app-topbar__title">{title}</h1>
				{subtitle ? <p className="app-topbar__subtitle">{subtitle}</p> : null}
			</div>

			<div className="app-topbar__actions">
				{user ? <span className="app-topbar__user">{user.name}</span> : null}
				<button type="button" className="app-topbar__logout" onClick={handleLogout} disabled={isLoggingOut}>
					{isLoggingOut ? 'Logging out...' : 'Logout'}
				</button>
			</div>
		</header>
	);
}
