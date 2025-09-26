# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DOCA is an AI-powered Korean document summarization application built with Next.js 14 App Router. The application allows users to upload Word documents, configure summarization prompts, and get AI-generated summaries using OpenAI's GPT-4o.

## Architecture

- **Framework**: Next.js 14.2.16 with App Router architecture
- **UI**: Three-pane layout (File Upload | Prompt Configuration | Results)
- **State Management**: React hooks (no external state library)
- **Styling**: Tailwind CSS v4 with shadcn/ui components
- **AI Integration**: Vercel AI SDK with OpenAI GPT-4o
- **Package Manager**: pnpm

## Key Commands

### Development
```bash
pnpm dev          # Start development server
pnpm build        # Build for production
pnpm start        # Start production server
pnpm lint         # Run ESLint
```

## Core Application Structure

### Main Components
- `app/page.tsx` - Main application with three-pane interface and state orchestration
- `app/api/summarize/route.ts` - API endpoint handling AI summarization requests
- `components/file-upload-pane.tsx` - File drag-and-drop and management
- `components/prompt-pane.tsx` - Summarization prompt configuration
- `components/results-pane.tsx` - Processing results and summary display

### Data Flow
1. Files uploaded via FileUploadPane (currently supports .doc/.docx)
2. User configures prompt and provides OpenAI API key in PromptPane
3. Main page orchestrates API calls to `/api/summarize`
4. Results displayed in ResultsPane with processing status

### UI System
- **Design System**: shadcn/ui "new-york" style with custom navy/coral theme
- **Theme Support**: Dark/light mode via CSS variables in globals.css
- **Icons**: Lucide React icons throughout
- **Path Mapping**: `@/*` maps to project root

## Current Limitations

- **File Processing**: Uses placeholder text instead of actual Word document parsing
- **No Persistence**: All state is ephemeral (no database/file storage)
- **Security**: API keys stored client-side
- **File Support**: Limited to Word documents only
- **No Version Control**: Project is not currently in a git repository

## Development Notes

- TypeScript strict mode enabled
- ESLint/TypeScript build errors ignored in next.config.mjs
- No testing framework currently configured
- Application is Korean-focused ("AI 문서 요약기")
- Uses modern React patterns with hooks and functional components