import React, { useRef, useEffect } from 'react';
import type { WorkflowNodeData } from '../types/nodes';
import { getNodeTypeConfig } from '../types/nodes';
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
            <div className="node-header">
                <div className="node-icon">{config.icon}</div>
                <div className="node-title">{node.title}</div>
                {getStatusBadge()}
                {showParallelBadge && (
                    <span className="meta-badge meta-parallel">Parallel</span>
                )}
                <button
                    ref={buttonRef}
                    className="node-menu-btn"
                    onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(!menuOpen);
                    }}
                >
                    ⋮
                </button>

                {menuOpen && (
                    <div className="node-menu" ref={menuRef}>
                        <button onClick={() => {
                            onUpdate(node.id, { title: prompt('Enter new title:', node.title.replace(/^\d+\.\s*/, '')) || node.title });
                            setMenuOpen(false);
                        }}>
                            ✏️ Rename
                        </button>
                        <button onClick={() => {
                            // TODO: Open config modal
                            setMenuOpen(false);
                        }}>
                            ⚙️ Configure
                        </button>
                        <button
                            className="delete-btn"
                            onClick={() => {
                                onRemove(node.id);
                                setMenuOpen(false);
                            }}
                        >
                            🗑️ Delete
                        </button>
                        {hasMockData && (
                            <button
                                className="run-from-btn"
                                onClick={() => {
                                    runFromNode(node.id);
                                    setMenuOpen(false);
                                }}
                                disabled={execution.isRunning}
                            >
                                ▶️ Run from here
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="node-body">
                <span className="node-type-label">{config.label}</span>
                <span className="node-provider">{node.provider}</span>
                {showArrayHint && (
                    <span className="meta-badge meta-array">Array input ({arrayInputCount})</span>
                )}
                <span className="node-time">⏱ {node.estimatedTime}</span>
            </div>
        </div>
    );
};
