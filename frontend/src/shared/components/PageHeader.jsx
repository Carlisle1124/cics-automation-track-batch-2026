import '../styles/PageHeader.css';

export default function PageHeader({ title, subtitle, className = '' }) {
	const rootClassName = ['page-header', className].filter(Boolean).join(' ');

	return (
		<header className={rootClassName}>
			<h1 className="page-header__title">{title}</h1>
			{subtitle ? <p className="page-header__subtitle">{subtitle}</p> : null}
		</header>
	);
}
