import React, { useState, useEffect } from 'react';
import {
    type WorkflowNodeData,
    type ProviderType,
    type ProviderConfig,
    type ApiConfig,
    type NodeType,
    PROVIDER_NODE_TYPES,
    NODE_TYPES,
    getNodeTypeConfig
} from '../types/nodes';
import { NodeOutputDisplay } from './NodeOutputDisplay';
import './NodeConfigTab.css';

interface NodeConfigTabProps {
    node: WorkflowNodeData;
    onUpdate: (updates: Partial<WorkflowNodeData>) => void;
}

const DEFAULT_PROVIDER_CONFIG: ProviderConfig = {
    provider: 'openai',
    model: '',
    endpoint: ''
};

const DEFAULT_API_CONFIG: ApiConfig = {
    requestFormat: 'json',
    headers: {},
    responseType: 'sync'
};

// Model options per provider
const PROVIDER_MODELS: Record<ProviderType, string[]> = {
    'openai': [
        'gpt-4o',
        'gpt-4o-mini',
        'dall-e-3',
        'dall-e-2',
        'tts-1',
        'tts-1-hd'
    ],
    'fal-ai': [
        'fal-ai/flux/schnell',
        'fal-ai/ltxv-13b-098-distilled',
        'fal-ai/ltxv-13b-098-distilled/image-to-video',
        'fal-ai/playht/tts/v3',
        'fal-ai/stable-diffusion-v3-medium',
        'fal-ai/wan/v2.1/text-to-video',
        'fal-ai/wan/v2.1/image-to-video'
    ],
    'ffmpeg': [
        'compose',
        'trim',
        'merge',
        'overlay'
    ]
};

// Common emoji icons for nodes
const NODE_ICONS = ['📝', '🖼️', '📹', '🎵', '🔊', '🎬', '🔄', '✂️', '🔗', '✨', '🎭', '👄', '🤖', '📤'];

export const NodeConfigTab: React.FC<NodeConfigTabProps> = ({ node, onUpdate }) => {
    const [providerConfig, setProviderConfig] = useState<ProviderConfig>(
        node.providerConfig || DEFAULT_PROVIDER_CONFIG
    );
    const [apiConfig, setApiConfig] = useState<ApiConfig>(
        node.apiConfig || DEFAULT_API_CONFIG
    );
    const [headerKey, setHeaderKey] = useState('');
    const [headerValue, setHeaderValue] = useState('');

    // Sync state with node changes
    useEffect(() => {
        setProviderConfig(node.providerConfig || DEFAULT_PROVIDER_CONFIG);
        setApiConfig(node.apiConfig || DEFAULT_API_CONFIG);
    }, [node.id]);

    // Get available node types for selected provider
    const availableTypes = PROVIDER_NODE_TYPES[providerConfig.provider] || [];
    const availableModels = PROVIDER_MODELS[providerConfig.provider] || [];

    const handleProviderChange = (provider: ProviderType) => {
        const newProviderConfig = { ...providerConfig, provider, model: '' };
        const newApiConfig = {
            ...apiConfig,
            responseType: provider === 'fal-ai' ? 'async' : 'sync' as 'sync' | 'async'
        };

        setProviderConfig(newProviderConfig);
        setApiConfig(newApiConfig);

        // Update node type if current type is not available for new provider
        const newAvailableTypes = PROVIDER_NODE_TYPES[provider];
        const updates: Partial<WorkflowNodeData> = {
            providerConfig: newProviderConfig,
            apiConfig: newApiConfig,
            provider: provider === 'openai' ? 'OpenAI' : provider === 'fal-ai' ? 'Fal AI' : 'FFmpeg'
        };

        if (!newAvailableTypes.includes(node.type)) {
            updates.type = newAvailableTypes[0];
            const typeConfig = getNodeTypeConfig(newAvailableTypes[0]);
            updates.title = node.title.replace(/^\d+\.\s*\w+/, `${node.title.match(/^\d+/)?.[0] || '1'}. ${typeConfig.label}`);
        }

        onUpdate(updates);
    };

    const handleModelChange = (model: string) => {
        const newConfig = { ...providerConfig, model };
        setProviderConfig(newConfig);
        onUpdate({ providerConfig: newConfig });
    };

    const handleEndpointChange = (endpoint: string) => {
        const newConfig = { ...providerConfig, endpoint };
        setProviderConfig(newConfig);
        onUpdate({ providerConfig: newConfig });
    };

    const handleTypeChange = (type: NodeType) => {
        const typeConfig = getNodeTypeConfig(type);
        onUpdate({
            type,
            title: node.title.replace(/^\d+\.\s*[\w\s]+/, `${node.title.match(/^\d+/)?.[0] || '1'}. ${typeConfig.label}`)
        });
    };

    const handleRequestFormatChange = (requestFormat: 'json' | 'form-data') => {
        const newConfig = { ...apiConfig, requestFormat };
        setApiConfig(newConfig);
        onUpdate({ apiConfig: newConfig });
    };

    const handleResponseTypeChange = (responseType: 'sync' | 'async') => {
        const newConfig = { ...apiConfig, responseType };
        setApiConfig(newConfig);
        onUpdate({ apiConfig: newConfig });
    };

    const addHeader = () => {
        if (!headerKey.trim()) return;
        const newHeaders = { ...apiConfig.headers, [headerKey]: headerValue };
        const newConfig = { ...apiConfig, headers: newHeaders };
        setApiConfig(newConfig);
        onUpdate({ apiConfig: newConfig });
        setHeaderKey('');
        setHeaderValue('');
    };

    const removeHeader = (key: string) => {
        const newHeaders = { ...apiConfig.headers };
        delete newHeaders[key];
        const newConfig = { ...apiConfig, headers: newHeaders };
        setApiConfig(newConfig);
        onUpdate({ apiConfig: newConfig });
    };

    const handleIconChange = (icon: string) => {
        // Update the icon in NODE_TYPES would require a different approach
        // For now, we'll store it in config
        onUpdate({
            config: {
                ...node.config,
                customIcon: icon
            }
        });
    };

    const currentIcon = (node.config as any)?.customIcon || getNodeTypeConfig(node.type).icon;

    return (
        <div className="node-config-tab">
            {/* Node Identity Section */}
            <div className="config-section">
                <h4 className="section-header">Node Identity</h4>

                <div className="config-row">
                    <label>Display Name</label>
                    <input
                        type="text"
                        value={node.title}
                        onChange={(e) => onUpdate({ title: e.target.value })}
                        placeholder="Node name..."
                    />
                </div>

                <div className="config-row">
                    <label>Icon</label>
                    <div className="icon-picker">
                        <span className="current-icon">{currentIcon}</span>
                        <div className="icon-options">
                            {NODE_ICONS.map(icon => (
                                <button
                                    key={icon}
                                    className={`icon-option ${currentIcon === icon ? 'active' : ''}`}
                                    onClick={() => handleIconChange(icon)}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Provider Section */}
            <div className="config-section">
                <h4 className="section-header">Provider Configuration</h4>

                <div className="config-row">
                    <label>Provider</label>
                    <div className="provider-buttons">
                        {(['openai', 'fal-ai', 'ffmpeg'] as ProviderType[]).map(provider => (
                            <button
                                key={provider}
                                className={`provider-btn ${providerConfig.provider === provider ? 'active' : ''}`}
                                onClick={() => handleProviderChange(provider)}
                            >
                                {provider === 'openai' ? '🤖 OpenAI' : provider === 'fal-ai' ? '⚡ Fal AI' : '🎬 FFmpeg'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="config-row">
                    <label>Node Type</label>
                    <select
                        value={node.type}
                        onChange={(e) => handleTypeChange(e.target.value as NodeType)}
                    >
                        {availableTypes.map(type => {
                            const config = NODE_TYPES.find(n => n.type === type);
                            return (
                                <option key={type} value={type}>
                                    {config?.icon} {config?.label || type}
                                </option>
                            );
                        })}
                    </select>
                </div>

                <div className="config-row">
                    <label>Model</label>
                    <select
                        value={providerConfig.model || ''}
                        onChange={(e) => handleModelChange(e.target.value)}
                    >
                        <option value="">-- Select Model --</option>
                        {availableModels.map(model => (
                            <option key={model} value={model}>{model}</option>
                        ))}
                    </select>
                </div>

                {providerConfig.provider !== 'ffmpeg' && (
                    <div className="config-row">
                        <label>Custom Endpoint (Optional)</label>
                        <input
                            type="text"
                            value={providerConfig.endpoint || ''}
                            onChange={(e) => handleEndpointChange(e.target.value)}
                            placeholder="https://api.example.com/v1/..."
                        />
                    </div>
                )}
            </div>

            {/* API Configuration Section */}
            <div className="config-section">
                <h4 className="section-header">API Configuration</h4>

                <div className="config-row inline">
                    <div className="config-field">
                        <label>Request Format</label>
                        <select
                            value={apiConfig.requestFormat}
                            onChange={(e) => handleRequestFormatChange(e.target.value as 'json' | 'form-data')}
                        >
                            <option value="json">JSON</option>
                            <option value="form-data">Form Data</option>
                        </select>
                    </div>

                    <div className="config-field">
                        <label>Response Type</label>
                        <select
                            value={apiConfig.responseType}
                            onChange={(e) => handleResponseTypeChange(e.target.value as 'sync' | 'async')}
                            disabled={providerConfig.provider === 'fal-ai'}
                        >
                            <option value="sync">Sync (Immediate)</option>
                            <option value="async">Async (Polling)</option>
                        </select>
                    </div>
                </div>

                {providerConfig.provider === 'fal-ai' && (
                    <div className="config-hint">
                        ⚡ Fal AI always uses async mode with status polling
                    </div>
                )}
            </div>

            {/* Custom Headers Section */}
            <div className="config-section">
                <h4 className="section-header">Custom Headers</h4>
                <p className="config-hint">Use <code>{'{{variable}}'}</code> syntax for dynamic values</p>

                <div className="headers-list">
                    {Object.entries(apiConfig.headers).map(([key, value]) => (
                        <div key={key} className="header-item">
                            <span className="header-key">{key}</span>
                            <span className="header-value">{value}</span>
                            <button className="remove-header" onClick={() => removeHeader(key)}>×</button>
                        </div>
                    ))}
                </div>

                <div className="add-header-row">
                    <input
                        type="text"
                        placeholder="Header name"
                        value={headerKey}
                        onChange={(e) => setHeaderKey(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Value (e.g., {{apiKey}})"
                        value={headerValue}
                        onChange={(e) => setHeaderValue(e.target.value)}
                    />
                    <button className="btn-add-header" onClick={addHeader}>+ Add</button>
                </div>
            </div>

            {/* Output Display - Shows when node is completed */}
            {node.status === 'completed' && (
                <div className="config-section output-section">
                    <NodeOutputDisplay
                        outputs={node.outputs}
                        outputUrl={node.outputUrl}
                        nodeType={node.type}
                        isParallel={node.execution?.mode === 'parallel'}
                    />
                </div>
            )}
        </div>
    );
};

export default NodeConfigTab;
