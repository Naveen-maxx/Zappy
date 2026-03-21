import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  Zap, Plus, Play, Users, BarChart3,
  Clock, Trophy, Settings, LogOut, Gamepad2, Medal, Award, Trash2, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface GameResult {
  winner_1_name: string | null;
  winner_1_score: number | null;
  winner_2_name: string | null;
  winner_2_score: number | null;
  winner_3_name: string | null;
  winner_3_score: number | null;
  played_at: string;
  total_participants: number;
}

interface Quiz {
  id: string;
  title: string;
  questionCount: number;
  playCount: number;
  createdAt: string;
  lastGameResult?: GameResult;
}

interface Stats {
  totalQuizzes: number;
  totalPlayers: number;
  gamesHosted: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, profile, logout } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [stats, setStats] = useState<Stats>({ totalQuizzes: 0, totalPlayers: 0, gamesHosted: 0 });
  const [loading, setLoading] = useState(true);
  const [deletingQuizId, setDeletingQuizId] = useState<string | null>(null);

  // Fetch user's quizzes and stats from database
  useEffect(() => {
    const fetchQuizzesAndStats = async () => {
      if (!user) return;

      setLoading(true);
      try {
        // Fetch quizzes
        const { data: quizzesData, error: quizzesError } = await supabase
          .from('quizzes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (quizzesError) throw quizzesError;

        // Fetch game results for this user's quizzes
        const quizIds = (quizzesData || []).map((q: any) => q.id);
        const { data: gameResults } = await supabase
          .from('game_results')
          .select('*')
          .in('quiz_id', quizIds)
          .order('played_at', { ascending: false });

        // Calculate total players and games hosted
        let totalPlayers = 0;
        const gamesHosted = (gameResults || []).length;
        (gameResults || []).forEach((result: any) => {
          totalPlayers += result.total_participants || 0;
        });

        // Group results by quiz_id (take most recent)
        const resultsByQuiz: Record<string, GameResult> = {};
        (gameResults || []).forEach((result: any) => {
          if (!resultsByQuiz[result.quiz_id]) {
            resultsByQuiz[result.quiz_id] = {
              winner_1_name: result.winner_1_name,
              winner_1_score: result.winner_1_score,
              winner_2_name: result.winner_2_name,
              winner_2_score: result.winner_2_score,
              winner_3_name: result.winner_3_name,
              winner_3_score: result.winner_3_score,
              played_at: result.played_at,
              total_participants: result.total_participants,
            };
          }
        });

        const formattedQuizzes: Quiz[] = (quizzesData || []).map((quiz: any) => ({
          id: quiz.id,
          title: quiz.title,
          questionCount: Array.isArray(quiz.questions) ? quiz.questions.length : 0,
          playCount: quiz.play_count || 0,
          createdAt: quiz.created_at,
          lastGameResult: resultsByQuiz[quiz.id],
        }));

        setQuizzes(formattedQuizzes);
        setStats({
          totalQuizzes: formattedQuizzes.length,
          totalPlayers,
          gamesHosted,
        });
      } catch (error) {
        console.error('Error fetching quizzes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuizzesAndStats();
  }, [user]);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const handleDeleteQuiz = async (quizId: string, quizTitle: string) => {
    setDeletingQuizId(quizId);
    try {
      const { error } = await supabase
        .from('quizzes')
        .delete()
        .eq('id', quizId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setQuizzes(prev => prev.filter(q => q.id !== quizId));
      setStats(prev => ({ ...prev, totalQuizzes: prev.totalQuizzes - 1 }));
      toast.success(`"${quizTitle}" deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    } finally {
      setDeletingQuizId(null);
    }
  };

  const statsDisplay = [
    { icon: Gamepad2, label: 'Total Quizzes', value: stats.totalQuizzes, color: 'text-primary' },
    { icon: Users, label: 'Total Players', value: stats.totalPlayers, color: 'text-secondary' },
    { icon: Trophy, label: 'Games Hosted', value: stats.gamesHosted, color: 'text-accent' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold gradient-text">
            <img src="/logo.png" alt="Zappy" className="w-8 h-8 rounded-lg object-cover" />
            Zappy
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm sm:text-base truncate max-w-[180px] sm:max-w-none">
              Hey, <span className="text-foreground font-medium">{profile?.name || user?.email || 'Creator'}</span>!
            </span>
            <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log out">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8"
        >
          {statsDisplay.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg bg-primary/10 ${stat.color}`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-wrap gap-4 mb-8"
        >
          <Button
            size="lg"
            className="neon-glow"
            onClick={() => navigate('/create')}
          >
            <Plus className="mr-2 w-5 h-5" />
            Create New Quiz
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/join')}
          >
            <Gamepad2 className="mr-2 w-5 h-5" />
            Join a Game
          </Button>
        </motion.div>

        {/* Quizzes List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h2 className="font-display text-2xl font-bold mb-4">Your Quizzes</h2>

          {loading ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <div className="animate-pulse">
                <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Loading your quizzes...</p>
              </div>
            </div>
          ) : quizzes.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center">
              <Gamepad2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No quizzes yet</h3>
              <p className="text-muted-foreground mb-6">Create your first quiz and start hosting games!</p>
              <Button onClick={() => navigate('/create')}>
                <Plus className="mr-2 w-4 h-4" />
                Create Quiz
              </Button>
            </div>
          ) : (
            <div className="grid gap-4">
              {quizzes.map((quiz, i) => (
                <motion.div
                  key={quiz.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * i }}
                  whileHover={{ scale: 1.01 }}
                  className="glass-card rounded-xl p-5"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{quiz.title}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4" />
                          {quiz.questionCount} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {quiz.playCount} plays
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {new Date(quiz.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            disabled={deletingQuizId === quiz.id}
                            aria-label={`Delete ${quiz.title}`}
                          >
                            {deletingQuizId === quiz.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Quiz</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{quiz.title}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteQuiz(quiz.id, quiz.title)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/create?edit=${quiz.id}`)}
                        aria-label={`Edit ${quiz.title}`}
                      >
                        <Settings className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/host/${quiz.id}`)}
                        aria-label={`Host ${quiz.title}`}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Host
                      </Button>
                    </div>
                  </div>

                  {/* Last Game Winners */}
                  {quiz.lastGameResult && (
                    <div className="mt-4 pt-4 border-t border-border/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Trophy className="w-4 h-4 text-yellow-500" />
                        <span>Last game winners ({quiz.lastGameResult.total_participants} players)</span>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        {quiz.lastGameResult.winner_1_name && (
                          <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1.5 rounded-full">
                            <Trophy className="w-4 h-4 text-yellow-500" />
                            <span className="font-medium text-sm">{quiz.lastGameResult.winner_1_name}</span>
                            <span className="text-xs text-muted-foreground">{quiz.lastGameResult.winner_1_score?.toLocaleString()}</span>
                          </div>
                        )}
                        {quiz.lastGameResult.winner_2_name && (
                          <div className="flex items-center gap-2 bg-gray-500/10 px-3 py-1.5 rounded-full">
                            <Medal className="w-4 h-4 text-gray-400" />
                            <span className="font-medium text-sm">{quiz.lastGameResult.winner_2_name}</span>
                            <span className="text-xs text-muted-foreground">{quiz.lastGameResult.winner_2_score?.toLocaleString()}</span>
                          </div>
                        )}
                        {quiz.lastGameResult.winner_3_name && (
                          <div className="flex items-center gap-2 bg-amber-500/10 px-3 py-1.5 rounded-full">
                            <Award className="w-4 h-4 text-amber-600" />
                            <span className="font-medium text-sm">{quiz.lastGameResult.winner_3_name}</span>
                            <span className="text-xs text-muted-foreground">{quiz.lastGameResult.winner_3_score?.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
