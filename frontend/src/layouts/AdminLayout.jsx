import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../shared/components/Navbar';
import Topbar from '../shared/components/Topbar';
import Card from '../shared/components/Card';
import '../shared/styles/LayoutShell.css';

export default function AdminLayout() {
	const location = useLocation();
	const isAdminOverview = location.pathname === '/admin';
	const isAdminReservations = location.pathname === '/admin/reservations';
	const isAdminAnalytics = location.pathname === '/admin/analytics';

	return (
		<div
			className={`app-shell app-shell--admin${
				isAdminOverview ? ' app-shell--admin-overview-entry' : ''
			}${isAdminReservations ? ' app-shell--admin-reservations-entry' : ''}${
				isAdminAnalytics ? ' app-shell--admin-analytics-entry' : ''
			}`}
		>
			<Navbar role="admin" />
			<main className="app-shell__main">
				<div className="app-shell__surface">
					<Topbar
						title="Admin Dashboard"
						subtitle="Manage reservations, users, and analytics from one place."
					/>
					<Card as="div" className="app-shell__panel layout-card" padding="0">
						<div className="app-shell__content">
							<Outlet />
						</div>
					</Card>
				</div>
			</main>
		</div>
	);
}