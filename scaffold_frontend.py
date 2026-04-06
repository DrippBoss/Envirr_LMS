import os

BASE_DIR = os.path.join(os.path.dirname(__file__), 'frontend', 'src')

components = {
    # 1. Premium Vanilla CSS Configuration
    "index.css": """@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Outfit:wght@500;700&display=swap');

:root {
  --bg-dark: #0f172a;
  --bg-panel: rgba(30, 41, 59, 0.7);
  --primary-accent: #6366f1;
  --primary-glow: rgba(99, 102, 241, 0.4);
  --secondary-accent: #10b981;
  --text-primary: #f8fafc;
  --text-muted: #94a3b8;
  --glass-border: rgba(255, 255, 255, 0.1);
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background-color: var(--bg-dark);
  color: var(--text-primary);
  font-family: 'Inter', sans-serif;
  min-height: 100vh;
  margin: 0;
  overflow-x: hidden;
}

h1, h2, h3, h4 { font-family: 'Outfit', sans-serif; }

/* Glassmorphism Structural Classes */
.glass-panel {
  background: var(--bg-panel);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s;
}

.glass-panel:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 40px var(--primary-glow);
}

/* Base Utility Classes */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.btn-primary {
  background: linear-gradient(135deg, var(--primary-accent), #8b5cf6);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  min-width: 120px;
}

.btn-primary:hover {
  transform: scale(1.05);
  box-shadow: 0 0 20px var(--primary-glow);
}

.btn-success {
  background: linear-gradient(135deg, var(--secondary-accent), #059669);
}

.input-glass {
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid var(--glass-border);
  color: white;
  padding: 12px;
  border-radius: 8px;
  width: 100%;
  font-family: 'Inter', sans-serif;
  transition: border-color 0.3s;
  margin-bottom: 1rem;
}

.input-glass:focus {
  outline: none;
  border-color: var(--primary-accent);
}

/* Animations */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-in { animation: fadeIn 0.6s ease forwards; }

.grid-dashboard {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-top: 2rem;
}
""",

    # 2. Main App Router Wrapper
    "App.tsx": """import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
""",

    # 3. AuthContext for JWT Management
    "context/AuthContext.tsx": """import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

type User = { id: number; username: string; email: string; role: string; };
type AuthContextType = { user: User | null; isAuthenticated: boolean; login: (t: string) => void; logout: () => void; };

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Expose Axios Globally
export const api = axios.create({ baseURL: 'http://localhost:8000/api' });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        }
    }, []);

    const fetchUser = async () => {
        try {
            const res = await api.get('/auth/me/');
            setUser(res.data);
        } catch { logout(); }
    };

    const login = (token: string) => {
        localStorage.setItem('access_token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        fetchUser();
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        delete api.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
""",

    # 4. Navbar
    "components/Navbar.tsx": """import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();

    if (!isAuthenticated) return null;

    return (
        <nav className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 2rem' }}>
            <h2 style={{ cursor: 'pointer', background: 'linear-gradient(90deg, #6366f1, #a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }} onClick={() => navigate('/')}>
                Envirr v2
            </h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{user?.username} ({user?.role})</span>
                {user?.role === 'teacher' && <button className="btn-primary" onClick={() => navigate('/teacher')}>Teacher Panel</button>}
                <button className="btn-primary" style={{ background: '#ef4444' }} onClick={logout}>Logout</button>
            </div>
        </nav>
    );
}
""",

    # 5. Login View
    "pages/Login.tsx": """import { useState } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await api.post('/auth/login/', { username, password });
            login(res.data.access);
            navigate('/');
        } catch (err) {
            alert("Invalid Credentials");
        }
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }} className="animate-fade-in">
            <div className="glass-panel" style={{ maxWidth: '400px', width: '100%' }}>
                <h1 style={{ marginBottom: '2rem', textAlign: 'center' }}>Portal Access</h1>
                <form onSubmit={handleLogin}>
                    <input className="input-glass" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                    <input className="input-glass" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button type="submit" className="btn-primary" style={{ width: '100%' }}>Authenticate</button>
                </form>
            </div>
        </div>
    );
}
""",

    # 6. Student Dashboard (Gamification & Overviews)
    "pages/StudentDashboard.tsx": """import { useEffect, useState } from 'react';
import { api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

type Stats = { current_streak: number; total_xp: number; current_level: number; };
type Course = { id: number; name: string; description: string; };

export default function StudentDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [courses, setCourses] = useState<Course[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get('/gamification/stats/').then(res => setStats(res.data)).catch(console.error);
        api.get('/courses/courses/').then(res => setCourses(res.data)).catch(console.error);
    }, []);

    return (
        <div className="animate-fade-in">
            <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Welcome Back!</h1>
            
            <div className="grid-dashboard">
                <div className="glass-panel" style={{ borderTop: '4px solid #f59e0b' }}>
                    <h3 style={{ color: 'var(--text-muted)' }}>Current Streak</h3>
                    <h1 style={{ fontSize: '3rem', color: '#f59e0b' }}>🔥 {stats?.current_streak || 0} Days</h1>
                </div>
                <div className="glass-panel" style={{ borderTop: '4px solid #8b5cf6' }}>
                    <h3 style={{ color: 'var(--text-muted)' }}>Experience / Level</h3>
                    <h1 style={{ fontSize: '3rem', color: '#8b5cf6' }}>⚡ Level {stats?.current_level || 1}</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Total XP: {stats?.total_xp || 0}</p>
                </div>
            </div>

            <h2 style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>Your Enrolled Courses</h2>
            <div className="grid-dashboard">
                {courses.map(course => (
                    <div key={course.id} className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <h3>{course.name}</h3>
                        <p style={{ color: 'var(--text-muted)', flex: 1 }}>{course.description}</p>
                        <button className="btn-primary" onClick={() => navigate(`/course/${course.id}`)}>Enter Map</button>
                    </div>
                ))}
                {courses.length === 0 && <p>No active enrollments.</p>}
            </div>
        </div>
    );
}
""",

    # 7. Teacher Panel (AI PDF Gen)
    "pages/TeacherPanel.tsx": """import { useState } from 'react';
import { api } from '../context/AuthContext';

export default function TeacherPanel() {
    const [loading, setLoading] = useState(false);
    
    // AI Form State
    const [subject, setSubject] = useState('Mathematics');
    const [chapter, setChapter] = useState('');
    const [marks, setMarks] = useState(80);

    const handleAIGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = { subject, chapter, max_marks: marks, difficulty: 'medium', paper_type: 'Exam' };
            const res = await api.post('/ai/generate-paper/', payload);
            alert("AI Pipeline Triggered: " + res.data.message);
        } catch (err) {
            alert("Failed to trigger generation.");
        }
        setLoading(false);
    };

    return (
        <div className="animate-fade-in grid-dashboard">
            <div className="glass-panel" style={{ gridColumn: '1 / -1' }}>
                <h2>AI Question Paper Factory</h2>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Generate complete PDFs mapped automatically to strict mark configurations via Celery Async queue.</p>
                
                <form onSubmit={handleAIGenerate} style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                    <input className="input-glass" placeholder="Subject" value={subject} onChange={e=>setSubject(e.target.value)} required />
                    <input className="input-glass" placeholder="Chapter(s)" value={chapter} onChange={e=>setChapter(e.target.value)} required />
                    <input className="input-glass" type="number" placeholder="Total Marks" value={marks} onChange={e=>setMarks(Number(e.target.value))} required />
                    
                    <button type="submit" className="btn-primary" disabled={loading} style={{ gridColumn: '1 / -1' }}>
                        {loading ? 'Transmitting Prompt...' : 'Generate AI Blueprint 🚀'}
                    </button>
                </form>
            </div>
        </div>
    );
}
""",

    # 8. Empty Map View (Placeholder for Interlocking Tree Logic)
    "pages/CourseViewer.tsx": """import { useParams } from 'react-router-dom';

export default function CourseViewer() {
    const { id } = useParams();
    
    return (
        <div className="animate-fade-in glass-panel" style={{ minHeight: '60vh', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
            <h2>Course Content Mapping Engine</h2>
            <p style={{ color: 'var(--text-muted)' }}>The visual interlocking map for Course #{id} will render here.</p>
            <button className="btn-primary" style={{ marginTop: '2rem' }}>Simulate Pre-requisite Pass</button>
        </div>
    );
}
"""
}

# Recursively ensure subdirs exist and write files
for rel_path, content in components.items():
    abs_path = os.path.join(BASE_DIR, rel_path)
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
print("Frontend Scaffold Initialized with Premium Real CSS Architecture")
