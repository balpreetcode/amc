import React, { useState, useEffect } from 'react';
import { useWorkflowContext } from '../context/WorkflowContext';
import { useAuth } from '../context/AuthContext';
import { FileBrowserModal } from './FileBrowserModal';
import { getNodeTypeConfig, getProviderFromModel, getModelDisplayName, type NodeExecutionConfig, type NodeType, type MockDataConfig } from '../types/nodes';
import { JsonTree } from './JsonTree';
import { OutputMappingEditor } from './OutputMappingEditor';
import { FilteredReferenceEditor } from './FilteredReferenceEditor';
import './NodePropertiesPanel.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

interface ComposioAccount {
    id: string;
    toolkit: string;
    status: string;
    accountName?: string;
}

interface FormField {
    name: string;
    label: string;
    type: 'text' | 'textarea' | 'select' | 'number' | 'slider' | 'toggle' | 'file' | 'video' | 'audio' | 'image' | 'images' | 'color';
    options?: string[];
    dynamicOptions?: string;
    min?: number;
    max?: number;
    step?: number;
    default?: string | number;
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
        { name: 'tempo', label: 'Tempo (BPM)', type: 'number' },
        { name: 'model', label: 'Model', type: 'select', options: ['fal-ai/stable-audio', 'fal-ai/minimax/music-01'] }
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
        { name: 'motionBucket', label: 'Motion Intensity', type: 'number', min: 1, max: 255 },
        { name: 'duration', label: 'Duration', type: 'number' },
        { name: 'seed', label: 'Seed', type: 'number' }
    ],
    'image_to_image': [
        { name: 'model', label: 'Model', type: 'select', options: ['fal-ai/gpt-image-1.5/edit', 'fal-ai/stable-diffusion-v3-medium', 'openai/dall-e-2'] },
        { name: 'imageUrl', label: 'Source Image', type: 'image' },
        { name: 'imageUrls', label: 'Source Images', type: 'images' },
        { name: 'prompt', label: 'Prompt', type: 'textarea' },
        { name: 'strength', label: 'Strength', type: 'slider', min: 0, max: 1, step: 0.1 },
        { name: 'imageSize', label: 'Image Size', type: 'select', options: ['1024x1024', '1536x1024', '1024x1536', '512x512'] },
        { name: 'quality', label: 'Quality', type: 'select', options: ['low', 'medium', 'high'] },
        { name: 'inputFidelity', label: 'Input Fidelity', type: 'select', options: ['high', 'low'] }
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
        { name: 'splitMode', label: 'Split Method', type: 'select', options: ['Text', 'Array', 'JSON Path'] },
        { name: 'arrayPath', label: 'JSON Path', type: 'text' }
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
        { name: 'filter', label: 'Filter', type: 'select', options: ['None', 'Grayscale', 'Sepia', 'High Contrast'] },
        { name: 'enableAutoSubtitles', label: '🎬 Auto-Generate Subtitles from Audio', type: 'toggle' },
        { name: 'subtitleLanguage', label: 'Subtitle Language (leave empty for auto-detect)', type: 'select', options: ['', 'en', 'hi', 'es', 'fr', 'de', 'ja', 'ko', 'zh'] },
        { name: 'subtitlePosition', label: 'Subtitle Position', type: 'select', options: ['bottom', 'center', 'top'] },
        { name: 'subtitleColor', label: 'Subtitle Color', type: 'color', default: '#ffffff' },
        { name: 'subtitleSize', label: 'Subtitle Size', type: 'number', default: 24 }
    ],
    'clip_merger': [
        { name: 'clips', label: 'Input Clips', type: 'text' }, // Simplified for now
        { name: 'transition', label: 'Transition', type: 'select', options: ['Cross-fade', 'Slide', 'Cut', 'Zoom'] },
        { name: 'bgmUrl', label: 'BGM Overlay', type: 'audio' }
    ],
    'media_ingest': [
        { name: 'mode', label: 'Mode', type: 'select', options: ['Import', 'Export'] },
        // Import mode fields
        { name: 'sourceType', label: 'Import From', type: 'select', options: ['Local Upload', 'Direct Link', 'Google Drive', 'Dropbox', 'S3'] },
        { name: 'url', label: 'URL / Link', type: 'text' },
        { name: 'files', label: 'Upload Files', type: 'file' },
        { name: 'connectionMode', label: 'Connection Mode', type: 'select', options: ['Public Link', 'Connect Account'] },
        // Export mode fields
        { name: 'exportDestination', label: 'Export To', type: 'select', options: ['Google Drive', 'Dropbox', 'S3'] },
        { name: 'exportFolderPath', label: 'Destination Folder', type: 'text' },
        { name: 'exportFileName', label: 'File Name (optional)', type: 'text' }
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
    'media_ingest': ['url', 'files'],
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
    const { userId, isLoggedIn } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('params');
    const [mockDataText, setMockDataText] = React.useState<string>('');
    const [mockDataError, setMockDataError] = React.useState<string | null>(null);
    const [inputPreviewIndex, setInputPreviewIndex] = useState(0);
    const [outputPreviewIndex, setOutputPreviewIndex] = useState(0);
    const [outputViewMode, setOutputViewMode] = useState<'raw' | 'tree'>('raw');
    const [copyFeedback, setCopyFeedback] = useState(false);

    // Composio OAuth state
    const [composioAccounts, setComposioAccounts] = useState<ComposioAccount[]>([]);
    const [composioLoading, setComposioLoading] = useState(false);
    const [oauthConnecting, setOauthConnecting] = useState(false);
    const [fileBrowserOpen, setFileBrowserOpen] = useState(false);

    // File upload state - must be at top level before any early returns
    const [uploadingField, setUploadingField] = useState<string | null>(null);

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

    // Fetch Composio connected accounts for media_ingest nodes
    useEffect(() => {
        if (!selectedNode || selectedNode.type !== 'media_ingest') return;
        if (!userId || !isLoggedIn) return;

        const mode = (selectedNode.config as any)?.mode || 'Import';
        const sourceType = (selectedNode.config as any)?.sourceType;
        const exportDestination = (selectedNode.config as any)?.exportDestination;

        // Determine which toolkit to fetch accounts for
        let targetProvider: string | null = null;
        if (mode === 'Import' && ['Google Drive', 'Dropbox'].includes(sourceType)) {
            targetProvider = sourceType;
        } else if (mode === 'Export' && ['Google Drive', 'Dropbox'].includes(exportDestination)) {
            targetProvider = exportDestination;
        }

        if (!targetProvider) return;

        const toolkit = targetProvider === 'Google Drive' ? 'GOOGLEDRIVE' : 'DROPBOX';

        const fetchAccounts = async () => {
            setComposioLoading(true);
            try {
                const response = await fetch(`${BACKEND_URL}/composio/accounts/${userId}?toolkit=${toolkit}`);
                const data = await response.json();
                if (data.accounts) {
                    setComposioAccounts(data.accounts);
                }
            } catch (error) {
                console.error('[Composio] Failed to fetch accounts:', error);
            } finally {
                setComposioLoading(false);
            }
        };

        fetchAccounts();

        // Listen for OAuth completion messages
        const handleMessage = (event: MessageEvent) => {
            if (event.data?.type === 'COMPOSIO_OAUTH_COMPLETE') {
                setOauthConnecting(false);
                if (event.data.success) {
                    fetchAccounts(); // Refresh accounts list
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [selectedNode?.type, (selectedNode?.config as any)?.mode, (selectedNode?.config as any)?.sourceType, (selectedNode?.config as any)?.exportDestination, userId, isLoggedIn]);

    // Function to initiate OAuth connection
    const initiateOAuthConnection = async (sourceType: string) => {
        if (!userId) {
            alert('Please log in to connect your account.');
            return;
        }

        const toolkit = sourceType === 'Google Drive' ? 'GOOGLEDRIVE' : 'DROPBOX';
        setOauthConnecting(true);

        try {
            const response = await fetch(`${BACKEND_URL}/composio/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ toolkit })
            });

            const data = await response.json();

            if (data.redirectUrl) {
                // Open OAuth in a popup window
                const width = 600;
                const height = 700;
                const left = window.screenX + (window.outerWidth - width) / 2;
                const top = window.screenY + (window.outerHeight - height) / 2;
                window.open(
                    data.redirectUrl,
                    'composio_oauth',
                    `width=${width},height=${height},left=${left},top=${top},popup=1`
                );
            } else {
                throw new Error(data.error || 'Failed to get OAuth URL');
            }
        } catch (error: any) {
            console.error('[Composio] OAuth initiation failed:', error);
            alert(`Failed to connect: ${error.message}`);
            setOauthConnecting(false);
        }
    };

    // Function to disconnect an account
    const disconnectAccount = async (connectionId: string) => {
        try {
            await fetch(`${BACKEND_URL}/composio/accounts/${connectionId}`, {
                method: 'DELETE'
            });
            setComposioAccounts(prev => prev.filter(a => a.id !== connectionId));
        } catch (error) {
            console.error('[Composio] Disconnect failed:', error);
        }
    };

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
            // Handle both display value 'JSON Path' and legacy 'json_path'
            const isJsonPath = String(value).toLowerCase().includes('json');
            if (isJsonPath && typeof nextConfig.arrayPath !== 'string') {
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

    // File upload function for image fields

    const uploadFile = async (file: File, fieldName: string, arrayIndex?: number) => {
        setUploadingField(fieldName + (arrayIndex !== undefined ? `-${arrayIndex}` : ''));
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await fetch(`${BACKEND_URL}/upload`, {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const data = await response.json();
            const url = data.url;

            // If this is for an array field (imageUrls), update the specific index
            if (arrayIndex !== undefined) {
                const currentUrls = Array.isArray((selectedNode.config as any)?.[fieldName])
                    ? [...(selectedNode.config as any)[fieldName]]
                    : [''];
                currentUrls[arrayIndex] = url;
                handleFieldChange(fieldName, currentUrls.filter(u => u));
            } else {
                handleFieldChange(fieldName, url);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload file. Please try again.');
        } finally {
            setUploadingField(null);
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
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <button
                                                className="nav-btn"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(JSON.stringify(displayedOutput, null, 2));
                                                    setCopyFeedback(true);
                                                    setTimeout(() => setCopyFeedback(false), 2000);
                                                }}
                                                title="Copy JSON"
                                                style={{ width: 'auto', padding: '0 8px', fontSize: '0.75rem', gap: '4px' }}
                                            >
                                                {copyFeedback ? '✓ Copied' : '📋 Copy'}
                                            </button>
                                            <div className="view-toggle" style={{ display: 'flex', background: 'rgba(0,0,0,0.1)', padding: '2px', borderRadius: '4px' }}>
                                                <button
                                                    onClick={() => setOutputViewMode('raw')}
                                                    style={{
                                                        background: outputViewMode === 'raw' ? '#fff' : 'transparent',
                                                        border: 'none',
                                                        padding: '4px 8px',
                                                        borderRadius: '3px',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        color: outputViewMode === 'raw' ? '#000' : '#666',
                                                        boxShadow: outputViewMode === 'raw' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                                                    }}
                                                >
                                                    JSON
                                                </button>
                                                <button
                                                    onClick={() => setOutputViewMode('tree')}
                                                    style={{
                                                        background: outputViewMode === 'tree' ? '#fff' : 'transparent',
                                                        border: 'none',
                                                        padding: '4px 8px',
                                                        borderRadius: '3px',
                                                        fontSize: '0.75rem',
                                                        cursor: 'pointer',
                                                        color: outputViewMode === 'tree' ? '#000' : '#666',
                                                        boxShadow: outputViewMode === 'tree' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
                                                    }}
                                                >
                                                    Tree
                                                </button>
                                            </div>
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
                                    </div>
                                    {outputViewMode === 'raw' ? (
                                        <pre className="json-preview">
                                            {JSON.stringify(displayedOutput, null, 2)}
                                        </pre>
                                    ) : (
                                        <div className="json-preview" style={{ background: '#1e1e1e', color: '#d4d4d4', padding: '1rem', borderRadius: '6px', fontFamily: 'Monaco, Consolas, monospace', fontSize: '0.8rem' }}>
                                            <JsonTree data={displayedOutput} />
                                        </div>
                                    )}
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

                    {/* Output Mapping Section */}
                    <OutputMappingEditor
                        mapping={selectedNode.outputMapping || {}}
                        nodeType={selectedNode.type}
                        inputFields={(() => {
                            // Extract input field names from referenced nodes
                            const fields: string[] = [];
                            const config = selectedNode.config || {};
                            Object.values(config).forEach(value => {
                                if (value && typeof value === 'object' && (value as any)._type === 'reference') {
                                    const ref = value as { nodeId: string; outputKey: string };
                                    // Add common fields that might be in the input
                                    if (ref.outputKey === 'items') {
                                        fields.push('name', 'description', 'text', 'id');
                                    } else {
                                        fields.push(ref.outputKey);
                                    }
                                }
                            });
                            return Array.from(new Set(fields));
                        })()}
                        outputFields={OUTPUT_KEYS[selectedNode.type] || []}
                        onChange={(mapping) => {
                            updateNode(selectedNode.id, { outputMapping: mapping });
                        }}
                    />

                    {fields.map(field => {
                        // Image-to-Image: Conditional field visibility based on model
                        if (selectedNode.type === 'image_to_image') {
                            const model = (selectedNode.config as any)?.model || 'fal-ai/stable-diffusion-v3-medium';
                            const isGptImg15 = model.includes('gpt-image-1.5');

                            // Fields only for GPT-IMG 1.5
                            if (['imageUrls', 'imageSize', 'quality', 'inputFidelity'].includes(field.name) && !isGptImg15) {
                                return null;
                            }
                            // Fields only for other models (not GPT-IMG 1.5)
                            if (['imageUrl', 'strength'].includes(field.name) && isGptImg15) {
                                return null;
                            }
                        }

                        // Media Ingest: Conditional field visibility
                        if (selectedNode.type === 'media_ingest') {
                            const mode = (selectedNode.config as any)?.mode || 'Import';
                            const sourceType = (selectedNode.config as any)?.sourceType || 'Direct Link';
                            const connectionMode = (selectedNode.config as any)?.connectionMode || 'Public Link';
                            const exportDestination = (selectedNode.config as any)?.exportDestination || 'Google Drive';

                            // Mode field - render as radio buttons
                            if (field.name === 'mode') {
                                return (
                                    <div key={field.name} className="form-group">
                                        <label>{field.label}</label>
                                        <div className="radio-group" style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                                            {field.options?.map(option => (
                                                <label
                                                    key={option}
                                                    className="radio-option"
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: '8px',
                                                        padding: '10px 16px',
                                                        borderRadius: '8px',
                                                        border: mode === option ? '2px solid #4a9eff' : '1px solid #3a3a3a',
                                                        backgroundColor: mode === option ? 'rgba(74, 158, 255, 0.1)' : '#1a1a1a',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s ease'
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="media-mode"
                                                        value={option}
                                                        checked={mode === option}
                                                        onChange={() => handleFieldChange('mode', option)}
                                                        style={{ accentColor: '#4a9eff' }}
                                                    />
                                                    <span style={{ fontSize: '14px', fontWeight: mode === option ? 600 : 400 }}>
                                                        {option === 'Import' ? '📥 Import' : '📤 Export'}
                                                    </span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }

                            // Hide Import-specific fields when in Export mode
                            if (mode === 'Export') {
                                if (['sourceType', 'url', 'files', 'connectionMode'].includes(field.name)) {
                                    return null;
                                }
                            }

                            // Hide Export-specific fields when in Import mode
                            if (mode === 'Import') {
                                if (['exportDestination', 'exportFolderPath', 'exportFileName'].includes(field.name)) {
                                    return null;
                                }
                            }

                            // Import mode conditional logic
                            if (mode === 'Import') {
                                // Hide connectionMode for sources that don't support OAuth
                                if (field.name === 'connectionMode' && !['Google Drive', 'Dropbox'].includes(sourceType)) {
                                    return null;
                                }

                                // Hide URL field for Local Upload
                                if (field.name === 'url' && sourceType === 'Local Upload') {
                                    return null;
                                }

                                // Hide files field for non-Local sources
                                if (field.name === 'files' && sourceType !== 'Local Upload') {
                                    return null;
                                }
                            }

                            // Export mode - show connect button for Google Drive/Dropbox
                            if (mode === 'Export' && field.name === 'exportFolderPath' && ['Google Drive', 'Dropbox'].includes(exportDestination)) {
                                const providerName = exportDestination;
                                const activeAccounts = composioAccounts.filter(a => a.status === 'ACTIVE');
                                const hasConnectedAccount = activeAccounts.length > 0;
                                const selectedAccountId = (selectedNode.config as any)?.composioAccountId;

                                return (
                                    <div key={field.name} className="form-group">
                                        <label>Connect to {providerName}</label>
                                        <div className="oauth-connect-section">
                                            {composioLoading ? (
                                                <div style={{ padding: '12px', color: '#888' }}>
                                                    ⏳ Loading connected accounts...
                                                </div>
                                            ) : hasConnectedAccount ? (
                                                <>
                                                    <div style={{ marginBottom: '12px' }}>
                                                        <select
                                                            value={selectedAccountId || activeAccounts[0]?.id}
                                                            onChange={(e) => handleFieldChange('composioAccountId', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                borderRadius: '8px',
                                                                border: '1px solid #3a3a3a',
                                                                backgroundColor: '#1a1a1a',
                                                                color: '#fff',
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            {activeAccounts.map(account => (
                                                                <option key={account.id} value={account.id}>
                                                                    ✓ {account.accountName || 'Connected Account'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={() => setFileBrowserOpen(true)}
                                                            style={{
                                                                padding: '8px 12px',
                                                                backgroundColor: exportDestination === 'Google Drive' ? '#4285f4' : '#0061ff',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '13px',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            📂 Select Destination Folder
                                                        </button>
                                                        <button
                                                            onClick={() => initiateOAuthConnection(exportDestination)}
                                                            disabled={oauthConnecting}
                                                            style={{
                                                                padding: '8px 12px',
                                                                backgroundColor: '#2a2a2a',
                                                                color: '#4a9eff',
                                                                border: '1px solid #3a3a3a',
                                                                borderRadius: '6px',
                                                                cursor: oauthConnecting ? 'not-allowed' : 'pointer',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            + Add Account
                                                        </button>
                                                    </div>
                                                    {(selectedNode.config as any)?.exportFolderPath && (
                                                        <div style={{ marginTop: '12px', padding: '8px 12px', backgroundColor: '#0d1117', borderRadius: '6px', fontSize: '13px' }}>
                                                            📁 {(selectedNode.config as any)?.exportFolderPath || '/'}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => initiateOAuthConnection(exportDestination)}
                                                    disabled={oauthConnecting}
                                                    style={{
                                                        width: '100%',
                                                        padding: '12px 16px',
                                                        backgroundColor: exportDestination === 'Google Drive' ? '#4285f4' : '#0061ff',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '8px',
                                                        cursor: oauthConnecting ? 'not-allowed' : 'pointer',
                                                        fontSize: '14px',
                                                        fontWeight: 500,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        gap: '8px'
                                                    }}
                                                >
                                                    {oauthConnecting ? (
                                                        '⏳ Connecting...'
                                                    ) : (
                                                        <>
                                                            {exportDestination === 'Google Drive' ? '🔗' : '📦'} Connect to {exportDestination}
                                                        </>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            }

                            // For Google Drive / Dropbox with Connect Account mode, show connect button instead of URL
                            if (field.name === 'url' && ['Google Drive', 'Dropbox'].includes(sourceType) && connectionMode === 'Connect Account') {
                                const providerName = sourceType;
                                const activeAccounts = composioAccounts.filter(a => a.status === 'ACTIVE');
                                const hasConnectedAccount = activeAccounts.length > 0;
                                const selectedAccountId = (selectedNode.config as any)?.composioAccountId;

                                return (
                                    <div key={field.name} className="form-group">
                                        <label>Connect to {providerName}</label>
                                        <div className="oauth-connect-section">
                                            {composioLoading ? (
                                                <div style={{ padding: '12px', color: '#888' }}>
                                                    ⏳ Loading connected accounts...
                                                </div>
                                            ) : hasConnectedAccount ? (
                                                <>
                                                    <div style={{ marginBottom: '12px' }}>
                                                        <select
                                                            value={selectedAccountId || activeAccounts[0]?.id}
                                                            onChange={(e) => handleFieldChange('composioAccountId', e.target.value)}
                                                            style={{
                                                                width: '100%',
                                                                padding: '10px 12px',
                                                                borderRadius: '8px',
                                                                border: '1px solid #3a3a3a',
                                                                backgroundColor: '#1a1a1a',
                                                                color: '#fff',
                                                                fontSize: '14px'
                                                            }}
                                                        >
                                                            {activeAccounts.map(account => (
                                                                <option key={account.id} value={account.id}>
                                                                    ✓ {account.accountName || 'Connected Account'}
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                                        <button
                                                            onClick={() => setFileBrowserOpen(true)}
                                                            style={{
                                                                padding: '8px 12px',
                                                                backgroundColor: sourceType === 'Google Drive' ? '#4285f4' : '#0061ff',
                                                                color: '#fff',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '13px',
                                                                fontWeight: 500
                                                            }}
                                                        >
                                                            📂 Browse Files
                                                        </button>
                                                        <button
                                                            onClick={() => initiateOAuthConnection(sourceType)}
                                                            disabled={oauthConnecting}
                                                            style={{
                                                                padding: '8px 12px',
                                                                backgroundColor: '#2a2a2a',
                                                                color: '#4a9eff',
                                                                border: '1px solid #3a3a3a',
                                                                borderRadius: '6px',
                                                                cursor: oauthConnecting ? 'not-allowed' : 'pointer',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            + Add Account
                                                        </button>
                                                        <button
                                                            onClick={() => selectedAccountId && disconnectAccount(selectedAccountId)}
                                                            style={{
                                                                padding: '8px 12px',
                                                                backgroundColor: 'transparent',
                                                                color: '#ff6b6b',
                                                                border: 'none',
                                                                borderRadius: '6px',
                                                                cursor: 'pointer',
                                                                fontSize: '13px'
                                                            }}
                                                        >
                                                            Disconnect
                                                        </button>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <button
                                                        className="btn-oauth-connect"
                                                        onClick={() => initiateOAuthConnection(sourceType)}
                                                        disabled={oauthConnecting}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: '8px',
                                                            padding: '12px 16px',
                                                            backgroundColor: oauthConnecting
                                                                ? '#666'
                                                                : sourceType === 'Google Drive' ? '#4285f4' : '#0061ff',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '8px',
                                                            cursor: oauthConnecting ? 'not-allowed' : 'pointer',
                                                            fontSize: '14px',
                                                            fontWeight: 500
                                                        }}
                                                    >
                                                        {oauthConnecting
                                                            ? '⏳ Connecting...'
                                                            : sourceType === 'Google Drive'
                                                                ? '🔗 Connect to Google Drive'
                                                                : '📦 Connect to Dropbox'
                                                        }
                                                    </button>
                                                    <p className="oauth-hint" style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                                                        Click to authorize access to your {providerName} files
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                );
                            }
                        }

                        if (selectedNode.type === 'split_text' && field.name === 'arrayPath') {
                            const splitMode = ((selectedNode.config as any)?.splitMode || 'text').toString().toLowerCase();
                            if (!splitMode.includes('json')) {
                                return null;
                            }
                        }
                        const fieldValue = (selectedNode.config as any)?.[field.name];
                        const isReference = fieldValue && typeof fieldValue === 'object' && fieldValue._type === 'reference';
                        const canBeReference = ['text', 'textarea', 'image', 'images', 'video', 'audio', 'file'].includes(field.type)
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
                                    <FilteredReferenceEditor
                                        fieldName={field.name}
                                        currentValue={fieldValue}
                                        previousNodes={previousNodes}
                                        onChange={(value) => handleFieldChange(field.name, value)}
                                    />
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
                                                placeholder={field.name === 'arrayPath' ? 'e.g., data.items or scenes' : `Enter ${field.label.toLowerCase()}...`}
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
                                                    <option key={opt} value={opt}>
                                                        {field.name === 'model' ? getModelDisplayName(opt, selectedNode.type) : opt}
                                                    </option>
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
                                        {field.type === 'color' && (
                                            <div className="color-input-container">
                                                <input
                                                    type="color"
                                                    value={fieldValue || field.default || '#ffffff'}
                                                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                                    className="color-picker"
                                                />
                                                <input
                                                    type="text"
                                                    value={fieldValue || field.default || '#ffffff'}
                                                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                                    placeholder="#ffffff"
                                                    className="color-text-input"
                                                />
                                            </div>
                                        )}
                                        {(field.type === 'file' || field.type === 'image' || field.type === 'video' || field.type === 'audio') && (
                                            <div className="file-input-container">
                                                <input
                                                    type="text"
                                                    value={fieldValue || ''}
                                                    onChange={(e) => handleFieldChange(field.name, e.target.value)}
                                                    placeholder="Paste URL or upload..."
                                                />
                                                <input
                                                    type="file"
                                                    id={`file-upload-${field.name}`}
                                                    style={{ display: 'none' }}
                                                    accept={field.type === 'image' ? 'image/*' : field.type === 'video' ? 'video/*' : field.type === 'audio' ? 'audio/*' : '*/*'}
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) uploadFile(file, field.name);
                                                    }}
                                                />
                                                <button
                                                    className="btn-secondary small"
                                                    onClick={() => document.getElementById(`file-upload-${field.name}`)?.click()}
                                                    disabled={uploadingField === field.name}
                                                >
                                                    {uploadingField === field.name ? '⏳' : 'Upload'}
                                                </button>
                                            </div>
                                        )}
                                        {field.type === 'images' && (
                                            <div className="multi-image-input">
                                                {(() => {
                                                    const urls: string[] = Array.isArray(fieldValue) ? fieldValue : (fieldValue ? [fieldValue] : ['']);
                                                    return (
                                                        <>
                                                            {urls.map((url, idx) => (
                                                                <div key={idx} className="file-input-container" style={{ marginBottom: '8px' }}>
                                                                    <input
                                                                        type="text"
                                                                        value={url || ''}
                                                                        onChange={(e) => {
                                                                            const newUrls = [...urls];
                                                                            newUrls[idx] = e.target.value;
                                                                            handleFieldChange(field.name, newUrls.filter(u => u));
                                                                        }}
                                                                        placeholder={`Image URL ${idx + 1}...`}
                                                                    />
                                                                    <input
                                                                        type="file"
                                                                        id={`file-upload-${field.name}-${idx}`}
                                                                        style={{ display: 'none' }}
                                                                        accept="image/*"
                                                                        onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) uploadFile(file, field.name, idx);
                                                                        }}
                                                                    />
                                                                    <button
                                                                        className="btn-secondary small"
                                                                        onClick={() => document.getElementById(`file-upload-${field.name}-${idx}`)?.click()}
                                                                        disabled={uploadingField === `${field.name}-${idx}`}
                                                                        style={{ padding: '4px 8px' }}
                                                                    >
                                                                        {uploadingField === `${field.name}-${idx}` ? '⏳' : '📤'}
                                                                    </button>
                                                                    <button
                                                                        className="btn-secondary small"
                                                                        onClick={() => {
                                                                            const newUrls = urls.filter((_, i) => i !== idx);
                                                                            handleFieldChange(field.name, newUrls.length ? newUrls : ['']);
                                                                        }}
                                                                        style={{ background: '#ff4d4d', padding: '4px 8px' }}
                                                                    >✕</button>
                                                                </div>
                                                            ))}
                                                            <button
                                                                className="btn-secondary small"
                                                                onClick={() => handleFieldChange(field.name, [...urls, ''])}
                                                                style={{ marginTop: '4px' }}
                                                            >+ Add Image</button>
                                                        </>
                                                    );
                                                })()}
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
                        <span className="stat-value">{getProviderFromModel((selectedNode.config as any)?.model, selectedNode.type)}</span>
                    </div>
                    <div className="stat">
                        <span className="stat-label">Estimated Time:</span>
                        <span className="stat-value">{selectedNode.estimatedTime}</span>
                    </div>
                </div>
            </div>

            {/* File Browser Modal for Google Drive / Dropbox */}
            {selectedNode.type === 'media_ingest' && userId && (
                <FileBrowserModal
                    isOpen={fileBrowserOpen}
                    onClose={() => setFileBrowserOpen(false)}
                    onSelect={(file, downloadUrl) => {
                        // Update the node config with the selected file
                        handleFieldChange('url', downloadUrl);
                        handleFieldChange('selectedFileName', file.name);
                        handleFieldChange('selectedFileId', file.id);
                        setFileBrowserOpen(false);
                    }}
                    userId={userId}
                    toolkit={
                        (selectedNode.config as any)?.sourceType === 'Google Drive'
                            ? 'GOOGLEDRIVE'
                            : 'DROPBOX'
                    }
                />
            )}
        </aside>
    );
};
