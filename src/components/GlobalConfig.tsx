import React from 'react';
import './GlobalConfig.css';

export const GlobalConfig: React.FC = () => {
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
