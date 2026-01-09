import { useState } from 'react';
import type { Template, TemplateUpdateRequest } from '../types/template';
import type { WorkflowNodeData } from '../types/nodes';
import { getNodeTypeConfig } from '../types/nodes';
import { FORM_SCHEMAS } from './NodePropertiesPanel';
import './TemplateEditModal.css';

interface TemplateEditModalProps {
    template: Template;
    onSave: (updates: TemplateUpdateRequest) => Promise<void>;
    onDelete: () => Promise<void>;
    onClose: () => void;
}

export function TemplateEditModal({ template, onSave, onDelete, onClose }: TemplateEditModalProps) {
    const [name, setName] = useState(template.name);
    const [description, setDescription] = useState(template.description || '');
    const [videoPreview, setVideoPreview] = useState(template.videoPreview || '');
    const [nodes, setNodes] = useState<WorkflowNodeData[]>(template.nodes);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [expandedNodeId, setExpandedNodeId] = useState<string | null>(null);

    const handleNodeConfigChange = (nodeId: string, fieldName: string, value: unknown) => {
        setNodes(prev => prev.map(node => {
            if (node.id !== nodeId) return node;
            return {
                ...node,
                config: {
                    ...(node.config || {}),
                    [fieldName]: value
                }
            };
        }));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Template name is required');
            return;
        }

        setSaving(true);
        try {
            await onSave({ name, description, videoPreview, nodes });
            onClose();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
            return;
        }

        setDeleting(true);
        try {
            await onDelete();
            onClose();
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete template');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="template-modal-overlay" onClick={onClose}>
            <div className="template-modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="template-modal-header">
                    <h2>Edit Template</h2>
                    <button className="close-button" onClick={onClose}>✕</button>
                </div>

                <div className="template-modal-body">
                    {/* Template Info Section */}
                    <div className="template-info-section">
                        <div className="form-group">
                            <label>Template Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter template name"
                            />
                        </div>
                        <div className="form-group">
                            <label>Description (Optional)</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Describe what this template does"
                                rows={2}
                            />
                        </div>
                        <div className="form-group">
                            <label>Video Preview URL (Optional)</label>
                            <input
                                type="text"
                                value={videoPreview}
                                onChange={(e) => setVideoPreview(e.target.value)}
                                placeholder="http://localhost:3002/output/composed_xxx.mp4"
                            />
                            {videoPreview && (
                                <small style={{ color: '#6B6B6B', marginTop: '4px', display: 'block' }}>
                                    Preview will be shown on the template card
                                </small>
                            )}
                        </div>
                    </div>

                    {/* Nodes Section */}
                    <div className="nodes-section">
                        <h3>Node Configurations ({nodes.length} nodes)</h3>
                        {nodes.map((node) => {
                            const nodeConfig = getNodeTypeConfig(node.type);
                            const fields = FORM_SCHEMAS[node.type] || [];
                            const isExpanded = expandedNodeId === node.id;

                            return (
                                <div key={node.id} className="node-card">
                                    <div
                                        className="node-card-header"
                                        onClick={() => setExpandedNodeId(isExpanded ? null : node.id)}
                                    >
                                        <div className="node-info">
                                            <span className="node-icon">{nodeConfig.icon}</span>
                                            <span className="node-title">{node.title}</span>
                                        </div>
                                        <span className="expand-icon">{isExpanded ? '▼' : '▶'}</span>
                                    </div>

                                    {isExpanded && (
                                        <div className="node-card-body">
                                            {fields.map(field => {
                                                const fieldValue = (node.config as Record<string, unknown>)?.[field.name];
                                                const isReference = fieldValue && typeof fieldValue === 'object' && (fieldValue as { _type?: string })._type === 'reference';

                                                // Skip reference fields - keep them as-is
                                                if (isReference) {
                                                    const refValue = fieldValue as { nodeId: string; outputKey: string };
                                                    return (
                                                        <div key={field.name} className="form-group">
                                                            <label>{field.label}</label>
                                                            <div className="reference-indicator">
                                                                🔗 Linked to: {nodes.find(n => n.id === refValue.nodeId)?.title || 'Unknown'} → {refValue.outputKey}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={field.name} className="form-group">
                                                        <label>{field.label}</label>
                                                        {field.type === 'textarea' && (
                                                            <textarea
                                                                value={(fieldValue as string) || ''}
                                                                onChange={(e) => handleNodeConfigChange(node.id, field.name, e.target.value)}
                                                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                                rows={3}
                                                            />
                                                        )}
                                                        {field.type === 'text' && (
                                                            <input
                                                                type="text"
                                                                value={(fieldValue as string) || ''}
                                                                onChange={(e) => handleNodeConfigChange(node.id, field.name, e.target.value)}
                                                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                                            />
                                                        )}
                                                        {field.type === 'number' && (
                                                            <input
                                                                type="number"
                                                                value={(fieldValue as number) || ''}
                                                                onChange={(e) => handleNodeConfigChange(node.id, field.name, Number(e.target.value))}
                                                                min={field.min}
                                                                max={field.max}
                                                            />
                                                        )}
                                                        {field.type === 'slider' && (
                                                            <div className="slider-container">
                                                                <input
                                                                    type="range"
                                                                    value={(fieldValue as number) || field.min || 0}
                                                                    onChange={(e) => handleNodeConfigChange(node.id, field.name, Number(e.target.value))}
                                                                    min={field.min}
                                                                    max={field.max}
                                                                    step={field.step}
                                                                />
                                                                <span className="slider-value">{fieldValue as number || field.min || 0}</span>
                                                            </div>
                                                        )}
                                                        {field.type === 'select' && (
                                                            <select
                                                                value={(fieldValue as string) || field.options?.[0]}
                                                                onChange={(e) => handleNodeConfigChange(node.id, field.name, e.target.value)}
                                                            >
                                                                {field.options?.map(opt => (
                                                                    <option key={opt} value={opt}>{opt}</option>
                                                                ))}
                                                            </select>
                                                        )}
                                                        {(field.type === 'file' || field.type === 'image' || field.type === 'video' || field.type === 'audio') && (
                                                            <input
                                                                type="text"
                                                                value={(fieldValue as string) || ''}
                                                                onChange={(e) => handleNodeConfigChange(node.id, field.name, e.target.value)}
                                                                placeholder={`Enter ${field.type} URL...`}
                                                            />
                                                        )}
                                                        {field.type === 'toggle' && (
                                                            <label className="toggle-switch">
                                                                <input
                                                                    type="checkbox"
                                                                    checked={(fieldValue as boolean) || false}
                                                                    onChange={(e) => handleNodeConfigChange(node.id, field.name, e.target.checked)}
                                                                />
                                                                <span className="toggle-slider"></span>
                                                            </label>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="template-modal-footer">
                    <button
                        className="btn-delete"
                        onClick={handleDelete}
                        disabled={deleting || saving}
                    >
                        {deleting ? 'Deleting...' : 'Delete Template'}
                    </button>
                    <div className="footer-actions">
                        <button className="btn-secondary" onClick={onClose}>Cancel</button>
                        <button
                            className="btn-primary"
                            onClick={handleSave}
                            disabled={saving || deleting}
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
