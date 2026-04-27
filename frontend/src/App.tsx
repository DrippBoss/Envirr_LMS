import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import TeacherPanel from './pages/TeacherPanel';
import CourseViewer from './pages/CourseViewer';
import Navbar from './components/Navbar';
import LearningMap from './pages/LearningMap';
import NodePage from './pages/NodePage';
import AiTutor from './pages/AiTutor';
import AdminDashboard from './pages/AdminDashboard';
import MockTestPage from './pages/MockTestPage';

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode, allowedRole?: string }) => {
    const { user, isAuthenticated, loading } = useAuth();

    if (loading) return <div className="loading-container">Loading...</div>;
    if (!isAuthenticated) return <Navigate to="/login" />;
    if (allowedRole && user?.role !== allowedRole && user?.role !== 'admin') return <Navigate to="/" />;
    return <>{children}</>;
};

function RoleHome() {
    const { user } = useAuth();
    if (user?.role === 'admin') return <Navigate to="/admin" replace />;
    if (user?.role === 'teacher') return <Navigate to="/teacher" replace />;
    return <StudentDashboard />;
}

function AppRoutes() {
    return (
        <Router>
            <div className="app-container">
                <Navbar />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
                    <Route path="/course/:id" element={<ProtectedRoute><CourseViewer /></ProtectedRoute>} />
                    <Route path="/map/:pathId" element={<ProtectedRoute><LearningMap /></ProtectedRoute>} />
                    <Route path="/learn/:nodeId" element={<ProtectedRoute><NodePage /></ProtectedRoute>} />
                    <Route path="/teacher" element={<ProtectedRoute allowedRole="teacher"><TeacherPanel /></ProtectedRoute>} />
                    <Route path="/tutor" element={<ProtectedRoute><AiTutor /></ProtectedRoute>} />
                    <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
                    <Route path="/mock-test" element={<ProtectedRoute><MockTestPage /></ProtectedRoute>} />
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
