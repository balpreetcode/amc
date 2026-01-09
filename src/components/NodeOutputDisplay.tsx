import React from 'react';
import type { NodeOutput, OutputType } from '../types/nodes';
import './NodeOutputDisplay.css';

interface NodeOutputDisplayProps {
    outputs?: NodeOutput[];
    outputUrl?: string;  // Legacy fallback
    nodeType: string;
    isParallel?: boolean;
}

// Determine output type from node type for legacy outputUrl display
const getOutputTypeFromNodeType = (nodeType: string): OutputType => {
    switch (nodeType) {
        case 'text_to_text':
        case 'split_text':
            return 'text';
        case 'text_to_image':
        case 'image_to_image':
            return 'image';
        case 'image_to_video':
        case 'text_to_video':
        case 'edit_video':
        case 'clip_merger':
            return 'video';
        case 'text_to_speech':
            return 'audio';
        case 'text_to_music':
            return 'music';
        default:
            return 'media';
    }
};

// Get file extension from URL
const getExtension = (url: string): string => {
    try {
        const pathname = new URL(url).pathname;
        const ext = pathname.split('.').pop()?.toLowerCase();
        return ext || '';
    } catch {
        const ext = url.split('.').pop()?.toLowerCase();
        return ext || '';
    }
};

// Check if URL is likely an image
const isImageUrl = (url: string): boolean => {
    const ext = getExtension(url);
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
};

// Check if URL is likely a video
const isVideoUrl = (url: string): boolean => {
    const ext = getExtension(url);
    return ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext);
};

// Check if URL is likely audio
const isAudioUrl = (url: string): boolean => {
    const ext = getExtension(url);
    return ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext);
};

const SingleOutput: React.FC<{ output: NodeOutput; index?: number }> = ({ output, index }) => {
    const { url, text, type } = output;

    if (text && type === 'text') {
        return (
            <div className="output-item output-text">
                {index !== undefined && <span className="output-index">#{index + 1}</span>}
                <div className="text-content">
                    <pre>{text}</pre>
                </div>
            </div>
        );
    }

    if (!url) {
        return null;
    }

    // Determine display type based on output type or URL
    const displayAsImage = type === 'image' || isImageUrl(url);
    const displayAsVideo = type === 'video' || isVideoUrl(url);
    const displayAsAudio = type === 'audio' || type === 'music' || isAudioUrl(url);

    return (
        <div className={`output-item output-${type}`}>
            {index !== undefined && <span className="output-index">#{index + 1}</span>}

            {displayAsImage && (
                <div className="image-preview">
                    <a href={url} target="_blank" rel="noopener noreferrer">
                        <img
                            src={url}
                            alt={`Output ${index !== undefined ? index + 1 : ''}`}
                            loading="lazy"
                            onError={(e) => {
                                // If image fails to load, show as link
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement?.classList.add('image-error');
                            }}
                        />
                    </a>
                </div>
            )}

            {displayAsVideo && (
                <div className="video-preview">
                    <video
                        controls
                        preload="metadata"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('video-error');
                        }}
                    >
                        <source src={url} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            )}

            {displayAsAudio && (
                <div className="audio-preview">
                    <audio
                        controls
                        preload="metadata"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement?.classList.add('audio-error');
                        }}
                    >
                        <source src={url} />
                        Your browser does not support the audio tag.
                    </audio>
                </div>
            )}

            <div className="output-url">
                <a href={url} target="_blank" rel="noopener noreferrer" title={url}>
                    {url.length > 60 ? url.substring(0, 30) + '...' + url.substring(url.length - 25) : url}
                </a>
                <button
                    className="copy-btn"
                    onClick={() => navigator.clipboard.writeText(url)}
                    title="Copy URL"
                >
                    📋
                </button>
            </div>
        </div>
    );
};

export const NodeOutputDisplay: React.FC<NodeOutputDisplayProps> = ({
    outputs,
    outputUrl,
    nodeType,
    isParallel = false
}) => {
    // Prepare outputs array
    let displayOutputs: NodeOutput[] = [];

    if (outputs && outputs.length > 0) {
        displayOutputs = outputs;
    } else if (outputUrl) {
        // Legacy fallback: create single output from outputUrl
        displayOutputs = [{
            url: outputUrl,
            type: getOutputTypeFromNodeType(nodeType)
        }];
    }

    if (displayOutputs.length === 0) {
        return (
            <div className="node-output-display empty">
                <p className="no-outputs">No outputs available</p>
            </div>
        );
    }

    const isList = displayOutputs.length > 1 || isParallel;

    return (
        <div className={`node-output-display ${isList ? 'list-view' : 'single-view'}`}>
            <div className="output-header">
                <h4>
                    {isList ? `Outputs (${displayOutputs.length})` : 'Output'}
                </h4>
            </div>
            <div className="outputs-container">
                {displayOutputs.map((output, index) => (
                    <SingleOutput
                        key={output.url || output.text || index}
                        output={output}
                        index={isList ? index : undefined}
                    />
                ))}
            </div>
        </div>
    );
};

export default NodeOutputDisplay;
