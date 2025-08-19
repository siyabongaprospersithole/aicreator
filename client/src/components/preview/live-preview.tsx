import { Project } from '@/lib/types';

interface LivePreviewProps {
  project: Project | null;
}

export default function LivePreview({ project }: LivePreviewProps) {
  if (!project) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center text-slate-400 max-w-md p-8">
          <i className="fas fa-rocket text-4xl mb-4"></i>
          <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
          <p className="text-sm">
            Start a conversation with the AI to generate your first Next.js project. 
            Describe what you want to build and watch the magic happen!
          </p>
        </div>
      </div>
    );
  }

  if (project.status === 'generating') {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <i className="fas fa-cog fa-spin text-white text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Generating Project</h3>
          <p className="text-sm text-slate-600 mb-4">
            AI is analyzing your requirements and creating your Next.js project...
          </p>
          <div className="space-y-2 text-left max-w-xs mx-auto">
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-slate-600">Analyzing requirements</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-slate-600">Generating components</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <span className="text-slate-400">Setting up project structure</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (project.status === 'error') {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Generation Failed</h3>
          <p className="text-sm text-slate-600 mb-4">
            There was an error generating your project. Please try again with a different description.
          </p>
        </div>
      </div>
    );
  }

  if (project.previewUrl) {
    return (
      <div className="h-full" data-testid="live-preview">
        <iframe
          src={project.previewUrl}
          className="w-full h-full border-0"
          title={`Preview of ${project.name}`}
        />
      </div>
    );
  }

  // Request compilation and preview URL for the generated project
  React.useEffect(() => {
    if (project && project.files && project.files.length > 0 && !project.previewUrl) {
      // Request live preview compilation
      fetch(`/api/projects/${project.id}/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        if (data.previewUrl) {
          // The backend should update the project with the preview URL
          // This would trigger a re-render through the project state
          console.log('Preview URL ready:', data.previewUrl);
        }
      })
      .catch(error => {
        console.error('Failed to compile project:', error);
      });
    }
  }, [project]);

  // Show compilation in progress
  if (project && project.files && project.files.length > 0 && !project.previewUrl) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <i className="fas fa-cog fa-spin text-blue-500 text-xl"></i>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">Compiling Project</h3>
          <p className="text-sm text-slate-600 mb-4">
            Setting up your generated project and installing dependencies...
          </p>
          <div className="space-y-2 text-left max-w-xs mx-auto">
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
              <span className="text-slate-600">Installing dependencies</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <span className="text-slate-600">Compiling components</span>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
              <span className="text-slate-400">Starting development server</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Fallback: Show file browser and code preview when live preview isn't available
  return (
    <div className="h-full bg-white overflow-hidden" data-testid="code-browser">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                Generated Files
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                onClick={() => window.open(`/api/projects/${project.id}/download`, '_blank')}
              >
                <i className="fas fa-download mr-2"></i>Download
              </button>
            </div>
          </div>
        </div>

        {/* File Browser */}
        <div className="flex-1 p-6 bg-slate-50 overflow-auto">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* File Tree */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Project Structure</h3>
                </div>
                <div className="p-4 max-h-96 overflow-auto">
                  {project.files?.map((file, index) => (
                    <div key={index} className="flex items-center space-x-2 py-1 text-sm">
                      <i className={`fas ${file.path.includes('.') ? 'fa-file-code' : 'fa-folder'} text-slate-400`}></i>
                      <span className="text-slate-700">{file.path}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Files Preview */}
              <div className="bg-white rounded-lg shadow-sm border border-slate-200">
                <div className="p-4 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-900">Key Files</h3>
                </div>
                <div className="p-4 space-y-4 max-h-96 overflow-auto">
                  {project.files?.slice(0, 3).map((file, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg">
                      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                        <code className="text-sm font-mono text-slate-600">{file.path}</code>
                      </div>
                      <div className="p-3">
                        <pre className="text-xs text-slate-600 overflow-hidden">
                          {file.content.substring(0, 200)}...
                        </pre>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                <div>
                  <p className="text-sm font-medium text-blue-900">Live Preview Pending</p>
                  <p className="text-sm text-blue-700 mt-1">
                    The project files have been generated successfully. Download the files to run locally, or the live preview will be available once compilation completes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
