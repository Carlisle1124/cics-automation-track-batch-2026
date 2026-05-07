import { useNavigate } from 'react-router-dom';
import './ReserveButton.css';

export default function ReserveButton({ isAvailable = true, onClick = null, role = 'student' }) {
	const navigate = useNavigate();

	function handleClick(event) {
		if (onClick) {
			onClick(event);
			return;
		}

		navigate('/dashboard/schedule');
	}

	return (
		<div
			className="reserve-fab"
			onClick={handleClick}
			disabled={!isAvailable}
			aria-label={isAvailable ? 'Reserve a slot' : 'No slots available'}
			style={{
				width: 'auto',
			}}
		>
			<div className="fab-wrapper">
				<span className="reserve-fab__icon" aria-hidden="true">
					<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
						<path d="M12 5v14M5 12h14" />
					</svg>
				</span>

				<span className="reserve-fab__label">{isAvailable ? 'Reserve' : 'Full'}</span>
			</div>
		</div>
	);
}