import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

type StudentProfile = {
    class_grade: string;
    board: string;
    avatar_url: string;
};

type User = { id: number; username: string; name: string; mobile: string; email: string; pending_email: string; role: string; can_build_courses: boolean; can_edit_questions: boolean; email_verified: boolean; assigned_subjects: string[]; profile?: StudentProfile };
type AuthContextType = { user: User | null; isAuthenticated: boolean; loading: boolean; login: () => void; logout: () => void; refreshUser: () => Promise<void>; };

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Expose Axios Globally — withCredentials enables sending cookies
export const api = axios.create({
    baseURL: `${import.meta.env.VITE_API_URL}/api/`,
    withCredentials: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // Silent token refresh interceptor — retries once on 401, redirects to login if refresh fails
    useEffect(() => {
        const interceptor = api.interceptors.response.use(
            res => res,
            async error => {
                const original = error.config;
                const is401    = error.response?.status === 401;
                const isAuthRoute = original.url?.includes('token/refresh') ||
                                    original.url?.includes('auth/login') ||
                                    original.url?.includes('auth/me');
                if (is401 && !original._retry && !isAuthRoute) {
                    original._retry = true;
                    try {
                        await api.post('auth/token/refresh/');
                        return api(original);
                    } catch {
                        setUser(null);
                        window.location.href = '/login';
                    }
                }
                return Promise.reject(error);
            }
        );
        return () => api.interceptors.response.eject(interceptor);
    }, []);

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
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout, refreshUser: fetchUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
