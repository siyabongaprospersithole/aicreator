# Overview

This is an AI-powered web application that generates Next.js projects based on user descriptions. The application features a modern, split-screen interface where users can chat with an AI assistant to describe their project requirements, and the AI generates complete project files including React components, TypeScript definitions, and styling. The system provides real-time feedback during generation and allows users to preview and download the generated projects.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: shadcn/ui components built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket connection for live updates during project generation

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Data Layer**: Drizzle ORM with PostgreSQL database (Neon serverless)
- **Storage Strategy**: In-memory storage with interface for easy database migration
- **Session Management**: PostgreSQL session store with connect-pg-simple
- **Development Setup**: Vite middleware integration for hot reloading in development

## Core Features
- **AI Project Generation**: Multi-step process that analyzes requirements, generates components, and creates project structure
- **Real-time Updates**: WebSocket-based communication for live generation progress
- **File Management**: Complete project file system with directory structure and code preview
- **Download System**: ZIP archive generation for complete project export
- **Responsive Design**: Mobile-aware interface with desktop-optimized layout

## Database Schema
- **Users**: Basic user management with username/password authentication
- **Projects**: Project metadata with status tracking (generating/ready/error) and file storage as JSONB
- **Messages**: Chat history with role-based messages (user/assistant) and metadata for generation tracking

## External Dependencies

### AI Services
- **Azure OpenAI GPT-5**: Primary AI model for advanced project generation and code creation (preferred when available)
- **Google AI (Gemini)**: Fallback AI model for project generation with streaming support
- **Auto-Selection**: System automatically selects Azure OpenAI when configured, otherwise falls back to Google AI
- **Integration**: Direct API calls with streaming support for real-time responses and progress updates

### Web Scraping
- **Firecrawl**: Reference website scraping for enhanced project context
- **Purpose**: Allows users to provide reference sites that inform the AI's generation process

### Development Environment
- **E2B**: Sandboxed code execution environment for testing generated projects
- **Functionality**: Provides isolated Node.js/React environments for validating generated code

### Database Infrastructure
- **Neon Database**: Serverless PostgreSQL for production data storage
- **Connection**: Direct database connection via connection string with Drizzle ORM abstraction

### Build and Development Tools
- **Replit Integration**: Development environment integration with runtime error handling
- **Cartographer**: Development-time code navigation and visualization
- **Archive Generation**: Project packaging using archiver for ZIP downloads