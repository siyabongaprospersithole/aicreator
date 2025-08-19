import { GoogleGenAI } from "@google/genai";
import { ProjectFile } from "@shared/schema";
import { scrapeReference } from "./firecrawl";
import { azureOpenAIService } from "./azure-openai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || "" 
});

export interface GenerationProgress {
  progress: number;
  step: string;
  message: string;
}

export interface GenerationResult {
  name: string;
  files: ProjectFile[];
  previewUrl?: string;
}

type ProgressCallback = (progress: GenerationProgress) => void;

export type AIProvider = 'google' | 'azure';

function getAIProvider(): AIProvider {
  // Check environment variables to determine which AI provider to use
  const hasAzure = process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT;
  const hasGoogle = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;
  
  // Default preference: Azure OpenAI if available, otherwise Google AI
  if (hasAzure) return 'azure';
  if (hasGoogle) return 'google';
  
  throw new Error("No AI provider configured. Please set either Azure OpenAI or Google AI credentials.");
}

export async function generateProject(
  prompt: string, 
  onProgress: ProgressCallback
): Promise<GenerationResult> {
  const provider = getAIProvider();
  
  // Route to appropriate AI service
  if (provider === 'azure') {
    return await azureOpenAIService.generateProject(prompt, onProgress);
  }
  
  // Default to Google AI
  if (!process.env.GEMINI_API_KEY && !process.env.GOOGLE_AI_API_KEY) {
    throw new Error("Google AI API key not configured");
  }

  try {
    // Step 1: Analyze requirements
    onProgress({
      progress: 10,
      step: "Analyzing requirements",
      message: "Understanding your project requirements and extracting key features..."
    });

    const analysisPrompt = `
Analyze this project description and extract:
1. Project type and main purpose
2. Key features and functionality
3. UI/UX requirements
4. Technology stack preferences
5. Suggested project name

Project description: ${prompt}

Respond with JSON in this format:
{
  "projectName": "suggested-project-name",
  "projectType": "type of application",
  "features": ["feature1", "feature2"],
  "uiRequirements": "description of UI needs",
  "techStack": ["technology1", "technology2"]
}`;

    const analysisResponse = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            projectName: { type: "string" },
            projectType: { type: "string" },
            features: { type: "array", items: { type: "string" } },
            uiRequirements: { type: "string" },
            techStack: { type: "array", items: { type: "string" } }
          },
          required: ["projectName", "projectType", "features"]
        }
      },
      contents: analysisPrompt
    });

    const analysis = JSON.parse(analysisResponse.text || "{}");
    
    // Step 2: Generate project structure
    onProgress({
      progress: 25,
      step: "Planning architecture",
      message: "Creating project structure and component hierarchy..."
    });

    const structurePrompt = `
Based on this analysis: ${JSON.stringify(analysis)}

Generate a complete Next.js project structure with TypeScript and Tailwind CSS.
Include all necessary files for a production-ready application.

Respond with JSON array of files:
[
  {
    "path": "package.json",
    "content": "file content here",
    "type": "file",
    "language": "json"
  }
]

Requirements:
- Use Next.js 14+ with App Router
- TypeScript configuration
- Tailwind CSS setup
- Modern React patterns with hooks
- Component-based architecture
- Responsive design
- Clean, production-ready code
- Include README.md with setup instructions
- Add appropriate dependencies in package.json
- Include example pages and components based on the features
`;

    onProgress({
      progress: 40,
      step: "Generating components",
      message: "Creating React components and pages..."
    });

    const structureResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: structurePrompt
    });

    let projectFiles: ProjectFile[] = [];
    
    try {
      const rawFiles = JSON.parse(structureResponse.text || "[]");
      projectFiles = rawFiles.map((file: any) => ({
        path: file.path,
        content: file.content,
        type: file.type || "file",
        language: file.language
      }));
    } catch (error) {
      console.error("Failed to parse generated files:", error);
      // Fallback to basic Next.js structure
      projectFiles = generateFallbackProject(analysis.projectName || "my-app");
    }

    // Step 3: Enhance with styling
    onProgress({
      progress: 60,
      step: "Applying styles",
      message: "Implementing responsive design and modern UI components..."
    });

    // Step 4: Add functionality
    onProgress({
      progress: 80,
      step: "Adding functionality",
      message: "Implementing interactive features and business logic..."
    });

    // Step 5: Final optimizations
    onProgress({
      progress: 95,
      step: "Optimizing",
      message: "Finalizing code structure and adding documentation..."
    });

    onProgress({
      progress: 100,
      step: "Complete",
      message: "Project generation completed successfully!"
    });

    return {
      name: analysis.projectName || "generated-project",
      files: projectFiles
    };

  } catch (error) {
    console.error("Project generation error:", error);
    throw new Error(`Failed to generate project: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

function generateFallbackProject(projectName: string): ProjectFile[] {
  return [
    {
      path: "package.json",
      content: JSON.stringify({
        name: projectName.toLowerCase().replace(/\s+/g, '-'),
        version: "0.1.0",
        private: true,
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
          lint: "next lint"
        },
        dependencies: {
          next: "14.0.0",
          react: "^18.0.0",
          "react-dom": "^18.0.0",
          typescript: "^5.0.0",
          "@types/node": "^20.0.0",
          "@types/react": "^18.0.0",
          "@types/react-dom": "^18.0.0",
          tailwindcss: "^3.3.0",
          autoprefixer: "^10.4.16",
          postcss: "^8.4.31"
        }
      }, null, 2),
      type: "file",
      language: "json"
    },
    {
      path: "next.config.js",
      content: `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
}

module.exports = nextConfig`,
      type: "file",
      language: "javascript"
    },
    {
      path: "tailwind.config.js",
      content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,
      type: "file",
      language: "javascript"
    },
    {
      path: "app/globals.css",
      content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 214, 219, 220;
  --background-end-rgb: 255, 255, 255;
}

@media (prefers-color-scheme: dark) {
  :root {
    --foreground-rgb: 255, 255, 255;
    --background-start-rgb: 0, 0, 0;
    --background-end-rgb: 0, 0, 0;
  }
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}`,
      type: "file",
      language: "css"
    },
    {
      path: "app/layout.tsx",
      content: `import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: '${projectName}',
  description: 'Generated by AI Project Generator',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  )
}`,
      type: "file",
      language: "typescript"
    },
    {
      path: "app/page.tsx",
      content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">Welcome to ${projectName}</h1>
      </div>

      <div className="relative flex place-items-center">
        <div className="text-center">
          <h2 className="mb-3 text-2xl font-semibold">
            Get started by editing{' '}
            <code className="font-mono font-bold">app/page.tsx</code>
          </h2>
        </div>
      </div>

      <div className="mb-32 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
        <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100">
          <h2 className="mb-3 text-2xl font-semibold">
            Documentation{' '}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Find in-depth information about Next.js features and API.
          </p>
        </div>
      </div>
    </main>
  )
}`,
      type: "file",
      language: "typescript"
    },
    {
      path: "README.md",
      content: `# ${projectName}

This project was generated using an AI-powered project generator.

## Getting Started

First, install the dependencies:

\`\`\`bash
npm install
# or
yarn install
# or
pnpm install
\`\`\`

Then, run the development server:

\`\`\`bash
npm run dev
# or
yarn dev
# or
pnpm dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Features

- Next.js 14 with App Router
- TypeScript support
- Tailwind CSS for styling
- Responsive design
- Modern React patterns

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
`,
      type: "file",
      language: "markdown"
    },
    {
      path: "tsconfig.json",
      content: JSON.stringify({
        compilerOptions: {
          target: "es5",
          lib: ["dom", "dom.iterable", "es6"],
          allowJs: true,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [
            {
              name: "next"
            }
          ],
          baseUrl: ".",
          paths: {
            "@/*": ["./*"]
          }
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"]
      }, null, 2),
      type: "file",
      language: "json"
    }
  ];
}

export async function enhanceWithReference(prompt: string, referenceUrl: string): Promise<string> {
  try {
    const referenceContent = await scrapeReference(referenceUrl);
    
    const enhancedPrompt = `
Original request: ${prompt}

Reference site content for inspiration:
${referenceContent.substring(0, 2000)}...

Please incorporate relevant design patterns, features, and functionality from the reference site into the project generation.
`;

    return enhancedPrompt;
  } catch (error) {
    console.error("Failed to enhance with reference:", error);
    return prompt; // Return original prompt if reference fails
  }
}
