import { useEffect, useState } from 'react';
import { getCurrentUser } from '../../data/services/authService';
import { getAvailabilityByDate } from '../../features/availability/services/availabilityService';
import AvailabilityPanel from '../../features/availability/components/AvailabilityPanel';
import CapacityMap from '../../features/availability/components/CapacityMap';
import Card from '../../shared/components/Card';

export default function Overview() {
    const [user, setUser] = useState(null);
    const [availability, setAvailability] = useState(null);

    useEffect(() => {
        let active = true;

        async function loadOverview() {
            const [currentUser, todayAvailability] = await Promise.all([
                getCurrentUser(),
                getAvailabilityByDate(new Date()),
            ]);

            if (!active) return;

            setUser(currentUser);
            setAvailability(todayAvailability);
        }

        loadOverview().catch((err) => {
            console.error('[Overview] Failed to load:', err);
            if (active) setAvailability({ date: '', slots: [], isClosed: false, room: {} });
        });

        return () => {
            active = false;
        };
    }, []);

    if (!availability) {
        return <section className="dashboard-page">Loading overview...</section>;
    }

    return (
        <section className="dashboard-page">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <h1 style={{
                    margin: 0,
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    fontWeight: 700,
                    lineHeight: 1.1,
                    color: 'var(--text-primary)',
                }}>
                    Welcome,
                </h1>
                {user && (
                    <p style={{
                        margin: 0,
                        fontSize: 'clamp(1rem, 2vw, 1.375rem)',
                        fontWeight: 500,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.3,
                    }}>
                        {user.name}
                    </p>
                )}
            </div>

            <AvailabilityPanel
                availability={availability}
            />

            <div>
                <CapacityMap />
            </div>
        </section>
    );
}