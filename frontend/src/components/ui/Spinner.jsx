import './Spinner.css';

export default function Spinner({ text }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      {text && <p className="spinner-wrap__text">{text}</p>}
    </div>
  );
}
