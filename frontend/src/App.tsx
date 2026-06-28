import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';

// Route-level code splitting: each page is fetched on demand so the initial
// bundle stays small. Navbar + Login are eager (layout / unauth entry point);
// labs are already lazy-loaded via LabDispatcher.
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'));
const TeacherPanel = lazy(() => import('./pages/TeacherPanel'));
const LearningMap = lazy(() => import('./pages/LearningMap'));
const NodePage = lazy(() => import('./pages/NodePage'));
const AiTutor = lazy(() => import('./pages/AiTutor'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const MockTestPage = lazy(() => import('./pages/MockTestPage'));
const StudyGroupsPage = lazy(() => import('./pages/StudyGroupsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage'));
const StudentAnalyticsPage = lazy(() => import('./pages/StudentAnalyticsPage'));

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
                <Suspense fallback={<div className="loading-container">Loading…</div>}>
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/" element={<ProtectedRoute><RoleHome /></ProtectedRoute>} />
                        <Route path="/map/:pathId" element={<ProtectedRoute><LearningMap /></ProtectedRoute>} />
                        <Route path="/learn/:nodeId" element={<ProtectedRoute><NodePage /></ProtectedRoute>} />
                        <Route path="/teacher" element={<ProtectedRoute allowedRole="teacher"><TeacherPanel /></ProtectedRoute>} />
                        <Route path="/tutor" element={<ProtectedRoute><AiTutor /></ProtectedRoute>} />
                        <Route path="/admin" element={<ProtectedRoute allowedRole="admin"><AdminDashboard /></ProtectedRoute>} />
                        <Route path="/mock-test" element={<ProtectedRoute><MockTestPage /></ProtectedRoute>} />
                        <Route path="/study-groups" element={<ProtectedRoute><StudyGroupsPage /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                        <Route path="/leaderboard" element={<ProtectedRoute><LeaderboardPage /></ProtectedRoute>} />
                        <Route path="/analytics" element={<ProtectedRoute><StudentAnalyticsPage /></ProtectedRoute>} />
                        <Route path="/verify-email" element={<VerifyEmailPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                    </Routes>
                </Suspense>
            </div>
        </Router>
    );
}

function App() {
  return (
    <ThemeProvider>
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
