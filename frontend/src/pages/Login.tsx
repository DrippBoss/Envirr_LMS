import { useState } from 'react';
import { useAuth, api } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('student');
    const [classGrade, setClassGrade] = useState('');
    const [board, setBoard] = useState('');
    
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (isLogin) {
                const res = await api.post('auth/login/', { username, password });
                login(res.data.access);
                navigate('/');
            } else {
                const payload: any = { username, password, email, role };
                if (role === 'student') {
                    payload.class_grade = classGrade;
                    payload.board = board;
                }
                await api.post('auth/register/', payload);
                
                // Auto-login after registration
                const res = await api.post('auth/login/', { username, password });
                login(res.data.access);
                navigate('/');
            }
        } catch (err: any) {
            alert(err.response?.data?.error || "An error occurred");
        }
    };

    return (
        <div style={{ 
            display: 'flex', justifyContent: 'center', alignItems: 'center', 
            minHeight: '100vh', 
            background: 'radial-gradient(circle at top right, #1a2a6c, #b21f1f, #fdbb2d)',
            backgroundSize: '400% 400%',
            animation: 'gradientMove 15s ease infinite',
            padding: '20px'
        }} className="animate-fade-in">
            <style>{`
                @keyframes gradientMove {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .glass-card {
                    background: rgba(15, 23, 42, 0.7);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 40px;
                    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                    width: 100%;
                    max-width: 450px;
                }
                .tab-btn {
                    flex: 1;
                    padding: 12px;
                    font-weight: 600;
                    letter-spacing: 0.5px;
                    transition: all 0.3s ease;
                }
            `}</style>
            <div className="glass-card">
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🚀</div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, background: 'linear-gradient(to right, #fff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Envirr LMS
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '5px' }}>Your journey to mastery starts here.</p>
                </div>
                
                <div style={{ display: 'flex', marginBottom: '30px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', padding: '4px' }}>
                    <button 
                        className="tab-btn"
                        style={{ 
                            background: isLogin ? 'rgba(58, 130, 246, 0.2)' : 'transparent', 
                            color: isLogin ? '#60a5fa' : '#94a3b8',
                            borderRadius: '8px',
                            border: 'none'
                        }}
                        onClick={() => setIsLogin(true)}>
                        Login
                    </button>
                    <button 
                        className="tab-btn"
                        style={{ 
                            background: !isLogin ? 'rgba(58, 130, 246, 0.2)' : 'transparent', 
                            color: !isLogin ? '#60a5fa' : '#94a3b8',
                            borderRadius: '8px',
                            border: 'none'
                        }}
                        onClick={() => setIsLogin(false)}>
                        Register
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <input className="input-glass" placeholder="Username" value={username} onChange={e => setUsername(e.target.value)} required />
                    
                    {!isLogin && (
                        <input className="input-glass" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                    )}
                    
                    <input className="input-glass" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    
                    {!isLogin && (
                        <>
                            <select className="input-glass" value={role} onChange={e => setRole(e.target.value)} required style={{background: 'rgba(255,255,255,0.05)', color: '#fff'}}>
                                <option value="student" style={{color: '#000'}}>Student</option>
                                <option value="teacher" style={{color: '#000'}}>Teacher</option>
                            </select>
                            
                            {role === 'student' && (
                                <>
                                    <select className="input-glass" value={classGrade} onChange={e => setClassGrade(e.target.value)} required style={{background: 'rgba(255,255,255,0.05)', color: '#fff'}}>
                                        <option value="" disabled style={{color: '#000'}}>Select Class</option>
                                        <option value="9" style={{color: '#000'}}>Class 9</option>
                                        <option value="10" style={{color: '#000'}}>Class 10</option>
                                        <option value="11" style={{color: '#000'}}>Class 11</option>
                                        <option value="12" style={{color: '#000'}}>Class 12</option>
                                    </select>
                                    
                                    <select className="input-glass" value={board} onChange={e => setBoard(e.target.value)} style={{background: 'rgba(255,255,255,0.05)', color: '#fff'}}>
                                        <option value="" disabled style={{color: '#000'}}>Select Board (Optional)</option>
                                        <option value="CBSE" style={{color: '#000'}}>CBSE</option>
                                        <option value="ICSE" style={{color: '#000'}}>ICSE</option>
                                        <option value="State" style={{color: '#000'}}>State Board</option>
                                        <option value="Other" style={{color: '#000'}}>Other</option>
                                    </select>
                                </>
                            )}
                        </>
                    )}

                    <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                        {isLogin ? 'Authenticate' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}
