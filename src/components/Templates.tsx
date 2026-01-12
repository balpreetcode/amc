import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TemplateCard } from './TemplateCard';
import { TemplateEditModal } from './TemplateEditModal';
import { useTemplates } from '../hooks/useTemplates';
import { useWorkflowContext } from '../context/WorkflowContext';
import { useAuth } from '../context/AuthContext';
import type { Template } from '../types/template';
import './Templates.css';

type FilterType = 'all' | 'system' | 'mine';

interface TemplatesProps {
    onNavigateToHistory?: () => void;
}

export function Templates({ onNavigateToHistory }: TemplatesProps = {}) {
    const navigate = useNavigate();
    const { loadTemplate } = useWorkflowContext();
    const { userId, isLoggedIn } = useAuth();
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
    const [filter, setFilter] = useState<FilterType>('all');

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    // Filter templates based on selected filter
    const filteredTemplates = templates.filter(template => {
        if (filter === 'all') return true;
        if (filter === 'system') return !template.userId;
        if (filter === 'mine') return template.userId === userId;
        return true;
    });

    // Count for display
    const systemCount = templates.filter(t => !t.userId).length;
    const myCount = templates.filter(t => t.userId === userId).length;

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
                <div className="templates-title-row">
                    <h2>Templates</h2>
                    {/* Filter Dropdown */}
                    <div className="templates-filter">
                        <select
                            value={filter}
                            onChange={(e) => setFilter(e.target.value as FilterType)}
                            className="filter-select"
                        >
                            <option value="all">All Templates ({templates.length})</option>
                            <option value="system">System Templates ({systemCount})</option>
                            {isLoggedIn && (
                                <option value="mine">My Templates ({myCount})</option>
                            )}
                        </select>
                    </div>
                </div>
                <p className="templates-subtitle">
                    {filteredTemplates.length === 0
                        ? 'No templates match the current filter.'
                        : `${filteredTemplates.length} template${filteredTemplates.length !== 1 ? 's' : ''} shown`
                    }
                </p>
            </div>

            {error && <div className="error-message">{error}</div>}

            {loading ? (
                <div className="loading-state">Loading templates...</div>
            ) : filteredTemplates.length === 0 ? (
                <div className="empty-state">
                    <span className="empty-icon">📋</span>
                    <p>No templates found</p>
                    <p className="empty-hint">
                        {filter === 'mine'
                            ? 'Create your first template in Flow Builder!'
                            : 'Try changing the filter or create a new template.'
                        }
                    </p>
                </div>
            ) : (
                <div className="templates-grid">
                    {filteredTemplates.map((template) => (
                        <TemplateCard
                            key={template.id}
                            template={template}
                            onEdit={() => handleEdit(template)}
                            onLoad={() => handleLoad(template)}
                            onGenerate={() => handleGenerate(template.id)}
                            isGenerating={generatingId === template.id}
                            currentUserId={userId}
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
