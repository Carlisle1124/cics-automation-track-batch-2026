import { Outlet } from 'react-router-dom';
import Navbar from '../shared/components/Navbar';
import Topbar from '../shared/components/Topbar';
import ReserveButton from '../features/reservations/components/ReserveButton';
import '../shared/styles/LayoutShell.css';

export default function AdminLayout() {
	return (
		<div className="app-shell">
			<Navbar role="admin" />
			<main className="app-main">
				<div className="app-main__surface">
					<Topbar
						title="Admin Dashboard"
						subtitle="Manage reservations, users, and analytics from one place."
					/>
                    <div className='app-main__wrapper'>
                        <div className="app-main__content">
                            <Outlet />
                        </div>
                    </div>
				</div>
			</main>
			<ReserveButton role="admin" />
		</div>
	);
}
