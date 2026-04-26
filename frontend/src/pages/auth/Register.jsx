import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUser } from '../../data/services/authService';
import Modal from '../../shared/components/Modal';
import cicsLogo from '../../assets/CICS-Logo.webp';
import './AuthPages.css';

const RESEND_COOLDOWN_SECONDS = 180;

const UST_DOMAIN = '@ust.edu.ph';
const FULL_NAME_REGEX = /^[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s.'-]{2,}$/;
const STUDENT_NUMBER_REGEX = /^\d{4}-\d{6}$/;

function validateFullName(value) {
	const trimmed = value.trim();

	if (!trimmed) return 'Please enter your full name.';
	if (trimmed.length < 5) return 'Full name must be at least 5 characters.';
	if (!FULL_NAME_REGEX.test(trimmed)) return 'Please enter a valid full name.';
	return '';
}

function validateUstEmail(value) {
	const trimmed = value.trim().toLowerCase();

	if (!trimmed) return 'Please enter your UST email address.';
	if (!trimmed.includes('@')) return 'Please enter a valid email address.';
	if (!trimmed.endsWith(UST_DOMAIN)) return 'Only @ust.edu.ph emails are allowed.';
	return '';
}

function validateStudentNumber(value) {
	const trimmed = value.trim();

	if (!trimmed) return 'Please enter your student number.';
	if (!STUDENT_NUMBER_REGEX.test(trimmed)) return 'Use the format YYYY-XXXXXX.';
	return '';
}

function validatePassword(value) {
	if (!value) return 'Please enter your password.';
	if (value.length < 6) return 'Password must be 6 or more characters.';
	return '';
}

function validateConfirmPassword(confirmPassword, password) {
	if (!confirmPassword) return 'Please confirm your password.';
	if (confirmPassword !== password) return 'Passwords do not match.';
	return '';
}

export default function Register() {
	const [formValues, setFormValues] = useState({
		fullName: '',
		email: '',
		studentId: '',
		password: '',
		confirmPassword: '',
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isPageLoading, setIsPageLoading] = useState(true);
	const [errorFeedback, setErrorFeedback] = useState('');
	const [hasSubmitted, setHasSubmitted] = useState(false);
	const [emailModalOpen, setEmailModalOpen] = useState(false);
	const [emailModalState, setEmailModalState] = useState('loading'); // 'loading' | 'success'
	const [emailSent, setEmailSent] = useState(false);
	const [resendCountdown, setResendCountdown] = useState(0);
	const countdownRef = useRef(null);

	const registerErrors = {
		fullName: hasSubmitted ? validateFullName(formValues.fullName) : '',
		email: hasSubmitted ? validateUstEmail(formValues.email) : '',
		studentId: hasSubmitted ? validateStudentNumber(formValues.studentId) : '',
		password: hasSubmitted ? validatePassword(formValues.password) : '',
		confirmPassword: hasSubmitted
			? validateConfirmPassword(formValues.confirmPassword, formValues.password)
			: '',
	};

	const getFieldClassName = (error) =>
		error ? 'auth-field auth-field--error' : 'auth-field';

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

	function formatCountdown(seconds) {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${String(s).padStart(2, '0')}`;
	}

	function startCountdown() {
		setResendCountdown(RESEND_COOLDOWN_SECONDS);
		countdownRef.current = setInterval(() => {
			setResendCountdown((prev) => {
				if (prev <= 1) {
					clearInterval(countdownRef.current);
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	}

	function updateField(key, value) {
		setFormValues((prev) => ({ ...prev, [key]: value }));
	}

	async function submitRegistration() {
		setIsSubmitting(true);
		setEmailModalState('loading');
		setEmailModalOpen(true);

		try {
			await registerUser(
				formValues.email,
				formValues.password,
				formValues.fullName,
				formValues.studentId
			);
			setEmailSent(true);
			setEmailModalState('success');
			clearInterval(countdownRef.current);
			startCountdown();
		} catch (error) {
			setEmailModalOpen(false);
			setErrorFeedback(error.message);
		} finally {
			setIsSubmitting(false);
		}
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setHasSubmitted(true);
		setErrorFeedback('');

		const nextErrors = {
			fullName: validateFullName(formValues.fullName),
			email: validateUstEmail(formValues.email),
			studentId: validateStudentNumber(formValues.studentId),
			password: validatePassword(formValues.password),
			confirmPassword: validateConfirmPassword(formValues.confirmPassword, formValues.password),
		};

		if (Object.values(nextErrors).some(Boolean)) return;

		await submitRegistration();
	}

	async function handleResend() {
		const errors = {
			fullName: validateFullName(formValues.fullName),
			email: validateUstEmail(formValues.email),
			studentId: validateStudentNumber(formValues.studentId),
			password: validatePassword(formValues.password),
			confirmPassword: validateConfirmPassword(formValues.confirmPassword, formValues.password),
		};
		if (Object.values(errors).some(Boolean)) {
			setHasSubmitted(true);
			return;
		}
		await submitRegistration();
	}

	return (
		<section
			className={`auth-page auth-page--register ${
				isPageLoading ? 'auth-page--content-hidden' : 'auth-page--content-visible'
			}`}
		>
			<aside className="auth-showcase auth-showcase--register">
				<img src="/UST-CICS Logo.png" alt="UST CICS" className="auth-showcase__logo" />

				<div className="auth-showcase__institution">
					<span className="auth-showcase__org">UNIVERSITY OF SANTO TOMAS</span>
					<span className="auth-showcase__subtitle">COLLEGE OF INFORMATION AND COMPUTING SCIENCES</span>
				</div>

				<div className="auth-showcase__divider" />

				<h1 className="auth-showcase__title">CICS Learning Common Room</h1>

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
					<span className="auth-mobile-brand__org">UNIVERSITY OF SANTO TOMAS</span>
					<span className="auth-mobile-brand__university">COLLEGE OF INFORMATION AND COMPUTING SCIENCES</span>
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

				<form className="auth-form" onSubmit={handleSubmit} noValidate>
					<label className={getFieldClassName(registerErrors.fullName)}>
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
						{registerErrors.fullName ? (
							<span className="auth-field__error-row" role="alert">
								<span className="auth-field__error-icon" aria-hidden="true">!</span>
								<span className="auth-field__error-text">{registerErrors.fullName}</span>
							</span>
						) : null}
					</label>

					<label className={getFieldClassName(registerErrors.email)}>
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
						{registerErrors.email ? (
							<span className="auth-field__error-row" role="alert">
								<span className="auth-field__error-icon" aria-hidden="true">!</span>
								<span className="auth-field__error-text">{registerErrors.email}</span>
							</span>
						) : null}
					</label>

					<label className={getFieldClassName(registerErrors.studentId)}>
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
						{registerErrors.studentId ? (
							<span className="auth-field__error-row" role="alert">
								<span className="auth-field__error-icon" aria-hidden="true">!</span>
								<span className="auth-field__error-text">{registerErrors.studentId}</span>
							</span>
						) : null}
					</label>

					<div className="auth-form__two-column">
						<label className={getFieldClassName(registerErrors.password)}>
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
									placeholder="Min. 6 chars"
									required
								/>
							</div>
							{registerErrors.password ? (
								<span className="auth-field__error-row" role="alert">
									<span className="auth-field__error-icon" aria-hidden="true">!</span>
									<span className="auth-field__error-text">{registerErrors.password}</span>
								</span>
							) : null}
						</label>

						<label className={getFieldClassName(registerErrors.confirmPassword)}>
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
							{registerErrors.confirmPassword ? (
								<span className="auth-field__error-row" role="alert">
									<span className="auth-field__error-icon" aria-hidden="true">!</span>
									<span className="auth-field__error-text">{registerErrors.confirmPassword}</span>
								</span>
							) : null}
						</label>
					</div>

					{!emailSent ? (
						<button type="submit" className="auth-primary-btn" disabled={isSubmitting}>
							{isSubmitting ? (
								<span className="auth-btn-loading">
									<span className="auth-spinner" aria-hidden="true" />
									Creating...
								</span>
							) : 'Create Account'}
						</button>
					) : (
						<button
							type="button"
							className="auth-primary-btn"
							disabled={resendCountdown > 0 || isSubmitting}
							onClick={handleResend}
						>
							{isSubmitting ? (
								<span className="auth-btn-loading">
									<span className="auth-spinner" aria-hidden="true" />
									Sending...
								</span>
							) : resendCountdown > 0
								? `Resend Email (${formatCountdown(resendCountdown)})`
								: 'Resend Email'
							}
						</button>
					)}
				</form>

				{errorFeedback ? (
					<p className="auth-status-message auth-status-message--error">{errorFeedback}</p>
				) : null}

				<p className="auth-panel__footer">
					Already registered? <Link to="/auth/login">Sign in</Link>
				</p>
			</div>

			<Modal isOpen={emailModalOpen} title="Verify Your Email" onClose={() => setEmailModalOpen(false)} className="ui-modal--flexible">
				<div className="auth-forgot-form">
					{emailModalState === 'loading' ? (
						<div className="auth-verify__state">
							<div className="auth-register-transition__card">
								<img src={cicsLogo} alt="UST CICS logo" className="auth-register-transition__logo" />
								<div className="auth-register-transition__loader" aria-hidden="true">
									<span></span>
								</div>
							</div>
							<p className="auth-verify__label">Sending verification email...</p>
						</div>
					) : (
						<div className="auth-verify__state">
							<div className="auth-verify__icon" aria-hidden="true">
								<svg width="56" height="56" viewBox="0 0 56 56" fill="none">
									<circle cx="28" cy="28" r="28" fill="#E8F5E9" />
									<path d="M16 28l8 8 16-16" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
								</svg>
							</div>
							<h3 className="auth-verify__title">Email Sent!</h3>
							<p className="auth-verify__desc">
								A verification link has been sent to <strong>{formValues.email}</strong>. Please check your inbox and click the link to activate your account.
							</p>
						</div>
					)}
				</div>
			</Modal>

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
