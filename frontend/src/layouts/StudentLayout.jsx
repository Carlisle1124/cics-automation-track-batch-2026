import { lazy, Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from '../shared/components/Navbar';
import Topbar from '../shared/components/Topbar';
import Card from '../shared/components/Card';
import '../shared/styles/LayoutShell.css';

const QADebugPanel = import.meta.env.DEV
	? lazy(() => import('../features/qa/QADebugPanel'))
	: null;

export default function StudentLayout() {
    const location = useLocation();
    const isStudentOverview = location.pathname === '/dashboard';
    const shouldDisableOuterScroll =
        location.pathname === '/dashboard/reservations' || location.pathname === '/dashboard/schedule';

    const contentClassName = [
        shouldDisableOuterScroll ? 'app-main__content-no-scroll' : 'app-main__content-scroll',
        isStudentOverview ? 'app-main__content-scroll--student-overview' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={`app-shell${isStudentOverview ? ' app-shell--student-overview-entry' : ''}`}>
            <Navbar role="student" />
            <main className="app-main">
                <div className="app-main__surface">
                    <Topbar
                        title="Dashboard"
                        subtitle="Reserve slots, track usage, and review your learning commons activity."
                    />
                    <Card
                        as="div"
                        className={`app-main__content-card${
                            isStudentOverview ? ' app-main__content-card--student-overview' : ''
                        }`}
                        padding="md"
                    >
                        <div className={contentClassName}>
                            <Outlet />
                        </div>
                    </Card>
                </div>
            </main>
            {QADebugPanel && (
                <Suspense fallback={null}>
                    <QADebugPanel />
                </Suspense>
            )}
        </div>
    );
}