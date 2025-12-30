import { TemplateCard } from './TemplateCard';
import './Templates.css';

export function Templates() {
    // Sample templates for demonstration
    const sampleTemplates = [
        {
            id: '1',
            name: 'Story to Scenes (Parallel Template)',
            videoPreview: '/templatePreview/composed_1767073702375.mp4'
        },
        {
            id: '2',
            name: 'Quick Story Generator',
            videoPreview: '/templatePreview/composed_1767073702375.mp4'
        },
        {
            id: '3',
            name: 'Cinematic Scenes',
            videoPreview: '/templatePreview/composed_1767073702375.mp4'
        }
    ];

    return (
        <div className="templates-container">
            <div className="templates-header">
                <h2>Templates</h2>
                <p className="templates-subtitle">Choose a template to get started quickly</p>
            </div>

            <div className="templates-grid">
                {sampleTemplates.map((template) => (
                    <TemplateCard
                        key={template.id}
                        id={template.id}
                        name={template.name}
                        videoPreview={template.videoPreview}
                    />
                ))}
            </div>
        </div>
    );
}
