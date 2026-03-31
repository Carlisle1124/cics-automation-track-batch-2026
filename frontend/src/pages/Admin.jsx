import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { TIME_SLOTS } from '../data/mockData';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import './Admin.css';

export default function Admin() {
  const {
    occupants,
    reservations,
    room,
    removeOccupant,
    editReservation,
    addReservationManual,
    cancelReservation,
  } = useApp();

  // Remove occupant confirmation
  const [removeTarget, setRemoveTarget] = useState(null);

  // Edit reservation
  const [editTarget, setEditTarget] = useState(null);
  const [editStart, setEditStart] = useState('');
  const [editEnd, setEditEnd] = useState('');

  // Add reservation manually
  const [addDate, setAddDate] = useState('');
  const [addStart, setAddStart] = useState('');
  const [addEnd, setAddEnd] = useState('');
  const [addName, setAddName] = useState('');
  const [addConfirmOpen, setAddConfirmOpen] = useState(false);

  // Verification
  const [verifyName, setVerifyName] = useState('');
  const [verifyResult, setVerifyResult] = useState(null);

  // Cancel reservation confirmation
  const [cancelTarget, setCancelTarget] = useState(null);

  const upcoming = reservations.filter((r) => r.status === 'upcoming');

  function confirmRemove() {
    if (removeTarget) {
      removeOccupant(removeTarget.id);
      setRemoveTarget(null);
    }
  }

  function openEdit(res) {
    setEditTarget(res);
    setEditStart(res.startTime);
    setEditEnd(res.endTime);
  }

  function confirmEdit() {
    if (editTarget) {
      editReservation(editTarget.id, editStart, editEnd);
      setEditTarget(null);
    }
  }

  function handleAddReservation() {
    if (!addDate || !addStart || !addEnd || !addName) return;
    setAddConfirmOpen(true);
  }

  function confirmAdd() {
    addReservationManual(addDate, addStart, addEnd, addName);
    setAddDate('');
    setAddStart('');
    setAddEnd('');
    setAddName('');
    setAddConfirmOpen(false);
  }

  function handleVerify() {
    if (!verifyName.trim()) return;
    const now = new Date();
    const currentHour = now.getHours();
    const match = upcoming.find((r) => {
      const nameLower = r.userName.toLowerCase();
      const searchLower = verifyName.toLowerCase();
      if (!nameLower.includes(searchLower)) return false;
      const startHour = parseInt(r.startTime);
      const isPM = r.startTime.includes('PM');
      let h = startHour;
      if (isPM && h !== 12) h += 12;
      if (!isPM && h === 12) h = 0;
      return Math.abs(currentHour - h) <= 1;
    });
    setVerifyResult(match || null);
  }

  function confirmCancel() {
    if (cancelTarget) {
      cancelReservation(cancelTarget.id);
      setCancelTarget(null);
    }
  }

  return (
    <div className="admin-page">
      <h1>Admin Panel</h1>

      <div className="admin-grid">
        {/* Current Occupants */}
        <div className="admin-section">
          <div className="admin-section__title">
            Current Occupants ({occupants.length} / {room.capacity})
          </div>
          <Card>
            {occupants.length === 0 ? (
              <p style={{ color: 'var(--neutral-400)', fontSize: '0.83rem' }}>
                No occupants.
              </p>
            ) : (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Student ID</th>
                    <th>Entered</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {occupants.map((occ) => (
                    <tr key={occ.id}>
                      <td>{occ.name}</td>
                      <td>{occ.studentId}</td>
                      <td>{occ.enteredAt}</td>
                      <td>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => setRemoveTarget(occ)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </div>

        {/* Verification */}
        <div className="admin-section">
          <div className="admin-section__title">Verify Student</div>
          <div className="admin-verify">
            <div className="admin-form">
              <div className="admin-form__group">
                <label className="admin-form__label">Student Name</label>
                <input
                  className="admin-form__input"
                  value={verifyName}
                  onChange={(e) => setVerifyName(e.target.value)}
                  placeholder="Enter name"
                />
              </div>
              <Button size="sm" onClick={handleVerify}>Check</Button>
            </div>
            {verifyResult !== null && verifyName && (
              <div
                className={`admin-verify__result ${
                  verifyResult
                    ? 'admin-verify__result--match'
                    : 'admin-verify__result--no-match'
                }`}
              >
                {verifyResult
                  ? `Match: ${verifyResult.userName} — ${verifyResult.date}, ${verifyResult.startTime} - ${verifyResult.endTime}`
                  : 'No matching reservation found for this time.'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Reservations */}
      <div className="admin-section">
        <div className="admin-section__title">Upcoming Reservations</div>
        <Card>
          {upcoming.length === 0 ? (
            <p style={{ color: 'var(--neutral-400)', fontSize: '0.83rem' }}>
              No upcoming reservations.
            </p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((res) => (
                  <tr key={res.id}>
                    <td>{res.userName}</td>
                    <td>{res.date}</td>
                    <td>{res.startTime} - {res.endTime}</td>
                    <td>
                      <Badge variant="upcoming">Upcoming</Badge>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(res)}>
                          Edit
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setCancelTarget(res)}>
                          Cancel
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      {/* Add Reservation Manually */}
      <div className="admin-section">
        <div className="admin-section__title">Add Reservation Manually</div>
        <Card>
          <div className="admin-form">
            <div className="admin-form__group">
              <label className="admin-form__label">Student Name</label>
              <input
                className="admin-form__input"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label">Date</label>
              <input
                className="admin-form__input"
                type="date"
                value={addDate}
                onChange={(e) => setAddDate(e.target.value)}
              />
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label">Start Time</label>
              <select
                className="admin-form__select"
                value={addStart}
                onChange={(e) => setAddStart(e.target.value)}
              >
                <option value="">--</option>
                {TIME_SLOTS.map((s) => (
                  <option key={s.id} value={s.label}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="admin-form__group">
              <label className="admin-form__label">End Time</label>
              <select
                className="admin-form__select"
                value={addEnd}
                onChange={(e) => setAddEnd(e.target.value)}
              >
                <option value="">--</option>
                {TIME_SLOTS.map((s) => {
                  const h = s.hour + 1;
                  const label =
                    h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
                  return (
                    <option key={s.id} value={label}>{label}</option>
                  );
                })}
              </select>
            </div>
            <Button size="sm" onClick={handleAddReservation}>
              Add
            </Button>
          </div>
        </Card>
      </div>

      {/* Remove Occupant Confirmation */}
      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Remove Occupant"
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: 18 }}>
          Remove <strong>{removeTarget?.name}</strong> ({removeTarget?.studentId}) from the room?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="danger" onClick={confirmRemove}>
            Yes, Remove
          </Button>
          <Button variant="secondary" onClick={() => setRemoveTarget(null)}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Edit Reservation Modal */}
      <Modal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Reservation Time"
      >
        {editTarget && (
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--neutral-600)', marginBottom: 14 }}>
              Editing reservation for <strong>{editTarget.userName}</strong> on{' '}
              <strong>{editTarget.date}</strong>
            </p>
            <div className="admin-form" style={{ marginBottom: 16 }}>
              <div className="admin-form__group">
                <label className="admin-form__label">Start Time</label>
                <select
                  className="admin-form__select"
                  value={editStart}
                  onChange={(e) => setEditStart(e.target.value)}
                >
                  {TIME_SLOTS.map((s) => (
                    <option key={s.id} value={s.label}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div className="admin-form__group">
                <label className="admin-form__label">End Time</label>
                <select
                  className="admin-form__select"
                  value={editEnd}
                  onChange={(e) => setEditEnd(e.target.value)}
                >
                  {TIME_SLOTS.map((s) => {
                    const h = s.hour + 1;
                    const label =
                      h === 12 ? '12:00 PM' : h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
                    return (
                      <option key={s.id} value={label}>{label}</option>
                    );
                  })}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button onClick={confirmEdit}>Save Changes</Button>
              <Button variant="secondary" onClick={() => setEditTarget(null)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Confirmation Modal */}
      <Modal
        open={addConfirmOpen}
        onClose={() => setAddConfirmOpen(false)}
        title="Confirm New Reservation"
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: 18 }}>
          Add reservation for <strong>{addName}</strong> on <strong>{addDate}</strong> at{' '}
          <strong>{addStart} - {addEnd}</strong>?
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <Button onClick={confirmAdd}>Yes, Add</Button>
          <Button variant="secondary" onClick={() => setAddConfirmOpen(false)}>
            Cancel
          </Button>
        </div>
      </Modal>

      {/* Cancel Reservation Confirmation */}
      <Modal
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Reservation"
      >
        <p style={{ fontSize: '0.875rem', color: 'var(--neutral-600)', marginBottom: 18 }}>
          Cancel {cancelTarget?.userName}'s reservation on{' '}
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
