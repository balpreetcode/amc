import type { Template } from '../types/template';
import './TemplateCard.css';

interface TemplateCardProps {
    template: Template;
    onEdit: () => void;
    onGenerate: () => void;
    onLoad: () => void;
    isGenerating?: boolean;
    isUserOwned?: boolean;
    currentUserId?: string | null;
}

export function TemplateCard({
    template,
    onEdit,
    onGenerate,
    onLoad,
    isGenerating,
    currentUserId
}: TemplateCardProps) {
    const videoSrc = template.videoPreview || '/output/default-preview.mp4';

    // Determine if this is a system template or user's own template
    const isSystemTemplate = !template.userId;
    const isOwnTemplate = template.userId && template.userId === currentUserId;

    return (
        <div className="template-card">
            <div className="template-video-container">
                <video
                    className="template-video"
                    src={videoSrc}
                    loop
                    muted
                    autoPlay
                    playsInline
                    onError={(e) => {
                        const target = e.target as HTMLVideoElement;
                        target.style.display = 'none';
                    }}
                />
                <div className="template-play-icon">
                    <svg
                        width="48"
                        height="48"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <circle cx="12" cy="12" r="10" fill="rgba(0, 0, 0, 0.6)" />
                        <path
                            d="M9.5 8.5L15.5 12L9.5 15.5V8.5Z"
                            fill="white"
                        />
                    </svg>
                </div>
                {/* Ownership Badge */}
                <div className={`template-badge ${isSystemTemplate ? 'badge-system' : 'badge-user'}`}>
                    {isSystemTemplate ? '📦 System' : '👤 My Template'}
                </div>
            </div>

            <div className="template-info">
                <div className="template-name">
                    <h3>{template.name}</h3>
                </div>
                {template.description && (
                    <div className="template-description">
                        <p>{template.description}</p>
                    </div>
                )}
                <div className="template-meta">
                    <span className="meta-item">{template.nodeCount} nodes</span>
                    <span className="meta-separator">•</span>
                    <span className="meta-item">
                        Updated {new Date(template.lastModified).toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="template-actions">
                <button
                    className="btn-load"
                    onClick={onLoad}
                    disabled={isGenerating}
                    title="Load into Builder for editing"
                >
                    Load
                </button>
                <button
                    className="btn-generate"
                    onClick={onGenerate}
                    disabled={isGenerating}
                >
                    {isGenerating ? 'Generating...' : 'Generate'}
                </button>
                {/* Only show Edit button for user's own templates */}
                {isOwnTemplate && (
                    <button className="btn-edit" onClick={onEdit}>
                        Edit
                    </button>
                )}
            </div>
        </div>
    );
}
