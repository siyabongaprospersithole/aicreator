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

  if (project.status === "ready" && project.previewUrl) {
    return (
      <div className="h-full bg-white flex flex-col" data-testid="live-preview">
        <div className="flex-shrink-0 bg-slate-100 border-b border-slate-200 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-sm text-slate-600">Live Preview</span>
            <code className="text-xs bg-slate-200 px-2 py-1 rounded text-slate-700">
              {project.previewUrl}
            </code>
          </div>
          <button
            className="text-xs bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 transition-colors"
            onClick={() => window.open(project.previewUrl, '_blank')}
          >
            Open in New Tab
          </button>
        </div>
        <iframe
          src={project.previewUrl}
          className="flex-1 w-full border-0"
          title={`${project.name} Preview`}
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation"
          onLoad={() => console.log("Preview loaded")}
        />
      </div>
    );
  }

  // Mock preview for demo when no live URL available
  return (
    <div className="h-full bg-white overflow-hidden" data-testid="mock-preview">
      <div className="h-full flex flex-col">
        {/* Mock App Header */}
        <div className="bg-white border-b border-slate-200 p-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold text-slate-900">{project.name}</h1>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 text-xs font-semibold">U</span>
                </div>
                <span className="text-sm text-slate-600">User</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-2 bg-primary text-white text-sm rounded-lg">
                <i className="fas fa-plus mr-2"></i>New Item
              </button>
            </div>
          </div>
        </div>

        {/* Mock Content Area */}
        <div className="flex-1 p-6 bg-slate-50 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Welcome to {project.name}</h2>
              <p className="text-slate-600 mb-6">
                Your project has been generated successfully! This is a preview of your application.
                The actual implementation includes all the components and functionality specified in your requirements.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {['Component 1', 'Component 2', 'Component 3', 'Component 4', 'Component 5', 'Component 6'].map((item, index) => (
                  <div key={index} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3 mb-3">
                      <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                        <i className="fas fa-cube text-white text-sm"></i>
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-900">{item}</h3>
                        <p className="text-xs text-slate-500">React Component</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">
                      This component is part of your generated project structure.
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <i className="fas fa-info-circle text-blue-500 mt-0.5"></i>
                  <div>
                    <p className="text-sm font-medium text-blue-900">Ready for Development</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Download the project files to continue development locally. All dependencies and configurations are included.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}