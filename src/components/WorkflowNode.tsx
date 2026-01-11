import React, { useRef, useEffect } from 'react';
import type { WorkflowNodeData } from '../types/nodes';
import { getNodeTypeConfig, getProviderFromModel } from '../types/nodes';
import { useWorkflowContext } from '../context/WorkflowContext';
import './WorkflowNode.css';

interface WorkflowNodeProps {
    node: WorkflowNodeData;
    index: number;
    onRemove: (id: string) => void;
    onUpdate: (id: string, updates: Partial<WorkflowNodeData>) => void;
    isCurrentlyRunning?: boolean;
    arrayInputCount?: number;
}

export const WorkflowNode: React.FC<WorkflowNodeProps> = ({
    node,
    index,
    onRemove,
    onUpdate,
    isCurrentlyRunning = false,
    arrayInputCount
}) => {
    const { selectedNodeId, setSelectedNodeId, runFromNode, execution } = useWorkflowContext();
    const [menuOpen, setMenuOpen] = React.useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!menuOpen) return;

        const handleInteractionOutside = (e: MouseEvent | FocusEvent) => {
            const isClickOnToggle = buttonRef.current && buttonRef.current.contains(e.target as Node);
            if (menuRef.current && !menuRef.current.contains(e.target as Node) && !isClickOnToggle) {
                setMenuOpen(false);
            }
        };

        window.addEventListener('mousedown', handleInteractionOutside, true);
        window.addEventListener('focusin', handleInteractionOutside, true);

        return () => {
            window.removeEventListener('mousedown', handleInteractionOutside, true);
            window.removeEventListener('focusin', handleInteractionOutside, true);
        };
    }, [menuOpen]);
    const config = getNodeTypeConfig(node.type);
    const hasMockData = node.mockData?.enabled && node.mockData?.data != null;

    const getStatusBadge = () => {
        switch (node.status) {
            case 'running':
                return <span className="status-badge status-running">⚡ Running</span>;
            case 'completed':
                return <span className="status-badge status-completed">✓ Done</span>;
            case 'error':
                return <span className="status-badge status-error">✗ Error</span>;
            default:
                return <span className="status-badge status-not-run">Not Run ⏱</span>;
        }
    };

    const nodeClasses = [
        'workflow-node',
        index === 0 ? 'first-node' : '',
        node.status === 'running' || isCurrentlyRunning ? 'node-running' : '',
        node.status === 'completed' ? 'node-completed' : '',
        selectedNodeId === node.id ? 'node-active' : '',
    ].filter(Boolean).join(' ');

    const showParallelBadge = node.execution?.mode === 'parallel';
    const showArrayHint = typeof arrayInputCount === 'number';

    return (
        <div
            className={nodeClasses}
            onClick={() => setSelectedNodeId(node.id)}
        >
            <div className="node-icon">{config.icon}</div>

            <div className="node-content-wrapper">
                <div className="node-title">{node.title}</div>

                <div className="node-badges">
                    {getStatusBadge()}
                    <span className="node-type-label">{config.label}</span>
                    <span className="node-provider">{getProviderFromModel((node.config as any)?.model, node.type)}</span>
                    {showParallelBadge && (
                        <span className="meta-badge meta-parallel">Parallel</span>
                    )}
                    {showArrayHint && (
                        <span className="meta-badge meta-array">Array ({arrayInputCount})</span>
                    )}
                </div>
            </div>

            <span className="node-time">⏱ {node.estimatedTime}</span>

            <div className="node-actions-container">
                <button
                    className="node-delete-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(node.id);
                    }}
                    title="Delete node"
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        <line x1="10" y1="11" x2="10" y2="17"></line>
                        <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                </button>
            </div>
        </div>
    );
};
