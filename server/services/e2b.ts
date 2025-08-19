import { Sandbox } from '@e2b/code-interpreter';

interface E2BSession {
  id: string;
  status: string;
}

export class E2BService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.E2B_API_KEY || process.env.E2B_KEY || "";
  }

  async createSession(): Promise<E2BSession> {
    if (!this.apiKey) {
      console.log("E2B API key not configured, using mock session");
      return {
        id: `mock-session-${Date.now()}`,
        status: "running"
      };
    }

    try {
      const sandbox = await Sandbox.create({ 
        apiKey: this.apiKey,
        template: 'nodejs' 
      });

      console.log(`E2B sandbox created: ${sandbox.sandboxId}`);

      return {
        id: sandbox.sandboxId,
        status: "running"
      };
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

      if (!this.apiKey || sessionId.startsWith('mock-session-')) {
        // Return mock URL for development when E2B is not configured
        return `https://${sessionId}.e2b.dev`;
      }

      const sandbox = await Sandbox.create({ 
        apiKey: this.apiKey,
        sandboxId: sessionId 
      });

      // Upload files to E2B sandbox
      for (const file of files) {
        await sandbox.files.write(file.path, file.content);
        console.log(`Uploaded file: ${file.path}`);
      }

      // Install dependencies if package.json exists
      const hasPackageJson = files.some(f => f.path === 'package.json');
      if (hasPackageJson) {
        console.log('Installing dependencies...');
        const installResult = await sandbox.commands.run('npm install');
        console.log('npm install result:', installResult.stdout);
      }

      // Start the development server
      console.log('Starting development server...');
      const startCommand = hasPackageJson ? 'npm run dev' : 'npx serve -s . -p 3000';

      // Start server in background
      sandbox.commands.run(startCommand).catch(error => {
        console.log('Server start command completed or errored:', error.message);
      });

      // Wait a moment for server to start
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Return the preview URL - E2B provides this automatically
      return `https://${sandbox.sandboxId}.e2b.dev`;
    } catch (error) {
      console.error("E2B deployment error:", error);
      throw new Error(`Failed to deploy project: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async destroySession(sessionId: string): Promise<void> {
    try {
      console.log(`Destroying E2B session: ${sessionId}`);

      if (!this.apiKey || sessionId.startsWith('mock-session-')) {
        console.log('Mock session, nothing to destroy');
        return;
      }

      const sandbox = await Sandbox.create({ 
        apiKey: this.apiKey,
        sandboxId: sessionId 
      });

      await sandbox.close();
      console.log(`E2B session ${sessionId} destroyed successfully`);
    } catch (error) {
      console.error("E2B session destruction error:", error);
    }
  }
}

export const e2bService = new E2BService();