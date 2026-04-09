import '../styles/LayoutContainer.css';

function cx(...classes) {
	return classes.filter(Boolean).join(' ');
}

export default function LayoutContainer({
	as,
	className,
	centered = false,
	split = false,
	children,
	...props
}) {
	const Component = as || 'div';

	return (
		<Component
			className={cx(
				'ui-layout-container',
				centered && 'ui-layout-container--centered',
				split && 'ui-layout-container--split',
				className
			)}
			{...props}
		>
			{children}
		</Component>
	);
}
