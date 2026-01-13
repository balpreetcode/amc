export interface MockDataConfig {
  enabled: boolean;
  data: unknown;  // Single JSON object or array of JSON objects for parallel execution
}

// Provider types for node configuration
export type ProviderType = 'openai' | 'fal-ai' | 'ffmpeg';

export interface ProviderConfig {
  provider: ProviderType;
  model?: string;
  endpoint?: string;  // Custom endpoint override
}

export interface ApiConfig {
  requestFormat: 'json' | 'form-data';
  headers: Record<string, string>;  // Custom headers with {{variable}} support
  responseType: 'sync' | 'async';   // sync=immediate response, async=polling
}

// Output type for different node results
export type OutputType = 'text' | 'image' | 'video' | 'audio' | 'music' | 'media';

// Single output item (can have URL, text, or both)
export interface NodeOutput {
  url?: string;
  text?: string;
  type: OutputType;
}

export interface WorkflowNodeData {
  id: string;
  type: NodeType;
  title: string;
  provider: string;
  status: 'not_run' | 'running' | 'completed' | 'error';
  estimatedTime: string;
  config?: Record<string, unknown>;
  execution?: NodeExecutionConfig;
  mockData?: MockDataConfig;
  providerConfig?: ProviderConfig;
  apiConfig?: ApiConfig;
  outputUrl?: string;  // Legacy: single output URL (kept for backwards compatibility)
  outputs?: NodeOutput[];  // New: array of outputs (supports parallel execution)
}

export type ExecutionMode = 'parallel' | 'sequential';

export interface NodeExecutionConfig {
  mode: ExecutionMode;
  waitForAll: boolean;
  aggregateItems: boolean;
}

export type NodeType =
  | 'face_swap'
  | 'image_to_video'
  | 'text_to_image'
  | 'text_to_video'
  | 'text_to_text'
  | 'image_to_image'
  | 'text_to_music'
  | 'text_to_speech'
  | 'enhancer'
  | 'split_text'
  | 'lip_sync'
  | 'ai_avatar'
  | 'image_object_removal'
  | 'image_remove_background'
  | 'video_sound_effects'
  | 'edit_video'
  | 'upload_files'
  | 'clip_merger'
  | 'media_ingest';

export interface NodeTypeConfig {
  type: NodeType;
  label: string;
  icon: string;
  defaultProvider: string;
  defaultTime: string;
  category: 'input' | 'generation' | 'processing' | 'output';
}

export const NODE_TYPES: NodeTypeConfig[] = [
  { type: 'upload_files', label: 'Upload Files', icon: '📤', defaultProvider: 'Local', defaultTime: '5s', category: 'input' },
  { type: 'text_to_text', label: 'Text To Text', icon: '📝', defaultProvider: 'OpenAI', defaultTime: '10s', category: 'generation' },
  { type: 'text_to_image', label: 'Text To Image', icon: '🖼️', defaultProvider: 'Fal AI', defaultTime: '30s', category: 'generation' },
  { type: 'text_to_video', label: 'Text To Video', icon: '📹', defaultProvider: 'Google', defaultTime: '5min', category: 'generation' },
  { type: 'text_to_music', label: 'Text To Music', icon: '🎵', defaultProvider: 'MiniMax', defaultTime: '3min', category: 'generation' },
  { type: 'text_to_speech', label: 'Text To Speech', icon: '🔊', defaultProvider: 'Fal AI', defaultTime: '20s', category: 'generation' },
  { type: 'image_to_video', label: 'Image To Video', icon: '🎬', defaultProvider: 'Runway', defaultTime: '2min', category: 'generation' },
  { type: 'image_to_image', label: 'Image To Image', icon: '🔄', defaultProvider: 'Fal AI', defaultTime: '30s', category: 'processing' },
  { type: 'face_swap', label: 'Face Swap', icon: '🎭', defaultProvider: 'InsightFace', defaultTime: '45s', category: 'processing' },
  { type: 'lip_sync', label: 'Lip Sync', icon: '👄', defaultProvider: 'KlingAI', defaultTime: '10min', category: 'processing' },
  { type: 'ai_avatar', label: 'AI Avatar', icon: '🤖', defaultProvider: 'HeyGen', defaultTime: '3min', category: 'generation' },
  { type: 'enhancer', label: 'Enhancer', icon: '✨', defaultProvider: 'Topaz', defaultTime: '1min', category: 'processing' },
  { type: 'split_text', label: 'Split Text', icon: '✂️', defaultProvider: 'ClipZap', defaultTime: '30s', category: 'processing' },
  { type: 'image_object_removal', label: 'Object Removal', icon: '🗑️', defaultProvider: 'Remove.bg', defaultTime: '15s', category: 'processing' },
  { type: 'image_remove_background', label: 'Remove Background', icon: '🎨', defaultProvider: 'Remove.bg', defaultTime: '10s', category: 'processing' },
  { type: 'video_sound_effects', label: 'Sound Effects', icon: '🔉', defaultProvider: 'Epidemic', defaultTime: '30s', category: 'processing' },
  { type: 'edit_video', label: 'Edit Video', icon: '✏️', defaultProvider: 'FFmpeg', defaultTime: '2min', category: 'processing' },
  { type: 'clip_merger', label: 'Clip Merger', icon: '🔗', defaultProvider: 'FFmpeg', defaultTime: '1min', category: 'output' },
  // Hidden until OAuth integration is complete:
  // { type: 'media_ingest', label: 'Media Import', icon: '📥', defaultProvider: 'Import', defaultTime: '30s', category: 'input' },
];

// Provider-specific node type mappings
export const PROVIDER_NODE_TYPES: Record<ProviderType, NodeType[]> = {
  'openai': ['text_to_text', 'text_to_image', 'image_to_image'],
  'fal-ai': ['text_to_speech', 'text_to_image', 'image_to_image', 'text_to_video', 'image_to_video', 'text_to_music'],
  'ffmpeg': ['edit_video', 'clip_merger']
};

export interface ModelProviderInfo {
  model: string;              // Model ID used in API calls (e.g., 'fal-ai/flux/schnell')
  provider: string;           // Internal provider key (e.g., 'fal-ai', 'openai')
  displayName: string;        // Provider display name (e.g., 'Fal AI', 'OpenAI')
  modelDisplayName: string;   // Model display name shown in dropdown (e.g., 'Flux', 'GPT-4o')
}

export const NODE_MODEL_PROVIDERS: Record<NodeType, ModelProviderInfo[]> = {
  'text_to_text': [
    { model: 'gpt-4o', provider: 'openai', displayName: 'OpenAI', modelDisplayName: 'GPT-4o' },
    { model: 'gpt-4o-mini', provider: 'openai', displayName: 'OpenAI', modelDisplayName: 'GPT-4o Mini' },
    { model: 'claude-3-opus', provider: 'anthropic', displayName: 'Anthropic', modelDisplayName: 'Claude 3 Opus' },
    { model: 'claude-3-sonnet', provider: 'anthropic', displayName: 'Anthropic', modelDisplayName: 'Claude 3 Sonnet' },
  ],
  'text_to_image': [
    { model: 'fal-ai/flux/schnell', provider: 'fal-ai', displayName: 'Fal AI', modelDisplayName: 'Flux Schnell' },
    { model: 'fal-ai/z-image/turbo', provider: 'fal-ai', displayName: 'Fal AI', modelDisplayName: 'Z-Image Turbo' },
    { model: 'dall-e-3', provider: 'openai', displayName: 'OpenAI', modelDisplayName: 'DALL-E 3' },
  ],
  'text_to_video': [
    { model: 'fal-ai/ltxv-13b-098-distilled', provider: 'fal-ai', displayName: 'Fal AI', modelDisplayName: 'LTXV 13B' },
    { model: 'fal-ai/wan/v2.1/text-to-video', provider: 'fal-ai', displayName: 'Fal AI', modelDisplayName: 'WAN v2.1' },
  ],
  'text_to_music': [
    { model: 'fal-ai/stable-audio', provider: 'fal-ai', displayName: 'Fal AI', modelDisplayName: 'Stable Audio' },
    { model: 'fal-ai/minimax/music-01', provider: 'fal-ai', displayName: 'MiniMax', modelDisplayName: 'MiniMax Music' },
  ],
  'text_to_speech': [
    { model: 'fal-ai/chatterbox/text-to-speech/turbo', provider: 'fal-ai', displayName: 'Fal AI', modelDisplayName: 'Chatterbox TTS' },
    { model: 'fal-ai/playht/tts/v3', provider: 'fal-ai', displayName: 'PlayHT', modelDisplayName: 'PlayHT v3' },
    { model: 'openai/tts-1', provider: 'openai', displayName: 'OpenAI', modelDisplayName: 'TTS-1' },
    { model: 'openai/gpt-4o-mini-tts', provider: 'openai', displayName: 'OpenAI', modelDisplayName: 'GPT-4o Mini TTS' },
  ],
  'image_to_video': [
    { model: 'fal-ai/ltxv-13b-098-distilled/image-to-video', provider: 'fal-ai', displayName: 'Fal AI', modelDisplayName: 'LTXV Image-to-Video' },
    { model: 'fal-ai/wan/v2.1/image-to-video', provider: 'fal-ai', displayName: 'Fal AI', modelDisplayName: 'WAN Image-to-Video' },
  ],
  'image_to_image': [
    { model: 'fal-ai/stable-diffusion-v3-medium', provider: 'fal-ai', displayName: 'Fal AI', modelDisplayName: 'Stable Diffusion v3' },
    { model: 'openai/dall-e-2', provider: 'openai', displayName: 'OpenAI', modelDisplayName: 'DALL-E 2' },
  ],
  // Non-model nodes with default providers
  'face_swap': [
    { model: 'default', provider: 'insightface', displayName: 'InsightFace', modelDisplayName: 'InsightFace' },
  ],
  'lip_sync': [
    { model: 'SadTalker', provider: 'sadtalker', displayName: 'SadTalker', modelDisplayName: 'SadTalker' },
    { model: 'HeyGen', provider: 'heygen', displayName: 'HeyGen', modelDisplayName: 'HeyGen' },
    { model: 'SyncLabs', provider: 'synclabs', displayName: 'SyncLabs', modelDisplayName: 'SyncLabs' },
  ],
  'ai_avatar': [
    { model: 'default', provider: 'heygen', displayName: 'HeyGen', modelDisplayName: 'HeyGen Avatar' },
  ],
  'enhancer': [
    { model: 'default', provider: 'topaz', displayName: 'Topaz', modelDisplayName: 'Topaz Enhancer' },
  ],
  'split_text': [
    { model: 'default', provider: 'internal', displayName: 'AMC', modelDisplayName: 'Text Splitter' },
  ],
  'image_object_removal': [
    { model: 'default', provider: 'remove-bg', displayName: 'Remove.bg', modelDisplayName: 'Object Removal' },
  ],
  'image_remove_background': [
    { model: 'default', provider: 'remove-bg', displayName: 'Remove.bg', modelDisplayName: 'Background Removal' },
  ],
  'video_sound_effects': [
    { model: 'default', provider: 'epidemic', displayName: 'Epidemic Sound', modelDisplayName: 'Epidemic SFX' },
  ],
  'edit_video': [
    { model: 'default', provider: 'ffmpeg', displayName: 'FFmpeg', modelDisplayName: 'FFmpeg Editor' },
  ],
  'upload_files': [
    { model: 'default', provider: 'local', displayName: 'Local', modelDisplayName: 'File Upload' },
  ],
  'clip_merger': [
    { model: 'default', provider: 'ffmpeg', displayName: 'FFmpeg', modelDisplayName: 'Clip Merger' },
  ],
  'media_ingest': [
    { model: 'google-drive', provider: 'google', displayName: 'Google Drive', modelDisplayName: 'Google Drive' },
    { model: 'dropbox', provider: 'dropbox', displayName: 'Dropbox', modelDisplayName: 'Dropbox' },
    { model: 's3', provider: 'aws', displayName: 'AWS S3', modelDisplayName: 'AWS S3' },
    { model: 'local', provider: 'local', displayName: 'Local Upload', modelDisplayName: 'Local Upload' },
    { model: 'url', provider: 'url', displayName: 'Direct Link', modelDisplayName: 'Direct URL' },
  ],
};

export const getNodeTypeConfig = (type: NodeType): NodeTypeConfig => {
  return NODE_TYPES.find(n => n.type === type) || NODE_TYPES[0];
};

export const createNode = (type: NodeType): WorkflowNodeData => {
  const config = getNodeTypeConfig(type);
  return {
    id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title: config.label,
    provider: config.defaultProvider,
    status: 'not_run',
    estimatedTime: config.defaultTime,
    config: {},
    execution: {
      mode: 'sequential',
      waitForAll: false,
      aggregateItems: false
    }
  };
};

// Derive provider display name from model string and node type
export const getProviderFromModel = (model: string | undefined, nodeType: NodeType): string => {
  // Check localStorage for user overrides first
  try {
    const savedOverrides = localStorage.getItem('providerDisplayNameOverrides');
    if (savedOverrides && model) {
      const overrides = JSON.parse(savedOverrides);
      if (overrides[nodeType]?.[model]) {
        return overrides[nodeType][model];
      }
    }
  } catch (e) {
    // Ignore localStorage errors (e.g., SSR, parsing errors)
  }

  // Use the comprehensive mapping if available
  if (model) {
    const providers = NODE_MODEL_PROVIDERS[nodeType];
    if (providers) {
      const match = providers.find(p => p.model === model);
      if (match) {
        return match.displayName;
      }
    }
  }

  // Fallback logic for models not in mapping or if model is undefined

  // FFmpeg nodes
  if (nodeType === 'edit_video' || nodeType === 'clip_merger') {
    return 'FFmpeg';
  }

  // AMC internal nodes (not ClipZap)
  if (nodeType === 'split_text') {
    return 'AMC';
  }

  // Media ingest nodes
  if (nodeType === 'media_ingest') {
    return 'Import';
  }

  // If no model specified, return Others
  if (!model) {
    return 'Others';
  }

  const modelLower = model.toLowerCase();

  // Fal AI models
  if (modelLower.startsWith('fal-ai/') || modelLower.startsWith('fal-ai')) {
    return 'Fal AI';
  }

  // OpenAI models
  if (modelLower.startsWith('openai/') ||
    modelLower.includes('gpt') ||
    modelLower.includes('dall-e') ||
    modelLower.includes('tts-1') ||
    modelLower.includes('whisper')) {
    return 'OpenAI';
  }

  return 'Others';
};

export const getProviderDisplayName = (model: string, nodeType: NodeType): string => {
  return getProviderFromModel(model, nodeType);
};

// Storage key for model display name overrides
const MODEL_DISPLAY_NAME_OVERRIDES_KEY = 'modelDisplayNameOverrides';

// Get the display name for a model (shown in dropdown)
export const getModelDisplayName = (model: string, nodeType: NodeType): string => {
  // Check localStorage for user overrides first
  try {
    const savedOverrides = localStorage.getItem(MODEL_DISPLAY_NAME_OVERRIDES_KEY);
    if (savedOverrides) {
      const overrides = JSON.parse(savedOverrides);
      if (overrides[nodeType]?.[model]) {
        return overrides[nodeType][model];
      }
    }
  } catch (e) {
    // Ignore localStorage errors
  }

  // Use the mapping if available
  const providers = NODE_MODEL_PROVIDERS[nodeType];
  if (providers) {
    const match = providers.find(p => p.model === model);
    if (match) {
      return match.modelDisplayName;
    }
  }

  // Fallback to the raw model string
  return model;
};
