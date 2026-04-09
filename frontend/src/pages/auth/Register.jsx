import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getUsers } from '../../data/services/authService';
import './AuthPages.css';

export default function Register() {
	const navigate = useNavigate();
	const [users, setUsers] = useState([]);
	const [formValues, setFormValues] = useState({
		fullName: '',
		email: '',
		studentId: '',
		password: '',
		confirmPassword: '',
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedback, setFeedback] = useState('Create your account to reserve hourly slots in the Learning Commons.');

	useEffect(() => {
		let active = true;

		async function loadUsers() {
			const items = await getUsers();

			if (!active) return;

			setUsers(items);
		}

		loadUsers();

		return () => {
			active = false;
		};
	}, []);

	function updateField(key, value) {
		setFormValues((prev) => ({
			...prev,
			[key]: value,
		}));
	}

	async function handleSubmit(event) {
		event.preventDefault();

		if (formValues.password !== formValues.confirmPassword) {
			setFeedback('Passwords do not match. Please try again.');
			return;
		}

		setIsSubmitting(true);
		setFeedback('Creating account...');

		await new Promise((resolve) => setTimeout(resolve, 450));

		setFeedback('Account created (mock). Redirecting to sign in...');
		setIsSubmitting(false);
		navigate('/auth/login');
	}

	return (
		<section className="auth-page auth-page--register">
			<aside className="auth-showcase auth-showcase--register">
				<div className="auth-showcase__chip">Create Student Access</div>
				<h1 className="auth-showcase__title">Start booking your learning commons sessions in minutes.</h1>
				<p className="auth-showcase__subtitle">
					Register once and get access to scheduling, check-in tracking, and reservation history.
				</p>
				<div className="auth-showcase__list-card">
					<h3>What you get</h3>
					<ul>
						<li>Fast 1-hour slot reservations</li>
						<li>Usage insights and attendance stats</li>
						<li>Real-time availability monitoring</li>
					</ul>
				</div>
			</aside>

			<div className="auth-panel">
				<div className="auth-panel__header">
					<h2>Create Account</h2>
					<p>Use your school details to get started.</p>
				</div>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label className="auth-field">
						<span>Full Name</span>
						<input
							type="text"
							value={formValues.fullName}
							onChange={(event) => updateField('fullName', event.target.value)}
							required
						/>
					</label>

					<label className="auth-field">
						<span>School Email</span>
						<input
							type="email"
							value={formValues.email}
							onChange={(event) => updateField('email', event.target.value)}
							placeholder="name@ust.edu.ph"
							required
						/>
					</label>

					<label className="auth-field">
						<span>Student ID</span>
						<input
							type="text"
							value={formValues.studentId}
							onChange={(event) => updateField('studentId', event.target.value)}
							placeholder="2026-00000"
							required
						/>
					</label>

					<div className="auth-form__two-column">
						<label className="auth-field">
							<span>Password</span>
							<input
								type="password"
								value={formValues.password}
								onChange={(event) => updateField('password', event.target.value)}
								required
							/>
						</label>

						<label className="auth-field">
							<span>Confirm Password</span>
							<input
								type="password"
								value={formValues.confirmPassword}
								onChange={(event) => updateField('confirmPassword', event.target.value)}
								required
							/>
						</label>
					</div>

					<button type="submit" className="auth-primary-btn" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create Account'}
					</button>
				</form>

				<p className="auth-status-message">{feedback}</p>
				<p className="auth-session-message">Existing mock accounts: {users.length}</p>
				<p className="auth-panel__footer">
					Already registered? <Link to="/auth/login">Sign in</Link>
				</p>
			</div>
		</section>
	);
}
