import '../styles/Button.css';

function cx(...classes) {
	return classes.filter(Boolean).join(' ');
}

export default function Button({
	as,
	variant = 'primary',
	size = 'md',
	leftIcon,
	rightIcon,
	iconOnly = false,
	fullWidth = false,
	className,
	children,
	type,
	...props
}) {
	const Component = as || 'button';
	const buttonType = Component === 'button' ? type || 'button' : undefined;

	return (
		<Component
			type={buttonType}
			className={cx(
				'ui-button',
				`ui-button--${variant}`,
				`ui-button--${size}`,
				iconOnly && 'ui-button--icon-only',
				fullWidth && 'ui-button--full',
				className
			)}
			{...props}
		>
			{leftIcon ? <span className="ui-button__icon" aria-hidden="true">{leftIcon}</span> : null}
			{children ? <span className="ui-button__label">{children}</span> : null}
			{rightIcon ? <span className="ui-button__icon" aria-hidden="true">{rightIcon}</span> : null}
		</Component>
	);
}
