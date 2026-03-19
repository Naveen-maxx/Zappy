# Zappy - Live Quiz Platform

A real-time multiplayer quiz platform where you can create AI-powered quizzes, host live game rooms, and compete with players worldwide!

## Features

- 🎮 **Real-time Multiplayer Quizzes**: Host and join live quiz games
- 🤖 **AI-Powered Quiz Generation**: Create quizzes instantly using Google Gemini AI
- 👥 **Team Support**: Play in teams with team leaderboards
- 📊 **Live Leaderboards**: Real-time scoring and rankings
- 🎨 **Modern UI**: Beautiful, responsive interface with dark/light theme support
- 📱 **Mobile Friendly**: Works seamlessly on all devices

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **UI Components**: shadcn/ui (Radix UI)
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Real-time**: Socket.io
- **AI**: Google Gemini API
- **Animations**: Framer Motion

## Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ installed ([install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- **npm** or **bun** package manager
- **Supabase account** and project
- **Google Gemini API key** (for quiz generation)

## Getting Started

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd Zappy
```

### 2. Install Dependencies

```bash
npm install
# or
bun install
```

### 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Get your project credentials from **Project Settings → API**:
   - Project URL
   - Anon/public key
   - Service role key (keep this secret!)

### 4. Configure Environment Variables

Create a `.env.local` file in the `Zappy` directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

**Important**: The `GEMINI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` should be set in your Supabase project's Edge Functions environment variables (not in `.env.local`). See step 5.

### 5. Set Up Supabase Edge Functions

1. Go to your Supabase Dashboard
2. Navigate to **Edge Functions → Settings**
3. Add the following environment variables:
   - `GEMINI_API_KEY`: Your Google Gemini API key ([get one here](https://makersuite.google.com/app/apikey))
   - `SUPABASE_SERVICE_ROLE_KEY`: Your service role key
   - `SUPABASE_URL`: Your Supabase project URL

### 6. Run Database Migrations

You have two options:

**Option A: Using Supabase CLI** (Recommended)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

**Option B: Manual Migration**

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Run all SQL files from `supabase/migrations/` in order

### 7. Deploy Supabase Edge Function

Deploy the quiz generation function:

```bash
supabase functions deploy generate-quiz
```

Or use the Supabase Dashboard:
1. Go to **Edge Functions**
2. Create a new function called `generate-quiz`
3. Copy the contents of `supabase/functions/generate-quiz/index.ts`

### 8. Start Development Server

```bash
npm run dev
# or
bun run dev
```

The application will be available at `http://localhost:8080`

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
Zappy/
├── src/
│   ├── components/      # React components
│   ├── contexts/        # React contexts
│   ├── hooks/          # Custom hooks
│   ├── integrations/   # External services
│   ├── pages/          # Page components
│   └── types/          # TypeScript types
├── supabase/
│   ├── functions/      # Edge Functions
│   └── migrations/     # Database migrations
└── public/             # Static assets
```

## Troubleshooting

### Environment Variables Not Working

- Ensure your `.env.local` file is in the `Zappy` directory (not the parent directory)
- Vite requires the `VITE_` prefix for environment variables
- Restart the dev server after changing environment variables

### CORS Errors

If you encounter CORS errors when calling the `generate-quiz` function:

1. Update the CORS configuration in `supabase/functions/generate-quiz/index.ts`
2. Add your local development URL to the `ALLOWED_ORIGINS` array
3. Redeploy the function

### Authentication Issues

- Verify your Supabase URL and keys are correct
- Ensure Email authentication is enabled in Supabase Dashboard → Authentication → Providers
- Check browser console for detailed error messages

### Database Migration Errors

- Ensure your Supabase project is properly linked
- Check that you have the necessary permissions
- Try running migrations manually in the Supabase SQL Editor

## Production Deployment

1. **Update CORS**: Add your production domain to `ALLOWED_ORIGINS` in `supabase/functions/generate-quiz/index.ts`
2. **Set Environment Variables**: Configure production environment variables in your hosting platform
3. **Build**: Run `npm run build`
4. **Deploy**: Deploy the `dist` folder to your hosting platform (Vercel, Netlify, etc.)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is private and proprietary.

## Support

For issues and questions, please open an issue in the repository.
