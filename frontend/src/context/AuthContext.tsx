import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

type StudentProfile = {
    class_grade: string;
    board: string;
    avatar_url: string;
};

type User = { id: number; username: string; email: string; role: string; can_build_courses: boolean; profile?: StudentProfile };
type AuthContextType = { user: User | null; isAuthenticated: boolean; loading: boolean; login: () => void; logout: () => void; };

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Expose Axios Globally — withCredentials enables sending cookies
export const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/`,
    withCredentials: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUser();
    }, []);

    const fetchUser = async () => {
        setLoading(true);
        try {
            const res = await api.get('auth/me/');
            setUser(res.data);
        } catch {
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = () => {
        // Token is set by httpOnly cookie from the backend
        // Just trigger a user fetch — the cookie is already set
        fetchUser();
    };

    const logout = async () => {
        try {
            await api.post('auth/logout/');
        } catch {
            // ignore
        }
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
