import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../shared/components/Navbar';
import Topbar from '../shared/components/Topbar';
import Card from '../shared/components/Card';
import '../shared/styles/LayoutShell.css';

export default function StaffLayout() {
	const location = useLocation();
	const isStaffPendingRequests = location.pathname === '/staff';
	const isStaffScheduleForStudents = location.pathname === '/staff/schedule-for-students';

	return (
		<div
			className={`app-shell${
				isStaffPendingRequests ? ' app-shell--staff-pending-entry' : ''
			}${isStaffScheduleForStudents ? ' app-shell--staff-schedule-entry' : ''}`}
		>
			<Navbar role="staff" />
			<main className="app-shell__main">
				<div className="app-shell__surface">
					<Topbar
						title="Staff Dashboard"
						subtitle="Review pending requests and support student reservations."
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
