import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import cicsLogo from '../../assets/CICS-Logo.png';
import './AuthPages.css';

export default function Register() {
	const navigate = useNavigate();
	const [formValues, setFormValues] = useState({
		fullName: '',
		email: '',
		studentId: '',
		password: '',
		confirmPassword: '',
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPageLoading, setIsPageLoading] = useState(true);
	const [feedback, setFeedback] = useState('Create your account to reserve hourly slots in the Learning Commons.');

	useEffect(() => {
		const previousTitle = document.title;
		document.title = 'Create Account - UST CICS Learning Common Room';

		const timeoutId = window.setTimeout(() => {
			setIsPageLoading(false);
		}, 700);

		return () => {
			document.title = previousTitle;
			window.clearTimeout(timeoutId);
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
		<section
			className={`auth-page auth-page--register ${
				isPageLoading ? 'auth-page--content-hidden' : 'auth-page--content-visible'
			}`}
		>
			<aside className="auth-showcase auth-showcase--register">
				<img src="/UST-CICS Logo.png" alt="UST CICS" className="auth-showcase__logo" />
				<h1 className="auth-showcase__title">CICS Learning Common Room</h1>
				<p className="auth-showcase__subtitle">University of Santo Tomas</p>
				<p className="auth-showcase__desc">
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

			<div className="auth-mobile-brand auth-mobile-brand--register">
				<div className="auth-mobile-brand__logo-wrap">
					<img src="/UST-CICS Logo.png" alt="UST CICS" className="auth-mobile-brand__logo" />
				</div>

				<div className="auth-mobile-brand__institution">
					<span className="auth-mobile-brand__org">UST CICS</span>
					<span className="auth-mobile-brand__university">UNIVERSITY OF SANTO TOMAS</span>
				</div>

				<div className="auth-mobile-brand__divider" />

				<h1 className="auth-mobile-brand__title">CICS Learning Common Room</h1>

				<p className="auth-mobile-brand__desc">
					Register once and get access to scheduling, check-in tracking, and reservation history.
				</p>

				<div className="auth-mobile-brand__feature-card">
					<h3>What you get</h3>
					<ul className="auth-mobile-brand__feature-list">
						<li>Fast 1-hour slot reservations</li>
						<li>Usage insights and attendance stats</li>
						<li>Real-time availability monitoring</li>
					</ul>
				</div>
			</div>

			<div className="auth-panel">
				<div className="auth-panel__header">
					<h2>Create Account</h2>
					<p>Use your school details to get started.</p>
				</div>

				<form className="auth-form" onSubmit={handleSubmit}>
					<label className="auth-field">
						<span>Full Name</span>
						<div className="auth-field__input-wrap">
							<svg className="auth-field__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
								<path d="M10 10a3.5 3.5 0 100-7 3.5 3.5 0 000 7Z" />
								<path d="M3.5 17a6.5 6.5 0 0113 0" />
							</svg>
							<input
								type="text"
								value={formValues.fullName}
								onChange={(event) => updateField('fullName', event.target.value)}
								placeholder="Juan A. Dela Cruz"
								required
							/>
						</div>
					</label>

					<label className="auth-field">
						<span>UST Email Address</span>
						<div className="auth-field__input-wrap">
							<svg className="auth-field__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
								<rect x="2" y="4" width="16" height="12" rx="2" />
								<path d="M2 4l8 6 8-6" />
							</svg>
							<input
								type="email"
								value={formValues.email}
								onChange={(event) => updateField('email', event.target.value)}
								placeholder="yourname@ust.edu.ph"
								required
							/>
						</div>
					</label>

					<label className="auth-field">
						<span>Student Number</span>
						<div className="auth-field__input-wrap">
							<svg className="auth-field__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
								<rect x="3" y="4" width="14" height="12" rx="2" />
								<path d="M6.5 8h7" />
								<path d="M6.5 11h4.5" />
							</svg>
							<input
								type="text"
								value={formValues.studentId}
								onChange={(event) => updateField('studentId', event.target.value)}
								placeholder="2026-123456"
								required
							/>
						</div>
					</label>

					<div className="auth-form__two-column">
						<label className="auth-field">
							<span>Password</span>
							<div className="auth-field__input-wrap">
								<svg className="auth-field__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
									<rect x="5" y="9" width="10" height="8" rx="2" />
									<path d="M7 9V6a3 3 0 016 0v3" />
								</svg>
								<input
									type="password"
									value={formValues.password}
									onChange={(event) => updateField('password', event.target.value)}
									placeholder="Min. 4 chars"
									required
								/>
							</div>
						</label>

						<label className="auth-field">
							<span>Confirm Password</span>
							<div className="auth-field__input-wrap">
								<svg className="auth-field__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
									<rect x="5" y="9" width="10" height="8" rx="2" />
									<path d="M7 9V6a3 3 0 016 0v3" />
									<path d="M8.25 13l1.1 1.1 2.4-2.4" />
								</svg>
								<input
									type="password"
									value={formValues.confirmPassword}
									onChange={(event) => updateField('confirmPassword', event.target.value)}
									placeholder="Re-enter your password"
									required
								/>
							</div>
						</label>
					</div>

					<button type="submit" className="auth-primary-btn" disabled={isSubmitting}>
						{isSubmitting ? 'Creating...' : 'Create Account'}
					</button>
				</form>

				<p className="auth-status-message">{feedback}</p>
				<p className="auth-panel__footer">
					Already registered? <Link to="/auth/login">Sign in</Link>
				</p>
			</div>

			{isPageLoading ? (
				<div
					className="auth-register-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading create account page"
				>
					<div className="auth-register-transition__card">
						<img
							src={cicsLogo}
							alt="UST CICS logo"
							className="auth-register-transition__logo"
						/>
						<div className="auth-register-transition__loader" aria-hidden="true">
							<span></span>
						</div>
					</div>
				</div>
			) : null}
		</section>
	);
}
