// Core types for the Content Creation module

export type ContentType = "video" | "image" | "audio" | "workflow-only"
export type AspectRatio = "9:16" | "1:1" | "16:9"
export type Language = "English" | "Spanish" | "French" | "German" | "Chinese" | "Japanese"
export type Platform = "YouTube Shorts" | "TikTok" | "Instagram Reels" | "Twitter"
export type QualityMode = "Standard" | "High"
export type ModelType = "Veo 3" | "Kling 2.1" | "PixVerse" | "Stable Diffusion"
export type NodeType =
  | "text-to-video"
  | "image-to-video"
  | "clip-maker"
  | "auto-subtitles"
  | "translator"
  | "format-resize"
  | "face-swap"
  | "avatar-generator"
  | "music-generator"
  | "voiceover"
export type RunStatus = "Queued" | "Running" | "Succeeded" | "Failed"
export type AssetType = "Video" | "Image" | "Audio" | "Subtitle" | "Doc"
export type SourceRights = "Owned" | "Licensed"

export interface Project {
  id: string
  name: string
  description?: string
  contentType: ContentType
  defaultAspectRatio: AspectRatio
  defaultDuration: number
  primaryLanguage: Language
  targetPlatforms: Platform[]
  brandPreset?: string
  tags: string[]
  createdAt: Date
  updatedAt: Date
}

export interface Workflow {
  id: string
  name: string
  projectId: string
  basedOnTemplate?: string
  inputs: WorkflowVariable[]
  outputs: WorkflowOutput[]
  defaultModelProfile?: string
  watermarkPolicy: boolean
  creditBudgetCap?: number
  nodes: WorkflowNode[]
  connections: Connection[]
  createdAt: Date
  updatedAt: Date
}

export interface WorkflowVariable {
  name: string
  type: "text" | "image" | "video" | "audio" | "list"
  defaultValue?: string
  required: boolean
}

export interface WorkflowOutput {
  id: string
  type: "final-video" | "thumbnail" | "srt" | "vtt"
  enabled: boolean
}

export interface Connection {
  id: string
  sourceNodeId: string
  sourceOutput: string
  targetNodeId: string
  targetInput: string
}

export interface WorkflowNode {
  id: string
  name: string
  type: NodeType
  position: { x: number; y: number }
  inputBindings: Record<string, string>
  outputVariableName: string
  model: ModelType
  qualityMode: QualityMode
  retryPolicy?: "none" | "1x" | "3x"
  costEstimate: number
  config: NodeConfig
}

export type NodeConfig =
  | TextToVideoConfig
  | ImageToVideoConfig
  | ClipMakerConfig
  | AutoSubtitlesConfig
  | TranslatorConfig
  | FormatResizeConfig
  | FaceSwapConfig
  | AvatarGeneratorConfig
  | MusicGeneratorConfig
  | VoiceoverConfig

export interface TextToVideoConfig {
  prompt: string
  negativePrompt?: string
  duration: number
  aspectRatio: AspectRatio
  seed?: number
  motionLevel?: number
  cameraStyle?: string
  nativeAudio: boolean
}

export interface ImageToVideoConfig {
  sourceImages: string[]
  prompt?: string
  duration: number
  motionStrength: number
  preserveSubject: boolean
  seed?: number
}

export interface ClipMakerConfig {
  sourceUrl?: string
  sourceUpload?: string
  inTimestamp: number
  outTimestamp: number
  outputDuration: number
  captionsToggle: boolean
}

export interface AutoSubtitlesConfig {
  sourceVideo: string
  language: string
  stylePreset: string
  burnIn: boolean
  exportFormats: ("SRT" | "VTT")[]
}

export interface TranslatorConfig {
  inputText?: string
  inputSubtitles?: string
  targetLanguages: string[]
  preserveTiming: boolean
  glossary?: string
}

export interface FormatResizeConfig {
  inputVideo: string
  targetAspect: AspectRatio
  safeAreaRules: boolean
  backgroundFill: "blur" | "solid" | "black"
  outputBitrate?: number
}

export interface FaceSwapConfig {
  targetVideo: string
  sourceFaceImages: string[]
  faceSelection?: number
  occlusionHandling: boolean
  uhdOptimize: boolean
}

export interface AvatarGeneratorConfig {
  avatarPreset: string
  script: string
  voice: string
  lipSync: boolean
  background?: string
}

export interface MusicGeneratorConfig {
  prompt: string
  genre: string
  mood: string
  bpm: number
  duration: number
  loop: boolean
  mixLevel: number
}

export interface VoiceoverConfig {
  script: string
  voice: string
  speed: number
  emotion: string
  outputFormat: "mp3" | "wav"
}

export interface Generation {
  id: string
  runId: string
  workflowId: string
  workflowName: string
  inputsSnapshot: Record<string, unknown>
  status: RunStatus
  models: ModelType[]
  duration: number
  creditsUsed: number
  watermark: boolean
  outputs: GenerationOutput[]
  error?: string
  retriable: boolean
  createdAt: Date
}

export interface GenerationOutput {
  type: string
  url: string
}

export interface Asset {
  id: string
  file: string
  assetType: AssetType
  title: string
  tags: string[]
  sourceRights?: SourceRights
  licenseInfo?: string
  notes?: string
  createdAt: Date
}

export interface Template {
  id: string
  name: string
  description: string
  category: string
  thumbnail: string
  nodes: Omit<WorkflowNode, "id">[]
  connections: Omit<Connection, "id">[]
  tags: string[]
}

export interface BrandPreset {
  id: string
  name: string
  fonts: { primary: string; secondary: string }
  colors: { primary: string; secondary: string; accent: string }
  logo?: string
  captionStyles: {
    fontFamily: string
    fontSize: number
    textColor: string
    backgroundColor?: string
  }
  outro?: string
}
