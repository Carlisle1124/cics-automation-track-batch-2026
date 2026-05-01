import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../data/supabaseClient';
import './AuthPages.css';

const UST_DOMAIN = '@ust.edu.ph';

function validateEmail(value) {
	const trimmed = value.trim().toLowerCase();

	if (!trimmed) return 'Please enter your UST email address.';
	if (!trimmed.includes('@')) return 'Please enter a valid email address.';
	if (!trimmed.endsWith(UST_DOMAIN)) return 'Only @ust.edu.ph emails are allowed.';
	const local = trimmed.slice(0, trimmed.indexOf('@'));
	if (local.length < 1) return 'Please enter your UST email username.';
	return '';
}

function validateNewPassword(value) {
	if (!value) return 'Please enter a new password.';
	if (value.length < 8) return 'New password must be at least 8 characters.';
	return '';
}

function validateConfirmPassword(password, confirmPassword) {
	if (!confirmPassword) return 'Please confirm your new password.';
	if (password !== confirmPassword) return 'Passwords do not match.';
	return '';
}

export default function ForgotPassword() {
	const [step, setStep] = useState('request');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [email, setEmail] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [emailSubmitted, setEmailSubmitted] = useState(false);
	const [resetSubmitted, setResetSubmitted] = useState(false);
	const [statusMessage, setStatusMessage] = useState('Enter your UST email to start resetting your password.');
	const [statusType, setStatusType] = useState('info');

	const emailError = emailSubmitted ? validateEmail(email) : '';
	const newPasswordError = resetSubmitted ? validateNewPassword(newPassword) : '';
	const confirmPasswordError = resetSubmitted
		? validateConfirmPassword(newPassword, confirmPassword)
		: '';

	const stepTitle = useMemo(() => {
		if (step === 'request') return 'Forgot Password';
		if (step === 'reset') return 'Set New Password';
		return 'Password Updated';
	}, [step]);

    useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
        (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
            setStep('reset');
            setStatusMessage('Enter your new password.');
            setStatusType('info');
        }
        }
    );

    return () => {
        listener.subscription.unsubscribe();
    };
    }, []);

async function handleRequestSubmit(event) {
  event.preventDefault();
  setEmailSubmitted(true);

  const err = validateEmail(email);
  if (err) {
    setStatusMessage('Please fix the highlighted field before continuing.');
    setStatusType('error');
    return;
  }

  setIsSubmitting(true);
  setStatusMessage('Sending reset link...');
  setStatusType('info');

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/ForgotPassword`,
  });

  setIsSubmitting(false);

  if (error) {
            setStatusMessage(error.message);
            setStatusType('error');
            return;
        }

        setStatusMessage('Check your email for the password reset link.');
        setStatusType('success');
    }       

    async function handleResetSubmit(event) {
    event.preventDefault();
    setResetSubmitted(true);

    const errors = {
        newPassword: validateNewPassword(newPassword),
        confirmPassword: validateConfirmPassword(newPassword, confirmPassword),
    };

    if (Object.values(errors).some(Boolean)) {
        setStatusMessage('Please complete all required fields.');
        setStatusType('error');
        return;
    }

    setIsSubmitting(true);
    setStatusMessage('Updating password...');
    setStatusType('info');

    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    setIsSubmitting(false);

    if (error) {
        setStatusMessage(error.message);
        setStatusType('error');
        return;
    }

    setStep('success');
    setStatusMessage('Password successfully updated.');
    setStatusType('success');
    }

	function getFieldClassName(error) {
		return error ? 'auth-field auth-field--error' : 'auth-field';
	}

	return (
		<section className="auth-page auth-page--login auth-page--content-visible">
			<aside className="auth-showcase">
				<img src="/UST-CICS Logo.png" alt="UST CICS" className="auth-showcase__logo" />
				<div className="auth-showcase__institution">
					<span className="auth-showcase__org">UNIVERSITY OF SANTO TOMAS</span>
					<span className="auth-showcase__subtitle">COLLEGE OF INFORMATION AND COMPUTING SCIENCES</span>
				</div>
				<div className="auth-showcase__divider" />
				<h1 className="auth-showcase__title">CICS Learning Common Room</h1>
				<p className="auth-showcase__desc">
					Recover your account quickly and get back to managing reservations.
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
					Reset your credentials using your registered UST account.
				</p>
			</div>

			<div className="auth-panel">
				<div className="auth-panel__header">
					<h2>{stepTitle}</h2>
					<p>
						{step === 'request'
							? 'We will send reset instructions to your school email.'
							: step === 'reset'
								? 'Enter your verification code and set a new password.'
								: 'Your account is ready to use again.'}
					</p>
				</div>

				{step === 'request' ? (
					<form className="auth-form" onSubmit={handleRequestSubmit} noValidate>
						<div className={getFieldClassName(emailError)}>
							<label htmlFor="forgot-password-email">
								<span>UST Email Address</span>
							</label>
							<div className="auth-field__input-wrap">
								<svg className="auth-field__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
									<rect x="2" y="4" width="16" height="12" rx="2" />
									<path d="M2 4l8 6 8-6" />
								</svg>
								<input
									id="forgot-password-email"
									type="email"
									placeholder="name@ust.edu.ph"
									autoComplete="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									aria-describedby={emailError ? 'forgot-password-email-error' : undefined}
									aria-invalid={emailError ? 'true' : undefined}
									required
								/>
							</div>
							{emailError ? (
								<span id="forgot-password-email-error" className="auth-field__error-row" role="alert">
									<span className="auth-field__error-icon" aria-hidden="true">!</span>
									<span className="auth-field__error-text">{emailError}</span>
								</span>
							) : null}
						</div>

						<button type="submit" className="auth-primary-btn" disabled={isSubmitting}>
							{isSubmitting ? (
								<span className="auth-btn-loading">
									<span className="auth-spinner" aria-hidden="true" />
									Preparing...
								</span>
							) : 'Continue'}
						</button>
					</form>
				) : null}

				{step === 'reset' ? (
					<form className="auth-form" onSubmit={handleResetSubmit} noValidate>
						<p className="auth-forgot-desc">
							For now, this screen is frontend-only. You can connect these fields to your reset API later.
						</p>

						<div className={getFieldClassName(newPasswordError)}>
							<label htmlFor="forgot-password-new-password">
								<span>New Password</span>
							</label>
							<input
								id="forgot-password-new-password"
								type="password"
								autoComplete="new-password"
								placeholder="Enter your new password"
								value={newPassword}
								onChange={(event) => setNewPassword(event.target.value)}
								aria-describedby={newPasswordError ? 'forgot-password-new-password-error' : undefined}
								aria-invalid={newPasswordError ? 'true' : undefined}
								required
							/>
							{newPasswordError ? (
								<span id="forgot-password-new-password-error" className="auth-field__error-row" role="alert">
									<span className="auth-field__error-icon" aria-hidden="true">!</span>
									<span className="auth-field__error-text">{newPasswordError}</span>
								</span>
							) : null}
						</div>

						<div className={getFieldClassName(confirmPasswordError)}>
							<label htmlFor="forgot-password-confirm-password">
								<span>Confirm Password</span>
							</label>
							<input
								id="forgot-password-confirm-password"
								type="password"
								autoComplete="new-password"
								placeholder="Confirm your new password"
								value={confirmPassword}
								onChange={(event) => setConfirmPassword(event.target.value)}
								aria-describedby={confirmPasswordError ? 'forgot-password-confirm-password-error' : undefined}
								aria-invalid={confirmPasswordError ? 'true' : undefined}
								required
							/>
							{confirmPasswordError ? (
								<span id="forgot-password-confirm-password-error" className="auth-field__error-row" role="alert">
									<span className="auth-field__error-icon" aria-hidden="true">!</span>
									<span className="auth-field__error-text">{confirmPasswordError}</span>
								</span>
							) : null}
						</div>

						<button type="submit" className="auth-primary-btn" disabled={isSubmitting}>
							{isSubmitting ? (
								<span className="auth-btn-loading">
									<span className="auth-spinner" aria-hidden="true" />
									Saving...
								</span>
							) : 'Update Password'}
						</button>
					</form>
				) : null}

				{step === 'success' ? (
					<div className="auth-forgot-success">
						<div className="auth-forgot-success__icon" aria-hidden="true">✓</div>
						<h3>All Set</h3>
						<p>Your new password is ready. You can now log in using your updated credentials.</p>
						<Link to="/auth/login" className="auth-primary-btn auth-forgot-link-btn">
							Back to Sign In
						</Link>
					</div>
				) : null}

				<p className={`auth-status-message auth-status-message--${statusType}`}>{statusMessage}</p>

				<p className="auth-panel__footer">
					Remembered your password? <Link to="/auth/login">Sign In</Link>
				</p>
				<p className="auth-panel__footer">
					Need a new account? <Link to="/auth/register">Create one</Link>
				</p>
			</div>
		</section>
	);
}
