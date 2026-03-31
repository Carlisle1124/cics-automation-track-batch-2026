import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import './Dashboard.css';

export default function Dashboard() {
  const { user, reservations, occupants, room } = useApp();
  const isAdmin = user?.role === 'admin';

  const upcoming = reservations.filter((r) => r.status === 'upcoming');
  const myUpcoming = upcoming.filter((r) => r.userId === user?.id);

  return (
    <div>
      {/* Header */}
      <div className="dashboard__header">
        <h1>Learning Common Room</h1>
        <p className="dashboard__header-sub">
          {isAdmin ? 'Administration Overview' : `Welcome, ${user?.name}`}
        </p>
      </div>

      {/* Stats */}
      <div className="dashboard__stats">
        <Card>
          <div className="stat-card">
            <div className="stat-card__label">Current Occupants</div>
            <div className="stat-card__value">{occupants.length} / {room.capacity}</div>
          </div>
        </Card>
        <Card>
          <div className="stat-card">
            <div className="stat-card__label">
              {isAdmin ? 'Total Upcoming' : 'My Upcoming'}
            </div>
            <div className="stat-card__value">
              {isAdmin ? upcoming.length : myUpcoming.length}
            </div>
          </div>
        </Card>
        <Card>
          <div className="stat-card">
            <div className="stat-card__label">Capacity</div>
            <div className="stat-card__value">{room.capacity}</div>
          </div>
        </Card>
      </div>

      <div className="dashboard__grid">
        {/* Occupants */}
        <div>
          <h3 className="dashboard__section-title">Current Occupants</h3>
          <Card>
            {occupants.length === 0 ? (
              <p className="dashboard__empty">No one in the room right now.</p>
            ) : (
              <table className="dashboard__table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student ID</th>
                    <th>Entered</th>
                  </tr>
                </thead>
                <tbody>
                  {occupants.map((occ) => (
                    <tr key={occ.id}>
                      <td>{occ.name}</td>
                      <td>{occ.studentId}</td>
                      <td>{occ.enteredAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Upcoming Reservations */}
        <div>
          <h3 className="dashboard__section-title">
            {isAdmin ? 'Upcoming Reservations' : 'My Upcoming Reservations'}
          </h3>
          <Card>
            {(isAdmin ? upcoming : myUpcoming).length === 0 ? (
              <p className="dashboard__empty">
                No upcoming reservations.{' '}
                {!isAdmin && (
                  <Link to="/schedule" className="dashboard__link">Reserve now</Link>
                )}
              </p>
            ) : (
              (isAdmin ? upcoming : myUpcoming).map((res) => (
                <div className="upcoming-item" key={res.id}>
                  <div className="upcoming-item__info">
                    <h4>{res.userName}</h4>
                    <p>{res.date} &middot; {res.startTime} - {res.endTime}</p>
                  </div>
                  <Badge variant="upcoming">Upcoming</Badge>
                </div>
              ))
            )}
          </Card>
        </div>
      </div>

      {/* CTA */}
      {!isAdmin && (
        <div className="dashboard__cta">
          <Link to="/schedule">
            <Button>Reserve a Time Slot</Button>
          </Link>
        </div>
      )}
      {isAdmin && (
        <div className="dashboard__cta">
          <Link to="/admin">
            <Button>Go to Admin Panel</Button>
          </Link>
        </div>
      )}
    </div>
  );
}
