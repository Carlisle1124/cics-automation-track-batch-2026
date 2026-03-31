import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import './Reservations.css';

const TABS = ['all', 'upcoming', 'completed', 'cancelled'];

export default function Reservations() {
  const { user, reservations, cancelReservation } = useApp();
  const isAdmin = user?.role === 'admin';
  const [activeTab, setActiveTab] = useState('all');
  const [detailRes, setDetailRes] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const userReservations = isAdmin
    ? reservations
    : reservations.filter((r) => r.userId === user?.id);

  const filtered =
    activeTab === 'all'
      ? userReservations
      : userReservations.filter((r) => r.status === activeTab);

  function handleCancelClick(res) {
    setCancelTarget(res);
  }

  function confirmCancel() {
    if (cancelTarget) {
      cancelReservation(cancelTarget.id);
      setCancelTarget(null);
      setDetailRes(null);
    }
  }

  return (
    <div>
      <div className="reservations__header">
        <h1>{isAdmin ? 'All Reservations' : 'My Reservations'}</h1>
        {!isAdmin && (
          <Link to="/schedule">
            <Button size="sm">+ New Reservation</Button>
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="reservations__tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={`reservations__tab ${activeTab === tab ? 'reservations__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="reservations__list">
        {filtered.length === 0 && (
          <Card>
            <p style={{ color: 'var(--neutral-400)', fontSize: '0.85rem', textAlign: 'center' }}>
              No reservations found.
            </p>
          </Card>
        )}
        {filtered.map((res) => (
          <Card key={res.id}>
            <div className="res-item">
              <div className="res-item__left">
                <div>
                  <div className="res-item__time">
                    {res.date} &middot; {res.startTime} - {res.endTime}
                  </div>
                  {isAdmin && (
                    <div className="res-item__user">{res.userName}</div>
                  )}
                </div>
              </div>
              <div className="res-item__right">
                <Badge variant={res.status}>
                  {res.status.charAt(0).toUpperCase() + res.status.slice(1)}
                </Badge>
                <div className="res-item__actions">
                  <Button size="sm" variant="ghost" onClick={() => setDetailRes(res)}>
                    Details
                  </Button>
                  {res.status === 'upcoming' && (
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleCancelClick(res)}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Detail Modal */}
      <Modal
        open={!!detailRes}
        onClose={() => setDetailRes(null)}
        title="Reservation Details"
      >
        {detailRes && (
          <div>
            <div className="res-detail__row">
              <span className="res-detail__label">Date</span>
              <span className="res-detail__value">{detailRes.date}</span>
            </div>
            <div className="res-detail__row">
              <span className="res-detail__label">Time</span>
              <span className="res-detail__value">
                {detailRes.startTime} - {detailRes.endTime}
              </span>
            </div>
            <div className="res-detail__row">
              <span className="res-detail__label">Duration</span>
              <span className="res-detail__value">{detailRes.duration}</span>
            </div>
            <div className="res-detail__row">
              <span className="res-detail__label">Status</span>
              <Badge variant={detailRes.status}>
                {detailRes.status.charAt(0).toUpperCase() + detailRes.status.slice(1)}
              </Badge>
            </div>
            {isAdmin && (
              <div className="res-detail__row">
                <span className="res-detail__label">Reserved by</span>
                <span className="res-detail__value">{detailRes.userName}</span>
              </div>
            )}
            <div style={{ marginTop: 18, display: 'flex', gap: 10 }}>
              {detailRes.status === 'upcoming' && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleCancelClick(detailRes)}
                >
                  Cancel Reservation
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setDetailRes(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Reservation"
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: 18 }}>
          Are you sure you want to cancel the reservation on{' '}
          <strong>{cancelTarget?.date}</strong> at{' '}
          <strong>{cancelTarget?.startTime} - {cancelTarget?.endTime}</strong>?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="danger" onClick={confirmCancel}>
            Yes, Cancel
          </Button>
          <Button variant="secondary" onClick={() => setCancelTarget(null)}>
            No, Keep It
          </Button>
        </div>
      </Modal>
    </div>
  );
}
