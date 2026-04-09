import '../styles/Input.css';

function cx(...classes) {
	return classes.filter(Boolean).join(' ');
}

export default function Input({
	id,
	label,
	hint,
	error,
	leftIcon,
	rightIcon,
	className,
	inputClassName,
	...props
}) {
	const inputId = id || `input-${Math.random().toString(36).slice(2, 10)}`;

	return (
		<div className={cx('ui-input-field', className)}>
			{label ? <label htmlFor={inputId} className="ui-input-field__label">{label}</label> : null}

			<div className={cx('ui-input', error && 'ui-input--error')}>
				{leftIcon ? <span className="ui-input__icon" aria-hidden="true">{leftIcon}</span> : null}
				<input id={inputId} className={cx('ui-input__control', inputClassName)} {...props} />
				{rightIcon ? <span className="ui-input__icon" aria-hidden="true">{rightIcon}</span> : null}
			</div>

			{error ? <p className="ui-input-field__message ui-input-field__message--error">{error}</p> : null}
			{!error && hint ? <p className="ui-input-field__message">{hint}</p> : null}
		</div>
	);
}
