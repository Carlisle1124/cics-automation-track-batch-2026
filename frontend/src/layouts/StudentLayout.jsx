import { Outlet } from 'react-router-dom';
import Navbar from '../shared/components/Navbar';
import Topbar from '../shared/components/Topbar';
import ReserveButton from '../features/reservations/components/ReserveButton';
import '../shared/styles/LayoutShell.css';

export default function StudentLayout() {
    return (
        <div className="app-shell">
            <Navbar role="student" />
            <main className="app-main">
                <div className="app-main__surface">
                    <Topbar
                        title="Student Dashboard"
                        subtitle="Reserve slots, track usage, and review your learning commons activity."
                    />
                    <div className="app-main__content">
                        <Outlet />
                    </div>
                </div>
            </main>
            <ReserveButton role="student" />
        </div>
    );
}