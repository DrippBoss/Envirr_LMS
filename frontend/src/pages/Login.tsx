import { useState } from 'react';
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
