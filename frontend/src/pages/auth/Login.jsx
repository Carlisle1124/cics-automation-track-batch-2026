import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, login } from '../../data/services/authService';
import Modal from '../../shared/components/Modal';
import cicsLogo from '../../assets/CICS-Logo.png';
import './AuthPages.css';

const UST_DOMAIN = '@ust.edu.ph';
const MOCK_OTP = '123456';

const QUICK_LOGIN_ACCOUNTS = {
	student: { email: 'juan.delacruz.cics@ust.edu.ph', password: 'password123' },
	admin: { email: 'admin.cics@ust.edu.ph', password: 'password123' },
	staff: { email: 'staff.cics@ust.edu.ph', password: 'password123' },
};

function validateEmail(value) {
	const trimmed = value.trim().toLowerCase();

	if (!trimmed) return 'Please enter your UST email address.';
	if (!trimmed.includes('@')) return 'Please enter a valid email address.';
	if (!trimmed.endsWith(UST_DOMAIN)) return 'Only @ust.edu.ph emails are allowed.';
	const local = trimmed.slice(0, trimmed.indexOf('@'));
	if (local.length < 1) return 'Please enter your UST email username.';
	return '';
}

function validatePassword(value) {
	if (!value) return 'Please enter your password.';
	if (value.length < 6) return 'Password must be 6 or more characters.';
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

	// Field-level validation
	const [hasSubmitted, setHasSubmitted] = useState(false);

	const loginErrors = {
		email: hasSubmitted ? validateEmail(email) : '',
		password: hasSubmitted ? validatePassword(password) : '',
	};

	// Forgot password modal
	const [forgotOpen, setForgotOpen] = useState(false);
	const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=OTP, 3=success
	const [forgotEmail, setForgotEmail] = useState('');
	const [forgotEmailSubmitted, setForgotEmailSubmitted] = useState(false);
	const [forgotOtp, setForgotOtp] = useState('');
	const [forgotLoading, setForgotLoading] = useState(false);
	const [forgotError, setForgotError] = useState('');
	const [forgotOtpSubmitted, setForgotOtpSubmitted] = useState(false);

	const forgotEmailError = forgotEmailSubmitted ? validateEmail(forgotEmail) : '';
	const forgotOtpValidationError = forgotOtpSubmitted ? validateOtp(forgotOtp) : '';
	const forgotOtpDisplayError = forgotOtpValidationError || forgotError;

	useEffect(() => {
		let active = true;

		async function loadLoginPage() {
			try {
				const [user] = await Promise.all([
					getCurrentUser(),
					new Promise((resolve) => setTimeout(resolve, 700)),
				]);

				if (!active) return;
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

	function getRoleRoute(role) {
		if (role === 'admin') return '/admin';
		if (role === 'staff') return '/staff';
		return '/';
	}

	const setStatus = useCallback((message, type = 'info') => {
		setStatusMessage(message);
		setStatusType(type);
	}, []);

	async function handleQuickLogin(role) {
		const account = QUICK_LOGIN_ACCOUNTS[role];
		setEmail(account.email);
		setPassword(account.password);
		setHasSubmitted(false);
		setIsSubmitting(true);
		setStatus('Signing you in...', 'info');

		try {
			const user = await login(account.email, account.password);
			setCurrentUser(user);
			setStatus(`Welcome back, ${user.full_name}. Redirecting...`, 'success');
			navigate(getRoleRoute(user.role));
		} catch (err) {
			setStatus(err.message || 'Unable to sign in. Please try again.', 'error');
		} finally {
			setIsSubmitting(false);
		}
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
			setStatus(err.message || 'Invalid email or password.', 'error');
		} finally {
			setIsSubmitting(false);
		}
	}

	// Forgot password handlers
	function openForgotModal() {
		setForgotStep(1);
		setForgotEmail('');
		setForgotEmailSubmitted(false);
		setForgotOtp('');
		setForgotOtpSubmitted(false);
		setForgotError('');
		setForgotLoading(false);
		setForgotOpen(true);
	}

	async function handleForgotEmailSubmit(e) {
		e.preventDefault();
		setForgotEmailSubmitted(true);
		setForgotError('');

		const err = validateEmail(forgotEmail);
		if (err) return;

		setForgotLoading(true);
		await new Promise((r) => setTimeout(r, 800));
		setForgotLoading(false);
		setForgotOtp('');
		setForgotOtpSubmitted(false);
		setForgotStep(2);
	}

	async function handleOtpSubmit(e) {
		e.preventDefault();
		setForgotOtpSubmitted(true);
		setForgotError('');

		const otpValidationError = validateOtp(forgotOtp);
		if (otpValidationError) return;

		setForgotLoading(true);
		await new Promise((r) => setTimeout(r, 800));

		if (forgotOtp.trim() === MOCK_OTP) {
			setForgotLoading(false);
			setForgotStep(3);
		} else {
			setForgotLoading(false);
			setForgotError('Invalid OTP. Try 123456 for the mock flow.');
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
						<button type="button" className="auth-link-btn" onClick={openForgotModal}>Forgot Password?</button>
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

				<div className="auth-panel__quick-actions">
					<span className="auth-panel__quick-label">Quick mock sessions</span>
					<div className="auth-panel__quick-buttons">
						<button type="button" onClick={() => handleQuickLogin('student')}>Student</button>
						<button type="button" onClick={() => handleQuickLogin('admin')}>Admin</button>
						<button type="button" onClick={() => handleQuickLogin('staff')}>Staff</button>
					</div>
				</div>

				<p className={`auth-status-message auth-status-message--${statusType}`}>{statusMessage}</p>
				<p className="auth-session-message">
					{currentUser ? `Active session: ${currentUser.name}` : 'No active session yet.'}
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

			{/* Forgot Password Modal */}
			<Modal isOpen={forgotOpen} title={forgotStep === 3 ? 'Check Complete' : 'Reset Password'} onClose={() => setForgotOpen(false)}>
				{forgotStep === 1 && (
					<form className="auth-forgot-form" onSubmit={handleForgotEmailSubmit} noValidate>
						<p className="auth-forgot-desc">Enter your UST email and we'll send a one-time code.</p>
						<div className={getFieldClassName(forgotEmailError)}>
							<label htmlFor="forgot-email"><span>UST Email Address</span></label>
							<input
								id="forgot-email"
								type="email"
								value={forgotEmail}
								placeholder="name@ust.edu.ph"
								autoComplete="email"
								aria-describedby={forgotEmailError ? 'forgot-email-error' : undefined}
								aria-invalid={forgotEmailError ? 'true' : undefined}
								onChange={(e) => setForgotEmail(e.target.value)}
								required
							/>
							{forgotEmailError ? (
								<span id="forgot-email-error" className="auth-field__error-row" role="alert">
									<span className="auth-field__error-icon" aria-hidden="true">!</span>
									<span className="auth-field__error-text">{forgotEmailError}</span>
								</span>
							) : null}
						</div>
						<button type="submit" className="auth-primary-btn" disabled={forgotLoading}>
							{forgotLoading ? <span className="auth-btn-loading"><span className="auth-spinner" aria-hidden="true" />Sending...</span> : 'Send OTP'}
						</button>
					</form>
				)}

				{forgotStep === 2 && (
					<form className="auth-forgot-form" onSubmit={handleOtpSubmit} noValidate>
						<p className="auth-forgot-desc">A 6-digit code was sent to <strong>{forgotEmail}</strong>. Enter it below.</p>
						<div className={getFieldClassName(forgotOtpDisplayError)}>
							<label htmlFor="forgot-otp"><span>One-Time Code</span></label>
							<input
								id="forgot-otp"
								type="text"
								inputMode="numeric"
								maxLength={6}
								value={forgotOtp}
								placeholder="000000"
								autoComplete="one-time-code"
								onChange={(e) => {
									setForgotOtp(e.target.value.replace(/\D/g, ''));
									if (forgotError) setForgotError('');
								}}
								required
							/>
							{forgotOtpDisplayError ? (
								<span className="auth-field__error-row" role="alert">
									<span className="auth-field__error-icon" aria-hidden="true">!</span>
									<span className="auth-field__error-text">{forgotOtpDisplayError}</span>
								</span>
							) : null}
						</div>
						<button type="submit" className="auth-primary-btn" disabled={forgotLoading}>
							{forgotLoading ? <span className="auth-btn-loading"><span className="auth-spinner" aria-hidden="true" />Verifying...</span> : 'Verify Code'}
						</button>
						<button
							type="button"
							className="auth-link-btn auth-forgot-resend"
							onClick={() => {
								setForgotStep(1);
								setForgotError('');
								setForgotOtp('');
								setForgotOtpSubmitted(false);
								setForgotEmailSubmitted(false);
							}}
						>
							Use a different email
						</button>
					</form>
				)}

				{forgotStep === 3 && (
					<div className="auth-forgot-success">
						<div className="auth-forgot-success__icon" aria-hidden="true">✓</div>
						<h3>Verification Successful</h3>
						<p>Your identity has been verified. In a real app, you would now set a new password.</p>
						<button type="button" className="auth-primary-btn" onClick={() => setForgotOpen(false)}>
							Back to Sign In
						</button>
					</div>
				)}
			</Modal>
		</section>
	);
}
