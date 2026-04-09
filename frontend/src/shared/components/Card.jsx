import '../styles/Card.css';

function cx(...classes) {
	return classes.filter(Boolean).join(' ');
}

export default function Card({
	as,
	padding = 'md',
	elevated = false,
	interactive = false,
	className,
	children,
	...props
}) {
	const Component = as || 'section';

	return (
		<Component
			className={cx(
				'ui-card',
				`ui-card--pad-${padding}`,
				elevated && 'ui-card--elevated',
				interactive && 'ui-card--interactive',
				className
			)}
			{...props}
		>
			{children}
		</Component>
	);
}
