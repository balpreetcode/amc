
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './DriveConnect.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface DriveFile {
    id: string;
    name: string;
    type: 'file' | 'folder';
    mimeType?: string;
    size: number | null;
    url: string;
    viewUrl: string;
}

export function DriveConnect() {
    const { userId } = useAuth();
    const [connected, setConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [files, setFiles] = useState<DriveFile[]>([]);
    const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([{ id: null, name: 'Root' }]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (userId) {
            checkConnection();
        }
    }, [userId]);

    const checkConnection = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/composio/accounts/${userId}?toolkit=GOOGLEDRIVE`);
            const data = await response.json();
            const isConnected = data.accounts && data.accounts.length > 0;
            setConnected(isConnected);
            if (isConnected) {
                listFiles(null);
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error('Failed to check connection:', err);
            // setError('Failed to check connection'); // Suppress for cleaner UI on initial load if just not connected
            setLoading(false);
        }
    };

    const listFiles = async (folderId: string | null) => {
        setLoading(true);
        setError(null);
        try {
            const folderParam = folderId ? `&folderId=${folderId}` : '';
            const response = await fetch(`${BACKEND_URL}/composio/files/${userId}?toolkit=GOOGLEDRIVE${folderParam}`);

            if (!response.ok) {
                throw new Error('Failed to fetch files');
            }

            const data = await response.json();
            setFiles(data.files || []);
        } catch (err: any) {
            console.error('Failed to list files:', err);
            setError(err.message || 'Failed to list files');
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/composio/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toolkit: 'GOOGLEDRIVE',
                    callbackUrl: `${window.location.origin}/drive-connect` // This might need adjustment based on how callback is handled
                })
            });
            const data = await response.json();

            if (data.redirectUrl) {
                // Open popup
                const width = 600;
                const height = 700;
                const left = window.screen.width / 2 - width / 2;
                const top = window.screen.height / 2 - height / 2;

                const popup = window.open(
                    data.redirectUrl,
                    'Connect Google Drive',
                    `width=${width},height=${height},left=${left},top=${top}`
                );

                // Listen for message from popup
                const messageHandler = (event: MessageEvent) => {
                    if (event.data.type === 'COMPOSIO_OAUTH_COMPLETE') {
                        if (event.data.success) {
                            checkConnection();
                        } else {
                            setError('Connection failed');
                        }
                        window.removeEventListener('message', messageHandler);
                    }
                };
                window.addEventListener('message', messageHandler);

                // Fallback polling or check on focus
                const checkPopup = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(checkPopup);
                        checkConnection(); // Check anyway on close
                        window.removeEventListener('message', messageHandler);
                    }
                }, 1000);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to initiate connection');
        }
    };

    const handleFolderClick = (folderId: string, folderName: string) => {
        setFolderHistory([...folderHistory, { id: folderId, name: folderName }]);
        listFiles(folderId);
    };

    const handleBreadcrumbClick = (index: number) => {
        const newHistory = folderHistory.slice(0, index + 1);
        setFolderHistory(newHistory);
        const folderId = newHistory[newHistory.length - 1].id;
        listFiles(folderId);
    };

    const formatSize = (bytes: number | null) => {
        if (bytes === null) return '-';
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    if (!userId) {
        return <div className="drive-connect-container">Please log in to use Drive Connect.</div>;
    }

    return (
        <div className="drive-connect-container">
            <header className="drive-header">
                <h1>Google Drive Connect</h1>
            </header>

            {error && <div className="drive-error">{error}</div>}

            {!connected ? (
                <div className="connect-state">
                    <p>Connect your Google Drive account to browse files.</p>
                    <button className="connect-btn" onClick={handleConnect} disabled={loading}>
                        {loading ? 'Loading...' : 'Connect Google Drive'}
                    </button>
                </div>
            ) : (
                <div className="file-browser">
                    <div className="breadcrumbs">
                        {folderHistory.map((item, index) => (
                            <span key={index} className="breadcrumb-item">
                                <span
                                    className="breadcrumb-link"
                                    onClick={() => handleBreadcrumbClick(index)}
                                >
                                    {item.name}
                                </span>
                                {index < folderHistory.length - 1 && <span className="separator">/</span>}
                            </span>
                        ))}
                    </div>

                    {loading ? (
                        <div className="loading-files">Loading files...</div>
                    ) : (
                        <div className="file-list">
                            {files.length === 0 ? (
                                <div className="empty-folder">This folder is empty.</div>
                            ) : (
                                files.map(file => (
                                    <div key={file.id} className="file-item">
                                        <div className="file-icon">
                                            {file.type === 'folder' ? '📁' : '📄'}
                                        </div>
                                        <div className="file-info">
                                            {file.type === 'folder' ? (
                                                <span
                                                    className="file-name folder-link"
                                                    onClick={() => handleFolderClick(file.id, file.name)}
                                                >
                                                    {file.name}
                                                </span>
                                            ) : (
                                                <a href={file.viewUrl} target="_blank" rel="noopener noreferrer" className="file-name">
                                                    {file.name}
                                                </a>
                                            )}
                                            <span className="file-size">{formatSize(file.size)}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
