import { useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from '../../data/services/authService';
import {
	AVAILABILITY_ALERTS,
	NOTIFICATIONS,
	OCCUPANCY,
	RESERVATIONS,
	ROOMS,
} from '../../data/mock/mockData';
import './Profile.css';

function formatDate(dateValue) {
	if (!dateValue) return 'N/A';
	const parsed = new Date(dateValue);
	if (Number.isNaN(parsed.getTime())) return 'N/A';

	return parsed.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

function getInitials(name) {
	if (!name) return 'ST';

	return name
		.split(' ')
		.filter(Boolean)
		.slice(0, 2)
		.map((chunk) => chunk[0].toUpperCase())
		.join('');
}

export default function Profile() {
	const [user, setUser] = useState(null);

	useEffect(() => {
		let active = true;

		async function loadProfile() {
			const currentUser = await getCurrentUser();

			if (!active) return;

			setUser(currentUser);
		}

		loadProfile();

		return () => {
			active = false;
		};
	}, []);

	const stats = useMemo(() => {
		if (!user) return null;

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const userReservations = RESERVATIONS.filter((item) => item.userId === user.id);
		const upcomingReservations = userReservations.filter((item) => {
			const reservationDate = new Date(item.date);
			reservationDate.setHours(0, 0, 0, 0);

			return reservationDate >= today && ['pending', 'confirmed', 'checked_in'].includes(item.status);
		}).length;

		const completedReservations = userReservations.filter((item) => item.status === 'completed').length;

		const reservationsMade = userReservations.length;
		const bookedHours = userReservations.reduce((total, item) => total + (item.slotIds?.length ?? 0), 0);

		const occupancyRecords = OCCUPANCY.filter((entry) => entry.userId === user.id);
		const checkIns = occupancyRecords.length;

		// Fallback to completed+checked_in slot count if occupancy logs are sparse in mock data.
		const hoursSpent = userReservations
			.filter((item) => ['completed', 'checked_in'].includes(item.status))
			.reduce((total, item) => total + (item.slotIds?.length ?? 0), 0);

		const activeAlerts = AVAILABILITY_ALERTS.filter((item) => item.userId === user.id && item.status === 'active').length;
		const unreadNotifications = NOTIFICATIONS.filter((item) => item.userId === user.id && !item.read).length;

		return {
			reservationsMade,
			bookedHours,
			hoursSpent,
			checkIns,
			upcomingReservations,
			completedReservations,
			activeAlerts,
			unreadNotifications,
		};
	}, [user]);

	if (!user || !stats) {
		return (
			<section className="profile-page">
				<div className="profile-page__loading">Loading profile...</div>
			</section>
		);
	}

	const learningCommons = ROOMS[0];

	return (
		<section className="profile-page">
			<header className="profile-hero">
				<div className="profile-hero__identity">
					<div className="profile-hero__avatar">{getInitials(user.name)}</div>
					<div>
						<h2 className="profile-hero__name">{user.name}</h2>
						<p className="profile-hero__meta">{user.email}</p>
						<p className="profile-hero__meta">{learningCommons?.name ?? 'Learning Commons'} Student Account</p>
					</div>
				</div>
				<div className="profile-hero__pill">{user.role}</div>
			</header>

			<div className="profile-stats-grid">
				<article className="profile-stat-card">
					<span className="profile-stat-card__label">Reservations Made</span>
					<span className="profile-stat-card__value">{stats.reservationsMade}</span>
				</article>
				<article className="profile-stat-card">
					<span className="profile-stat-card__label">Booked Hours</span>
					<span className="profile-stat-card__value">{stats.bookedHours} hrs</span>
				</article>
				<article className="profile-stat-card">
					<span className="profile-stat-card__label">Hours Spent in Commons</span>
					<span className="profile-stat-card__value">{stats.hoursSpent} hrs</span>
				</article>
				<article className="profile-stat-card">
					<span className="profile-stat-card__label">Check-ins</span>
					<span className="profile-stat-card__value">{stats.checkIns}</span>
				</article>
				<article className="profile-stat-card">
					<span className="profile-stat-card__label">Upcoming Reservations</span>
					<span className="profile-stat-card__value">{stats.upcomingReservations}</span>
				</article>
				<article className="profile-stat-card">
					<span className="profile-stat-card__label">Completed Sessions</span>
					<span className="profile-stat-card__value">{stats.completedReservations}</span>
				</article>
			</div>

			<div className="profile-content-grid">
				<article className="profile-card">
					<h3 className="profile-card__title">Account Details</h3>
					<div className="profile-card__rows">
						<div className="profile-row">
							<span className="profile-row__label">Full Name</span>
							<span className="profile-row__value">{user.name}</span>
						</div>
						<div className="profile-row">
							<span className="profile-row__label">Email</span>
							<span className="profile-row__value">{user.email}</span>
						</div>
						<div className="profile-row">
							<span className="profile-row__label">Student ID</span>
							<span className="profile-row__value">{user.studentId ?? 'Not assigned'}</span>
						</div>
						<div className="profile-row">
							<span className="profile-row__label">Email Verification</span>
							<span className="profile-row__value">{user.emailVerified ? 'Verified' : 'Pending'}</span>
						</div>
						<div className="profile-row">
							<span className="profile-row__label">Remember Me</span>
							<span className="profile-row__value">{user.rememberMe ? 'Enabled' : 'Disabled'}</span>
						</div>
						<div className="profile-row">
							<span className="profile-row__label">Member Since</span>
							<span className="profile-row__value">{formatDate(user.createdAt)}</span>
						</div>
					</div>
				</article>

				<article className="profile-card">
					<h3 className="profile-card__title">Activity Snapshot</h3>
					<div className="profile-card__rows">
						<div className="profile-row">
							<span className="profile-row__label">Unread Notifications</span>
							<span className="profile-row__value">{stats.unreadNotifications}</span>
						</div>
						<div className="profile-row">
							<span className="profile-row__label">Active Availability Alerts</span>
							<span className="profile-row__value">{stats.activeAlerts}</span>
						</div>
						<div className="profile-row">
							<span className="profile-row__label">Preferred Space</span>
							<span className="profile-row__value">{learningCommons?.name ?? 'Learning Commons'}</span>
						</div>
						<div className="profile-row">
							<span className="profile-row__label">Operating Hours</span>
							<span className="profile-row__value">{learningCommons?.openTime ?? '08:00'} - {learningCommons?.closeTime ?? '17:00'}</span>
						</div>
					</div>
				</article>
			</div>
		</section>
	);
}
