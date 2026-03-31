import { Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Confirmation from './pages/Confirmation';
import Reservations from './pages/Reservations';
import Admin from './pages/Admin';

function App() {
  const { user } = useApp();

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/confirmation" element={<Confirmation />} />
        <Route path="/reservations" element={<Reservations />} />
        {user.role === 'admin' && (
          <Route path="/admin" element={<Admin />} />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
