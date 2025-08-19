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

      // Check if this is a Next.js project
      const isNextJs = files.some(f => f.path.includes('app/page.tsx') || f.path.includes('pages/'));
      const hasPackageJson = files.some(f => f.path === 'package.json');

      if (isNextJs && !hasPackageJson) {
        // Create a minimal Next.js package.json with only essential dependencies
        console.log('Creating minimal Next.js package.json...');
        const nextPackageJson = {
          "name": "generated-nextjs-app",
          "version": "0.1.0",
          "private": true,
          "scripts": {
            "dev": "next dev --hostname 0.0.0.0 --port 3000 --turbo",
            "build": "next build",
            "start": "next start --hostname 0.0.0.0 --port 3000"
          },
          "dependencies": {
            "next": "^14.0.0",
            "react": "^18.0.0",
            "react-dom": "^18.0.0"
          }
        };
        await sandbox.files.write('package.json', JSON.stringify(nextPackageJson, null, 2));
        
        // Create simplified next.config.js
        const nextConfig = `/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone'
}

module.exports = nextConfig`;
        await sandbox.files.write('next.config.js', nextConfig);
      }

      // Install dependencies with timeout
      if (hasPackageJson || isNextJs) {
        console.log('Installing dependencies...');
        try {
          const installResult = await sandbox.commands.run('npm install --no-audit --no-fund', {
            timeoutMs: 120000 // 2 minute timeout
          });
          console.log('npm install result:', installResult.stdout);
          
          if (installResult.stderr && installResult.stderr.includes('error')) {
            console.log('npm install errors:', installResult.stderr);
          }
        } catch (error) {
          console.log('npm install timeout or error, trying alternative approach...');
          // Fallback to serve if npm install fails
          const serveCommand = 'npx serve -s . -p 3000 -H 0.0.0.0';
          sandbox.commands.run(serveCommand, { timeoutMs: 60000 }).catch(err => {
            console.log('Serve command error:', err.message);
          });
          await new Promise(resolve => setTimeout(resolve, 5000));
          return `https://${sandbox.sandboxId}.e2b.dev`;
        }
      }

      // Start the development server with timeout
      console.log('Starting development server...');
      let startCommand;
      
      if (isNextJs) {
        startCommand = 'npm run dev';
      } else if (hasPackageJson) {
        startCommand = 'npm run dev';
      } else {
        startCommand = 'npx serve -s . -p 3000 -H 0.0.0.0';
      }

      // Start server in background with timeout
      sandbox.commands.run(startCommand, { 
        timeoutMs: 180000 // 3 minute timeout
      }).catch(error => {
        console.log('Server start command completed or errored:', error.message);
      });

      // Wait longer for server to start
      await new Promise(resolve => setTimeout(resolve, 8000));

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