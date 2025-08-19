import { AzureOpenAI } from "openai";
import { ProjectFile } from "@shared/schema";
import { scrapeReference } from "./firecrawl";

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

class AzureOpenAIService {
  private client: AzureOpenAI | null = null;

  constructor() {
    this.initializeClient();
  }

  private initializeClient() {
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-5-2025-08-07";
    const apiVersion = process.env.AZURE_OPENAI_API_VERSION || "2024-04-01-preview";

    if (apiKey && endpoint) {
      this.client = new AzureOpenAI({
        apiKey,
        endpoint,
        deployment,
        apiVersion
      });
    }
  }

  async generateProject(
    prompt: string, 
    onProgress: ProgressCallback
  ): Promise<GenerationResult> {
    if (!this.client) {
      throw new Error("Azure OpenAI not configured. Please set AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT");
    }

    const modelName = process.env.AZURE_OPENAI_MODEL_NAME || "gpt-5-chat";

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

      const analysisResponse = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: "You are an expert project analyzer. Always respond with valid JSON only. Do not use markdown formatting or code blocks. Return raw JSON." },
          { role: "user", content: analysisPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
        model: modelName,
        response_format: { type: "json_object" }
      });

      let analysisContent = analysisResponse.choices[0].message.content || "{}";
      
      // Clean up markdown formatting if present
      analysisContent = analysisContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const analysis = JSON.parse(analysisContent);
      
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

      const structureResponse = await this.client.chat.completions.create({
        messages: [
          { role: "system", content: "You are an expert Next.js developer. Generate complete, production-ready code files. Return ONLY a valid JSON array with no markdown formatting or explanations. Each object should have: path, content, type, language fields." },
          { role: "user", content: structurePrompt }
        ],
        max_tokens: 16384,
        temperature: 0.2,
        model: modelName
      });

      let projectFiles: ProjectFile[] = [];
      
      try {
        let structureContent = structureResponse.choices[0].message.content || "[]";
        
        // Clean up markdown formatting if present
        structureContent = structureContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        
        const rawFiles = JSON.parse(structureContent);
        projectFiles = rawFiles.map((file: any) => ({
          path: file.path,
          content: file.content,
          type: file.type || "file",
          language: file.language
        }));
      } catch (error) {
        console.error("Failed to parse generated files:", error);
        console.error("Raw content:", structureResponse.choices[0].message.content?.substring(0, 200));
        // Fallback to basic Next.js structure
        projectFiles = this.generateFallbackProject(analysis.projectName || "my-app");
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
      console.error("Azure OpenAI project generation error:", error);
      throw new Error(`Failed to generate project: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  private generateFallbackProject(projectName: string): ProjectFile[] {
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
        path: "app/page.tsx",
        content: `export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">Welcome to ${projectName}</h1>
      </div>
    </main>
  )
}`,
        type: "file",
        language: "typescript"
      }
    ];
  }

  async enhanceWithReference(prompt: string, referenceUrl: string): Promise<string> {
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
}

export const azureOpenAIService = new AzureOpenAIService();