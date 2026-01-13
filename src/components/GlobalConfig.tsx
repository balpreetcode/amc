import React, { useState, useEffect } from 'react';
import { NODE_MODEL_PROVIDERS, NODE_TYPES, type ModelProviderInfo } from '../types/nodes';
import './GlobalConfig.css';

// Storage key for model display name overrides
const MODEL_DISPLAY_NAME_OVERRIDES_KEY = 'modelDisplayNameOverrides';

// Type for overrides stored in localStorage
type ModelOverrides = Record<string, Record<string, string>>; // nodeType -> model -> modelDisplayName

export const GlobalConfig: React.FC = () => {
    const [overrides, setOverrides] = useState<ModelOverrides>({});
    const [hasChanges, setHasChanges] = useState(false);

    // Load overrides from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem(MODEL_DISPLAY_NAME_OVERRIDES_KEY);
        if (saved) {
            try {
                setOverrides(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse model display name overrides:', e);
            }
        }
    }, []);

    const handleDisplayNameChange = (nodeType: string, model: string, newDisplayName: string) => {
        setOverrides(prev => ({
            ...prev,
            [nodeType]: {
                ...prev[nodeType],
                [model]: newDisplayName
            }
        }));
        setHasChanges(true);
    };

    const handleSave = () => {
        localStorage.setItem(MODEL_DISPLAY_NAME_OVERRIDES_KEY, JSON.stringify(overrides));
        setHasChanges(false);
        alert('Model display names saved! Refresh the page to see changes in dropdowns.');
    };

    const handleReset = () => {
        if (confirm('Reset all model display names to defaults?')) {
            localStorage.removeItem(MODEL_DISPLAY_NAME_OVERRIDES_KEY);
            setOverrides({});
            setHasChanges(false);
            window.location.reload();
        }
    };

    const getDisplayName = (nodeType: string, model: string, defaultName: string): string => {
        return overrides[nodeType]?.[model] || defaultName;
    };

    // Flatten all providers into a single list for the table
    const allProviders: { nodeType: string; nodeLabel: string; nodeIcon: string; provider: ModelProviderInfo }[] = [];
    NODE_TYPES.forEach(nodeConfig => {
        const providers = NODE_MODEL_PROVIDERS[nodeConfig.type] || [];
        providers.forEach(provider => {
            allProviders.push({
                nodeType: nodeConfig.type,
                nodeLabel: nodeConfig.label,
                nodeIcon: nodeConfig.icon,
                provider
            });
        });
    });

    return (
        <div className="global-config-page">
            <div className="config-container">
                <h2>Node Configuration</h2>
                <p className="page-description">
                    Global configuration settings for workflow nodes.
                </p>

                <div className="config-section">
                    <h3>Provider Settings</h3>
                    <div className="config-card">
                        <div className="config-row">
                            <label>Default Provider</label>
                            <select defaultValue="openai">
                                <option value="openai">🤖 OpenAI</option>
                                <option value="fal-ai">⚡ Fal AI</option>
                                <option value="ffmpeg">🎬 FFmpeg</option>
                            </select>
                        </div>
                        <div className="config-row">
                            <label>Default Model</label>
                            <select defaultValue="gpt-4o">
                                <option value="gpt-4o">gpt-4o</option>
                                <option value="gpt-4o-mini">gpt-4o-mini</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="config-section">
                    <div className="section-header">
                        <h3>Model Display Names</h3>
                        <div className="section-actions">
                            <button className="btn-reset" onClick={handleReset}>
                                Reset to Defaults
                            </button>
                            <button className="btn-save" onClick={handleSave} disabled={!hasChanges}>
                                💾 Save Changes
                            </button>
                        </div>
                    </div>
                    <p className="section-description">
                        Customize the names shown in the model dropdown when selecting a model for each node type.
                    </p>

                    <div className="provider-table-container">
                        <table className="provider-table">
                            <thead>
                                <tr>
                                    <th>Node Type</th>
                                    <th>Type ID</th>
                                    <th>Model ID</th>
                                    <th>Provider</th>
                                    <th>Display Name (in Dropdown)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allProviders.map((item, idx) => (
                                    <tr key={`${item.nodeType}-${item.provider.model}-${idx}`}>
                                        <td className="node-type-cell">
                                            <span className="node-icon">{item.nodeIcon}</span>
                                            <span className="node-label">{item.nodeLabel}</span>
                                        </td>
                                        <td className="type-id-cell">
                                            <code>{item.nodeType}</code>
                                        </td>
                                        <td className="model-cell">
                                            <code>{item.provider.model}</code>
                                        </td>
                                        <td className="provider-cell">
                                            {item.provider.displayName}
                                        </td>
                                        <td className="display-name-cell">
                                            <input
                                                type="text"
                                                className="display-name-input"
                                                value={getDisplayName(item.nodeType, item.provider.model, item.provider.modelDisplayName)}
                                                onChange={(e) => handleDisplayNameChange(item.nodeType, item.provider.model, e.target.value)}
                                                placeholder={item.provider.modelDisplayName}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="config-section">
                    <h3>Execution Settings</h3>
                    <div className="config-card">
                        <div className="config-row">
                            <label>Default Execution Mode</label>
                            <select defaultValue="parallel">
                                <option value="parallel">Parallel</option>
                                <option value="sequential">Sequential</option>
                            </select>
                        </div>
                        <div className="config-row">
                            <label>Polling Interval (ms)</label>
                            <input type="number" defaultValue={500} min={100} max={5000} step={100} />
                        </div>
                    </div>
                </div>

                <div className="config-section">
                    <h3>Output Settings</h3>
                    <div className="config-card">
                        <div className="config-row">
                            <label>Default Storage</label>
                            <select defaultValue="r2">
                                <option value="r2">Cloudflare R2</option>
                                <option value="local">Local Storage</option>
                            </select>
                        </div>
                        <div className="config-row">
                            <label>Auto-cleanup outputs after (days)</label>
                            <input type="number" defaultValue={7} min={1} max={90} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GlobalConfig;
