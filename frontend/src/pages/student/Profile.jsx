import { useEffect, useMemo, useState } from 'react';
import { getCurrentUser } from '../../data/services/authService';
import {
	AVAILABILITY_ALERTS,
	NOTIFICATIONS,
	OCCUPANCY,
	RESERVATIONS,
	ROOMS,
} from '../../data/mock/mockData';
import PageHeader from '../../shared/components/PageHeader';
import { formatTimeRange } from '../../shared/utils/datetime';
import './Profile.css';
import { supabase } from '../../data/supabaseClient.js';

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
	const [reservationCount, setReservationCount] = useState(0);
	const [hoursBooked, setHoursBooked] = useState(0);
	const [spentHours, setspentHours] = useState(0);
	const [checkinCount, setCheckinCount] = useState(0);
	const [upcomingResCount, setUpcomingResCount] = useState(0);
	const [completedResCount, setCompletedResCount] = useState(0);

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

	useEffect(() => {
	if (!user) return;

	const fetchReservationCount = async () => {
		const { data, error } = await supabase.rpc(
			'user_reservation_count',
			{ p_user_id: user.id }
		);

		if (error) {
			console.error('Error fetching reservation count:', error);
			return;
		}

		setReservationCount(data);
	};

	fetchReservationCount();
}, [user]);

	useEffect(() => {
	if (!user) return;

	const fetchBookedHours = async () => {
		const { data, error } = await supabase.rpc(
			'user_booked_reservation_hours',
			{ p_user_id: user.id }
		);

		if (error) {
			console.error(error);
			return;
		}

		setHoursBooked(data);
	};

	fetchBookedHours();
	}, [user]);

	useEffect(() => {
	if (!user) return;

	const fetchPastHours = async () => {
		const { data, error } = await supabase.rpc(
			'user_past_reservation_hours',
			{ p_user_id: user.id }
		);

		if (error) {
			console.error(error);
			return;
		}

		setspentHours(data);
	};

	fetchPastHours();
	}, [user]);

	useEffect(() => {
	if (!user) return;

	const fetchCheckinCount = async () => {
		const { data, error } = await supabase.rpc(
			'user_check_in_count',
			{ p_user_id: user.id }
		);

		if (error) {
			console.error('Error fetching check-in count:', error);
			return;
		}

		setCheckinCount(data);
	};

	fetchCheckinCount();
}, [user]);

	useEffect(() => {
	if (!user) return;

	const fetchUpcomingResCount = async () => {
		const { data, error } = await supabase.rpc(
			'user_upcoming_res_count',
			{ p_user_id: user.id }
		);

		if (error) {
			console.error(error);
			return;
		}

		setUpcomingResCount(data);
	};

	fetchUpcomingResCount();
	}, [user]);

	useEffect(() => {
	if (!user) return;

	const fetchCompletedResCount = async () => {
		const { data, error } = await supabase.rpc(
			'user_completed_res_count',
			{ p_user_id: user.id }
		);

		if (error) {
			console.error(error);
			return;
		}

		setCompletedResCount(data);
	};

	fetchCompletedResCount();
	}, [user]);

	const stats = useMemo(() => {
		if (!user) return null;

		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const userReservations = RESERVATIONS.filter((item) => item.userId === user.id);
//		const upcomingReservations = userReservations.filter((item) => {
//			const reservationDate = new Date(item.date);
//			reservationDate.setHours(0, 0, 0, 0);
//
//			return reservationDate >= today && ['pending', 'confirmed', 'checked_in'].includes(item.status);
//		}).length;
//		const completedReservations = userReservations.filter((item) => item.status === 'completed').length;
//		^ not sure what this is for, pero iwan ko na muna dito in case needed sya     - Cath

		const reservationsMade = reservationCount;
		const bookedHours = hoursBooked;
		const hoursSpent = spentHours;
		const checkIns = checkinCount;
		const upcomingReservations = upcomingResCount;
		const completedReservations = completedResCount;

		// Fallback to completed+checked_in slot count if occupancy logs are sparse in mock data.
		const fallbackhoursSpent = userReservations
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
	}, [user, reservationCount, hoursBooked, spentHours, checkinCount, upcomingResCount, completedResCount]);

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
			<PageHeader
				className="page-header--student-sticky"
				title="Profile"
				subtitle="Review your account details, reservation activity, and learning commons insights."
			/>

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
							<span className="profile-row__value">{user.student_id ?? 'Not assigned'}</span>
						</div>
						<div className="profile-row">
							<span className="profile-row__label">Member Since</span>
							<span className="profile-row__value">{formatDate(user.created_at)}</span>
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
							<span className="profile-row__label">Operating Hours</span>
							<span className="profile-row__value">
								{formatTimeRange(learningCommons?.openTime ?? '8:00 AM', learningCommons?.closeTime ?? '5:00 PM')}
							</span>
						</div>
					</div>
				</article>
			</div>
		</section>
	);
}
