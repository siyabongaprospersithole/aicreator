import { useState } from 'react';
import { ProjectFile } from '@/lib/types';

interface FileExplorerProps {
  files: ProjectFile[];
  selectedFile: ProjectFile | null;
  onFileSelect: (file: ProjectFile | null) => void;
}

export default function FileExplorer({ files, selectedFile, onFileSelect }: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['']));

  const getFileIcon = (file: ProjectFile) => {
    if (file.type === 'directory') {
      return 'fas fa-folder text-blue-500';
    }

    const ext = file.path.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'tsx':
      case 'ts':
        return 'fas fa-file-code text-blue-500';
      case 'js':
      case 'jsx':
        return 'fas fa-file-code text-yellow-500';
      case 'css':
      case 'scss':
        return 'fas fa-file-code text-pink-500';
      case 'json':
        return 'fas fa-file-code text-green-500';
      case 'md':
        return 'fas fa-file-alt text-gray-500';
      default:
        return 'fas fa-file text-slate-400';
    }
  };

  const buildFileTree = (files: ProjectFile[]) => {
    const tree: { [key: string]: ProjectFile[] } = { '': [] };
    
    files.forEach(file => {
      const pathParts = file.path.split('/');
      const fileName = pathParts.pop() || '';
      const dirPath = pathParts.join('/');
      
      if (!tree[dirPath]) {
        tree[dirPath] = [];
      }
      
      tree[dirPath].push({
        ...file,
        path: fileName,
      });
    });

    // Sort files: directories first, then files alphabetically
    Object.keys(tree).forEach(dir => {
      tree[dir].sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.path.localeCompare(b.path);
      });
    });

    return tree;
  };

  const toggleFolder = (folderPath: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderPath)) {
      newExpanded.delete(folderPath);
    } else {
      newExpanded.add(folderPath);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFileTree = (files: ProjectFile[], level = 0, parentPath = '') => {
    return files.map((file, index) => {
      const fullPath = parentPath ? `${parentPath}/${file.path}` : file.path;
      const isSelected = selectedFile?.path === fullPath;
      const isDirectory = file.type === 'directory';
      const isExpanded = expandedFolders.has(fullPath);

      return (
        <div key={`${fullPath}-${index}`} className="select-none">
          <div
            className={`flex items-center space-x-2 p-2 hover:bg-slate-50 rounded cursor-pointer ${
              isSelected ? 'bg-blue-50 border-l-2 border-primary' : ''
            }`}
            style={{ paddingLeft: `${0.5 + level * 0.75}rem` }}
            onClick={() => {
              if (isDirectory) {
                toggleFolder(fullPath);
              } else {
                // Find the original file from the files prop using the full path
                const originalFile = files.find(f => f.path === fullPath) || null;
                onFileSelect(originalFile);
              }
            }}
            data-testid={`file-${file.path.replace(/[^a-zA-Z0-9]/g, '-')}`}
          >
            {isDirectory && (
              <i 
                className={`fas fa-chevron-right text-xs text-slate-400 transition-transform ${
                  isExpanded ? 'rotate-90' : ''
                }`}
              />
            )}
            <i className={`${getFileIcon(file)} text-xs`}></i>
            <span className={`text-slate-700 text-sm ${isSelected ? 'font-medium' : ''}`}>
              {file.path.split('/').pop()}
            </span>
            {isSelected && file.type === 'file' && (
              <span className="text-xs text-emerald-600 ml-auto">●</span>
            )}
          </div>
        </div>
      );
    });
  };

  if (files.length === 0) {
    return (
      <div className="w-64 bg-white border-r border-slate-200 flex flex-col" data-testid="file-explorer">
        <div className="p-3 border-b border-slate-200">
          <h3 className="text-sm font-medium text-slate-700">Project Files</h3>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center text-slate-400">
            <i className="fas fa-folder-open text-2xl mb-2"></i>
            <p className="text-sm">No files yet</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col" data-testid="file-explorer">
      <div className="p-3 border-b border-slate-200">
        <h3 className="text-sm font-medium text-slate-700">Project Files</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-2 text-sm">
        {renderFileTree(files)}
      </div>
    </div>
  );
}
