import { useApp } from '../context/AppContext';
import './Login.css';

export default function Login() {
  const { login } = useApp();

  return (
    <div className="login-page">
      <div className="login-card">
        <img
          src="/UST-CICS Logo.png"
          alt="UST CICS"
          className="login-card__logo"
        />
        <h1 className="login-card__title">UST CICS</h1>
        <p className="login-card__subtitle">Learning Common Room</p>

        <span className="login-card__label">Select your role</span>
        <div className="login-card__roles">
          <button
            className="login-card__role-btn"
            onClick={() => login('student')}
          >
            Student / User
          </button>
          <button
            className="login-card__role-btn"
            onClick={() => login('admin')}
          >
            Admin
          </button>
        </div>
      </div>
    </div>
  );
}
