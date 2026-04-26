import { lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../shared/components/Navbar';
import Topbar from '../shared/components/Topbar';
import Card from '../shared/components/Card';
import ReserveButton from '../features/reservations/components/ReserveButton';
import '../shared/styles/LayoutShell.css';

const QADebugPanel = import.meta.env.DEV
	? lazy(() => import('../features/qa/QADebugPanel'))
	: null;

export default function StudentLayout() {
    const location = useLocation();
    const shouldDisableOuterScroll =
        location.pathname === '/dashboard/reservations' || location.pathname === '/dashboard/schedule';

    return (
        <div className="app-shell">
            <Navbar role="student" />
            <main className="app-main">
                <div className="app-main__surface">
                    <Topbar
                        title="Dashboard"
                        subtitle="Reserve slots, track usage, and review your learning commons activity."
                    />
                    <Card as="div" className="app-main__content-card" padding="md">
                        <div className={shouldDisableOuterScroll ? 'app-main__content-no-scroll' : 'app-main__content-scroll'}>
                            <Outlet />
                        </div>
                    </Card>
                </div>
            </main>
            <ReserveButton role="student" />
            {QADebugPanel && (
                <Suspense fallback={null}>
                    <QADebugPanel />
                </Suspense>
            )}
        </div>
    );
}