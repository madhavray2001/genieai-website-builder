# GenieAI - AI-Powered Website Builder

GenieAI is a full-stack web application that transforms natural language prompts into complete, functional websites. Built with modern technologies, it leverages AI agents, sandbox execution, and real-time streaming to deliver a seamless website generation experience.

## Overview

GenieAI allows users to describe their desired website in plain English, and the AI generates a complete, production-ready website in react js. The application features real-time streaming feedback through multiple generation phases, secure code execution in isolated sandboxes, and persistent storage of generated projects.

## Architecture

<p align="center">
  <img src="./assets/architecture.png" alt="System Architecture" width="100%">
</p>

The application follows a modern full-stack architecture with clear separation of concerns:

### Frontend
- **Framework:** Next.js 15 with App Router
- **UI Layer:** React 18 with TypeScript
- **Styling:** Tailwind CSS with shadcn/ui components
- **Authentication:** NextAuth.js with session management
- **State Management:** React Context API

### Backend
- **Runtime:** Bun (high-performance JavaScript runtime)
- **API:** RESTful endpoints with TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **AI Integration:** Gemini/Anthropic API
- **Sandbox:** E2B Code Interpreter for isolated execution
- **Storage:** AWS S3 for generated project files

### Infrastructure
- **Containerization:** Docker with multi-service orchestration
- **Database:** PostgreSQL in Docker container
- **File Storage:** AWS S3
- **Sandbox Environment:** E2B cloud sandboxes

For detailed information about frontend and backend technologies, architecture, and implementation details, please refer to the respective README files in the [frontend](./frontend/README.md) and [backend](./backend/README.md) directories.

## Key Features

### AI-Powered Website Generation
- Natural language prompt interface
- Real-time streaming of generation progress
- Context-aware follow-up conversations
- Enhanced prompt optimization

### Code Execution & Validation
- Secure sandbox execution via E2B
- Isolated environment for each project
- Real-time code validation
- File system management within sandboxes

### Project Management
- Multiple projects per user
- Conversation threads within projects
- File tree visualization
- Syntax-highlighted code viewer using monaco editor

### User Experience
- Responsive design for all devices
- Real-time streaming feedback
- Rate limiting protection
- Conversation limit management

## How It Works

### LLM Processing Graph (LangGraph flow)

<p align="center">
  <img src="./assets/llmGraph.png" alt="LLM Processing Graph" width="100%">
</p>

The LLM processing pipeline handles code generation, context summarisation and providing the final response to the user

- **Prompt Enhancement:** Optimizes user input for better AI understanding
- **Code Generation:** Generates the code according to the users prompt
- **Context Window Management:** Maintains conversation history efficiently
- **Streaming Generation:** Produces real-time responses with phase indicators
- **Token Optimization:** Manages token usage for cost efficiency
- **Response Formatting:** Structures output for seamless frontend integration

### AI Agent Workflow

<p align="center">
  <img src="./assets/agenticLoop.png" alt="Agentic Loop" width="100%">
</p>

The AI agent operates through a simple agentic loop that orchestrates the entire website generation process, above image is the example on how normally the tool call is done in the agentic development and how final response reaches to the end user. 

1. **Prompt Reception:** User submits a natural language description
2. **Context Analysis:** AI analyzes previous conversations and project context
3. **Planning Phase:** Determines required files, structure, and technologies
4. **Code Generation:** Produces react code
5. **Validation:** Executes code in sandbox to verify functionality
6. **Iteration:** Refines based on validation results
7. **Delivery:** Finalizes and stores the complete project

## Getting Started

### Prerequisites

Ensure you have the following installed and configured:
- Node.js 18+ or Bun
- PostgreSQL 14+
- Docker and Docker Compose (optional)
- AWS account with S3 bucket configured
- E2B API key
- Gemini/Anthropic API key

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/genieai.git
cd genieai
```

2. **Install dependencies**

Frontend:
```bash
cd frontend
bun install
```

Backend:
```bash
cd backend
bun install
```

3. **Configure environment variables**

Frontend `.env`:
```env
NEXTAUTH_SECRET=your_nextauth_secret
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Backend `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/genieai"
E2B_API_KEY=your_e2b_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name
```

4. **Set up the database**
```bash
cd backend
bunx prisma migrate dev
bunx prisma generate
```

5. **Start the development servers**

Terminal 1 (Backend):
```bash
cd backend
bun run index.ts
```

Terminal 2 (Frontend):
```bash
cd frontend
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Docker Deployment

Run the entire application stack with Docker Compose:

```bash
docker-compose up --build
```

This will start:
- Frontend on port 3000
- Backend on port 8000
- PostgreSQL on port 5432

## Project Structure

```
GenieAI/
├── frontend/           # Next.js application
│   ├── app/           # App Router pages and API routes
│   ├── components/    # React components (UI, streaming, etc.)
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utility libraries and context
│   └── public/        # Static assets
├── backend/           # Bun API server
│   ├── routes/        # API route handlers
│   ├── helpers/       # S3 and utility functions
│   ├── prisma/        # Database schema and migrations
│   ├── runAgent.ts    # AI agent orchestration
│   ├── sandboxManager.ts  # E2B sandbox management
│   ├── systemPrompt.ts    # AI system prompts
│   └── guardrails.ts      # Safety and validation
├── assets/            # Documentation images and diagrams
└── docs/              # Additional documentation
```

## API Overview

The backend exposes RESTful APIs for user management, project operations, and AI prompt handling. Real-time streaming is implemented for AI response generation, providing live updates through multiple phases.

**Main API Categories:**
- **Projects:** CRUD operations for website projects
- **Prompts:** AI generation requests and conversation handling
- **Files:** S3 file retrieval and management

For detailed API documentation, refer to the [backend README](./backend/README.md).

## Technology Highlights

### Real-time Streaming
The application implements WebSocket-like streaming for AI responses, with dedicated React components for each generation phase. This provides users with immediate feedback and transparency into the AI's thinking process.

### Sandbox Security
All generated code is executed in isolated E2B sandboxes, ensuring security and preventing malicious code execution. Each sandbox has resource limitations and network restrictions.

### Persistent Storage
Generated projects are stored in AWS S3 for secure access. Project metadata and conversation history are maintained in PostgreSQL for quick retrieval and project management.

### Type Safety
Full TypeScript implementation across frontend and backend ensures type safety, better developer experience, and fewer runtime errors. Prisma provides type-safe database queries with auto-generated types.

## Security Features

- **Authentication:** Authentication using google oAuth
- **Input Validation:** Prompt sanitization, SQL injection prevention
- **Sandbox Isolation:** E2B sandboxes with resource constraints
- **Content Policies:** AI guardrails and output validation

## Performance Optimization

- **Frontend:** Server-side rendering, code splitting, lazy loading
- **Backend:** Connection pooling, efficient streaming, optimized queries
- **Database:** Indexed queries, efficient relations
- **Storage:** Lazy loading of large files, optimized S3 operations

## Development & Deployment

### Development Mode
Both frontend and backend support hot reload during development. The frontend uses Next.js fast refresh, while the backend uses Bun's watch mode.

### Production Build
```bash
# Frontend
cd frontend
bun run build
bun start

# Backend
cd backend
bun run index.ts
```

### Docker Production
The included Docker configuration supports production deployment with optimized builds, health checks, and resource management.

## Troubleshooting

**Database Connection Issues**
- Verify PostgreSQL is running and accessible
- Check DATABASE_URL format in backend .env
- Run `bunx prisma migrate dev` to ensure schema is up to date

**E2B Sandbox Errors**
- Verify E2B_API_KEY is valid
- Check E2B account status and credits
- Review e2b.toml configuration

**S3 Upload Failures**
- Confirm AWS credentials are correct
- Verify S3 bucket exists and has proper permissions
- Check AWS_REGION matches bucket region

**Frontend Build Errors**
- Clear Next.js cache: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && bun install`

## License

This project is licensed under the MIT License.

## Links

- [GenieAI] (https://genieai.samadesh.com/)

---

Built with passion for AI-powered development