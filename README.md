<div align="center">
  <br />
  <h1>⚡ Zappy</h1>
  <p><strong>A Next-Generation Real-Time Multiplayer Quiz & Learning Platform</strong></p>
  <br />
</div>

## 📖 Project Overview

**Zappy** is a modern, real-time multiplayer quiz platform designed to make learning, testing, and team-building genuinely engaging. Whether you're hosting a classroom review session, running a coding bootcamp assessment, or just having fun with friends, Zappy provides a seamless, high-performance environment for live interactive games.

With built-in AI question generation and specialized collaborative game modes, Zappy goes beyond traditional multiple-choice trivia to offer deep, engaging, and cooperative challenges.

---

## 🤔 Problem Statement

While platforms like Kahoot! popularized the live quiz genre, they often come with significant limitations:

*   **Paced Only for Speed:** They heavily prioritize fast clicking over thoughtful collaboration or deep problem-solving.
*   **Limited Question Formats:** Traditional platforms struggle with complex topics like coding, where understanding logic is more important than spotting the right keyword.
*   **Isolation in Learning:** Participants typically compete solely as individuals, missing out on the educational benefits of peer discussion and teamwork.
*   **Tedious Quiz Creation:** Educators spend hours manually writing questions, distractors, and formatting content.

### The Zappy Solution
Zappy solves these problems by introducing **collaborative game modes** (Team and Co-Op), specialized question types like **Code Debug Mode**, and integrating **AI** to generate high-quality quizzes in seconds.

---

## ✨ Key Highlights

Zappy introduces unique features that set it apart from traditional quiz platforms:

*   🐛 **Code Debug Mode:** Designed specifically for developers and coding bootcamps. Instead of standard text options, participants are presented with a code snippet containing a bug. They must analyze the code and identify the exact line where the error occurs.
*   👥 **Team Mode:** Host creates teams, and participants join their designated squads. Teams are given a dedicated "Discussion Phase" with real-time private team chat to debate the answer before the Team Leader submits the final choice.
*   🤝 **Co-Op Mode (Cooperative Racing):** A high-stakes collaborative mode. Participants are still split into teams, but the first team where *everyone* submits the correct answer wins the round. It encourages fast communication and peer teaching.
*   🤖 **AI Quiz Generator:** Powered by Google Gemini. Just type a topic (e.g., "React Hooks" or "World War II History"), and Zappy will instantly generate a full, classroom-safe quiz with questions, correct answers, and plausible distractors.

---

## 🎯 All Features List

*   **Real-time Synchronization:** Sub-second latency for game state, timers, and live leaderboards using WebSockets/Supabase Realtime.
*   **Multiple Game Modes:** Classic (Individual), Team Mode, and Co-Op Mode.
*   **Dynamic Question Types:** Standard Multiple Choice and Code Debug.
*   **Host Control Panel:** Full control over game pacing, manual phase advancing, and live leaderboard reveals.
*   **Real-time Team Chat:** Private chat rooms for team members during discussion phases.
*   **Emoji Reactions:** Floating, real-time emoji reactions in waiting rooms.
*   **Animated Avatars:** Customizable animated avatars for participants.
*   **Premium UI/UX:** Built with a modern aesthetic, featuring glassmorphism, dynamic animations, and full Dark/Light mode support.
*   **Mobile Responsive:** A flawless, app-like experience on mobile browsers.
*   **Guest Access:** No forced sign-ups for participants—just enter a room code and play.

---

## 🛠 Tech Stack

Zappy is built with a modern, scalable, and type-safe architecture.

**Frontend:**
*   **Framework:** React 18 + Vite
*   **Language:** TypeScript
*   **Styling:** Tailwind CSS + `cn` utility merging
*   **Components:** shadcn/ui (Radix UI primitives)
*   **Animations:** Framer Motion
*   **Icons:** Lucide-React

**Backend & Infrastructure:**
*   **Database:** Supabase (PostgreSQL)
*   **Real-time:** Supabase Realtime (WebSockets)
*   **Authentication:** Supabase Auth
*   **Serverless:** Supabase Edge Functions (Deno)

**AI Integration:**
*   **LLM:** Google Gemini API (Flash/Lite models)

---

## 🎮 How to Play

### For the Host
1.  Log in to the Zappy dashboard.
2.  Click **Create Quiz** (write it yourself or let the AI generate it).
3.  Click **Host Live** to open a game room.
4.  Select the **Game Mode** (Classic, Team, Co-Op) and wait for players to join.
5.  Control the flow of the game, review live results, and reveal the leaderboard!

### For the Participant
1.  Go to the Zappy homepage.
2.  Enter the **6-digit Game PIN** provided by your host.
3.  Enter your nickname and pick an avatar.
4.  Join the waiting lobby. Once the host starts, answer questions on your device.
    *   *If in Team Mode:* Use the team chat to discuss the answer before the timer runs out!

---

## 🚀 Installation & Setup Guide

Want to run Zappy locally or contribute? Follow these steps.

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   [npm](https://www.npmjs.com/) or [bun](https://bun.sh/)
*   A [Supabase](https://supabase.com/) account and project
*   A [Google Gemini API Key](https://aistudio.google.com/app/apikey)

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

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory and add your Supabase public keys:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 4. Database Setup (Supabase)
Link the project to your Supabase instance and push the database migrations:
```bash
# Install the Supabase CLI globally if you haven't
npm install -g supabase

# Login and link your project
supabase login
supabase link --project-ref your-project-ref

# Push the database schema and RPCs
supabase db push
```

### 5. Setup AI Edge Function
To enable the AI Quiz Generator, configure your Edge Function in Supabase.

1.  Go to your Supabase Dashboard -> **Edge Functions** -> **Secrets**.
2.  Add the following secrets:
    *   `GEMINI_API_KEY`: Your Google Gemini API Key.
    *   `SUPABASE_URL`: Your Supabase project URL.
    *   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Service Role Key.
3.  Deploy the function via the CLI:
    ```bash
    supabase functions deploy generate-quiz
    ```

### 6. Start the Development Server
```bash
npm run dev
# or
bun run dev
```
The application will be available at `http://localhost:8080`.

---

<div align="center">
  <p>Built with ❤️ for interactive learning.</p>
</div>

