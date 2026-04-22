import { useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    CalendarDots,
    ChartLineUp,
    ClipboardText,
    House,
    IdentificationCard,
    List,
    Users,
    X,
} from '@phosphor-icons/react';
import cicsLogo from '../../assets/CICS-Logo.png';
import '../styles/Navbar.css';

const studentLinks = [
    { to: '/dashboard', label: 'Overview', icon: House, end: true },
    { to: '/dashboard/reservations', label: 'Reservations', icon: ClipboardText },
    { to: '/dashboard/schedule', label: 'Schedule', icon: CalendarDots },
    { to: '/dashboard/profile', label: 'Profile', icon: IdentificationCard },
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
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();

    const linksByRole = {
        admin: adminLinks,
        staff: staffLinks,
        student: studentLinks,
    };
    const links = linksByRole[role] ?? studentLinks;
    const roleLabel = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : 'Student';

    // Close drawer on route change
    useEffect(() => {
        setIsOpen(false);
    }, [location.pathname]);

    // Close on Escape key
    useEffect(() => {
        function handleKeyDown(event) {
            if (event.key === 'Escape' && isOpen) {
                setIsOpen(false);
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const toggleDrawer = useCallback(() => setIsOpen((prev) => !prev), []);

    return (
        <>
            {/* Mobile top navbar */}
            <header className="app-mobile-header">
                <button
                    type="button"
                    className="app-mobile-header__hamburger"
                    onClick={toggleDrawer}
                    aria-label={isOpen ? 'Close navigation menu' : 'Open navigation menu'}
                    aria-expanded={isOpen}
                    aria-controls="app-sidebar-drawer"
                >
                    {isOpen ? <X weight="bold" /> : <List weight="bold" />}
                </button>

                <span className="app-mobile-header__brand">Learning Common Rooms</span>

                <div className="app-mobile-header__spacer" />
            </header>

            {/* Overlay backdrop for mobile */}
            <div
                className={`app-sidebar-overlay ${isOpen ? 'app-sidebar-overlay--visible' : ''}`}
                onClick={() => setIsOpen(false)}
                aria-hidden="true"
            />

            {/* Sidebar / Drawer */}
            <aside
                id="app-sidebar-drawer"
                className={`app-sidebar ${isOpen ? 'app-sidebar--open' : ''}`}
                aria-label="Primary navigation"
            >
                <div className="app-sidebar__brand" title="UST CICS Learning Commons">
                    <img className="app-sidebar__brand-mark" src={cicsLogo} alt="UST CICS logo" />
                    <span className="app-sidebar__brand-text">Learning Common Rooms</span>
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
        </>
    );
}
