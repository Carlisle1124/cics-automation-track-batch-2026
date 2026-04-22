import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/Modal.css';

export default function Modal({ isOpen, title, children, onClose, className = '' }) {
	const [shouldRender, setShouldRender] = useState(isOpen);
	const [isClosing, setIsClosing] = useState(false);

	useEffect(() => {
		let timeoutId;

		if (isOpen) {
			setShouldRender(true);
			setIsClosing(false);
			return () => {
				if (timeoutId) clearTimeout(timeoutId);
			};
		}

		if (shouldRender) {
			setIsClosing(true);
			timeoutId = window.setTimeout(() => {
				setShouldRender(false);
				setIsClosing(false);
			}, 220);
		}

		return () => {
			if (timeoutId) clearTimeout(timeoutId);
		};
	}, [isOpen, shouldRender]);

	if (!shouldRender) return null;

	const backdropClassName = [
		'ui-modal__backdrop',
		isClosing ? 'ui-modal__backdrop--closing' : 'ui-modal__backdrop--opening',
	].join(' ');

	const modalClassName = ['ui-modal', isClosing ? 'ui-modal--closing' : 'ui-modal--opening', className].filter(Boolean).join(' ');

	return createPortal(
		<div className={backdropClassName} role="presentation" onClick={onClose}>
			<div
				className={modalClassName}
				role="dialog"
				aria-modal="true"
				aria-labelledby="ui-modal-title"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="ui-modal__header">
					<h2 id="ui-modal-title" className="ui-modal__title">{title}</h2>
					<button type="button" className="ui-modal__close" onClick={onClose} aria-label="Close modal">
						<svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" focusable="false">
							<path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
						</svg>
					</button>
				</div>
				<div className="ui-modal__body">{children}</div>
			</div>
		</div>,
		document.body
	);
}
