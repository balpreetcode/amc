import React, { useState, useEffect } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface CloudFile {
    id: string;
    name: string;
    type: 'file' | 'folder';
    mimeType?: string;
    size?: number;
    url?: string;
}

interface FileBrowserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (file: CloudFile, downloadUrl: string) => void;
    userId: string;
    toolkit: 'GOOGLEDRIVE' | 'DROPBOX';
}

export const FileBrowserModal: React.FC<FileBrowserModalProps> = ({
    isOpen,
    onClose,
    onSelect,
    userId,
    toolkit
}) => {
    const [files, setFiles] = useState<CloudFile[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [folderHistory, setFolderHistory] = useState<{ id: string | null; name: string }[]>([
        { id: null, name: 'Root' }
    ]);
    const [selectedFile, setSelectedFile] = useState<CloudFile | null>(null);
    const [selecting, setSelecting] = useState(false);

    const currentFolderId = folderHistory[folderHistory.length - 1].id;

    useEffect(() => {
        if (isOpen) {
            loadFiles(currentFolderId);
        }
    }, [isOpen, currentFolderId]);

    const loadFiles = async (folderId: string | null) => {
        setLoading(true);
        setError(null);
        setSelectedFile(null);

        try {
            const url = new URL(`${BACKEND_URL}/composio/files/${userId}`);
            url.searchParams.set('toolkit', toolkit);
            if (folderId) {
                url.searchParams.set('folderId', folderId);
            }

            const response = await fetch(url.toString());
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            // Sort: folders first, then files
            const sortedFiles = (data.files || []).sort((a: CloudFile, b: CloudFile) => {
                if (a.type === 'folder' && b.type !== 'folder') return -1;
                if (a.type !== 'folder' && b.type === 'folder') return 1;
                return a.name.localeCompare(b.name);
            });

            setFiles(sortedFiles);
        } catch (err: any) {
            console.error('[FileBrowser] Load error:', err);
            setError(err.message || 'Failed to load files');
        } finally {
            setLoading(false);
        }
    };

    const navigateToFolder = (folder: CloudFile) => {
        setFolderHistory([...folderHistory, { id: folder.id, name: folder.name }]);
    };

    const handleSelect = async () => {
        if (!selectedFile || selectedFile.type === 'folder') return;

        setSelecting(true);
        try {
            // Get download URL
            const response = await fetch(
                `${BACKEND_URL}/composio/files/${userId}/download/${encodeURIComponent(selectedFile.id)}?toolkit=${toolkit}`
            );
            const data = await response.json();

            if (data.error) {
                throw new Error(data.error);
            }

            onSelect(selectedFile, data.url);
            onClose();
        } catch (err: any) {
            console.error('[FileBrowser] Select error:', err);
            setError(err.message || 'Failed to get file URL');
        } finally {
            setSelecting(false);
        }
    };

    const formatSize = (bytes?: number) => {
        if (!bytes) return '';
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    };

    const getFileIcon = (file: CloudFile) => {
        if (file.type === 'folder') return '📁';
        const mime = file.mimeType?.toLowerCase() || '';
        if (mime.includes('image')) return '🖼️';
        if (mime.includes('video')) return '🎬';
        if (mime.includes('audio')) return '🎵';
        if (mime.includes('pdf')) return '📄';
        return '📎';
    };

    if (!isOpen) return null;

    return (
        <div
            className="file-browser-overlay"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div
                className="file-browser-modal"
                style={{
                    backgroundColor: '#1a1a1a',
                    borderRadius: '12px',
                    width: '600px',
                    maxHeight: '80vh',
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid #333'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '20px' }}>
                            {toolkit === 'GOOGLEDRIVE' ? '📁' : '📦'}
                        </span>
                        <h3 style={{ margin: 0, fontSize: '16px', color: '#fff' }}>
                            {toolkit === 'GOOGLEDRIVE' ? 'Google Drive' : 'Dropbox'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#888',
                            fontSize: '20px',
                            cursor: 'pointer',
                            padding: '4px 8px'
                        }}
                    >
                        ✕
                    </button>
                </div>

                {/* Breadcrumb */}
                <div style={{
                    padding: '12px 20px',
                    borderBottom: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '13px',
                    color: '#888',
                    flexWrap: 'wrap'
                }}>
                    {folderHistory.map((folder, index) => (
                        <React.Fragment key={folder.id || 'root'}>
                            {index > 0 && <span style={{ color: '#555' }}>/</span>}
                            <button
                                onClick={() => setFolderHistory(folderHistory.slice(0, index + 1))}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: index === folderHistory.length - 1 ? '#fff' : '#4a9eff',
                                    cursor: index === folderHistory.length - 1 ? 'default' : 'pointer',
                                    padding: '4px 6px',
                                    borderRadius: '4px'
                                }}
                            >
                                {folder.name}
                            </button>
                        </React.Fragment>
                    ))}
                </div>

                {/* File List */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '8px 0'
                }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                            ⏳ Loading files...
                        </div>
                    ) : error ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#ff6b6b' }}>
                            ❌ {error}
                            <button
                                onClick={() => loadFiles(currentFolderId)}
                                style={{
                                    display: 'block',
                                    margin: '12px auto 0',
                                    padding: '8px 16px',
                                    backgroundColor: '#333',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '6px',
                                    cursor: 'pointer'
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    ) : files.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                            📭 No files found
                        </div>
                    ) : (
                        files.map(file => (
                            <div
                                key={file.id}
                                onClick={() => {
                                    if (file.type === 'folder') {
                                        navigateToFolder(file);
                                    } else {
                                        setSelectedFile(selectedFile?.id === file.id ? null : file);
                                    }
                                }}
                                onDoubleClick={() => {
                                    if (file.type === 'folder') {
                                        navigateToFolder(file);
                                    }
                                }}
                                style={{
                                    padding: '12px 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    cursor: 'pointer',
                                    backgroundColor: selectedFile?.id === file.id ? '#2a4a6a' : 'transparent',
                                    borderLeft: selectedFile?.id === file.id ? '3px solid #4a9eff' : '3px solid transparent'
                                }}
                            >
                                <span style={{ fontSize: '20px' }}>{getFileIcon(file)}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        color: '#fff',
                                        fontSize: '14px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {file.name}
                                    </div>
                                    {file.size && (
                                        <div style={{ color: '#888', fontSize: '12px', marginTop: '2px' }}>
                                            {formatSize(file.size)}
                                        </div>
                                    )}
                                </div>
                                {file.type === 'folder' && (
                                    <span style={{ color: '#888' }}>›</span>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid #333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <div style={{ color: '#888', fontSize: '13px' }}>
                        {selectedFile ? `Selected: ${selectedFile.name}` : 'Select a file'}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: '#333',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSelect}
                            disabled={!selectedFile || selectedFile.type === 'folder' || selecting}
                            style={{
                                padding: '10px 20px',
                                backgroundColor: selectedFile && selectedFile.type !== 'folder' ? '#4285f4' : '#444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: selectedFile && selectedFile.type !== 'folder' ? 'pointer' : 'not-allowed',
                                fontSize: '14px',
                                opacity: selecting ? 0.7 : 1
                            }}
                        >
                            {selecting ? 'Loading...' : 'Select File'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
