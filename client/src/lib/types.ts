export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    generationStep?: string;
    progress?: number;
    files?: ProjectFile[];
    error?: string;
  };
}

export interface ProjectFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
  language?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'generating' | 'ready' | 'error';
  files: ProjectFile[];
  previewUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationProgress {
  progress: number;
  step: string;
  message: string;
}

export interface WebSocketMessage {
  type: 'message' | 'status_update' | 'generation_progress' | 'generation_complete' | 'generation_error';
  data?: any;
  [key: string]: any;
}
