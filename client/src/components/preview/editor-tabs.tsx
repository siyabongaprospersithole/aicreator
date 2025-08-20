import LivePreview from './live-preview';
import { Project, ProjectFile } from '@/lib/types';

interface EditorTabsProps {
  project: Project | null;
  selectedFile: ProjectFile | null;
  activeTab: 'preview' | 'code';
  onTabChange: (tab: 'preview' | 'code') => void;
}

export default function EditorTabs({ project, selectedFile, activeTab, onTabChange }: EditorTabsProps) {
  const openFiles = selectedFile ? [selectedFile] : [];

  return (
    <div className="flex-1 flex flex-col" data-testid="editor-tabs">
      {/* Tabs */}
      <div className="bg-white border-b border-slate-200">
        <div className="flex">
          <button
            onClick={() => onTabChange('preview')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preview'
                ? 'text-primary border-primary bg-blue-50'
                : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
            }`}
            data-testid="tab-preview"
          >
            <i className="fas fa-eye mr-2"></i>Live Preview
          </button>
          {selectedFile && (
            <button
              onClick={() => onTabChange('code')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'code'
                  ? 'text-primary border-primary bg-blue-50'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
              }`}
              data-testid={`tab-${selectedFile.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
            >
              <i className="fas fa-code mr-2"></i>{selectedFile.path.split('/').pop()}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white overflow-hidden">
        {activeTab === 'preview' ? (
          <LivePreview project={project} />
        ) : selectedFile ? (
          <div className="h-full flex flex-col">
            {/* File header */}
            <div className="bg-slate-800 text-slate-300 px-4 py-2 text-sm border-b border-slate-700">
              <i className="fas fa-file-code mr-2"></i>
              {selectedFile.path}
            </div>
            {/* Code content */}
            <div className="flex-1 bg-slate-900 text-slate-100 overflow-auto">
              <pre className="p-4 text-sm leading-relaxed font-mono">
                <code className="whitespace-pre-wrap">{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <i className="fas fa-code text-3xl mb-3"></i>
              <p className="text-lg font-medium mb-2">No File Selected</p>
              <p className="text-sm">Click on a file in the explorer to view its contents</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
