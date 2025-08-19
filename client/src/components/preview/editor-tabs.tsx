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
            <i className="fas fa-eye mr-2"></i>Preview
          </button>
          {openFiles.map((file) => (
            <button
              key={file.path}
              onClick={() => onTabChange('code')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'code'
                  ? 'text-primary border-primary bg-blue-50'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:bg-slate-50'
              }`}
              data-testid={`tab-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
            >
              <i className="fas fa-code mr-2"></i>{file.path}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white overflow-hidden">
        {activeTab === 'preview' ? (
          <LivePreview project={project} />
        ) : selectedFile ? (
          <div className="h-full">
            <div className="h-full bg-slate-900 text-slate-100 p-4 overflow-auto code-editor">
              <pre className="text-sm leading-relaxed">
                <code>{selectedFile.content}</code>
              </pre>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <i className="fas fa-code text-3xl mb-3"></i>
              <p>Select a file to view its contents</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
