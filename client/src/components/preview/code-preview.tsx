import { useState } from 'react';
import FileExplorer from './file-explorer';
import EditorTabs from './editor-tabs';
import { Project, ProjectFile } from '@/lib/types';
import { useMutation } from '@tanstack/react-query';

interface CodePreviewProps {
  project: Project | null;
}

export default function CodePreview({ project }: CodePreviewProps) {
  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  const downloadMutation = useMutation({
    mutationFn: async (projectId: string) => {
      const response = await fetch(`/api/projects/${projectId}/download`);
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project?.name || 'project'}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  });

  const handleDownload = () => {
    if (project?.id) {
      downloadMutation.mutate(project.id);
    }
  };

  const getStatusIndicator = () => {
    if (!project) return null;
    
    switch (project.status) {
      case 'generating':
        return (
          <div className="flex items-center space-x-2 text-sm text-slate-600">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Building...</span>
          </div>
        );
      case 'ready':
        return (
          <div className="flex items-center space-x-2 text-sm text-emerald-600">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span>Ready</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center space-x-2 text-sm text-red-600">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Error</span>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50" data-testid="code-preview">
      {/* Preview Header */}
      <div className="bg-white border-b border-slate-200 p-4" data-testid="preview-header">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold text-slate-900">
                {project?.name || 'No Project'}
              </h2>
              {project?.status === 'ready' && (
                <span className="text-xs bg-accent text-white px-2 py-1 rounded-full">
                  Live Preview
                </span>
              )}
            </div>
            {getStatusIndicator()}
          </div>
          <div className="flex items-center space-x-2">
            {project?.previewUrl && (
              <button 
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                onClick={() => window.open(project.previewUrl, '_blank')}
                data-testid="button-external-link"
              >
                <i className="fas fa-external-link-alt"></i>
              </button>
            )}
            <button 
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              data-testid="button-refresh"
            >
              <i className="fas fa-refresh"></i>
            </button>
            <button
              onClick={handleDownload}
              disabled={!project || project.status !== 'ready' || downloadMutation.isPending}
              className="px-3 py-2 bg-primary text-white text-sm rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-download"
            >
              <i className="fas fa-download mr-2"></i>
              {downloadMutation.isPending ? 'Downloading...' : 'Download ZIP'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* File Explorer */}
        <FileExplorer
          files={project?.files || []}
          selectedFile={selectedFile}
          onFileSelect={setSelectedFile}
        />

        {/* Editor and Preview Tabs */}
        <EditorTabs
          project={project}
          selectedFile={selectedFile}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>
    </div>
  );
}
