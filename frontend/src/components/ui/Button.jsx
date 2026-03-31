import './Button.css';

export default function Button({
  children,
  variant = 'primary',
  size,
  className = '',
  ...props
}) {
  const sizeClass = size ? ` btn--${size}` : '';
  return (
    <button className={`btn btn--${variant}${sizeClass} ${className}`} {...props}>
      {children}
    </button>
  );
}
