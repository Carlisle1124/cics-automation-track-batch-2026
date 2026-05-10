import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, login } from '../../data/services/authService';
import { getRoleRoute } from '../../shared/utils/routeUtils';
import Modal from '../../shared/components/Modal';
import cicsLogo from '../../assets/CICS-Logo.webp';
import './AuthPages.css';

const UST_DOMAIN = '@ust.edu.ph';
const MOCK_OTP = '123456';

function formatCountdown(targetDate) {
	if (!targetDate) return '';

	const diffMs = Math.max(0, targetDate.getTime() - Date.now());
	const totalSeconds = Math.floor(diffMs / 1000);
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	return [
		days > 0 ? `${days}d` : null,
		`${String(hours).padStart(2, '0')}h`,
		`${String(minutes).padStart(2, '0')}m`,
		`${String(seconds).padStart(2, '0')}s`,
	]
		.filter(Boolean)
		.join(' ');
}

function formatSuspensionDate(value) {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';
	return date.toLocaleDateString('en-PH', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

function validateEmail(value) {
	const trimmed = value.trim().toLowerCase();

	if (!trimmed) return 'Please enter your UST email address.';
	if (trimmed.length > 255) return 'Email address must be 255 characters or fewer..';
	if (!trimmed.includes('@')) return 'Please enter a valid email address.';
	if (!trimmed.endsWith(UST_DOMAIN)) return 'Only @ust.edu.ph emails are allowed.';
	const local = trimmed.slice(0, trimmed.indexOf('@'));
	if (local.length < 1) return 'Please enter your UST email username.';
	return '';
}

function validatePassword(value) {
	if (!value.trim()) return 'Please enter your password.';
	if (value.length > 64) return 'Password must be 64 characters or fewer.';
	return '';
}

function validateOtp(value) {
	const trimmed = value.trim();

	if (!trimmed) return 'Please enter the OTP.';
	if (!/^\d{6}$/.test(trimmed)) return 'OTP must be exactly 6 digits.';
	return '';
}

export default function Login() {
	const navigate = useNavigate();
	const [currentUser, setCurrentUser] = useState(null);
	const [isPageLoading, setIsPageLoading] = useState(true);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [rememberMe, setRememberMe] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [statusMessage, setStatusMessage] = useState('Sign in using your university credentials to reserve slots.');
	const [statusType, setStatusType] = useState('info');
	const [errorModalOpen, setErrorModalOpen] = useState(false);
	const [errorModalMessage, setErrorModalMessage] = useState('');
	const [suspensionInfo, setSuspensionInfo] = useState(null);

	// Field-level validation
	const [hasSubmitted, setHasSubmitted] = useState(false);

	const loginErrors = {
		email: hasSubmitted ? validateEmail(email) : '',
		password: hasSubmitted ? validatePassword(password) : '',
	};

	const suspensionUntilDate = suspensionInfo?.suspendedUntil ? new Date(suspensionInfo.suspendedUntil) : null;
	const suspensionCountdown = suspensionUntilDate ? formatCountdown(suspensionUntilDate) : '';
	const suspensionUntilLabel = suspensionInfo?.suspendedUntil ? formatSuspensionDate(suspensionInfo.suspendedUntil) : '';

	useEffect(() => {
		if (!suspensionInfo?.suspendedUntil) return undefined;

		const timerId = window.setInterval(() => {
			setSuspensionInfo((current) => (current ? { ...current } : current));
		}, 1000);

		return () => window.clearInterval(timerId);
	}, [suspensionInfo?.suspendedUntil]);

	useEffect(() => {
		let active = true;

		async function loadLoginPage() {
			try {
				const [user] = await Promise.all([
					getCurrentUser(),
					new Promise((resolve) => setTimeout(resolve, 700)),
				]);

				if (!active) return;
				if (user) {
					navigate(getRoleRoute(user.role), { replace: true });
					return;
				}
				setCurrentUser(user);
			} finally {
				if (active) {
					setIsPageLoading(false);
				}
			}
		}

		loadLoginPage();

		return () => {
			active = false;
		};
	}, []);

	useEffect(() => {
		const previousTitle = document.title;
		document.title = 'Login - UST CICS Learning Common Room';

		return () => {
			document.title = previousTitle;
		};
	}, []);

const setStatus = useCallback((message, type = 'info') => {
		setStatusMessage(message);
		setStatusType(type);
	}, []);

	function getFriendlyError(message = '') {
		const msg = message.toLowerCase();
		if (msg.includes('invalid login credentials') || msg.includes('invalid email or password'))
			return 'The email or password you entered is incorrect. Please check your details and try again.';
		if (msg.includes('email not confirmed'))
			return 'Your email address has not been verified yet. Please check your inbox for a verification link.';
		if (msg.includes('too many requests'))
			return 'Too many sign-in attempts. Please wait a few minutes before trying again.';
		if (msg.includes('user not found'))
			return 'No account was found with that email address.';
		if (msg.includes('profile fetch error'))
			return 'Your account was found but your profile could not be loaded. Please contact support.';
		return 'Something went wrong while signing you in. Please try again.';
	}

	function showErrorModal(message) {
		setErrorModalMessage(getFriendlyError(message));
		setErrorModalOpen(true);
	}

	function showSuspensionInfo(err) {
		const suspendedUntil = err?.suspendedUntil ? new Date(err.suspendedUntil) : null;
		setSuspensionInfo({
			message: err?.message || 'Your account is suspended. Please contact an administrator if you think this is a mistake.',
			suspendedUntil: err?.suspendedUntil ?? null,
		});
		setStatus(err?.message || 'Your account is suspended.', 'error');
		setErrorModalMessage(err?.message || 'Your account is suspended. Please contact an administrator if you think this is a mistake.');
		setErrorModalOpen(true);
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setHasSubmitted(true);

		const eErr = validateEmail(email);
		const pErr = validatePassword(password);

		if (eErr || pErr) {
			setStatus('Please fix the highlighted fields and try again.', 'error');
			return;
		}

		setIsSubmitting(true);
		setStatus('Signing you in...', 'info');

		try {
			const user = await login(email, password);
			setCurrentUser(user);
			setStatus(`Welcome back, ${user.full_name}. Redirecting...`, 'success');
			navigate(getRoleRoute(user.role));
		} catch (err) {
			setStatus('Sign in failed.', 'error');
			if (err?.code === 'ACCOUNT_SUSPENDED' || String(err?.message || '').toLowerCase().includes('suspended')) {
				showSuspensionInfo(err);
				return;
			}
			showErrorModal(err.message || 'Invalid email or password. Please try again.');
		} finally {
			setIsSubmitting(false);
		}
	}

	function getFieldClassName(error) {
		return error ? 'auth-field auth-field--error' : 'auth-field';
	}

	return (
		<section
			className={`auth-page auth-page--login ${
				isPageLoading ? 'auth-page--content-hidden' : 'auth-page--content-visible'
			}`}
		>
			<aside className="auth-showcase">
				<img src="/UST-CICS Logo.png" alt="UST CICS" className="auth-showcase__logo" />
				<div className="auth-showcase__institution">
					<span className="auth-showcase__org">UNIVERSITY OF SANTO TOMAS</span>
					<span className="auth-showcase__subtitle">COLLEGE OF INFORMATION AND COMPUTING SCIENCES</span>
				</div>
				<div className="auth-showcase__divider" />
				<h1 className="auth-showcase__title">CICS Learning Common Room</h1>
				<p className="auth-showcase__desc">
					Reserve your preferred time slot, track your reservation, and manage your next reservation, all in one place.
				</p>
			</aside>

			<div className="auth-mobile-brand">
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
					Reserve your preferred time slot, track your reservation, and manage your next reservation, all in one place.
				</p>
			</div>

			<div className="auth-panel">
				<div className="auth-panel__header">
					<h2>Welcome Back</h2>
					<p>Use your UST email account to continue.</p>
				</div>

				<form className="auth-form" onSubmit={handleSubmit} noValidate>
					<div className={getFieldClassName(loginErrors.email)}>
						<label htmlFor="login-email">
							<span>UST Email Address</span>
						</label>
						<div className="auth-field__input-wrap">
							<svg className="auth-field__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
								<rect x="2" y="4" width="16" height="12" rx="2" />
								<path d="M2 4l8 6 8-6" />
							</svg>
							<input
								id="login-email"
								type="email"
								value={email}
								placeholder="Enter your UST email address"
								autoComplete="email"
								aria-describedby={loginErrors.email ? 'login-email-error' : undefined}
								aria-invalid={loginErrors.email ? 'true' : undefined}
								onChange={(e) => setEmail(e.target.value)}
								maxLength={255}
								required
							/>
						</div>
						{loginErrors.email ? (
							<span id="login-email-error" className="auth-field__error-row" role="alert">
								<span className="auth-field__error-icon" aria-hidden="true">!</span>
								<span className="auth-field__error-text">{loginErrors.email}</span>
							</span>
						) : null}
					</div>

					<div className={getFieldClassName(loginErrors.password)}>
						<label htmlFor="login-password">
							<span>Password</span>
						</label>
						<div className="auth-field__input-wrap">
							<svg className="auth-field__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
								<rect x="5" y="9" width="10" height="8" rx="2" />
								<path d="M7 9V6a3 3 0 016 0v3" />
							</svg>
							<input
								id="login-password"
								type="password"
								value={password}
								placeholder="Enter your password"
								autoComplete="current-password"
								aria-describedby={loginErrors.password ? 'login-password-error' : undefined}
								aria-invalid={loginErrors.password ? 'true' : undefined}
								onChange={(e) => setPassword(e.target.value)}
								maxLength={64}
								required
							/>
						</div>
						{loginErrors.password ? (
							<span id="login-password-error" className="auth-field__error-row" role="alert">
								<span className="auth-field__error-icon" aria-hidden="true">!</span>
								<span className="auth-field__error-text">{loginErrors.password}</span>
							</span>
						) : null}
					</div>

					<div className="auth-form__row">
						<label className="auth-checkbox">
							<input
								type="checkbox"
								checked={rememberMe}
								onChange={(event) => setRememberMe(event.target.checked)}
							/>
							<span>Remember Me</span>
						</label>
						<Link to="/auth/forgot-password" className="auth-link-btn">
						Forgot Password?
						</Link>					
					</div>

					<button type="submit" className="auth-primary-btn" disabled={isSubmitting}>
						{isSubmitting ? (
							<span className="auth-btn-loading">
								<span className="auth-spinner" aria-hidden="true" />
								Signing In...
							</span>
						) : 'Sign In'}
					</button>
				</form>

				<p className={`auth-status-message auth-status-message--${statusType}`}>{statusMessage}</p>
				{suspensionInfo ? (
					<div className="auth-suspension-banner" role="status" aria-live="polite">
						<h3 className="auth-suspension-banner__title">Account suspended</h3>
						<p className="auth-suspension-banner__text">
							Your account is suspended until <strong>{suspensionUntilLabel || 'further notice'}</strong>.
						</p>
						{suspensionCountdown ? (
							<p className="auth-suspension-banner__timer">
								Time remaining: <strong>{suspensionCountdown}</strong>
							</p>
						) : null}
						<p className="auth-suspension-banner__reminder">
							If you think this was a mistake, please contact the administrator.
						</p>
					</div>
				) : null}
				<p className="auth-session-message">
					{currentUser ? `Active session: ${currentUser.full_name}` : 'No active session yet.'}
				</p>

				<p className="auth-panel__footer">
					New here? <Link to="/auth/register">Create an account</Link>
				</p>
			</div>

			{isPageLoading ? (
				<div
					className="auth-register-transition"
					role="status"
					aria-live="polite"
					aria-label="Loading login page"
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

			{/* Error Modal */}
			<Modal isOpen={errorModalOpen} title="Sign In Failed" onClose={() => setErrorModalOpen(false)} className="ui-modal--small">
				<div className="auth-forgot-form">
					<div className="auth-error-modal__icon" aria-hidden="true">
						<svg width="40" height="40" viewBox="0 0 40 40" fill="none">
							<circle cx="20" cy="20" r="20" fill="#FDECEA" />
							<path d="M13 13l14 14M27 13L13 27" stroke="#D32F2F" strokeWidth="2.5" strokeLinecap="round"/>
						</svg>
					</div>
					<p className="auth-forgot-desc">{errorModalMessage}</p>
					<button type="button" className="auth-primary-btn" onClick={() => setErrorModalOpen(false)}>
						Try Again
					</button>
				</div>
			</Modal>
		</section>
	);
}
