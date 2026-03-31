import { useState } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import './Layout.css';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useApp();

  const isAdmin = user?.role === 'admin';

  const navItems = isAdmin
    ? [
        { to: '/', label: 'Dashboard' },
        { to: '/admin', label: 'Admin Panel' },
        { to: '/reservations', label: 'All Reservations' },
      ]
    : [
        { to: '/', label: 'Dashboard' },
        { to: '/schedule', label: 'Reserve' },
        { to: '/reservations', label: 'My Reservations' },
      ];

  return (
    <div className="layout">
      {/* Navbar */}
      <header className="navbar">
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            className="navbar__hamburger"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            &#9776;
          </button>
          <Link to="/" className="navbar__brand">
            <img
              src="/UST-CICS Logo.png"
              alt="UST CICS"
              className="navbar__logo-img"
            />
            <div className="navbar__title">
              UST CICS<span className="navbar__title-sub">Learning Common Room</span>
            </div>
          </Link>
        </div>

        <div className="navbar__actions">
          <span className="navbar__user-name">{user?.name}</span>
          <span className="navbar__role-badge">
            {isAdmin ? 'Admin' : 'Student'}
          </span>
          <button className="navbar__logout-btn" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      <div className="layout__body">
        {/* Sidebar */}
        <nav className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `sidebar__link${isActive ? ' sidebar__link--active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Main Content */}
        <main className="layout__content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
