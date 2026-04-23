import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyEmailFromUrl } from '../../data/services/authService';
import { getRoleRoute } from '../../shared/utils/routeUtils';
import cicsLogo from '../../assets/CICS-Logo.webp';
import './AuthPages.css';

const REDIRECT_DELAY_MS = 3000;

export default function VerifyEmail() {
	const navigate = useNavigate();
	const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
	const [errorMessage, setErrorMessage] = useState('');
	const [countdown, setCountdown] = useState(REDIRECT_DELAY_MS / 1000);

	useEffect(() => {
		document.title = 'Verifying Email - UST CICS Learning Common Room';
		return () => { document.title = 'UST CICS Learning Common Room'; };
	}, []);

	useEffect(() => {
		let cleanup;

		verifyEmailFromUrl()
			.then(({ role }) => {
				setStatus('success');

				let seconds = REDIRECT_DELAY_MS / 1000;
				const interval = setInterval(() => {
					seconds -= 1;
					setCountdown(seconds);
					if (seconds <= 0) {
						clearInterval(interval);
						navigate(getRoleRoute(role), { replace: true });
					}
				}, 1000);

				cleanup = () => clearInterval(interval);
			})
			.catch((err) => {
				setErrorMessage(err.message);
				setStatus('error');
			});

		return () => cleanup?.();
	}, [navigate]);

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
					Reserve your preferred time slot, track your reservation, and manage your next reservation, all in one place.
				</p>
			</aside>

			<div className="auth-panel">
				{status === 'loading' && (
					<div className="auth-verify__state">
						<div className="auth-register-transition__card">
							<img src={cicsLogo} alt="UST CICS logo" className="auth-register-transition__logo" />
							<div className="auth-register-transition__loader" aria-hidden="true">
								<span></span>
							</div>
						</div>
						<p className="auth-verify__label">Verifying your email address...</p>
					</div>
				)}

				{status === 'success' && (
					<div className="auth-verify__state">
						<div className="auth-verify__icon" aria-hidden="true">
							<svg width="56" height="56" viewBox="0 0 56 56" fill="none">
								<circle cx="28" cy="28" r="28" fill="#E8F5E9" />
								<path d="M16 28l8 8 16-16" stroke="#2E7D32" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
							</svg>
						</div>
						<h2 className="auth-verify__title">Email Verified!</h2>
						<p className="auth-verify__desc">
							Your account has been successfully verified. Redirecting you to your dashboard in {countdown} second{countdown !== 1 ? 's' : ''}...
						</p>
					</div>
				)}

				{status === 'error' && (
					<div className="auth-verify__state">
						<div className="auth-verify__icon" aria-hidden="true">
							<svg width="56" height="56" viewBox="0 0 56 56" fill="none">
								<circle cx="28" cy="28" r="28" fill="#FDECEA" />
								<path d="M18 18l20 20M38 18L18 38" stroke="#D32F2F" strokeWidth="3" strokeLinecap="round" />
							</svg>
						</div>
						<h2 className="auth-verify__title">Link Expired or Invalid</h2>
						<p className="auth-verify__desc">{errorMessage}</p>
						<a href="/auth/login" className="auth-primary-btn auth-verify__back-btn">
							Back to Sign In
						</a>
					</div>
				)}
			</div>
		</section>
	);
}
