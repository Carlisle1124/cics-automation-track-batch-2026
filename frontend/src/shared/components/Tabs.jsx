import '../styles/Tabs.css';

function cx(...classes) {
	return classes.filter(Boolean).join(' ');
}

export default function Tabs({
	tabs = [],
	value,
	onChange,
	ariaLabel = 'Tabs',
	className,
}) {
	return (
		<div className={cx('ui-tabs', className)} role="tablist" aria-label={ariaLabel}>
			{tabs.map((tab) => {
				const isActive = tab.value === value;
				const isDisabled = Boolean(tab.disabled);

				return (
					<button
						key={tab.value}
						type="button"
						role="tab"
						className={cx('ui-tabs__tab', isActive && 'is-active')}
						aria-selected={isActive}
						disabled={isDisabled}
						onClick={() => {
							if (!isDisabled && onChange) {
								onChange(tab.value);
							}
						}}
					>
						{tab.icon ? <span className="ui-tabs__icon" aria-hidden="true">{tab.icon}</span> : null}
						<span className="ui-tabs__label">{tab.label}</span>
					</button>
				);
			})}
		</div>
	);
}
