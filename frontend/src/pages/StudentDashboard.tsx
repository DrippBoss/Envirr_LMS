import { useEffect, useState } from 'react';
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
