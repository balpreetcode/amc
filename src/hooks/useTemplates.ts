import { useState, useCallback } from 'react';
import type { Template, TemplateCreateRequest, TemplateUpdateRequest } from '../types/template';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export const useTemplates = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/templates`);
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTemplate = useCallback(async (request: TemplateCreateRequest): Promise<Template> => {
    setError(null);
    const response = await fetch(`${BACKEND_URL}/template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create template');
    }

    const result = await response.json();
    setTemplates(prev => [result.template, ...prev]);
    return result.template;
  }, []);

  const updateTemplate = useCallback(async (id: string, updates: TemplateUpdateRequest): Promise<Template> => {
    setError(null);
    const response = await fetch(`${BACKEND_URL}/template/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to update template');
    }

    const result = await response.json();
    setTemplates(prev => prev.map(t => t.id === id ? result.template : t));
    return result.template;
  }, []);

  const deleteTemplate = useCallback(async (id: string): Promise<void> => {
    setError(null);
    const response = await fetch(`${BACKEND_URL}/template/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete template');
    }

    setTemplates(prev => prev.filter(t => t.id !== id));
  }, []);

  const generateFromTemplate = useCallback(async (id: string): Promise<string> => {
    setError(null);
    const response = await fetch(`${BACKEND_URL}/template/${id}/generate`, {
      method: 'POST',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to generate from template');
    }

    const result = await response.json();
    return result.workflowId;
  }, []);

  return {
    templates,
    loading,
    error,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    generateFromTemplate,
  };
};
