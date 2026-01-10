import React, { useState } from 'react';
import { useWorkflowContext } from '../context/WorkflowContext';
import { getNodeTypeConfig, type NodeExecutionConfig, type NodeType, type MockDataConfig } from '../types/nodes';
import './NodePropertiesPanel.css';

interface FormField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'number' | 'slider' | 'toggle' | 'file' | 'video' | 'audio' | 'image';
    options?: string[];
    dynamicOptions?: string;
    min?: number;
    max?: number;
    step?: number;
}

export const FORM_SCHEMAS: Record<NodeType, FormField[]> = {
    'upload_files': [
        { name: 'sourceType', label: 'Source Type', type: 'select', options: ['Local', 'URL', 'Cloud Storage'] },
        { name: 'assetType', label: 'Asset Type', type: 'select', options: ['Image', 'Video', 'Audio'] },
        { name: 'files', label: 'Files', type: 'file' }
    ],
    'text_to_text': [
        { name: 'prompt', label: 'Prompt', type: 'textarea' },
        { name: 'model', label: 'Model', type: 'select', options: ['gpt-4o', 'gpt-4o-mini', 'claude-3-opus', 'claude-3-sonnet'] },
        { name: 'systemPrompt', label: 'System Prompt', type: 'textarea' },
        { name: 'temperature', label: 'Temperature', type: 'slider', min: 0, max: 1, step: 0.1 }
    ],
    'text_to_image': [
        { name: 'prompt', label: 'Positive Prompt', type: 'textarea' },
        { name: 'negativePrompt', label: 'Negative Prompt', type: 'textarea' },
        { name: 'aspectRatio', label: 'Aspect Ratio', type: 'select', options: ['1:1', '16:9', '9:16', '4:3'] },
        { name: 'model', label: 'Model', type: 'select', options: ['fal-ai/flux/schnell', 'fal-ai/z-image/turbo', 'dall-e-3'] }
    ],
    'text_to_video': [
        { name: 'prompt', label: 'Prompt', type: 'textarea' },
        { name: 'duration', label: 'Duration', type: 'select', options: ['5 seconds', '10 seconds'] },
        { name: 'resolution', label: 'Resolution', type: 'select', options: ['720p', '1080p', '4K'] },
        { name: 'style', label: 'Style', type: 'select', options: ['Realistic', 'Cinematic', 'Anime', '3D Render'] },
        { name: 'model', label: 'Model', type: 'select', options: ['fal-ai/ltxv-13b-098-distilled', 'fal-ai/wan/v2.1/text-to-video'] }
    ],
    'text_to_music': [
        { name: 'prompt', label: 'Prompt', type: 'textarea' },
        { name: 'duration', label: 'Duration (sec)', type: 'number' },
        { name: 'tempo', label: 'Tempo (BPM)', type: 'number' }
    ],
    'text_to_speech': [
        { name: 'text', label: 'Text Content', type: 'textarea' },
        { name: 'language', label: 'Language', type: 'select', options: ['English', 'Hindi'] },
        { name: 'voice', label: 'Voice', type: 'select', options: [], dynamicOptions: 'model' },
        { name: 'model', label: 'Model', type: 'select', options: ['fal-ai/chatterbox/text-to-speech/turbo', 'fal-ai/playht/tts/v3', 'openai/tts-1', 'openai/gpt-4o-mini-tts'] },
        { name: 'stability', label: 'Stability', type: 'slider', min: 0, max: 1, step: 0.1 }
    ],
    'image_to_video': [
        { name: 'imageUrl', label: 'Source Image', type: 'image' },
        { name: 'prompt', label: 'Motion Prompt', type: 'textarea' },
        { name: 'model', label: 'Model', type: 'select', options: ['fal-ai/ltxv-13b-098-distilled/image-to-video', 'fal-ai/wan/v2.1/image-to-video'] },
        { name: 'motionBucket', label: 'Motion Bucket', type: 'number', min: 1, max: 255 },
        { name: 'duration', label: 'Duration', type: 'number' },
        { name: 'seed', label: 'Seed', type: 'number' }
    ],
    'image_to_image': [
        { name: 'imageUrl', label: 'Source Image', type: 'image' },
        { name: 'prompt', label: 'Prompt', type: 'textarea' },
        { name: 'strength', label: 'Strength', type: 'slider', min: 0, max: 1, step: 0.1 },
        { name: 'model', label: 'Model', type: 'select', options: ['fal-ai/stable-diffusion-v3-medium', 'openai/dall-e-2'] }
    ],
    'face_swap': [
        { name: 'targetImageUrl', label: 'Target Image', type: 'image' },
        { name: 'sourceImageUrl', label: 'Source Face', type: 'image' },
        { name: 'faceEnhance', label: 'Face Enhance', type: 'toggle' }
    ],
    'lip_sync': [
        { name: 'videoUrl', label: 'Video File', type: 'video' },
        { name: 'audioUrl', label: 'Audio File', type: 'audio' },
        { name: 'model', label: 'Model', type: 'select', options: ['SadTalker', 'HeyGen', 'SyncLabs'] }
    ],
    'ai_avatar': [
        { name: 'avatar', label: 'Avatar', type: 'select', options: ['Predefined 1', 'Predefined 2', 'Custom'] },
        { name: 'script', label: 'Script', type: 'textarea' },
        { name: 'background', label: 'Background', type: 'select', options: ['Transparent', 'Solid Color', 'Image'] }
    ],
    'enhancer': [
        { name: 'sourceUrl', label: 'Source File', type: 'file' },
        { name: 'upscaleFactor', label: 'Upscale Factor', type: 'select', options: ['1x', '2x', '4x'] },
        { name: 'denoiseStrength', label: 'Denoise Strength', type: 'slider', min: 0, max: 1, step: 0.1 }
    ],
    'split_text': [
        { name: 'text', label: 'Source', type: 'textarea' },
        { name: 'numSegments', label: 'Scenes', type: 'number' },
        { name: 'splitMode', label: 'Split Mode', type: 'select', options: ['text', 'array', 'json_path'] },
        { name: 'arrayPath', label: 'Array Path', type: 'text' }
    ],
    'image_object_removal': [
        { name: 'imageUrl', label: 'Source Image', type: 'image' },
        { name: 'description', label: 'Mask/Description', type: 'text' }
    ],
    'image_remove_background': [
        { name: 'imageUrl', label: 'Source Image', type: 'image' },
        { name: 'outputFormat', label: 'Output Format', type: 'select', options: ['PNG', 'JPG'] }
    ],
    'video_sound_effects': [
        { name: 'prompt', label: 'Prompt', type: 'textarea' },
        { name: 'duration', label: 'Duration (sec)', type: 'number' },
        { name: 'videoUrl', label: 'Sync to Video', type: 'video' }
    ],
    'edit_video': [
        { name: 'videoUrl', label: 'Source Video', type: 'video' },
        { name: 'startTime', label: 'Trim Start', type: 'text' },
        { name: 'endTime', label: 'Trim End', type: 'text' },
        { name: 'cropRatio', label: 'Crop Ratio', type: 'select', options: ['1:1', '16:9', '9:16'] },
        { name: 'filter', label: 'Filter', type: 'select', options: ['None', 'Grayscale', 'Sepia', 'High Contrast'] }
    ],
    'clip_merger': [
        { name: 'clips', label: 'Input Clips', type: 'text' }, // Simplified for now
        { name: 'transition', label: 'Transition', type: 'select', options: ['Cross-fade', 'Slide', 'Cut', 'Zoom'] },
        { name: 'bgmUrl', label: 'BGM Overlay', type: 'audio' }
    ]
};

const OUTPUT_KEYS: Record<string, string[]> = {
    'text_to_text': ['text'],
    'text_to_image': ['imageUrl'],
    'image_to_image': ['imageUrl'],
    'text_to_video': ['videoUrl'],
    'image_to_video': ['videoUrl'],
    'text_to_music': ['audioUrl'],
    'text_to_speech': ['audioUrl', 'text', 'originalText'],
    'split_text': ['segments', 'items'],
    'edit_video': ['videoUrl'],
    'clip_merger': ['videoUrl'],
    'upload_files': ['files'],
};

// Voice options based on TTS model
const VOICE_OPTIONS_BY_MODEL: Record<string, string[]> = {
    'fal-ai/chatterbox/text-to-speech/turbo': ['Default (auto-selected)'],
    'fal-ai/playht/tts/v3': ['Jennifer', 'Dexter', 'Scarlett', 'Brandon'],
    'openai/tts-1': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
    'openai/gpt-4o-mini-tts': ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
};

const DEFAULT_VOICE_OPTIONS = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];

type TabType = 'params' | 'config' | 'docs' | 'input' | 'output';

export const NodePropertiesPanel: React.FC = () => {
    const { workflow, selectedNodeId, updateNode, execution, runFromNode } = useWorkflowContext();
    const [activeTab, setActiveTab] = useState<TabType>('params');
    const [mockDataText, setMockDataText] = React.useState<string>('');
    const [mockDataError, setMockDataError] = React.useState<string | null>(null);
    const [inputPreviewIndex, setInputPreviewIndex] = useState(0);
    const [outputPreviewIndex, setOutputPreviewIndex] = useState(0);

    const selectedNode = workflow.nodes.find(n => n.id === selectedNodeId);

    // Reset mock data text and indices when selected node changes
    React.useEffect(() => {
        if (selectedNode?.mockData?.data != null) {
            setMockDataText(JSON.stringify(selectedNode.mockData.data, null, 2));
        } else {
            setMockDataText('');
        }
        setMockDataError(null);
        setInputPreviewIndex(0);
        setOutputPreviewIndex(0);
    }, [selectedNodeId]);

    if (!selectedNode) {
        return (
            <aside className="properties-panel empty">
                <div className="empty-state">
                    <span className="empty-icon">🖱️</span>
                    <p>Select a node to edit its properties</p>
                </div>
            </aside>
        );
    }

    const nodeIndex = workflow.nodes.findIndex(n => n.id === selectedNode.id);
    const previousNodes = workflow.nodes.slice(0, nodeIndex);

    const nodeConfig = getNodeTypeConfig(selectedNode.type);
    const fields = FORM_SCHEMAS[selectedNode.type] || [];
    const executionConfig: NodeExecutionConfig = selectedNode.execution || {
        mode: 'parallel',
        waitForAll: false,
        aggregateItems: false
    };

    const mockDataConfig: MockDataConfig = selectedNode.mockData || {
        enabled: false,
        data: null
    };

    const updateMockData = (updates: Partial<MockDataConfig>) => {
        updateNode(selectedNode.id, {
            mockData: {
                ...mockDataConfig,
                ...updates
            }
        });
    };

    const handleMockDataTextChange = (text: string) => {
        setMockDataText(text);
        if (!text.trim()) {
            setMockDataError(null);
            updateMockData({ data: null });
            return;
        }
        try {
            const parsed = JSON.parse(text);
            setMockDataError(null);
            updateMockData({ data: parsed });
        } catch (e) {
            setMockDataError('Invalid JSON');
        }
    };

    const arrayInputCount = (() => {
        const outputs = new Map<string, any>();
        execution.results.forEach(result => {
            const output = (result.data as any)?.output;
            if (output) {
                outputs.set(result.nodeId, output);
            }
        });

        const refs: Array<{ nodeId: string; outputKey: string }> = [];
        const collectReferences = (value: any) => {
            if (!value || typeof value !== 'object') return;
            if (Array.isArray(value)) {
                value.forEach(item => collectReferences(item));
                return;
            }
            if (value._type === 'reference' && value.nodeId && value.outputKey) {
                refs.push({ nodeId: value.nodeId, outputKey: value.outputKey });
                return;
            }
            Object.values(value).forEach(item => collectReferences(item));
        };

        collectReferences(selectedNode.config);

        let count: number | undefined;
        refs.forEach(ref => {
            const output = outputs.get(ref.nodeId);
            if (!output) return;
            const value = output[ref.outputKey];
            if (Array.isArray(value)) {
                count = count ?? value.length;
                return;
            }
            if (ref.outputKey === 'items') {
                if (Array.isArray(output.items)) {
                    count = count ?? output.items.length;
                } else if (typeof output.itemsCount === 'number') {
                    count = count ?? output.itemsCount;
                }
            }
        });

        return count;
    })();

    const handleFieldChange = (name: string, value: any) => {
        const nextConfig: Record<string, unknown> = {
            ...(selectedNode.config || {}),
            [name]: value
        };

        if (selectedNode.type === 'split_text' && name === 'splitMode') {
            if (value === 'json_path' && typeof nextConfig.arrayPath !== 'string') {
                nextConfig.arrayPath = '';
            }
        }

        if (selectedNode.type === 'split_text' && name === 'arrayPath' && typeof value !== 'string') {
            nextConfig.arrayPath = '';
        }

        updateNode(selectedNode.id, { config: nextConfig });
    };

    const updateExecution = (updates: Partial<NodeExecutionConfig>) => {
        updateNode(selectedNode.id, {
            execution: {
                ...executionConfig,
                ...updates
            }
        });
    };

    const toggleReference = (fieldName: string) => {
        const currentVal = (selectedNode.config as any)?.[fieldName];
        if (currentVal && typeof currentVal === 'object' && currentVal._type === 'reference') {
            handleFieldChange(fieldName, '');
        } else {
            handleFieldChange(fieldName, {
                _type: 'reference',
                nodeId: previousNodes[previousNodes.length - 1]?.id || '',
                outputKey: OUTPUT_KEYS[previousNodes[previousNodes.length - 1]?.type]?.[0] || ''
            });
        }
    };

    return (
        <aside className="properties-panel">
            <div className="panel-header">
                <div className="node-type-badge">
                    <span className="type-icon">{(selectedNode.config as any)?.customIcon || nodeConfig.icon}</span>
                    <span className="type-label">{nodeConfig.label}</span>
                </div>
                <h3>Node Configuration</h3>
            </div>

            <div className="panel-tabs">
                <button
                    className={`tab-btn ${activeTab === 'params' ? 'active' : ''}`}
                    onClick={() => setActiveTab('params')}
                >
                    Parameters
                </button>
                <button
                    className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`}
                    onClick={() => setActiveTab('input')}
                >
                    Input
                </button>
                <button
                    className={`tab-btn ${activeTab === 'output' ? 'active' : ''}`}
                    onClick={() => setActiveTab('output')}
                >
                    Output
                </button>
            </div>

            <div className="panel-content">
                {activeTab === 'input' && (
                    <div className="input-tab">
                        <h4>Node Input</h4>
                        <p className="tab-description">
                            View and configure the input data for this node.
                        </p>
                        <div className="input-info">
                            <div className="info-row">
                                <span className="info-label">Node ID:</span>
                                <span className="info-value">{selectedNode.id}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">Type:</span>
                                <span className="info-value">{selectedNode.type}</span>
                            </div>
                        </div>
                        <div className="input-preview">
                            <label>Input Configuration</label>
                            <pre className="json-preview">
                                {JSON.stringify(selectedNode.config || {}, null, 2)}
                            </pre>
                        </div>

                        {/* Show resolved input data from previous nodes */}
                        {(() => {
                            // Find references in config and resolve them from execution results
                            const resolvedInputs: Record<string, unknown> = {};
                            const config = selectedNode.config || {};

                            for (const [key, value] of Object.entries(config)) {
                                if (value && typeof value === 'object' && '_type' in value && (value as Record<string, unknown>)._type === 'reference') {
                                    const ref = value as unknown as { nodeId: string; outputKey: string };
                                    const sourceResult = execution.results.find(r => r.nodeId === ref.nodeId);
                                    if (sourceResult?.data) {
                                        const output = (sourceResult.data as { output?: Record<string, unknown> })?.output;
                                        if (output && ref.outputKey in output) {
                                            resolvedInputs[key] = output[ref.outputKey];
                                        }
                                    }
                                }
                            }

                            if (Object.keys(resolvedInputs).length > 0) {
                                // Check if any input is an array (parallel execution input)
                                const arrayInputKey = Object.keys(resolvedInputs).find(key => Array.isArray(resolvedInputs[key]));
                                const isArrayInput = !!arrayInputKey;
                                const arrayLength = isArrayInput ? (resolvedInputs[arrayInputKey] as unknown[]).length : 0;

                                const displayedInputs = isArrayInput
                                    ? Object.fromEntries(
                                        Object.entries(resolvedInputs).map(([k, v]) => [
                                            k,
                                            Array.isArray(v) && v.length === arrayLength ? v[inputPreviewIndex] : v
                                        ])
                                    )
                                    : resolvedInputs;

                                return (
                                    <div className="input-preview received-input">
                                        <div className="preview-header">
                                            <label>📥 Received Input Data</label>

                                            {isArrayInput && arrayLength > 1 && (
                                                <div className="array-navigation">
                                                    <button
                                                        className="nav-btn"
                                                        disabled={inputPreviewIndex === 0}
                                                        onClick={() => setInputPreviewIndex(prev => Math.max(0, prev - 1))}
                                                    >
                                                        &lt;
                                                    </button>
                                                    <span className="nav-counter">
                                                        {inputPreviewIndex + 1} / {arrayLength}
                                                    </span>
                                                    <button
                                                        className="nav-btn"
                                                        disabled={inputPreviewIndex === arrayLength - 1}
                                                        onClick={() => setInputPreviewIndex(prev => Math.min(arrayLength - 1, prev + 1))}
                                                    >
                                                        &gt;
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <pre className="json-preview">
                                            {JSON.stringify(displayedInputs, null, 2)}
                                        </pre>
                                    </div>
                                );
                            }
                            return null;
                        })()}

                        <button
                            className="btn-run-from-node"
                            onClick={() => runFromNode(selectedNode.id)}
                            disabled={execution.isRunning}
                        >
                            {execution.isRunning ? '⏳ Running...' : '▶️ Run from this node'}
                        </button>
                    </div>
                )}

                {activeTab === 'output' && (
                    <div className="output-tab">
                        <h4>Node Output</h4>
                        <p className="tab-description">
                            View the output data from this node's execution.
                        </p>
                        {(() => {
                            const result = execution.results.find(r => r.nodeId === selectedNode.id);

                            if (!result) {
                                return (
                                    <div className="empty-output">
                                        <span className="empty-icon">📭</span>
                                        <p>No output yet. Run the workflow to see results.</p>
                                    </div>
                                );
                            }

                            if (result.error) {
                                return (
                                    <div className="error-state">
                                        <p className="error-title">Execution Failed</p>
                                        <p className="error-message">{result.error}</p>
                                    </div>
                                );
                            }

                            // Handle parallel execution output
                            let finalOutput = (result.data as any)?.output;
                            let isArrayOutput = false;
                            let arrayLength = 0;

                            if (finalOutput && !Array.isArray(finalOutput) && typeof finalOutput === 'object') {
                                // Check for array properties in output
                                const outputKeys = Object.keys(finalOutput);
                                const arrayKey = outputKeys.find(key => Array.isArray((finalOutput as Record<string, unknown>)[key]));

                                if (arrayKey) {
                                    isArrayOutput = true;
                                    arrayLength = ((finalOutput as Record<string, unknown>)[arrayKey] as unknown[]).length;
                                }
                            }

                            const displayedOutput = isArrayOutput && finalOutput
                                ? Object.fromEntries(
                                    Object.entries(finalOutput).map(([k, v]) => [
                                        k,
                                        Array.isArray(v) && v.length > 0 && v.length === arrayLength ? v[outputPreviewIndex] : v
                                    ])
                                )
                                : result.data || {};

                            return (
                                <div className="output-preview">
                                    <div className="info-row">
                                        <span className="info-label">Status:</span>
                                        <span className={`info-value status-${result.success ? 'success' : 'error'}`}>
                                            {result.success ? 'Success' : 'Error'}
                                        </span>
                                    </div>

                                    <div className="preview-header">
                                        <label>Output Data</label>
                                        {isArrayOutput && arrayLength > 1 && (
                                            <div className="array-navigation">
                                                <button
                                                    className="nav-btn"
                                                    disabled={outputPreviewIndex === 0}
                                                    onClick={() => setOutputPreviewIndex(prev => Math.max(0, prev - 1))}
                                                >
                                                    &lt;
                                                </button>
                                                <span className="nav-counter">
                                                    {outputPreviewIndex + 1} / {arrayLength}
                                                </span>
                                                <button
                                                    className="nav-btn"
                                                    disabled={outputPreviewIndex === arrayLength - 1}
                                                    onClick={() => setOutputPreviewIndex(prev => Math.min(arrayLength - 1, prev + 1))}
                                                >
                                                    &gt;
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <pre className="json-preview">
                                        {JSON.stringify(displayedOutput, null, 2)}
                                    </pre>
                                </div>
                            );
                        })()}
                    </div>
                )}

                {activeTab === 'params' && (<>
                    <div className="form-group title-group">
                        <label>Display Title</label>
                        <input
                            type="text"
                            value={selectedNode.title}
                            onChange={(e) => updateNode(selectedNode.id, { title: e.target.value })}
                        />
                    </div>

                    <div className="section-title">Execution</div>
                    <div className="form-group toggle-group">
                        <span className="toggle-label">Run items in parallel</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={executionConfig.mode === 'parallel'}
                                onChange={(e) => updateExecution({ mode: e.target.checked ? 'parallel' : 'sequential' })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    <div className="form-group toggle-group">
                        <span className="toggle-label">Wait for all previous items</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={executionConfig.waitForAll}
                                onChange={(e) => updateExecution({ waitForAll: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    {executionConfig.waitForAll && (
                        <div className="form-group toggle-group">
                            <span className="toggle-label">Aggregate items into one request</span>
                            <label className="toggle-switch">
                                <input
                                    type="checkbox"
                                    checked={executionConfig.aggregateItems}
                                    onChange={(e) => updateExecution({ aggregateItems: e.target.checked })}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                    )}
                    {typeof arrayInputCount === 'number' && (
                        <div className="execution-hint">
                            Array input detected ({arrayInputCount} items)
                        </div>
                    )}

                    <div className="section-title">Mock Data (Debug)</div>
                    <div className="form-group toggle-group">
                        <span className="toggle-label">Use mock input data</span>
                        <label className="toggle-switch">
                            <input
                                type="checkbox"
                                checked={mockDataConfig.enabled}
                                onChange={(e) => updateMockData({ enabled: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                    {mockDataConfig.enabled && (
                        <div className="form-group">
                            <label>
                                Mock JSON Input
                                {mockDataError && <span className="error-hint"> ⚠️ {mockDataError}</span>}
                            </label>
                            <textarea
                                value={mockDataText}
                                onChange={(e) => handleMockDataTextChange(e.target.value)}
                                placeholder={'{"text": "Your mock data here..."}\nor\n[{"text": "item1"}, {"text": "item2"}]'}
                                className={mockDataError ? 'has-error' : ''}
                                style={{ minHeight: '120px', fontFamily: 'monospace', fontSize: '12px' }}
                            />
                            <div className="execution-hint">
                                Single object for one run, or array for parallel runs
                            </div>
                            {mockDataConfig.enabled && mockDataConfig.data != null && !mockDataError && (
                                <button
                                    className="btn-continue-from-node"
                                    onClick={() => runFromNode(selectedNode.id)}
                                    disabled={execution.isRunning}
                                >
                                    {execution.isRunning ? '⏳ Running...' : '▶️ Continue from here'}
                                </button>
                            )}
                        </div>
                    )}

                    {fields.map(field => {
                        if (selectedNode.type === 'split_text' && field.name === 'arrayPath') {
                            const splitMode = ((selectedNode.config as any)?.splitMode || 'text').toString().toLowerCase();
                            if (!splitMode.includes('json')) {
                                return null;
                            }
                        }
                        const fieldValue = (selectedNode.config as any)?.[field.name];
                        const isReference = fieldValue && typeof fieldValue === 'object' && fieldValue._type === 'reference';
                        const canBeReference = ['text', 'textarea', 'image', 'video', 'audio', 'file'].includes(field.type)
                            && !(selectedNode.type === 'split_text' && field.name === 'arrayPath');

                        const fieldNode = (
                            <div key={field.name} className="form-group">
                                <label>
                                    {field.label}
                                    {canBeReference && previousNodes.length > 0 && (
                                        <div className="reference-controls">
                                            <button
                                                className={`btn-link-node ${isReference ? 'active' : ''}`}
                                                onClick={() => toggleReference(field.name)}
                                                title="Link to previous node output"
                                            >
                                                🔗 {isReference ? 'Linked' : 'Link'}
                                            </button>
                                        </div>
                                    )}
                                </label>

                                {isReference ? (
                                    <div className="reference-selector">
                                        <select
                                            value={fieldValue.nodeId}
                                            onChange={(e) => handleFieldChange(field.name, { ...fieldValue, nodeId: e.target.value })}
                                        >
                                            {previousNodes.map(node => (
                                                <option key={node.id} value={node.id}>{node.title}</option>
                                            ))}
                                        </select>
                                        <select
                                            value={fieldValue.outputKey}
                                            onChange={(e) => handleFieldChange(field.name, { ...fieldValue, outputKey: e.target.value })}
                                        >
                                            {(() => {
                                                const keys = OUTPUT_KEYS[workflow.nodes.find(n => n.id === fieldValue.nodeId)?.type || ''] || [];
                                                const withItems = keys.includes('items') ? keys : [...keys, 'items'];
                                                return withItems.map(key => (
                                                    <option key={key} value={key}>{key}</option>
                                                ));
                                            })() || <option value="">No outputs</option>}
                                        </select>
                                    </div>
                                ) : (
                                    <>
                                        {field.type === 'textarea' && (
                                            <textarea
                                                value={fieldValue || ''}
                                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                            />
                                        )}
                                        {field.type === 'text' && (
                                            <input
                                                type="text"
                                                value={field.name === 'arrayPath' ? (typeof fieldValue === 'string' ? fieldValue : '') : (fieldValue || '')}
                                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                                placeholder={field.name === 'arrayPath' ? 'response.body.Items' : `Enter ${field.label.toLowerCase()}...`}
                                            />
                                        )}
                                        {field.type === 'number' && (
                                            <input
                                                type="number"
                                                value={fieldValue || ''}
                                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                                min={field.min}
                                                max={field.max}
                                            />
                                        )}
                                        {field.type === 'select' && (
                                            <select
                                                value={fieldValue || (
                                                    field.dynamicOptions
                                                        ? (VOICE_OPTIONS_BY_MODEL[(selectedNode.config as any)?.[field.dynamicOptions]] || DEFAULT_VOICE_OPTIONS)[0]
                                                        : field.options?.[0]
                                                )}
                                                onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                            >
                                                {(field.dynamicOptions
                                                    ? (VOICE_OPTIONS_BY_MODEL[(selectedNode.config as any)?.[field.dynamicOptions]] || DEFAULT_VOICE_OPTIONS)
                                                    : (field.options || [])
                                                ).map(opt => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        )}
                                        {field.type === 'slider' && (
                                            <div className="slider-container">
                                                <input
                                                    type="range"
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step}
                                                    value={fieldValue || field.min}
                                                    onChange={(e) => handleFieldChange(field.name, parseFloat(e.target.value))}
                                                />
                                                <span className="slider-value">{fieldValue || field.min}</span>
                                            </div>
                                        )}
                                        {field.type === 'toggle' && (
                                            <label className="toggle-switch">
                                                <input
                                                    type="checkbox"
                                                    checked={fieldValue || false}
                                                    onChange={(e) => handleFieldChange(field.name, e.target.checked)}
                                                />
                                                <span className="slider round"></span>
                                            </label>
                                        )}
                                        {(field.type === 'file' || field.type === 'image' || field.type === 'video' || field.type === 'audio') && (
                                            <div className="file-input-container">
                                                <input
                                                    type="text"
                                                    value={fieldValue || ''}
                                                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                                    placeholder="Paste URL or upload..."
                                                />
                                                <button className="btn-secondary small">Upload</button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );

                        if (field.name !== 'prompt') {
                            return fieldNode;
                        }

                        const concatPromptsEnabled = Boolean((selectedNode.config as any)?.concatPrompts);
                        const extraPrompts: FormField[] = [
                            { name: 'prompt2', label: 'Prompt 2', type: 'textarea' },
                            { name: 'prompt3', label: 'Prompt 3', type: 'textarea' },
                            { name: 'prompt4', label: 'Prompt 4', type: 'textarea' }
                        ];

                        return (
                            <React.Fragment key={`${field.name}-extra`}>
                                {fieldNode}
                                <div className="form-group toggle-group">
                                    <span className="toggle-label">Concat more prompts</span>
                                    <label className="toggle-switch">
                                        <input
                                            type="checkbox"
                                            checked={concatPromptsEnabled}
                                            onChange={(e) => handleFieldChange('concatPrompts', e.target.checked)}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                                {concatPromptsEnabled && extraPrompts.map(extraField => {
                                    const extraValue = (selectedNode.config as any)?.[extraField.name];
                                    const extraIsReference = extraValue && typeof extraValue === 'object' && extraValue._type === 'reference';
                                    const extraCanBeReference = true;

                                    return (
                                        <div key={extraField.name} className="form-group">
                                            <label>
                                                {extraField.label}
                                                {extraCanBeReference && previousNodes.length > 0 && (
                                                    <div className="reference-controls">
                                                        <button
                                                            className={`btn-link-node ${extraIsReference ? 'active' : ''}`}
                                                            onClick={() => toggleReference(extraField.name)}
                                                            title="Link to previous node output"
                                                        >
                                                            🔗 {extraIsReference ? 'Linked' : 'Link'}
                                                        </button>
                                                    </div>
                                                )}
                                            </label>
                                            {extraIsReference ? (
                                                <div className="reference-selector">
                                                    <select
                                                        value={extraValue.nodeId}
                                                        onChange={(e) => handleFieldChange(extraField.name, { ...extraValue, nodeId: e.target.value })}
                                                    >
                                                        {previousNodes.map(node => (
                                                            <option key={node.id} value={node.id}>{node.title}</option>
                                                        ))}
                                                    </select>
                                                    <select
                                                        value={extraValue.outputKey}
                                                        onChange={(e) => handleFieldChange(extraField.name, { ...extraValue, outputKey: e.target.value })}
                                                    >
                                                        {(() => {
                                                            const keys = OUTPUT_KEYS[workflow.nodes.find(n => n.id === extraValue.nodeId)?.type || ''] || [];
                                                            const withItems = keys.includes('items') ? keys : [...keys, 'items'];
                                                            return withItems.map(key => (
                                                                <option key={key} value={key}>{key}</option>
                                                            ));
                                                        })() || <option value="">No outputs</option>}
                                                    </select>
                                                </div>
                                            ) : (
                                                <textarea
                                                    value={extraValue || ''}
                                                    onChange={(e) => handleFieldChange(extraField.name, e.target.value)}
                                                    placeholder={`Enter ${extraField.label.toLowerCase()}...`}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </>)}
            </div>

            <div className="panel-footer">
                <div className="node-stats">
                    <div className="stat">
                        <span className="stat-label">Provider:</span>
                        <span className="stat-value">{selectedNode.provider}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Estimated Time:</span>
                        <span className="stat-value">{selectedNode.estimatedTime}</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};
