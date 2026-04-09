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

        loadOverview();

        return () => {
            active = false;
        };
    }, []);

    if (!availability) {
        return <section style={{ padding: '2rem' }}>Loading overview...</section>;
    }

    return (
        <section style={{ padding: '2rem' }}>
            <AvailabilityPanel
                availability={availability}
                title="Student Overview"
                subtitle={user ? `Welcome, ${user.name}.` : 'Quick view of today\'s learning commons availability and reservation status.'}
            />

            <div style={{ marginTop: '2rem' }}>
                <CapacityMap />
            </div>

            <div style={{ marginTop: '2rem' }}>
                <Card className="booking-rules" padding="lg" elevated>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, margin: '0 0 0.5rem 0' }}>Booking Rules</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#595959', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Operating Hours</span>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1a1a1a' }}>08:00 AM - 05:00 PM</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#595959', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Max Stay</span>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1a1a1a' }}>3 hours</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#595959', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Grace Period</span>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1a1a1a' }}>15 minutes</span>
                        </div>
                        <div>
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: '#595959', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.5rem' }}>Slot Length</span>
                            <span style={{ fontSize: '1rem', fontWeight: 600, color: '#1a1a1a' }}>1 hour</span>
                        </div>
                    </div>
                </Card>
            </div>
        </section>
    );
}