import { useState, useCallback, useEffect, useRef } from 'react';
import type { WorkflowNodeData, NodeType, NodeOutput } from '../types/nodes';
import { createNode } from '../types/nodes';

const STORAGE_KEY = 'workflow-builder-state';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';

export interface WorkflowState {
    nodes: WorkflowNodeData[];
    name: string;
    lastModified: string;
    templateVersion?: number;
}

export interface ExecutionState {
    isRunning: boolean;
    workflowId: string | null;
    currentNodeId: string | null;
    error: string | null;
    results: Array<{
        nodeId: string;
        nodeType: string;
        success: boolean;
        data?: unknown;
        error?: string;
    }>;
}

const DEFAULT_TEMPLATE_VERSION = 5;

const DEFAULT_NODE_EXECUTION = {
    mode: 'sequential' as const,
    waitForAll: false,
    aggregateItems: false
};

const normalizeWorkflow = (workflowState: WorkflowState): WorkflowState => ({
    ...workflowState,
    nodes: workflowState.nodes.map(node => ({
        ...node,
        execution: {
            ...DEFAULT_NODE_EXECUTION,
            ...(node.execution || {})
        }
    }))
});

const defaultWorkflow: WorkflowState = {
    nodes: [
        {
            id: 'node-story-1',
            type: 'text_to_text',
            title: 'Generate Story',
            provider: 'OpenAI',
            status: 'not_run',
            estimatedTime: '10s',
            config: {
                prompt: 'Write a short, vivid story (6-8 sentences) with a clear beginning, middle, and end.'
            },
            execution: {
                mode: 'parallel',
                waitForAll: false,
                aggregateItems: false
            }
        },
        {
            id: 'node-scenes-1',
            type: 'split_text',
            title: 'Split Story Into 3 Scenes',
            provider: 'ClipZap',
            status: 'not_run',
            estimatedTime: '30s',
            config: {
                text: { _type: 'reference', nodeId: 'node-story-1', outputKey: 'text' },
                numSegments: 3
            },
            execution: {
                mode: 'parallel',
                waitForAll: false,
                aggregateItems: false
            }
        },
        {
            id: 'node-narration-1',
            type: 'text_to_text',
            title: 'Narration For All Scenes',
            provider: 'OpenAI',
            status: 'not_run',
            estimatedTime: '10s',
            config: {
                prompt: { _type: 'reference', nodeId: 'node-scenes-1', outputKey: 'items' },
                systemPrompt: 'Write a short narration (2-3 sentences) for the given scene. Return only the narration text.'
            },
            execution: {
                mode: 'parallel',
                waitForAll: false,
                aggregateItems: false
            }
        },
        {
            id: 'node-img-prompt-1',
            type: 'text_to_text',
            title: 'Image Prompts For All Scenes',
            provider: 'OpenAI',
            status: 'not_run',
            estimatedTime: '10s',
            config: {
                prompt: { _type: 'reference', nodeId: 'node-scenes-1', outputKey: 'items' },
                systemPrompt: 'Generate a vivid image generation prompt for this scene. Return only the prompt.'
            },
            execution: {
                mode: 'parallel',
                waitForAll: false,
                aggregateItems: false
            }
        },
        {
            id: 'node-video-prompt-1',
            type: 'text_to_text',
            title: 'Video Prompts For All Scenes',
            provider: 'OpenAI',
            status: 'not_run',
            estimatedTime: '10s',
            config: {
                prompt: { _type: 'reference', nodeId: 'node-scenes-1', outputKey: 'items' },
                systemPrompt: 'Generate a cinematic video motion prompt for this scene. Return only the prompt.'
            },
            execution: {
                mode: 'parallel',
                waitForAll: false,
                aggregateItems: false
            }
        },
        {
            id: 'node-tts-all',
            type: 'text_to_speech',
            title: 'Speech For All Narrations',
            provider: 'Fal AI',
            status: 'not_run',
            estimatedTime: '20s',
            config: {
                text: { _type: 'reference', nodeId: 'node-narration-1', outputKey: 'text' },
                voice: 'Default (auto-selected)',
                model: 'fal-ai/chatterbox/text-to-speech/turbo'
            },
            execution: {
                mode: 'parallel',
                waitForAll: true,
                aggregateItems: false
            }
        },
        {
            id: 'node-img-all',
            type: 'text_to_image',
            title: 'Images For All Scenes',
            provider: 'Fal AI',
            status: 'not_run',
            estimatedTime: '30s',
            config: {
                prompt: { _type: 'reference', nodeId: 'node-img-prompt-1', outputKey: 'text' },
                aspectRatio: '16:9'
            },
            execution: {
                mode: 'parallel',
                waitForAll: true,
                aggregateItems: false
            }
        },
        {
            id: 'node-video-all',
            type: 'image_to_video',
            title: 'Videos For All Scenes',
            provider: 'Runway',
            status: 'not_run',
            estimatedTime: '2min',
            config: {
                imageUrl: { _type: 'reference', nodeId: 'node-img-all', outputKey: 'imageUrl' },
                prompt: { _type: 'reference', nodeId: 'node-video-prompt-1', outputKey: 'text' },
                duration: 5
            },
            execution: {
                mode: 'parallel',
                waitForAll: true,
                aggregateItems: false
            }
        },
        {
            id: 'node-music-1',
            type: 'text_to_music',
            title: 'Story Music',
            provider: 'MiniMax',
            status: 'not_run',
            estimatedTime: '3min',
            config: {
                prompt: { _type: 'reference', nodeId: 'node-story-1', outputKey: 'text' },
                duration: 20
            },
            execution: {
                mode: 'parallel',
                waitForAll: false,
                aggregateItems: false
            }
        },
        {
            id: 'node-final-merge',
            type: 'edit_video',
            title: 'Merge All Scenes + Audio',
            provider: 'FFmpeg',
            status: 'not_run',
            estimatedTime: '2min',
            config: {
                videoUrl: { _type: 'reference', nodeId: 'node-video-all', outputKey: 'videoUrl' },
                speechUrl: { _type: 'reference', nodeId: 'node-tts-all', outputKey: 'audioUrl' },
                musicUrl: { _type: 'reference', nodeId: 'node-music-1', outputKey: 'audioUrl' },
                speechVolume: 1.0,
                musicVolume: 0.3
            },
            execution: {
                mode: 'parallel',
                waitForAll: true,
                aggregateItems: true
            }
        }
    ],
    name: 'Story to Scenes (Parallel Template)',
    lastModified: new Date().toISOString(),
    templateVersion: DEFAULT_TEMPLATE_VERSION,
};

const defaultExecution: ExecutionState = {
    isRunning: false,
    workflowId: null,
    currentNodeId: null,
    error: null,
    results: [],
};

export const useWorkflow = () => {
    const [workflow, setWorkflow] = useState<WorkflowState>(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                if (!parsed || !Array.isArray(parsed.nodes) || parsed.nodes.length === 0) {
                    return normalizeWorkflow(defaultWorkflow);
                }
                if (parsed.templateVersion !== DEFAULT_TEMPLATE_VERSION) {
                    return normalizeWorkflow(defaultWorkflow);
                }
                return normalizeWorkflow(parsed);
            } catch {
                return normalizeWorkflow(defaultWorkflow);
            }
        }
        return normalizeWorkflow(defaultWorkflow);
    });

    const [execution, setExecution] = useState<ExecutionState>(defaultExecution);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [loadedTemplateId, setLoadedTemplateId] = useState<string | null>(null);
    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Undo/Redo history stacks
    const MAX_HISTORY = 50;
    const undoStackRef = useRef<WorkflowState[]>([]);
    const redoStackRef = useRef<WorkflowState[]>([]);
    const [historyVersion, setHistoryVersion] = useState(0); // Force re-render on undo/redo

    // Push current state to undo stack before mutations
    const pushToHistory = useCallback(() => {
        const currentState = JSON.parse(JSON.stringify(workflow));
        undoStackRef.current.push(currentState);
        if (undoStackRef.current.length > MAX_HISTORY) {
            undoStackRef.current.shift();
        }
        // Clear redo stack on new action
        redoStackRef.current = [];
        setHistoryVersion(v => v + 1);
    }, [workflow]);

    // Undo function
    const undo = useCallback(() => {
        if (undoStackRef.current.length === 0) return;

        const previousState = undoStackRef.current.pop()!;
        const currentState = JSON.parse(JSON.stringify(workflow));
        redoStackRef.current.push(currentState);

        setWorkflow(previousState);
        setHistoryVersion(v => v + 1);
    }, [workflow]);

    // Redo function
    const redo = useCallback(() => {
        if (redoStackRef.current.length === 0) return;

        const nextState = redoStackRef.current.pop()!;
        const currentState = JSON.parse(JSON.stringify(workflow));
        undoStackRef.current.push(currentState);

        setWorkflow(nextState);
        setHistoryVersion(v => v + 1);
    }, [workflow]);

    // Computed values for UI
    const canUndo = undoStackRef.current.length > 0;
    const canRedo = redoStackRef.current.length > 0;

    // Keyboard shortcuts for undo/redo
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Check for Cmd+Z (Mac) or Ctrl+Z (Windows)
            const isMod = e.metaKey || e.ctrlKey;
            if (isMod && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Auto-select first node if none selected and nodes exist
    useEffect(() => {
        if (!selectedNodeId && workflow.nodes.length > 0) {
            setSelectedNodeId(workflow.nodes[0].id);
        }
    }, [workflow.nodes, selectedNodeId]);

    // Persist to localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(workflow));
    }, [workflow]);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    const addNode = useCallback((type: NodeType, afterIndex?: number) => {
        pushToHistory();
        setWorkflow(prev => {
            const newNode = createNode(type);
            const nodes = [...prev.nodes];

            if (afterIndex !== undefined) {
                nodes.splice(afterIndex + 1, 0, newNode);
            } else {
                nodes.push(newNode);
            }

            const updatedNodes = nodes;

            return {
                ...prev,
                nodes: updatedNodes,
                lastModified: new Date().toISOString(),
            };
        });
    }, [pushToHistory]);

    const removeNode = useCallback((nodeId: string) => {
        pushToHistory();
        setWorkflow(prev => {
            const nodes = prev.nodes.filter(n => n.id !== nodeId);

            const updatedNodes = nodes;

            return {
                ...prev,
                nodes: updatedNodes,
                lastModified: new Date().toISOString(),
            };
        });
    }, [pushToHistory]);

    const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNodeData>) => {
        pushToHistory();
        setWorkflow(prev => ({
            ...prev,
            nodes: prev.nodes.map(node =>
                node.id === nodeId ? { ...node, ...updates } : node
            ),
            lastModified: new Date().toISOString(),
        }));
    }, [pushToHistory]);

    const moveNode = useCallback((fromIndex: number, toIndex: number) => {
        pushToHistory();
        setWorkflow(prev => {
            const nodes = [...prev.nodes];
            const [removed] = nodes.splice(fromIndex, 1);
            nodes.splice(toIndex, 0, removed);

            const updatedNodes = nodes;

            return {
                ...prev,
                nodes: updatedNodes,
                lastModified: new Date().toISOString(),
            };
        });
    }, [pushToHistory]);

    const clearWorkflow = useCallback(() => {
        setWorkflow(normalizeWorkflow({
            ...defaultWorkflow,
            lastModified: new Date().toISOString(),
        }));
    }, []);

    const renameWorkflow = useCallback((name: string) => {
        setWorkflow(prev => ({
            ...prev,
            name,
            lastModified: new Date().toISOString(),
        }));
    }, []);

    // Load workflow from execution history with node statuses and results
    const loadFromExecution = useCallback(async (workflowId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/workflow/${workflowId}/status`);
            const data = await response.json();

            if (!data || !data.nodeStatuses) {
                throw new Error('Invalid workflow data');
            }

            // detailed logs for debugging
            console.log('[loadFromExecution] Loading workflow:', workflowId);
            console.log('[loadFromExecution] Has snapshot nodes:', !!data.nodes, 'Count:', data.nodes?.length);
            console.log('[loadFromExecution] Has nodeStatuses:', !!data.nodeStatuses, 'Count:', data.nodeStatuses?.length);

            // Use saved nodes snapshot if available, otherwise fall back to nodeStatuses
            // The snapshot (data.nodes) contains the full config at time of execution
            const sourceNodes = data.nodes || data.nodeStatuses;

            if (!sourceNodes) {
                console.error('[loadFromExecution] No nodes found in execution data');
                throw new Error('Invalid workflow data: No nodes found');
            }

            // Build nodes with their statuses and outputs from execution
            const nodesWithStatus = sourceNodes.map((sourceNode: any) => {
                // Find status info (might be in nodeStatuses if we are using sourceNodes from snapshot)
                const statusInfo = data.nodeStatuses?.find((s: any) => s.id === sourceNode.id) ||
                    (sourceNode.status ? sourceNode : null); // Fallback if source is status object

                const result = data.results?.find((r: { nodeId: string }) => r.nodeId === sourceNode.id);
                const output = result?.data?.output as Record<string, unknown> | undefined;

                // Determine outputs from result data
                let outputs: NodeOutput[] | undefined;
                let outputUrl: string | undefined;

                if (output) {
                    outputs = [];
                    const urlFields = ['audioUrl', 'videoUrl', 'imageUrl', 'url', 'musicUrl'];
                    for (const field of urlFields) {
                        if (output[field]) {
                            if (Array.isArray(output[field])) {
                                outputs.push(...(output[field] as string[]).map(url => ({ url, type: 'media' as const })));
                            } else {
                                outputs.push({ url: output[field] as string, type: 'media' as const });
                                if (!outputUrl) outputUrl = output[field] as string;
                            }
                        }
                    }
                    if (output.text) {
                        if (Array.isArray(output.text)) {
                            outputs.push(...(output.text as string[]).map(t => ({ text: t, type: 'text' as const })));
                        } else {
                            outputs.push({ text: output.text as string, type: 'text' as const });
                        }
                    }
                }

                // If loading from snapshot, sourceNode has the config. 
                // If loading from nodeStatuses, it might have partial config or none.
                return {
                    id: sourceNode.id,
                    type: sourceNode.type as NodeType,
                    title: sourceNode.title || statusInfo?.title || sourceNode.id, // Fallback title
                    status: (statusInfo?.status === 'completed' ? 'completed' :
                        statusInfo?.status === 'running' ? 'running' :
                            statusInfo?.status === 'failed' || statusInfo?.status === 'error' ? 'error' : 'not_run') as any,
                    config: sourceNode.config || statusInfo?.config || {},
                    execution: sourceNode.execution || statusInfo?.execution || { mode: 'parallel', waitForAll: false, aggregateItems: false },
                    provider: sourceNode.provider || statusInfo?.provider || 'OpenAI',
                    estimatedTime: sourceNode.estimatedTime || statusInfo?.estimatedTime || '10s',
                    outputs,
                    outputUrl,
                    // Preserve other fields if loading from snapshot
                    mockData: sourceNode.mockData,
                    _mockData: sourceNode._mockData
                };
            });

            // Update workflow state
            setWorkflow({
                nodes: nodesWithStatus,
                name: data.workflowName || 'Loaded Workflow',
                lastModified: new Date().toISOString(),
                templateVersion: DEFAULT_TEMPLATE_VERSION,
            });

            // Update execution state with results
            setExecution({
                isRunning: false,
                workflowId: workflowId,
                currentNodeId: null,
                error: data.status === 'failed' ? data.error || 'Workflow failed' : null,
                results: data.results || [],
            });

            // Select first node
            if (nodesWithStatus.length > 0) {
                setSelectedNodeId(nodesWithStatus[0].id);
            }

            return true;
        } catch (error) {
            console.error('Failed to load from execution:', error);
            return false;
        }
    }, []);

    // Load template into builder
    const loadTemplate = useCallback((templateData: WorkflowState, templateId?: string) => {
        // Reset execution state
        setExecution(defaultExecution);

        // Track the loaded template ID for direct save
        setLoadedTemplateId(templateId || null);

        // Load new workflow state from template
        setWorkflow({
            ...templateData,
            lastModified: new Date().toISOString(),
        });

        // Select first node if available
        if (templateData.nodes.length > 0) {
            setSelectedNodeId(templateData.nodes[0].id);
        }
    }, []);

    // Clear the loaded template ID (e.g., after creating a new workflow)
    const clearLoadedTemplateId = useCallback(() => {
        setLoadedTemplateId(null);
    }, []);

    // Poll for workflow status
    const pollStatus = useCallback(async (workflowId: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/workflow/${workflowId}/status`);
            const data = await response.json();

            if (data.error) {
                setExecution(prev => ({
                    ...prev,
                    error: data.error,
                    isRunning: false,
                }));
                return;
            }

            // Update node statuses and outputs in UI
            if (data.nodeStatuses) {
                setWorkflow(prev => ({
                    ...prev,
                    nodes: prev.nodes.map(node => {
                        const statusInfo = data.nodeStatuses.find((s: { id: string }) => s.id === node.id);
                        // Find result for this node to get output data
                        const result = data.results?.find((r: { nodeId: string, data?: { output?: unknown } }) => r.nodeId === node.id);

                        // Extract outputs from result
                        let outputUrl = node.outputUrl;
                        let outputs: NodeOutput[] | undefined = node.outputs;

                        if (result?.data?.output) {
                            const output = result.data.output as Record<string, unknown>;

                            // Determine output type based on node type
                            const getOutputType = (nodeType: string): 'text' | 'image' | 'video' | 'audio' | 'music' | 'media' => {
                                switch (nodeType) {
                                    case 'text_to_text': return 'text';
                                    case 'text_to_image':
                                    case 'image_to_image': return 'image';
                                    case 'image_to_video':
                                    case 'text_to_video':
                                    case 'edit_video': return 'video';
                                    case 'text_to_speech': return 'audio';
                                    case 'text_to_music': return 'music';
                                    default: return 'media';
                                }
                            };

                            const outputType = getOutputType(node.type);
                            outputs = [];

                            // Handle text output
                            if (output.text) {
                                if (Array.isArray(output.text)) {
                                    outputs.push(...output.text.map((t: string) => ({ text: t, type: 'text' as const })));
                                } else {
                                    outputs.push({ text: output.text as string, type: 'text' as const });
                                }
                            }

                            // Handle URL outputs (various field names from different providers)
                            const urlFields = ['audioUrl', 'videoUrl', 'imageUrl', 'url', 'musicUrl'];
                            for (const field of urlFields) {
                                if (output[field]) {
                                    if (Array.isArray(output[field])) {
                                        outputs.push(...(output[field] as string[]).map(url => ({ url, type: outputType })));
                                    } else {
                                        outputs.push({ url: output[field] as string, type: outputType });
                                    }
                                    // Set legacy outputUrl to first URL for backwards compatibility
                                    if (!outputUrl) {
                                        outputUrl = Array.isArray(output[field])
                                            ? (output[field] as string[])[0]
                                            : output[field] as string;
                                    }
                                    break; // Only use first matching field
                                }
                            }

                            // If no outputs extracted but we have the raw output, try to handle it
                            if (outputs.length === 0 && output) {
                                // Check for nested structures (e.g., items array for parallel)
                                if (output.items && Array.isArray(output.items)) {
                                    outputs = (output.items as Array<Record<string, unknown>>).map(item => ({
                                        url: (item.audioUrl || item.videoUrl || item.imageUrl || item.url) as string | undefined,
                                        text: item.text as string | undefined,
                                        type: outputType
                                    })).filter(o => o.url || o.text);
                                }
                            }
                        }

                        if (statusInfo) {
                            return {
                                ...node,
                                status: statusInfo.status === 'completed' ? 'completed' :
                                    statusInfo.status === 'running' ? 'running' :
                                        statusInfo.status === 'pending' ? 'not_run' :
                                            statusInfo.status === 'failed' || statusInfo.status === 'error' ? 'error' : node.status,
                                outputUrl,
                                outputs: outputs && outputs.length > 0 ? outputs : node.outputs
                            };
                        }
                        // Update outputs even if status info is missing (unlikely but safe)
                        if (outputs && outputs.length > 0) {
                            return { ...node, outputUrl, outputs };
                        }
                        if (outputUrl !== node.outputUrl) {
                            return { ...node, outputUrl };
                        }
                        return node;
                    }),
                }));
            }

            setExecution(prev => ({
                ...prev,
                currentNodeId: data.currentNodeId,
                results: data.results || [],
            }));

            // Stop polling if completed or failed
            if (data.status === 'completed' || data.status === 'failed') {
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
                setExecution(prev => ({
                    ...prev,
                    isRunning: false,
                    error: data.status === 'failed' ? data.error : null,
                }));
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, []);

    // Run the workflow
    const runWorkflow = useCallback(async () => {
        if (workflow.nodes.length === 0) {
            setExecution(prev => ({
                ...prev,
                error: 'No nodes in workflow',
            }));
            return;
        }

        // Reset all node statuses
        setWorkflow(prev => ({
            ...prev,
            nodes: prev.nodes.map(node => ({
                ...node,
                status: 'not_run' as const,
            })),
        }));

        setExecution({
            isRunning: true,
            workflowId: null,
            currentNodeId: null,
            error: null,
            results: [],
        });

        try {
            const response = await fetch(`${BACKEND_URL}/workflow/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodes: workflow.nodes,
                    workflowName: workflow.name,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setExecution(prev => ({
                    ...prev,
                    isRunning: false,
                    error: data.error || 'Failed to start workflow',
                }));
                return;
            }

            setExecution(prev => ({
                ...prev,
                workflowId: data.workflowId,
            }));

            // Start polling for status
            pollingRef.current = setInterval(() => {
                pollStatus(data.workflowId);
            }, 500);

        } catch (error) {
            setExecution(prev => ({
                ...prev,
                isRunning: false,
                error: error instanceof Error ? error.message : 'Failed to connect to backend',
            }));
        }
    }, [workflow.nodes, workflow.name, pollStatus]);

    const stopWorkflow = useCallback(() => {
        if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
        }
        setExecution(prev => ({
            ...prev,
            isRunning: false,
        }));
    }, []);

    // Run workflow starting from a specific node (uses mock data or previous outputs)
    const runFromNode = useCallback(async (nodeId: string) => {
        const nodeIndex = workflow.nodes.findIndex(n => n.id === nodeId);
        if (nodeIndex === -1) {
            setExecution(prev => ({
                ...prev,
                error: 'Node not found',
            }));
            return;
        }

        const startNode = workflow.nodes[nodeIndex];

        // Determine the input data to use
        let inputData: unknown = null;

        // Priority 1: Use mock data if enabled
        if (startNode.mockData?.enabled && startNode.mockData?.data != null) {
            inputData = startNode.mockData.data;
        } else {
            // Priority 2: Use previous nodes' execution results
            // Build a map of previous node outputs from execution results
            const previousOutputs: Record<string, unknown> = {};

            for (let i = 0; i < nodeIndex; i++) {
                const prevNode = workflow.nodes[i];
                const result = execution.results.find(r => r.nodeId === prevNode.id);
                if (result?.success && result.data) {
                    const output = (result.data as { output?: unknown })?.output;
                    if (output) {
                        previousOutputs[prevNode.id] = output;
                    }
                }
            }

            // If we have previous outputs, use them as context
            if (Object.keys(previousOutputs).length > 0) {
                inputData = { previousOutputs };
            }
        }

        // Get nodes from the starting node onwards
        const nodesToRun = workflow.nodes.slice(nodeIndex);

        // Reset statuses for nodes that will run
        setWorkflow(prev => ({
            ...prev,
            nodes: prev.nodes.map((node, idx) => ({
                ...node,
                status: idx >= nodeIndex ? 'not_run' as const : node.status,
            })),
        }));

        setExecution({
            isRunning: true,
            workflowId: null,
            currentNodeId: null,
            error: null,
            results: execution.results.filter(r => {
                // Keep results from nodes before the starting node
                const resultNodeIndex = workflow.nodes.findIndex(n => n.id === r.nodeId);
                return resultNodeIndex < nodeIndex;
            }),
        });

        try {
            const response = await fetch(`${BACKEND_URL}/workflow/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nodes: nodesToRun,
                    workflowName: workflow.name,
                    startFromNodeId: nodeId,
                    mockData: inputData,
                    previousOutputs: inputData && typeof inputData === 'object' && 'previousOutputs' in inputData
                        ? (inputData as { previousOutputs: Record<string, unknown> }).previousOutputs
                        : undefined,
                }),
            });

            const data = await response.json();

            if (!data.success) {
                setExecution(prev => ({
                    ...prev,
                    isRunning: false,
                    error: data.error || 'Failed to start workflow',
                }));
                return;
            }

            setExecution(prev => ({
                ...prev,
                workflowId: data.workflowId,
            }));

            // Start polling for status
            pollingRef.current = setInterval(() => {
                pollStatus(data.workflowId);
            }, 500);

        } catch (error) {
            setExecution(prev => ({
                ...prev,
                isRunning: false,
                error: error instanceof Error ? error.message : 'Failed to connect to backend',
            }));
        }
    }, [workflow.nodes, workflow.name, execution.results, pollStatus]);

    return {
        workflow,
        execution,
        addNode,
        removeNode,
        updateNode,
        moveNode,
        clearWorkflow,
        renameWorkflow,
        loadFromExecution,
        loadTemplate,
        runWorkflow,
        runFromNode,
        stopWorkflow,
        selectedNodeId,
        setSelectedNodeId,
        // Template tracking
        loadedTemplateId,
        setLoadedTemplateId,
        clearLoadedTemplateId,
        // Undo/Redo
        undo,
        redo,
        canUndo,
        canRedo,
    };
};
