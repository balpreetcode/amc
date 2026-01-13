import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Sidebar.css';

interface SidebarProps {
    activeTab: string;
}

export function Sidebar({ activeTab }: SidebarProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const navigate = useNavigate();

    const menuItems = [
        { id: 'builder', label: 'Flow Builder', icon: '🔧', path: '/' },
        { id: 'history', label: 'Execution History', icon: '📜', path: '/history' },
        { id: 'templates', label: 'Templates', icon: '📋', path: '/templates' },
        { id: 'node-config', label: 'Node Config', icon: '⚙️', path: '/node-config' },
        { id: 'api-tokens', label: 'API & Embed', icon: '🔑', path: '/api-tokens' },
        { id: 'api-docs', label: 'API Docs', icon: '📚', path: '/api-docs' },
        { id: 'playground', label: 'AI Playground', icon: '🎮', path: '/playground' },
    ];

    const handleNavigation = (path: string) => {
        navigate(path);
    };

    return (
        <div className={`sidebar ${isExpanded ? 'expanded' : 'collapsed'}`}>
            <div className="sidebar-header">
                <button
                    className="expand-btn"
                    onClick={() => setIsExpanded(!isExpanded)}
                    title={isExpanded ? "Collapse" : "Expand"}
                >
                    {isExpanded ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                        </svg>
                    ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    )}
                </button>
            </div>

            <nav className="sidebar-nav">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activeTab === item.id ? 'active' : ''}`}
                        onClick={() => handleNavigation(item.path)}
                        title={isExpanded ? '' : item.label}
                    >
                        <span className="sidebar-icon">{item.icon}</span>
                        {isExpanded && <span className="sidebar-label">{item.label}</span>}
                    </button>
                ))}
            </nav>
        </div>
    );
}
