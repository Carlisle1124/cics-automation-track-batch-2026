import './Card.css';

export default function Card({ children, hover, flat, className = '', ...props }) {
  const classes = [
    'card',
    hover && 'card--hover',
    flat && 'card--flat',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
}
