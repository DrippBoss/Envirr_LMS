import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

type StudentProfile = {
    class_grade: string;
    board: string;
    avatar_url: string;
};

type User = { id: number; username: string; email: string; role: string; profile?: StudentProfile };
type AuthContextType = { user: User | null; isAuthenticated: boolean; loading: boolean; login: (t: string) => void; logout: () => void; };

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Expose Axios Globally
export const api = axios.create({ baseURL: 'http://localhost:8000/api/' });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('access_token');
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        setLoading(true);
        try {
            const res = await api.get('auth/me/');
            setUser(res.data);
        } catch { 
            logout(); 
        } finally {
            setLoading(false);
        }
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
        setLoading(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
