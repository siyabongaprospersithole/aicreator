interface E2BSession {
  id: string;
  status: string;
}

interface E2BFileSystem {
  write: (path: string, content: string) => Promise<void>;
  read: (path: string) => Promise<string>;
  list: (path: string) => Promise<string[]>;
}

interface E2BProcess {
  start: (command: string) => Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

// Mock E2B implementation for development
// In production, this would use the actual E2B SDK
export class E2BService {
  private apiKey: string;
  private baseUrl = "https://api.e2b.dev";

  constructor() {
    this.apiKey = process.env.E2B_API_KEY || process.env.E2B_KEY || "";
  }

  async createSession(): Promise<E2BSession> {
    if (!this.apiKey) {
      throw new Error("E2B API key not configured");
    }

    try {
      const response = await fetch(`${this.baseUrl}/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          template: "nodejs-react",
        }),
      });

      if (!response.ok) {
        throw new Error(`E2B API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error("E2B session creation error:", error);
      // Return mock session for development
      return {
        id: `mock-session-${Date.now()}`,
        status: "running"
      };
    }
  }

  async deployProject(sessionId: string, files: Array<{ path: string; content: string }>): Promise<string> {
    try {
      console.log(`Deploying project to E2B session: ${sessionId}`);
      console.log(`Files to deploy: ${files.map(f => f.path).join(", ")}`);

      if (!this.apiKey) {
        // Return mock URL for development when E2B is not configured
        return `https://${sessionId}.e2b.dev`;
      }

      // Upload files to E2B session
      for (const file of files) {
        await this.uploadFile(sessionId, file.path, file.content);
      }

      // Install dependencies if package.json exists
      const hasPackageJson = files.some(f => f.path === 'package.json');
      if (hasPackageJson) {
        console.log('Installing dependencies...');
        await this.executeCommand(sessionId, 'npm install');
      }

      // Start the development server
      console.log('Starting development server...');
      const startCommand = hasPackageJson ? 'npm run dev' : 'npx serve -s . -p 3000';
      
      // Start server in background
      this.executeCommand(sessionId, startCommand).catch(error => {
        console.log('Server start command completed or errored:', error.message);
      });

      // Wait a moment for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Return the preview URL
      return `https://${sessionId}.e2b.dev`;
    } catch (error) {
      console.error("E2B deployment error:", error);
      throw new Error(`Failed to deploy project: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async uploadFile(sessionId: string, filePath: string, content: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/filesystem/write`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          path: filePath,
          content: content
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file ${filePath}: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`File upload error for ${filePath}:`, error);
      throw error;
    }
  }

  async executeCommand(sessionId: string, command: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    try {
      console.log(`Executing command in session ${sessionId}: ${command}`);
      
      if (!this.apiKey) {
        // Mock command execution for development
        return {
          stdout: `Command executed: ${command}`,
          stderr: "",
          exitCode: 0
        };
      }

      const response = await fetch(`${this.baseUrl}/sessions/${sessionId}/processes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          command: command,
          background: command.includes('npm run dev') || command.includes('serve')
        }),
      });

      if (!response.ok) {
        throw new Error(`E2B API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      return {
        stdout: result.stdout || "",
        stderr: result.stderr || "",
        exitCode: result.exitCode || 0
      };
    } catch (error) {
      console.error("E2B command execution error:", error);
      throw new Error(`Failed to execute command: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    try {
      console.log(`Destroying E2B session: ${sessionId}`);
      // In real implementation, this would call the E2B API to destroy the session
    } catch (error) {
      console.error("E2B session destruction error:", error);
    }
  }
}

export const e2bService = new E2BService();
