import './TemplateCard.css';

interface TemplateCardProps {
    id: string;
    name: string;
    videoPreview?: string;
}

export function TemplateCard({ id, name, videoPreview }: TemplateCardProps) {
    const handleGenerateVideo = () => {
        console.log('Generate video for template:', id);
        // TODO: Implement generate video functionality
    };

    const handleEdit = () => {
        console.log('Edit template:', id);
        // TODO: Implement edit template functionality
    };

    // Use a default video from output folder or placeholder
    const videoSrc = videoPreview || '/templatePreview/composed_1767073702375.mp4';

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
            </div>

            <div className="template-name">
                <h3>{name}</h3>
            </div>

            <div className="template-actions">
                <button className="btn-generate" onClick={handleGenerateVideo}>
                    Generate Video
                </button>
                <button className="btn-edit" onClick={handleEdit}>
                    Edit
                </button>
            </div>
        </div>
    );
}
