import { Navigate, Route, Routes } from 'react-router-dom';

//layouts
import StudentLayout from '../layouts/StudentLayout';
import AdminLayout from '../layouts/AdminLayout';
import StaffLayout from '../layouts/StaffLayout';

//student pages
import StudentOverview from '../pages/student/Overview';
import StudentReservations from '../pages/student/Reservations';
import StudentSchedule from '../pages/student/Schedule';
import StudentProfile from '../pages/student/Profile';

//admin pages
import AdminOverview from '../pages/admin/Overview';
import ManageReservations from '../pages/admin/ManageReservations';
import Analytics from '../pages/admin/Analytics';
import Users from '../pages/admin/Users';

//staff pages
import PendingRequests from '../pages/staff/PendingRequests';
import ScheduleForStudents from '../pages/staff/ScheduleForStudents';

//auth pages
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';

import ProtectedRoute from '../shared/components/ProtectedRoute';

export default function App() {
    return (
        <Routes>
            <Route path="/dashboard" element={<ProtectedRoute requiredRole="student"><StudentLayout /></ProtectedRoute>}>
                <Route index element={<StudentOverview />} />
                <Route path="reservations" element={<StudentReservations />} />
                <Route path="schedule" element={<StudentSchedule />} />
                <Route path="profile" element={<StudentProfile />} />
            </Route>

            <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
                <Route index element={<AdminOverview />} />
                <Route path="reservations" element={<ManageReservations />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="users" element={<Users />} />
            </Route>

            <Route path="/staff" element={<ProtectedRoute requiredRole="staff"><StaffLayout /></ProtectedRoute>}>
                <Route index element={<PendingRequests />} />
                <Route path="schedule-for-students" element={<ScheduleForStudents />} />
            </Route>

            <Route path="/auth/login" element={<Login />} />
            <Route path="/auth/register" element={<Register />} />

            <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
    );
}
