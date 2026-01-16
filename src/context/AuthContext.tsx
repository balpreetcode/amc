import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getSessionToken } from '../utils/api';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface AuthContextType {
    isLoggedIn: boolean;
    userId: string | null;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    isLoggedIn: false,
    userId: null,
    isLoading: true,
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [userId, setUserId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const validateSession = async () => {
            const token = getSessionToken();

            // DEV BYPASS: If no token found internally, attempt to validate with backend anyway (which will return dev-user)
            const tokenToValidate = token || 'dev-check';

            try {
                const response = await fetch(`${BACKEND_URL}/session/validate?token=${encodeURIComponent(tokenToValidate)}`);
                const data = await response.json();

                if (data.valid && data.userId) {
                    setUserId(data.userId);
                } else {
                    setUserId(null);
                }
            } catch (error) {
                console.error('[Auth] Session validation failed:', error);
                setUserId(null);
            } finally {
                setIsLoading(false);
            }
        };

        validateSession();
    }, []);

    return (
        <AuthContext.Provider value={{
            isLoggedIn: !!userId,
            userId,
            isLoading,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
