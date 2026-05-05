import { useEffect, useState } from 'react';
import { getCurrentUser } from '../../data/services/authService';
import { getAvailabilityByDate } from '../../features/availability/services/availabilityService';
import AvailabilityPanel from '../../features/availability/components/AvailabilityPanel';
import CapacityMap from '../../features/availability/components/CapacityMap';
import PageHeader from '../../shared/components/PageHeader';
import cicsLogo from '../../assets/CICS-Logo.webp';
import './Overview.css';

export default function Overview() {
    const [user, setUser] = useState(null);
    const [availability, setAvailability] = useState(null);
    const [isPageLoading, setIsPageLoading] = useState(true);

    useEffect(() => {
        const previousTitle = document.title;
        document.title = 'Overview - UST CICS Learning Common Room';

        let active = true;

        async function loadOverview() {
            try {
                const [currentUser, todayAvailability] = await Promise.all([
                    getCurrentUser(),
                    getAvailabilityByDate(new Date()),
                    new Promise((resolve) => setTimeout(resolve, 700)),
                ]);

                if (!active) return;

                setUser(currentUser);
                setAvailability(todayAvailability);
            } catch (err) {
                console.error('[Overview] Failed to load:', err);

                if (active) {
                    setAvailability(null);
                }
            } finally {
                if (active) {
                    setIsPageLoading(false);
                }
            }
        }

        loadOverview();

        return () => {
            active = false;
            document.title = previousTitle;
        };
    }, []);

    return (
        <section
            className={`dashboard-page student-overview ${
                isPageLoading
                    ? 'student-overview--content-hidden'
                    : 'student-overview--content-visible'
            }`}
        >
            <PageHeader
                title={`Welcome, ${user?.name ?? 'Student'}`}
            />

            <AvailabilityPanel availability={availability} />

            <div className="student-overview__capacity">
                <CapacityMap />
            </div>

            {isPageLoading ? (
                <div
                    className="student-overview-transition"
                    role="status"
                    aria-live="polite"
                    aria-label="Loading student overview page"
                >
                    <div className="student-overview-transition__card">
                        <img
                            src={cicsLogo}
                            alt="UST CICS logo"
                            className="student-overview-transition__logo"
                        />
                        <div className="student-overview-transition__loader" aria-hidden="true">
                            <span></span>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}