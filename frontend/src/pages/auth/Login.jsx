import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, login } from '../../data/services/authService';
import Modal from '../../shared/components/Modal';
import cicsLogo from '../../assets/CICS-Logo.png';
import './AuthPages.css';

const UST_DOMAIN = '@ust.edu.ph';
const MOCK_OTP = '123456';

function validateEmail(value) {
	if (!value) return '';
	if (!value.includes('@')) return 'Enter a valid email address.';
	if (!value.toLowerCase().endsWith(UST_DOMAIN)) return 'Only @ust.edu.ph emails are allowed.';
	const local = value.slice(0, value.indexOf('@'));
	if (local.length < 1) return 'Enter your UST email username.';
	return '';
}

function validatePassword(value) {
	if (!value) return '';
	if (value.length < 4) return 'Password must be at least 4 characters.';
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
	const [emailTouched, setEmailTouched] = useState(false);
	const [passwordTouched, setPasswordTouched] = useState(false);
	const emailError = emailTouched ? validateEmail(email) : '';
	const passwordError = passwordTouched ? validatePassword(password) : '';
	const emailValid = emailTouched && email && !emailError;
	const passwordValid = passwordTouched && password && !passwordError;

	// Forgot password modal
	const [forgotOpen, setForgotOpen] = useState(false);
	const [forgotStep, setForgotStep] = useState(1); // 1=email, 2=OTP, 3=success
	const [forgotEmail, setForgotEmail] = useState('');
	const [forgotEmailTouched, setForgotEmailTouched] = useState(false);
	const [forgotOtp, setForgotOtp] = useState('');
	const [forgotLoading, setForgotLoading] = useState(false);
	const [forgotError, setForgotError] = useState('');
	const forgotEmailError = forgotEmailTouched ? validateEmail(forgotEmail) : '';

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

	async function handleQuickLogin(targetEmail = 'juan@ust.edu.ph') {
		setIsSubmitting(true);
		setStatus('Signing you in...', 'info');

		const user = await login(targetEmail);
		setCurrentUser(user);

		if (user) {
			setStatus(`Welcome back, ${user.name}. Redirecting...`, 'success');
			navigate(getRoleRoute(user.role));
		} else {
			setStatus('Unable to sign in. Please try again.', 'error');
		}

		setIsSubmitting(false);
	}

	async function handleSubmit(event) {
		event.preventDefault();
		setEmailTouched(true);
		setPasswordTouched(true);

		const eErr = validateEmail(email);
		const pErr = validatePassword(password);
		if (eErr || pErr) {
			setStatus('Please fix the errors above.', 'error');
			return;
		}

		await handleQuickLogin(email);
	}

	// Forgot password handlers
	function openForgotModal() {
		setForgotStep(1);
		setForgotEmail('');
		setForgotEmailTouched(false);
		setForgotOtp('');
		setForgotError('');
		setForgotLoading(false);
		setForgotOpen(true);
	}

	async function handleForgotEmailSubmit(e) {
		e.preventDefault();
		setForgotEmailTouched(true);
		const err = validateEmail(forgotEmail);
		if (err) { setForgotError(err); return; }

		setForgotLoading(true);
		setForgotError('');
		await new Promise((r) => setTimeout(r, 800));
		setForgotLoading(false);
		setForgotStep(2);
	}

	async function handleOtpSubmit(e) {
		e.preventDefault();
		if (!forgotOtp.trim()) { setForgotError('Please enter the OTP.'); return; }

		setForgotLoading(true);
		setForgotError('');
		await new Promise((r) => setTimeout(r, 800));

		if (forgotOtp.trim() === MOCK_OTP) {
			setForgotLoading(false);
			setForgotStep(3);
		} else {
			setForgotLoading(false);
			setForgotError('Invalid OTP. Try 123456 for the mock flow.');
		}
	}

	function getFieldClassName(error, valid) {
		if (error) return 'auth-field auth-field--error';
		if (valid) return 'auth-field auth-field--success';
		return 'auth-field';
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
					<span className="auth-showcase__org">UST CICS</span>
					<span className="auth-showcase__subtitle">University of Santo Tomas</span>
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
					<span className="auth-mobile-brand__org">UST CICS</span>
					<span className="auth-mobile-brand__university">University of Santo Tomas</span>
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
					<div className={getFieldClassName(emailError, emailValid)}>
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
								aria-describedby={emailError ? 'login-email-error' : undefined}
								aria-invalid={emailError ? 'true' : undefined}
								onChange={(e) => setEmail(e.target.value)}
								onBlur={() => setEmailTouched(true)}
								required
							/>
						</div>
						{emailError && <span id="login-email-error" className="auth-field__error" role="alert">{emailError}</span>}
					</div>

					<div className={getFieldClassName(passwordError, passwordValid)}>
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
							aria-describedby={passwordError ? 'login-password-error' : undefined}
							aria-invalid={passwordError ? 'true' : undefined}
							onChange={(e) => setPassword(e.target.value)}
								onBlur={() => setPasswordTouched(true)}
								required
							/>
						</div>
						{passwordError && <span id="login-password-error" className="auth-field__error" role="alert">{passwordError}</span>}
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
						<button type="button" onClick={() => handleQuickLogin('juan@ust.edu.ph')}>Student</button>
						<button type="button" onClick={() => handleQuickLogin('admin@ust.edu.ph')}>Admin</button>
						<button type="button" onClick={() => handleQuickLogin('staff@ust.edu.ph')}>Staff</button>
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
						<div className={forgotEmailError ? 'auth-field auth-field--error' : 'auth-field'}>
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
								onBlur={() => setForgotEmailTouched(true)}
								required
							/>
							{forgotEmailError && <span id="forgot-email-error" className="auth-field__error" role="alert">{forgotEmailError}</span>}
						</div>
						{forgotError && <p className="auth-forgot-error" role="alert">{forgotError}</p>}
						<button type="submit" className="auth-primary-btn" disabled={forgotLoading}>
							{forgotLoading ? <span className="auth-btn-loading"><span className="auth-spinner" aria-hidden="true" />Sending...</span> : 'Send OTP'}
						</button>
					</form>
				)}

				{forgotStep === 2 && (
					<form className="auth-forgot-form" onSubmit={handleOtpSubmit} noValidate>
						<p className="auth-forgot-desc">A 6-digit code was sent to <strong>{forgotEmail}</strong>. Enter it below.</p>
						<div className="auth-field">
							<label htmlFor="forgot-otp"><span>One-Time Code</span></label>
							<input
								id="forgot-otp"
								type="text"
								inputMode="numeric"
								maxLength={6}
								value={forgotOtp}
								placeholder="000000"
								autoComplete="one-time-code"
								onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
								required
							/>
						</div>
						{forgotError && <p className="auth-forgot-error" role="alert">{forgotError}</p>}
						<button type="submit" className="auth-primary-btn" disabled={forgotLoading}>
							{forgotLoading ? <span className="auth-btn-loading"><span className="auth-spinner" aria-hidden="true" />Verifying...</span> : 'Verify Code'}
						</button>
						<button type="button" className="auth-link-btn auth-forgot-resend" onClick={() => { setForgotStep(1); setForgotError(''); }}>
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
