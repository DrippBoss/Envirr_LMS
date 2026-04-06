import { createContext, useState, useEffect, useContext } from 'react';
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
