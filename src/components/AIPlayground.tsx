import React, { useState, useEffect } from 'react';
import { FORM_SCHEMAS } from '../components/NodePropertiesPanel';
import { NODE_TYPES, type NodeType, createNode } from '../types/nodes';
import './AIPlayground.css';

// Reuse the OutputKeys from NodePropertiesPanel if possible, or redefine locally for now to be safe
// const OUTPUT_KEYS: Record<string, string[]> = {
//     'text_to_text': ['text'],
//     'text_to_image': ['imageUrl'],
//     'image_to_image': ['imageUrl'],
//     'text_to_video': ['videoUrl'],
//     'image_to_video': ['videoUrl'],
//     'text_to_music': ['audioUrl'],
//     'text_to_speech': ['audioUrl', 'text'],
//     'split_text': ['segments'],
//     'edit_video': ['videoUrl'],
//     'clip_merger': ['videoUrl'],
//     'upload_files': ['files'],
// };

export const AIPlayground: React.FC = () => {
    const [selectedNodeType, setSelectedNodeType] = useState<NodeType>('text_to_text');
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isExecuting, setIsExecuting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Filter to only "generation" or interesting nodes for the playground
    const playgroundNodes = NODE_TYPES.filter(n =>
        ['generation', 'processing'].includes(n.category) &&
        n.type !== 'upload_files' // Maybe keep upload files for utility?
    );

    const activeSchema = FORM_SCHEMAS[selectedNodeType] || [];

    useEffect(() => {
        // Reset form when node type changes
        const newFormData: Record<string, any> = {};
        // Set defaults if possible, e.g. first option for selects
        if (activeSchema) {
            activeSchema.forEach(field => {
                if (field.type === 'select' && field.options && field.options.length > 0) {
                    newFormData[field.name] = field.options[0];
                }
            });
        }
        setFormData(newFormData);
        setResult(null);
        setError(null);
    }, [selectedNodeType]);

    const handleFieldChange = (name: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, fieldName: string) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
            const response = await fetch(`${BACKEND_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                let errorMsg = 'Upload failed';
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    const text = await response.text();
                    if (text) errorMsg = text;
                }
                throw new Error(errorMsg);
            }

            const data = await response.json();
            handleFieldChange(fieldName, data.url);
        } catch (err) {
            console.error('Upload error:', err);
            setError('Failed to upload file');
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    const handleExecute = async () => {
        setIsExecuting(true);
        setError(null);
        setResult(null);

        try {
            // Create a temporary single-node workflow
            const tempNode = createNode(selectedNodeType);
            tempNode.config = formData;

            // We can't easily use the full 'runWorkflow' because it expects the global workflow state.
            // However, we can use the backend execution endpoint directly if we had access to the API client.
            // Since `runWorkflow` in context is tied to the canvas state, we might need a direct `executeNode` helper.
            // For now, let's try to construct a minimal workflow object and send it.

            // HACK: We need to access the API directly.
            // Ideally, we'd add 'executeSingleNode' to the context, but let's try fetch for now to avoid large refactors 
            // of the context just for this.

            const workflowId = `playground-${Date.now()}`;
            const payload = {
                workflowId,
                nodes: [tempNode],
                executionMode: 'sequential'
            };

            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
            const response = await fetch(`${BACKEND_URL}/workflow/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Execution failed: ${errText}`);
            }

            const data = await response.json();

            // The response from /execute is usually an Ack with executionId. 
            // We need to poll or wait for the result.
            let status = 'running';
            let finalResult = null;
            let attempts = 0;
            const executionId = data.workflowId || data.executionId || workflowId;

            while (status === 'running' && attempts < 300) { // 5 minutes timeout
                await new Promise(r => setTimeout(r, 1000));

                try {
                    const statusRes = await fetch(`${BACKEND_URL}/workflow/${executionId}/results`);
                    if (statusRes.ok) {
                        const statusData = await statusRes.json();

                        if (statusData.status === 'completed' || statusData.status === 'COMPLETED') {
                            status = 'completed';
                            // Find our node result
                            const nodeRes = statusData.results.find((r: any) =>
                                r.nodeId === tempNode.id ||
                                r.nodeId.includes(tempNode.id) ||
                                (r.nodeType === selectedNodeType && r.success)
                            );

                            if (nodeRes && nodeRes.data && nodeRes.data.output) {
                                finalResult = nodeRes.data.output;
                            } else if (statusData.results.length > 0) {
                                const lastRes = statusData.results.filter((r: any) => r.success).pop();
                                if (lastRes && lastRes.data) finalResult = lastRes.data.output;
                            }
                        } else if (statusData.status === 'failed' || statusData.status === 'FAILED' || statusData.status === 'terminated') {
                            status = 'error';
                            const failedNode = statusData.results.find((r: any) => !r.success);
                            throw new Error(failedNode?.error || 'Workflow failed');
                        }
                    }
                } catch (e) {
                    if (status === 'error') throw e;
                    console.warn('Polling error:', e);
                }
                attempts++;
            }

            if (status === 'running') throw new Error('Execution timed out');

            setResult(finalResult);

        } catch (err: any) {
            setError(err.message || 'Something went wrong');
        } finally {
            setIsExecuting(false);
        }
    };

    const renderResult = () => {
        if (error) return (
            <div className="error-message">
                <h3>Error</h3>
                <p>{error}</p>
            </div>
        );

        if (!result) return <div className="result-placeholder">Run the model to see results</div>;

        // Try to guess content based on node type
        // Use OUTPUT_KEYS to find the right property
        // const keys = OUTPUT_KEYS[selectedNodeType] || ['output'];
        let contentUrl = '';
        let contentText = '';

        // Check specifically for known keys
        if (result.videoUrl) contentUrl = result.videoUrl;
        else if (result.imageUrl) contentUrl = result.imageUrl;
        else if (result.audioUrl) contentUrl = result.audioUrl;

        if (result.text) contentText = result.text;

        // Handle split_text output structure
        if (selectedNodeType === 'split_text' && result.segments) {
            return (
                <div className="text-viewer">
                    {JSON.stringify(result.segments, null, 2)}
                </div>
            );
        }

        // Render based on node type
        if (selectedNodeType.includes('video') || selectedNodeType === 'edit_video') {
            return (
                <div className="media-viewer">
                    <video src={contentUrl} controls autoPlay loop />
                </div>
            );
        }

        if (selectedNodeType.includes('image') || selectedNodeType === 'face_swap') {
            return (
                <div className="media-viewer">
                    <img src={contentUrl} alt="Generated Result" />
                </div>
            );
        }

        if (selectedNodeType.includes('speech') || selectedNodeType.includes('music')) {
            return (
                <div className="audio-viewer">
                    <span style={{ fontSize: '48px' }}>🎵</span>
                    <audio src={contentUrl} controls autoPlay />
                    {contentText && <div className="text-viewer">{contentText}</div>}
                </div>
            );
        }

        if (selectedNodeType === 'text_to_text' || contentText) {
            return (
                <div className="text-viewer">
                    {contentText || JSON.stringify(result, null, 2)}
                </div>
            );
        }

        return (
            <div className="text-viewer">
                <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
        );
    };

    return (
        <div className="ai-playground-container">
            <div className="playground-config-panel">
                <div className="playground-header">
                    <h2>AI Playground</h2>
                    <p className="subtitle">Execute models directly</p>
                </div>

                <div className="config-section">
                    <label>Capability</label>
                    <select
                        className="playground-select"
                        value={selectedNodeType}
                        onChange={(e) => setSelectedNodeType(e.target.value as NodeType)}
                    >
                        {playgroundNodes.map(node => (
                            <option key={node.type} value={node.type}>{node.label}</option>
                        ))}
                    </select>
                </div>

                <div className="config-form">
                    {activeSchema.map(field => (
                        <div key={field.name} className="config-section">
                            <label>{field.label}</label>

                            {field.type === 'select' && (
                                <select
                                    className="playground-select"
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                >
                                    {(field.options || []).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            )}

                            {(field.type === 'text' || field.type === 'number' || field.type === 'file' || field.type === 'image') && (
                                <div className="input-group">
                                    <input
                                        type={field.type === 'number' ? 'number' : 'text'}
                                        className="playground-input"
                                        value={formData[field.name] || ''}
                                        onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                        placeholder={field.type === 'image' ? 'Paste Image URL or Upload...' : ''}
                                    />
                                    {(field.type === 'image' || field.type === 'file') && (
                                        <div className="file-upload-wrapper">
                                            <input
                                                type="file"
                                                id={`file-${field.name}`}
                                                className="file-input-hidden"
                                                onChange={(e) => handleFileUpload(e, field.name)}
                                                accept={field.type === 'image' ? "image/*" : "*/*"}
                                            />
                                            <label htmlFor={`file-${field.name}`} className="upload-button-label">
                                                {isUploading ? (
                                                    <svg className="upload-spinner" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                                                    </svg>
                                                ) : (
                                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                                        <polyline points="17 8 12 3 7 8" />
                                                        <line x1="12" y1="3" x2="12" y2="15" />
                                                    </svg>
                                                )}
                                            </label>
                                        </div>
                                    )}
                                </div>
                            )}

                            {field.type === 'textarea' && (
                                <textarea
                                    className="playground-textarea"
                                    value={formData[field.name] || ''}
                                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                />
                            )}

                            {field.type === 'slider' && (
                                <div className="range-container">
                                    <input
                                        type="range"
                                        min={field.min}
                                        max={field.max}
                                        step={field.step}
                                        value={formData[field.name] || field.min}
                                        onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value))}
                                        style={{ width: '100%' }}
                                    />
                                    <span>{formData[field.name] || field.min}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    className="run-button"
                    onClick={handleExecute}
                    disabled={isExecuting}
                >
                    {isExecuting ? (
                        <>
                            <span className="spinner">↻</span> Generating...
                        </>
                    ) : (
                        <>
                            ⚡ Run Model
                        </>
                    )}
                </button>
            </div>

            <div className="playground-results-panel">
                <div className="result-container">
                    {isExecuting ? (
                        <div className="result-placeholder">
                            <div className="loader"></div>
                            <p>Waiting for response...</p>
                        </div>
                    ) : renderResult()}
                </div>
            </div>
        </div>
    );
};
