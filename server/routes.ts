import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { generateProject } from "./services/ai";
import { scrapeReference } from "./services/firecrawl";
import { e2bService } from "./services/e2b";
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

      // Deploy to E2B for live preview
      let previewUrl = null;
      try {
        broadcast(projectId, {
          type: "generation_progress",
          progress: 90,
          step: "deploying",
          message: "Deploying to live environment..."
        });

        const session = await e2bService.createSession();
        previewUrl = await e2bService.deployProject(session.id, result.files);
        
        broadcast(projectId, {
          type: "generation_progress",
          progress: 95,
          step: "deploying",
          message: "Live preview ready!"
        });
      } catch (error) {
        console.error("E2B deployment error:", error);
        // Continue without live preview
      }

      // Update project with generated files and preview URL
      await storage.updateProject(projectId, {
        status: "ready",
        files: result.files,
        previewUrl
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
