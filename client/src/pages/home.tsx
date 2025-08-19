import { useState, useEffect } from 'react';
import { useParams } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import ChatSidebar from '@/components/chat/chat-sidebar';
import CodePreview from '@/components/preview/code-preview';
import { Project } from '@/lib/types';
import { useWebSocket } from '@/hooks/use-websocket';

export default function Home() {
  const { id: projectId } = useParams<{ id?: string }>();
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const { lastMessage } = useWebSocket(projectId);

  const { data: project } = useQuery({
    queryKey: ['/api/projects', projectId],
    enabled: !!projectId,
  });

  const { data: projects } = useQuery({
    queryKey: ['/api/projects'],
    enabled: !projectId,
  });

  useEffect(() => {
    if (project) {
      setCurrentProject(project);
    } else if (projects && Array.isArray(projects) && projects.length > 0) {
      setCurrentProject(projects[0] as Project);
    }
  }, [project, projects]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      if (lastMessage.type === 'generation_complete' && lastMessage.project) {
        setCurrentProject(lastMessage.project);
      }
    }
  }, [lastMessage]);

  return (
    <div className="h-screen overflow-hidden bg-slate-50" data-testid="main-layout">
      {/* Mobile responsive overlay */}
      <div className="lg:hidden fixed inset-0 bg-white z-40 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-desktop text-white text-xl"></i>
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Desktop Experience Required</h2>
          <p className="text-slate-600 mb-4">
            The Project Generator is optimized for desktop development workflows. Please access from a larger screen for the full experience.
          </p>
          <div className="flex space-x-2 text-sm text-slate-500">
            <span>Minimum: 1024px width</span>
          </div>
        </div>
      </div>

      {/* Main Layout */}
      <div className="hidden lg:flex h-screen">
        <ChatSidebar project={currentProject} />
        <CodePreview project={currentProject} />
      </div>
    </div>
  );
}
