import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateCard } from './TemplateCard';
import { TemplateEditModal } from './TemplateEditModal';
import { useTemplates } from '../hooks/useTemplates';
import { useWorkflowContext } from '../context/WorkflowContext';
import type { Template } from '../types/template';
import './Templates.css';

interface TemplatesProps {
    onNavigateToHistory?: () => void;
}

export function Templates({ onNavigateToHistory }: TemplatesProps = {}) {
    const navigate = useNavigate();
    const { loadTemplate } = useWorkflowContext();
    const {
        templates,
        loading,
        error,
        fetchTemplates,
        updateTemplate,
        deleteTemplate,
        generateFromTemplate,
    } = useTemplates();

    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
    const [generatingId, setGeneratingId] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleEdit = (template: Template) => {
        setEditingTemplate(template);
    };

    const handleLoad = (template: Template) => {
        loadTemplate({
            nodes: template.nodes,
            name: template.name,
            lastModified: new Date().toISOString(),
            templateVersion: template.templateVersion
        }, template.id);
        navigate('/');
    };

    const handleGenerate = async (templateId: string) => {
        setGeneratingId(templateId);
        try {
            const workflowId = await generateFromTemplate(templateId);
            setGeneratingId(null);

            // Navigate to Execution History automatically
            if (onNavigateToHistory) {
                onNavigateToHistory();
            }

            alert(`Video generation started!\n\nWorkflow ID: ${workflowId}\n\nYou are now on the Execution History tab. The video will appear here when generation completes (usually 3-5 minutes).`);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to generate video');
            setGeneratingId(null);
        }
    };

    return (
        <div className="templates-container">
            <div className="templates-header">
                <h2>Templates</h2>
                <p className="templates-subtitle">
                    {templates.length === 0
                        ? 'No templates yet. Create one from Flow Builder!'
                        : `${templates.length} template${templates.length !== 1 ? 's' : ''} available`
                    }
                </p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-state">Loading templates...</div>
            ) : templates.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <p>No templates found</p>
                    <p className="empty-hint">Go to Flow Builder and click "Save As Template" to create your first template</p>
                </div>
            ) : (
                <div className="templates-grid">
                    {templates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onEdit={() => handleEdit(template)}
                            onLoad={() => handleLoad(template)}
                            onGenerate={() => handleGenerate(template.id)}
                            isGenerating={generatingId === template.id}
                        />
                    ))}
                </div>
            )}

            {editingTemplate && (
                <TemplateEditModal
                    template={editingTemplate}
                    onSave={async (updates) => {
                        await updateTemplate(editingTemplate.id, updates);
                        setEditingTemplate(null);
                        fetchTemplates();
                    }}
                    onDelete={async () => {
                        await deleteTemplate(editingTemplate.id);
                        setEditingTemplate(null);
                    }}
                    onClose={() => setEditingTemplate(null)}
                />
            )}
        </div>
    );
}
