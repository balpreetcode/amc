import { useState, useEffect, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

interface SessionGateProps {
    children: ReactNode;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export function SessionGate({ children }: SessionGateProps) {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Check for token in URL or sessionStorage
        const urlToken = searchParams.get('sessiontoken');
        const storedToken = sessionStorage.getItem('sessionToken');
        const sessionToken = urlToken || storedToken;

        if (!sessionToken) {
            setStatus('invalid');
            setError('No session token provided');
            return;
        }

        // Validate the session token
        const validateSession = async () => {
            try {
                const response = await fetch(`${BACKEND_URL}/session/validate?token=${encodeURIComponent(sessionToken)}`);
                const data = await response.json();

                if (data.valid) {
                    // Store the valid token for future use
                    sessionStorage.setItem('sessionToken', sessionToken);
                    setStatus('valid');
                } else {
                    // Clear any stored token if validation fails
                    sessionStorage.removeItem('sessionToken');
                    setStatus('invalid');
                    setError(data.error || 'Invalid session token');
                }
            } catch (err) {
                sessionStorage.removeItem('sessionToken');
                setStatus('invalid');
                setError('Failed to validate session');
                console.error('Session validation error:', err);
            }
        };

        validateSession();
    }, [searchParams]);

    if (status === 'loading') {
        return (
            <div className="session-gate-loading">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>Validating session...</p>
                </div>
                <style>{`
          .session-gate-loading {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
          }
          .loading-container {
            text-align: center;
          }
          .loading-spinner {
            width: 50px;
            height: 50px;
            border: 3px solid rgba(255, 255, 255, 0.1);
            border-top-color: #00d4ff;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div className="session-gate-denied">
                <div className="denied-container">
                    <div className="denied-icon">🔒</div>
                    <h1>Access Denied</h1>
                    <p>{error || 'Your session is invalid or has expired.'}</p>
                    <p className="hint">Please use a valid session link to access the workflow builder.</p>
                </div>
                <style>{`
          .session-gate-denied {
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
          }
          .denied-container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 16px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 400px;
          }
          .denied-icon {
            font-size: 64px;
            margin-bottom: 20px;
          }
          .denied-container h1 {
            margin: 0 0 16px;
            font-size: 28px;
            color: #ff6b6b;
          }
          .denied-container p {
            margin: 0 0 12px;
            color: #a0a0a0;
          }
          .denied-container .hint {
            font-size: 14px;
            color: #666;
          }
        `}</style>
            </div>
        );
    }

    return <>{children}</>;
}
