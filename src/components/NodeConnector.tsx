import React from 'react';
import './NodeConnector.css';

interface NodeConnectorProps {
    onAddClick: () => void;
    itemCount?: number;
    showItemCount?: boolean;
}

export const NodeConnector: React.FC<NodeConnectorProps> = ({ onAddClick, itemCount, showItemCount }) => {
    return (
        <div className="node-connector">
            <div className="connector-pill">
                <div className="connector-arrow-icon">
                    <svg width="20" height="32" viewBox="0 0 20 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <line x1="10" y1="0" x2="10" y2="25" stroke="#F97316" strokeWidth="2" />
                        <path d="M5 20L10 27L15 20" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <button className="connector-add-btn" onClick={onAddClick}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 1V13M1 7H13" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
            {showItemCount && typeof itemCount === 'number' && (
                <div className="connector-items">({itemCount} items)</div>
            )}
        </div>
    );
};
