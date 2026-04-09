import { createPortal } from 'react-dom';
import '../styles/Modal.css';

export default function Modal({ isOpen, title, children, onClose }) {
	if (!isOpen) return null;

	return createPortal(
		<div className="ui-modal__backdrop" role="presentation" onClick={onClose}>
			<div
				className="ui-modal"
				role="dialog"
				aria-modal="true"
				aria-labelledby="ui-modal-title"
				onClick={(event) => event.stopPropagation()}
			>
				<div className="ui-modal__header">
					<h2 id="ui-modal-title" className="ui-modal__title">{title}</h2>
					<button type="button" className="ui-modal__close" onClick={onClose} aria-label="Close modal">
						×
					</button>
				</div>
				<div className="ui-modal__body">{children}</div>
			</div>
		</div>,
		document.body
	);
}
