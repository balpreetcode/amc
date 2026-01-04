import { useEffect, useState } from 'react';
import './ApiTokens.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface Token {
    id: string;
    name: string;
    tokenPreview: string;
    createdAt: string;
    expiresAt: string | null;
    lastUsed: string | null;
}

interface NewToken {
    id: string;
    name: string;
    token: string;
    createdAt: string;
    expiresAt: string | null;
}

export function ApiTokens() {
    const [tokens, setTokens] = useState<Token[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTokenName, setNewTokenName] = useState('');
    const [expiresInDays, setExpiresInDays] = useState(365);
    const [createdToken, setCreatedToken] = useState<NewToken | null>(null);
    const [embedCode, setEmbedCode] = useState('');

    useEffect(() => {
        fetchTokens();
    }, []);

    const fetchTokens = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${BACKEND_URL}/api/tokens`);
            const data = await response.json();
            setTokens(data);
        } catch (err) {
            console.error('Failed to fetch tokens:', err);
        } finally {
            setLoading(false);
        }
    };

    const createToken = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/tokens`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: newTokenName || 'API Token',
                    expiresInDays
                })
            });
            const token = await response.json();
            setCreatedToken(token);
            setNewTokenName('');
            fetchTokens();

            // Generate embed code
            const embedResponse = await fetch(`${BACKEND_URL}/api/embed-url?token=${token.token}`);
            const embedData = await embedResponse.json();
            setEmbedCode(embedData.iframeCode);
        } catch (err) {
            console.error('Failed to create token:', err);
            alert('Failed to create token');
        }
    };

    const deleteToken = async (id: string) => {
        if (!confirm('Are you sure you want to delete this token?')) return;

        try {
            await fetch(`${BACKEND_URL}/api/tokens/${id}`, {
                method: 'DELETE'
            });
            fetchTokens();
        } catch (err) {
            console.error('Failed to delete token:', err);
            alert('Failed to delete token');
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const formatDate = (isoString: string | null) => {
        if (!isoString) return 'Never';
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="api-tokens-container">
            <div className="tokens-header">
                <h2>API Tokens & Embed</h2>
                <button
                    className="btn-primary"
                    onClick={() => setShowCreateModal(true)}
                >
                    + Generate New Token
                </button>
            </div>

            <div className="tokens-description">
                <p>Generate API tokens to embed this workflow builder in an iframe on other websites.</p>
            </div>

            {loading ? (
                <div className="loading-state">Loading tokens...</div>
            ) : tokens.length === 0 ? (
                <div className="empty-state">
                    No tokens created yet. Generate one to get started!
                </div>
            ) : (
                <div className="tokens-table-container">
                    <table className="tokens-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Token</th>
                                <th>Created</th>
                                <th>Expires</th>
                                <th>Last Used</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tokens.map((token) => (
                                <tr key={token.id}>
                                    <td>{token.name}</td>
                                    <td className="token-preview">{token.tokenPreview}</td>
                                    <td>{formatDate(token.createdAt)}</td>
                                    <td>{formatDate(token.expiresAt)}</td>
                                    <td>{formatDate(token.lastUsed)}</td>
                                    <td>
                                        <button
                                            className="btn-danger-small"
                                            onClick={() => deleteToken(token.id)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Token Modal */}
            {showCreateModal && (
                <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Generate New API Token</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowCreateModal(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Token Name</label>
                                <input
                                    type="text"
                                    value={newTokenName}
                                    onChange={(e) => setNewTokenName(e.target.value)}
                                    placeholder="e.g., Production Website"
                                />
                            </div>
                            <div className="form-group">
                                <label>Expires In (days)</label>
                                <input
                                    type="number"
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                                    min="1"
                                    max="3650"
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                                Cancel
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => {
                                    createToken();
                                    setShowCreateModal(false);
                                }}
                            >
                                Generate Token
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Token Created Success Modal */}
            {createdToken && (
                <div className="modal-overlay" onClick={() => setCreatedToken(null)}>
                    <div className="modal-content token-success" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>✅ Token Created Successfully!</h3>
                            <button
                                className="close-button"
                                onClick={() => setCreatedToken(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="token-warning">
                                ⚠️ Save this token now! You won't be able to see it again.
                            </div>

                            <div className="form-group">
                                <label>API Token</label>
                                <div className="copy-field">
                                    <input
                                        type="text"
                                        value={createdToken.token}
                                        readOnly
                                    />
                                    <button
                                        className="btn-copy"
                                        onClick={() => copyToClipboard(createdToken.token)}
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            </div>

                            <div className="form-group">
                                <label>Iframe Embed Code</label>
                                <div className="copy-field">
                                    <textarea
                                        value={embedCode}
                                        readOnly
                                        rows={3}
                                    />
                                    <button
                                        className="btn-copy"
                                        onClick={() => copyToClipboard(embedCode)}
                                    >
                                        📋 Copy
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="btn-primary" onClick={() => setCreatedToken(null)}>
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
