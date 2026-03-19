import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeToggle } from "./components/ThemeToggle";
import ProtectedRoute from "./components/ProtectedRoute";
import Landing from "./pages/Landing";
import JoinGame from "./pages/JoinGame";
import WaitingRoom from "./pages/WaitingRoom";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import CreateQuiz from "./pages/CreateQuiz";
import LiveQuiz from "./pages/LiveQuiz";
import Results from "./pages/Results";
import HostGame from "./pages/HostGame";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem storageKey="zappy-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="fixed bottom-4 right-4 z-[100]">
              <ThemeToggle />
            </div>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Auth mode="login" />} />
              <Route path="/register" element={<Auth mode="register" />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/create" element={<ProtectedRoute><CreateQuiz /></ProtectedRoute>} />
              <Route path="/join" element={<JoinGame />} />
              <Route path="/waiting/:roomCode" element={<WaitingRoom />} />
              <Route path="/play/:roomCode" element={<LiveQuiz />} />
              <Route path="/host/:quizId" element={<ProtectedRoute><HostGame /></ProtectedRoute>} />
              <Route path="/results/:roomCode" element={<Results />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
