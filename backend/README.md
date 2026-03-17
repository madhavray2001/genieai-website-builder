# GenieAI Backend

The backend service for GenieAI, an AI-powered website builder that generates complete websites from natural language prompts. Built with Bun runtime and featuring AI agent orchestration, sandbox execution, and AWS S3 integration.

## Tech Stack

- **Runtime:** Bun
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **AI Integration:** Gemini/Anthropic API
- **Sandbox Environment:** E2B (Code Interpreter)
- **Object Storage:** AWS S3
- **Containerization:** Docker

## Project Structure

```
backend/
├── index.ts                  # Main application entry point
├── routes/                   # API route handlers
│   ├── projectRoute.ts      # Project CRUD operations
│   ├── promptRoute.ts       # AI prompt handling
│   └── userRoute.ts         # User management
├── helpers/                  # Helper utilities
│   └── s3Helper.ts          # AWS S3 operations
├── prisma/                   # Database schema and migrations
│   ├── schema.prisma        # Prisma schema definition
│   └── migrations/          # Database migrations
├── generated/               # Prisma generated client
├── aws/                     # AWS CLI installation
├── guardrails.ts           # AI safety and validation
├── runAgent.ts             # AI agent orchestration
├── sandboxManager.ts       # E2B sandbox management
├── systemPrompt.ts         # AI system prompts
├── Dockerfile              # Docker configuration
├── e2b.Dockerfile          # E2B sandbox Dockerfile
├── e2b.toml                # E2B configuration
└── compose.yaml            # Docker Compose setup
```

## Key Features

### AI Agent Orchestration
- Multi-step AI workflow with structured phases
- Streaming response handling for real-time updates
- System prompt management for consistent AI behavior
- Guardrails for content safety and validation

### Sandbox Execution
- E2B Code Interpreter integration for secure code execution
- Isolated environment for running generated websites
- File system management within sandboxes
- Real-time code execution and validation

### Storage Management
- AWS S3 integration for file storage
- Automatic file upload for generated projects
- Project file organization and retrieval

### Database Operations
- Prisma ORM for type-safe database queries
- User authentication and management
- Project creation and tracking
- Conversation history storage
- Enhanced prompt tracking

## Getting Started

### Prerequisites

- Bun runtime installed
- PostgreSQL database
- AWS account with S3 access
- E2B API key
- Gemini/Anthropic API key

### Installation

```bash
# Install dependencies
bun install

# Run Prisma migrations
bunx prisma migrate dev

# Generate Prisma client
bunx prisma generate
```

### Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/genieai"
E2B_API_KEY=your_e2b_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
GOOGLE_API_KEY=your_google_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
S3_BUCKET_NAME=your_s3_bucket_name
```

### Development

```bash
# Run development server
bun run index.ts

# Run with hot reload
bun --watch index.ts
```

### Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up --build

# Run in detached mode
docker-compose up -d
```

## API Routes

### User Routes
- `POST /createUser` - Create new user

### Project Routes
- `POST /project` - Creates a new project
- `GET /project/:id` - Get specific project
- `GET /projects/:userId` - List all projects
- `GET /project/load/:id` - loads the specific project from S3
- `GET /project/verify/:id` - Verify if the project belong to the user

### Prompt Routes
- `POST /prompt` - Sends the intial project to llm
- `POST /conversation` - Sends the followup message in the project

## Core Modules

### AI Agent (`runAgent.ts`)
Orchestrates the AI-powered website generation process:
- Code generation, summarising the response for further requests,     final message generation 
- Sending streams via Websockets (Thinking, Validating, Building, Delivering)
- Streaming response handling
- File extraction and organization
- Integration with sandbox for code execution

### Sandbox Manager (`sandboxManager.ts`)
Manages E2B sandbox environments:
- Sandbox lifecycle management
- File system operations within sandbox
- Code execution and validation

### S3 Helper (`helpers/s3Helper.ts`)
Handles AWS S3 operations:
- File upload with proper structure
- Project file retrieval
- Bucket management

### Guardrails (`guardrails.ts`)
Ensures AI safety and content validation:
- Filepath and directory validation
- Command validation
- Output validation

### System Prompts (`systemPrompt.ts`)
Defines AI behavior and instructions:
- Website generation instructions
- Code quality guidelines
- Response formatting rules
- Technology stack specifications

## E2B Integration

### Configuration (`e2b.toml`)
- Sandbox template configuration
- Resource allocation
- Dockerfile specification
- Environment setup

### Dockerfile (`e2b.Dockerfile`)
Custom sandbox environment with:
- Node.js and Bun runtime
- Required dependencies
- Build tools and utilities
- Optimized for code execution

## Database Migrations

### Available Migrations
1. **init** - Initial schema setup
2. **title_optional** - Make project title optional
3. **add_auth_fields** - Add authentication fields
4. **added_default_project_title** - Default project title
5. **added_enhanced_prompt** - Enhanced prompt tracking

Run migrations with:
```bash
bunx prisma migrate dev
```

## Development Tools

### Prisma Studio
View and edit database records:
```bash
bunx prisma studio
```

### Database Reset
Reset database and rerun migrations:
```bash
bunx prisma migrate reset
```

### Type Generation
Regenerate Prisma client types:
```bash
bunx prisma generate
```

## Error Handling

The backend implements comprehensive error handling:
- Database operation errors
- AI API failures
- Sandbox execution errors
- S3 upload failures
- Authentication errors
- Rate limiting responses

## Security Features

- Password hashing for user authentication
- Input validation and sanitization
- SQL injection prevention via Prisma
- Rate limiting on AI requests
- Secure file storage with S3
- Environment variable protection

## Performance Optimization

- Efficient streaming for AI responses
- Lazy loading of generated files
- Optimized S3 operations
- Sandbox resource management

## Monitoring and Logging

- Request/response logging
- Error tracking and reporting
- AI generation metrics
- Sandbox usage statistics
- Database query monitoring

## Docker Configuration

### Main Dockerfile
- Multi-stage build for optimization
- Bun runtime integration
- Production dependencies only
- Health check configuration

### Docker Compose (`compose.yaml`)
- Service orchestration
- Database container setup
- Network configuration
- Healthcheck

## Learn More

- [Bun Documentation](https://bun.sh/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [E2B Documentation](https://e2b.dev/docs)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3)
- [Anthropic API Documentation](https://docs.anthropic.com)

## License

Part of the GenieAI application suite - AI-powered website builder.