import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import CourseViewer from './pages/CourseViewer';
import TeacherPanel from './pages/TeacherPanel';
import Navbar from './components/Navbar';

const ProtectedRoute = ({ children, allowedRole }: { children: JSX.Element, allowedRole?: string }) => {
    const { user, isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (allowedRole && user?.role !== allowedRole && user?.role !== 'admin') return <Navigate to="/" />;
    return children;
};

function AppRoutes() {
    return (
        <Router>
            <div className="app-container">
                <Navbar />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><StudentDashboard /></ProtectedRoute>} />
                    <Route path="/course/:id" element={<ProtectedRoute><CourseViewer /></ProtectedRoute>} />
                    <Route path="/teacher" element={<ProtectedRoute allowedRole="teacher"><TeacherPanel /></ProtectedRoute>} />
                </Routes>
            </div>
        </Router>
    );
}

function App() {
  return (
    <AuthProvider>
        <AppRoutes />
    </AuthProvider>
  );
}

export default App;
