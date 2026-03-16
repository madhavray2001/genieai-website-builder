# GenieAI Frontend

An AI-powered website builder that generates complete websites from natural language prompts. Built with Next.js 15 and featuring real-time streaming responses.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** shadcn/ui
- **Authentication:** NextAuth.js
- **State Management:** React Context API
- **Package Manager:** Bun

## Project Structure

```
frontend/
├── app/                      # Next.js App Router pages
│   ├── api/                 # API routes
│   │   └── auth/           # Authentication endpoints
│   ├── project/[id]/       # Dynamic project pages
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Home page
│   └── globals.css         # Global styles
├── components/              # React components
│   ├── ui/                 # shadcn/ui components
│   ├── AiMsgBox.tsx        # AI message display
│   ├── HumanMsgBox.tsx     # User message display
│   ├── FileTree.tsx        # Generated file explorer
│   ├── CodeViewer.tsx      # Generated code display
│   ├── ProjectList.tsx     # User's website projects
│   ├── navbar.tsx          # Navigation bar
│   ├── prompt-input.tsx    # AI prompt input
│   └── ...                 # Streaming state components
├── hooks/                   # Custom React hooks
│   └── use-mobile.ts       # Mobile detection hook
├── lib/                     # Utility libraries
│   ├── utils.ts            # Helper functions
│   └── PromptFocusContext.ts # Prompt input focus management
├── utils/                   # Additional utilities
│   └── extractFiles.ts     # File extraction utilities
├── public/                  # Static assets
│   ├── logo.svg
│   ├── loader.lottie
│   └── icons/
└── middleware.ts           # Next.js middleware
```

## Key Features

### AI-Powered Website Generation
- Natural language prompt interface for website creation
- Real-time streaming of AI responses
- Multi-phase generation process with visual feedback
- Complete website generation from a single prompt

### Generation Pipeline
The AI website builder follows a structured pipeline:

1. **Thinking Phase** - AI analyzes the prompt and plans the website structure
2. **Validating Phase** - Validates requirements and technical feasibility
3. **Building Phase** - Generates .jsx and .css code
4. **Delivering Phase** - Finalizes and delivers the complete website

Each phase is represented by dedicated streaming components:
- `ThinkingStream.tsx`
- `ValidatingStream.tsx`
- `BuildingStream.tsx`
- `DeliveringStream.tsx`

### Code Visualization
- **FileTree Component** - Interactive file explorer showing generated project structure
- **CodeViewer Component** - Syntax-highlighted code display for generated files
- Real-time preview of generated code

### Website Projects
- Multiple website projects per user
- Dynamic routing for individual projects (`/project/[id]`)
- Project listing and management via `ProjectList.tsx`
- Persistent storage of generated websites

### User Experience
- Responsive design with mobile detection (`use-mobile.ts`)
- Rate limiting protection with `RateLimitAlert.tsx`
- Conversation limits with `ConversationLimitAlert.tsx`
- Real-time feedback during generation process

## Getting Started

### Prerequisites

- Node.js 18+ or Bun
- Environment variables configured in `.env`

### Installation

```bash
# Install dependencies
bun install

# or with npm
npm install
```

### Environment Variables

Create a `.env` file in the frontend directory:

```env
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=your_backend_api_url
```

### Development

```bash
# Run development server
bun dev

# or with npm
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to start building websites with AI.

### Build

```bash
# Create production build
bun run build

# Start production server
bun start
```

## Component Architecture

### Core Components

#### Prompt Interface
- `prompt-input.tsx` - Main input for AI prompts
- `PromptFocusContext.ts` - Focus management for seamless user experience

#### Message Display
- `AiMsgBox.tsx` - Displays AI-generated responses and updates
- `HumanMsgBox.tsx` - Displays user prompts and interactions

#### Generation Streaming
Four dedicated components handle different phases of website generation:
- `ThinkingStream.tsx` - AI planning and analysis phase
- `ValidatingStream.tsx` - Requirement validation phase
- `BuildingStream.tsx` - Active code generation phase
- `DeliveringStream.tsx` - Final delivery and compilation phase

#### Code Display
- `FileTree.tsx` - Tree view of generated project files
- `CodeViewer.tsx` - Syntax-highlighted code viewer by monaco-editor

#### Navigation
- `navbar.tsx` - Main navigation bar
- `app-sidebar.tsx` - Collapsible sidebar for project navigation

### UI Components
Customized shadcn/ui components in `components/ui/`:
- **Forms:** Input, Textarea, Label, Input-Group
- **Navigation:** Sidebar, Tabs, Sheet
- **Feedback:** Alert Dialog, Spinner, Skeleton, Toast
- **Layout:** Card, Separator, Button
- **Loading:** Spinner Button for async actions

## Authentication

NextAuth.js integration with:
- Custom type definitions in `next-auth.d.ts`
- Protected routes via `middleware.ts`
- Session-based authentication
- User-specific project management

## Type Safety

- Full TypeScript support with strict type checking
- Custom type definitions for authentication
- Type-safe API routes and component props
- Generated route types in `.next/types/`

## Styling

- **Tailwind CSS** - Utility-first styling approach
- **Component Theming** - Configured via `components.json`
- **Global Styles** - Custom styles in `app/globals.css`
- **Dark Mode** - Theme support via shadcn/ui
- **Responsive Design** - Mobile-first with breakpoint utilities

## File Extraction

The `utils/extractFiles.ts` utility handles:
- Parsing AI-generated code responses
- Extracting individual files from generation output
- Organizing generated project structure

## Middleware

Route protection and authentication handling:
- Authentication state verification
- Protected route redirects
- Session management
- API request interception

## Development Tools

- **ESLint** - Code linting with `eslint.config.mjs`
- **PostCSS** - CSS processing with `postcss.config.mjs`
- **TypeScript** - Strict type checking via `tsconfig.json`
- **Next.js Config** - Custom configuration in `next.config.ts`

## User Flow

1. User enters a natural language prompt describing desired website
2. AI processes the prompt through four phases (Thinking, Validating, Building, Delivering)
3. Real-time streaming shows progress with visual feedback
4. Generated files appear in the FileTree component
5. Users can view generated code in the CodeViewer
6. Completed website is saved to user's project list
7. Users can access and manage all their generated websites

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

## License

Part of the GenieAI application suite - AI-powered website builder.