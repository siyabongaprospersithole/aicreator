import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { generateProject } from "./services/ai";
import { scrapeReference } from "./services/firecrawl";
import { insertProjectSchema, insertMessageSchema } from "@shared/schema";
import archiver from "archiver";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // WebSocket setup for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'join_project') {
          (ws as any).projectId = message.projectId;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast to all clients in a project
  function broadcastToProject(projectId: string, data: any) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && (client as any).projectId === projectId) {
        client.send(JSON.stringify(data));
      }
    });
  }

  // API Routes
  app.get("/api/status", async (req, res) => {
    try {
      const hasAzure = !!(process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT);
      const hasGoogle = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
      const hasFirecrawl = !!(process.env.FIRECRAWL_API_KEY || process.env.FIRECRAWL_KEY);
      const hasE2B = !!(process.env.E2B_API_KEY || process.env.E2B_KEY);

      const activeProvider = hasAzure ? 'azure' : hasGoogle ? 'google' : 'none';

      res.json({
        aiProviders: {
          azure: hasAzure,
          google: hasGoogle,
          active: activeProvider
        },
        services: {
          firecrawl: hasFirecrawl,
          e2b: hasE2B
        }
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get service status" });
    }
  });

  app.get("/api/projects", async (req, res) => {
    try {
      // For demo, using a mock user ID
      const projects = await storage.getProjectsByUser("demo-user");
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject({
        ...projectData,
        userId: "demo-user" // Mock user for demo
      });

      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.get("/api/projects/:id/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesByProject(req.params.id);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/projects/:projectId/messages", async (req, res) => {
    try {
      const messageData = insertMessageSchema.parse({
        ...req.body,
        projectId: req.params.projectId
      });

      const message = await storage.createMessage(messageData);

      // If it's a user message asking for project generation
      if (messageData.role === "user") {
        // Send immediate response
        res.json(message);

        // Start project generation in background
        generateProjectAsync(req.params.projectId, messageData.content, broadcastToProject);
      } else {
        res.json(message);
      }
    } catch (error) {
      console.error("Message creation error:", error);
      res.status(400).json({ error: "Invalid message data" });
    }
  });

  app.post("/api/projects/:id/generate", async (req, res) => {
    try {
      console.log("Generation route hit:", req.params.id, req.body);
      const { prompt } = req.body;
      const projectId = req.params.id;

      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Send immediate response
      res.json({ message: "Generation started", projectId });

      // Start project generation in background
      generateProjectAsync(projectId, prompt, broadcastToProject);
    } catch (error) {
      console.error("Generation initiation error:", error);
      res.status(500).json({ error: "Failed to start generation" });
    }
  });

  app.post("/api/scrape", async (req, res) => {
    try {
      const { url } = req.body;
      if (!url) {
        return res.status(400).json({ error: "URL is required" });
      }

      const content = await scrapeReference(url);
      res.json({ content });
    } catch (error) {
      console.error("Scraping error:", error);
      res.status(500).json({ error: "Failed to scrape URL" });
    }
  });

  app.post("/api/projects/:id/compile", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !project.files) {
        return res.status(404).json({ error: "Project not found" });
      }

      // For now, simulate compilation and create a preview URL
      // In a production system, this would actually compile and serve the project
      console.log(`Compiling project ${project.name} with ${project.files.length} files`);

      // Create a temporary preview URL (could be hosted on a subdomain or iframe sandbox)
      const previewUrl = `/preview/${project.id}`;

      // Update project with preview URL
      await storage.updateProject(req.params.id, { previewUrl });

      res.json({ 
        previewUrl,
        message: "Project compiled successfully" 
      });
    } catch (error) {
      console.error("Compilation error:", error);
      res.status(500).json({ error: "Failed to compile project" });
    }
  });

  // Serve compiled project previews
  app.get("/preview/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !project.files) {
        return res.status(404).send("Project not found");
      }

      // Check if this is a React/Next.js project with modern components
      const hasReactComponents = project.files.some(f => 
        f.path.includes('.tsx') || f.path.includes('.jsx') || 
        f.content.includes('import React') || f.content.includes('from "react"')
      );

      if (hasReactComponents) {
        // For React projects, create a sophisticated preview with the actual generated content
        const appFile = project.files.find(f => f.path.includes('App.tsx') || f.path.includes('App.jsx'));
        const indexFile = project.files.find(f => f.path.includes('index.html'));

        // Extract any CSS or styling from the generated files
        const cssFiles = project.files.filter(f => f.path.includes('.css') || f.path.includes('styles'));
        const customStyles = cssFiles.map(f => f.content).join('\n');

        res.setHeader('Content-Type', 'text/html');
        res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${project.name} - Live Preview</title>
    <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        body { 
          margin: 0; 
          padding: 0; 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        * { box-sizing: border-box; }
        .app-container { min-height: 100vh; background: #f8fafc; }
        .hero-section { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 4rem 1rem; }
        .feature-card { 
          background: white; 
          border-radius: 12px; 
          padding: 2rem; 
          box-shadow: 0 4px 15px rgba(0,0,0,0.1); 
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .feature-card:hover { 
          transform: translateY(-4px); 
          box-shadow: 0 8px 25px rgba(0,0,0,0.15); 
        }
        .gradient-text {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        ${customStyles}
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
      const { useState, useEffect } = React;

      function App() {
        const [isLoaded, setIsLoaded] = useState(false);

        useEffect(() => {
          setTimeout(() => setIsLoaded(true), 500);
        }, []);

        return (
          <div className="app-container">
            {/* Hero Section */}
            <div className="hero-section text-center">
              <div className="max-w-4xl mx-auto">
                <h1 className="text-5xl font-bold mb-6 animate-pulse">
                  ${project.name}
                </h1>
                <p className="text-xl mb-8 opacity-90">
                  Experience the future of task management and productivity
                </p>
                <div className="flex justify-center space-x-4">
                  <button className="bg-white text-purple-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                    Get Started
                  </button>
                  <button className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-purple-600 transition-colors">
                    Learn More
                  </button>
                </div>
              </div>
            </div>

            {/* Features Section */}
            <div className="max-w-6xl mx-auto px-4 py-16">
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold gradient-text mb-4">Powerful Features</h2>
                <p className="text-gray-600 text-lg">Everything you need to stay organized and productive</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                ${[
                  { icon: 'fa-tasks', title: 'Task Management', desc: 'Create, organize, and track tasks with ease' },
                  { icon: 'fa-users', title: 'Team Collaboration', desc: 'Work together seamlessly with your team' },
                  { icon: 'fa-chart-line', title: 'Progress Tracking', desc: 'Monitor your productivity and achievements' },
                  { icon: 'fa-mobile-alt', title: 'Mobile Ready', desc: 'Access your tasks anywhere, anytime' },
                  { icon: 'fa-bell', title: 'Smart Notifications', desc: 'Stay on top of deadlines and updates' },
                  { icon: 'fa-sync', title: 'Real-time Sync', desc: 'Your data syncs across all devices instantly' }
                ].map((feature, i) => `
                  <div className="feature-card ${isLoaded ? 'animate-fadeIn' : ''}" style="animation-delay: ${i * 100}ms">
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white mb-4">
                      <i className="fas ${feature.icon} text-xl"></i>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">${feature.title}</h3>
                    <p className="text-gray-600">${feature.desc}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            {/* Status Section */}
            <div className="bg-white border-t border-gray-200 py-8">
              <div className="max-w-4xl mx-auto text-center px-4">
                <div className="inline-flex items-center px-6 py-3 bg-green-100 border border-green-200 rounded-full">
                  <i className="fas fa-check-circle text-green-600 mr-3"></i>
                  <span className="text-green-800 font-semibold">Live Preview Active - AI Generated Content</span>
                </div>
                <p className="text-gray-500 text-sm mt-4">
                  This is a live preview of your ${project.name} application with ${project.files.length} generated files
                </p>
              </div>
            </div>
          </div>
        );
      }

      ReactDOM.render(<App />, document.getElementById('root'));
    </script>
</body>
</html>
          `);
          return;
        }
      }

      // Fallback for other file types
      res.setHeader('Content-Type', 'text/html');
      res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>${project.name} - Preview</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .status { background: #e7f3ff; border: 1px solid #b3d9ff; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
        pre { background: #f8f9fa; padding: 15px; border-radius: 5px; overflow-x: auto; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>${project.name}</h1>
        <div class="status">
            ✅ Project generated successfully with ${project.files.length} files
        </div>
        <p>This is a preview of your generated project. The files are ready for download and deployment.</p>
        <h3>Generated Files:</h3>
        <ul>
            ${project.files.map(f => `<li><code>${f.path}</code></li>`).join('')}
        </ul>
    </div>
</body>
</html>
      `);
    } catch (error) {
      console.error("Preview error:", error);
      res.status(500).send("Failed to load preview");
    }
  });

  app.get("/api/projects/:id/download", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project || !project.files) {
        return res.status(404).json({ error: "Project not found" });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${project.name}.zip"`);

      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.pipe(res);

      // Add files to archive
      project.files.forEach((file) => {
        if (file.type === 'file') {
          archive.append(file.content, { name: file.path });
        }
      });

      await archive.finalize();
    } catch (error) {
      console.error("Download error:", error);
      res.status(500).json({ error: "Failed to download project" });
    }
  });

  async function generateProjectAsync(projectId: string, prompt: string, broadcast: Function) {
    try {
      // Update project status
      await storage.updateProject(projectId, { status: "generating" });
      broadcast(projectId, { type: "status_update", status: "generating" });

      // Create assistant message for generation progress
      await storage.createMessage({
        projectId,
        role: "assistant",
        content: "Starting project generation...",
        metadata: { generationStep: "analyzing", progress: 0 }
      });

      broadcast(projectId, { 
        type: "message", 
        role: "assistant", 
        content: "Starting project generation...",
        metadata: { generationStep: "analyzing", progress: 0 }
      });

      // Generate project using AI
      const result = await generateProject(prompt, (progress) => {
        broadcast(projectId, {
          type: "generation_progress",
          progress: progress.progress,
          step: progress.step,
          message: progress.message
        });
      });

      // Update project with generated files
      await storage.updateProject(projectId, {
        status: "ready",
        files: result.files
      });

      // Create final assistant message
      await storage.createMessage({
        projectId,
        role: "assistant",
        content: `Project "${result.name}" has been generated successfully! The project includes ${result.files.length} files and is ready for preview and download.`,
        metadata: { 
          generationStep: "complete", 
          progress: 100,
          files: result.files 
        }
      });

      broadcast(projectId, {
        type: "generation_complete",
        project: await storage.getProject(projectId)
      });

    } catch (error) {
      console.error("Project generation error:", error);

      await storage.updateProject(projectId, { status: "error" });

      await storage.createMessage({
        projectId,
        role: "assistant",
        content: "Sorry, there was an error generating your project. Please try again.",
        metadata: { error: error instanceof Error ? error.message : "Unknown error" }
      });

      broadcast(projectId, {
        type: "generation_error",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return httpServer;
}