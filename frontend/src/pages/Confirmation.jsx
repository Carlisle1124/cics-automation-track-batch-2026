import { useLocation, Link, Navigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import './Confirmation.css';

export default function Confirmation() {
  const location = useLocation();
  const data = location.state;

  if (!data) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="confirm-page">
      <h1 className="confirm-page__title">Reservation Confirmed</h1>
      <p className="confirm-page__subtitle">
        Your time slot has been reserved successfully.
      </p>

      <Card>
        <div className="confirm-page__details">
          <div className="confirm-page__row">
            <span className="confirm-page__label">Date</span>
            <span className="confirm-page__value">{data.date}</span>
          </div>
          <div className="confirm-page__row">
            <span className="confirm-page__label">Time</span>
            <span className="confirm-page__value">
              {data.startTime} - {data.endTime}
            </span>
          </div>
          <div className="confirm-page__row">
            <span className="confirm-page__label">Duration</span>
            <span className="confirm-page__value">{data.duration}</span>
          </div>
        </div>
      </Card>

      <div className="confirm-page__actions">
        <Link to="/reservations">
          <Button>View My Reservations</Button>
        </Link>
        <Link to="/schedule">
          <Button variant="secondary">Reserve Another Slot</Button>
        </Link>
        <Link to="/">
          <Button variant="ghost">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
