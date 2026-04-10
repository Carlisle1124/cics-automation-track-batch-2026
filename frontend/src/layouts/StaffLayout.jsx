import { Outlet } from 'react-router-dom';
import Navbar from '../shared/components/Navbar';
import Topbar from '../shared/components/Topbar';
import ReserveButton from '../features/reservations/components/ReserveButton';
import '../shared/styles/LayoutShell.css';

export default function StaffLayout() {
	return (
		<div className="app-shell">
			<Navbar role="staff" />
			<main className="app-main">
				<div className="app-main__surface">
					<Topbar
						title="Staff Dashboard"
						subtitle="Review pending requests and support student reservations."
					/>
					<div className="app-main__wrapper">
						<div className="app-main__content">
							<Outlet />
						</div>
					</div>
				</div>
			</main>
			<ReserveButton role="staff" />
		</div>
	);
}
