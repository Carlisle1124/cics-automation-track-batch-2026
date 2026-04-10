import { NavLink } from 'react-router-dom';
import {
    CalendarDots,
    ChartLineUp,
    ClipboardText,
    House,
    IdentificationCard,
    Users,
} from '@phosphor-icons/react';
import cicsLogo from '../../assets/CICS-Logo.png';
import '../styles/Navbar.css';

const studentLinks = [
    { to: '/', label: 'Overview', icon: House, end: true },
    { to: '/reservations', label: 'Reservations', icon: ClipboardText },
    { to: '/schedule', label: 'Schedule', icon: CalendarDots },
    { to: '/profile', label: 'Profile', icon: IdentificationCard },
];

const adminLinks = [
    { to: '/admin', label: 'Overview', icon: House, end: true },
    { to: '/admin/reservations', label: 'Reservations', icon: ClipboardText },
    { to: '/admin/analytics', label: 'Analytics', icon: ChartLineUp },
    { to: '/admin/users', label: 'Users', icon: Users },
];

const staffLinks = [
    { to: '/staff', label: 'Pending Requests', icon: ClipboardText, end: true },
    { to: '/staff/schedule-for-students', label: 'Schedule for Students', icon: CalendarDots },
];

export default function Navbar({ role }) {
    const linksByRole = {
        admin: adminLinks,
        staff: staffLinks,
        student: studentLinks,
    };
    const links = linksByRole[role] ?? studentLinks;
    const roleLabel = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Student';

    return (
        <aside className="app-sidebar" aria-label="Primary navigation">
            <div className="app-sidebar__brand" title="UST CICS Learning Commons">
                <img className="app-sidebar__brand-mark" src={cicsLogo} alt="UST CICS logo" />
            </div>

            <nav className="app-sidebar__nav">
                {links.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.end}
                        className={({ isActive }) =>
                            isActive ? 'app-sidebar__link is-active' : 'app-sidebar__link'
                        }
                        title={item.label}
                    >
                        <span className="app-sidebar__glyph" aria-hidden="true">
                            <item.icon weight="duotone" />
                        </span>
                        <span className="app-sidebar__label">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            <div className="app-sidebar__role">{roleLabel}</div>
        </aside>
    );
}
