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
    const isStudentOverview = location.pathname === '/student';
    const isStudentReservations = location.pathname === '/student/reservations';
    const isStudentSchedule = location.pathname === '/student/schedule';

    return (
        <div
            className={`app-shell${
                isStudentOverview ? ' app-shell--student-overview-entry' : ''
            }${isStudentReservations ? ' app-shell--student-reservations-entry' : ''}${
                isStudentSchedule ? ' app-shell--student-schedule-entry' : ''
            }`}
        >
            <Navbar role="student" />
            <main className="app-shell__main">
                <div className="app-shell__surface">
                    <Topbar
                        title="Dashboard"
                        subtitle="Reserve slots, track usage, and review your learning commons activity."
                    />
                    <Card as="div" className="app-shell__panel layout-card" padding="0">
                        <div className="app-shell__content">
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