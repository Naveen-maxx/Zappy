import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Zap, ArrowLeft, Plus, Trash2, Sparkles,
  Save, Loader2, GripVertical, Check, Image, X
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import { Question as GameQuestion, QuestionType } from '@/types/game';

// Extend the shared type with local UI specific fields
type Question = GameQuestion & {
  source?: 'ai' | 'manual';
};

export default function CreateQuiz() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editQuizId = searchParams.get('edit');
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [quizTitle, setQuizTitle] = useState('');
  const [aiTopic, setAiTopic] = useState('');
  const [draftQuizId, setDraftQuizId] = useState<string | null>(editQuizId);
  const [questions, setQuestions] = useState<Question[]>([
    {
      type: 'multiple-choice',
      id: '1',
      text: '',
      options: ['', '', '', ''],
      correctIndex: 0,
      timeLimit: 20,
      source: 'manual',
      imageUrl: undefined,
    },
  ]);
  const [uploadingImageId, setUploadingImageId] = useState<string | null>(null);
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const serializeQuestionsForDb = (qs: Question[]) =>
    qs.map((q) => {
      if (q.type === 'multiple-choice') {
        return {
          ...q,
          source: q.source ?? 'manual',
          correctAnswer: q.options?.[q.correctIndex] ?? '',
        };
      } else {
        return {
          ...q,
          source: q.source ?? 'manual',
          // Debug questions don't have 'correctAnswer' string the same way, 
          // but we might want to store something for legacy compat if needed.
          // For now, we trust the new schema.
        };
      }
    });

  const persistDraftQuiz = useCallback(async (title: string, qs: Question[]) => {
    if (!user) return;

    const dbQuestions = JSON.parse(JSON.stringify(serializeQuestionsForDb(qs)));

    if (draftQuizId) {
      const { error } = await supabase
        .from('quizzes')
        .update({ title, questions: dbQuestions })
        .eq('id', draftQuizId)
        .eq('user_id', user.id);

      if (error) throw error;
      return;
    }

    const { data, error } = await supabase
      .from('quizzes')
      .insert([{ user_id: user.id, title, questions: dbQuestions }])
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (data?.id) setDraftQuizId(data.id);
  }, [user, draftQuizId]);

  // Auto-save functionality
  useEffect(() => {
    if (!user) return;
    // Only auto-save if there's content (title or questions with text/images)
    if (!quizTitle.trim() && !questions.some(q => q.text.trim() || q.imageUrl)) return;

    const autoSaveTimer = setTimeout(() => {
      if (questions.some(q => q.text.trim() || q.imageUrl)) {
        persistDraftQuiz(quizTitle.trim() || 'Untitled Quiz', questions).catch(err => {
          console.error('Auto-save failed:', err);
          // Don't show error to user for auto-save failures
        });
      }
    }, 2000); // Auto-save after 2 seconds of inactivity

    return () => clearTimeout(autoSaveTimer);
  }, [quizTitle, questions, user, persistDraftQuiz]);

  // Save to localStorage as backup
  useEffect(() => {
    const backupData = {
      quizTitle,
      questions,
      draftQuizId,
      timestamp: Date.now(),
    };
    localStorage.setItem('zappy_quiz_draft', JSON.stringify(backupData));
  }, [quizTitle, questions, draftQuizId]);

  // Load from localStorage on mount (before loading from DB)
  useEffect(() => {
    if (editQuizId) return; // Don't restore if editing existing quiz

    try {
      const saved = localStorage.getItem('zappy_quiz_draft');
      if (saved) {
        const backupData = JSON.parse(saved);
        // Only restore if it's recent (within 1 hour)
        if (Date.now() - backupData.timestamp < 3600000) {
          if (backupData.quizTitle) {
            setQuizTitle(backupData.quizTitle);
          }
          if (backupData.questions?.length > 0) {
            setQuestions(backupData.questions);
          }
          if (backupData.draftQuizId) {
            setDraftQuizId(backupData.draftQuizId);
          }
        }
      }
    } catch (err) {
      console.error('Failed to restore from localStorage:', err);
    }
  }, [editQuizId]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (questions.some(q => q.text.trim() || q.imageUrl)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [questions]);

  // Load existing quiz for editing
  useEffect(() => {
    const loadQuizForEditing = async () => {
      if (!editQuizId || !user) {
        setIsLoadingQuiz(false);
        return;
      }

      setIsLoadingQuiz(true);
      try {
        const { data: quiz, error } = await supabase
          .from('quizzes')
          .select('title, questions')
          .eq('id', editQuizId)
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;

        if (!quiz) {
          toast.error('Quiz not found or you do not have permission to edit it');
          navigate('/dashboard');
          return;
        }

        setQuizTitle(quiz.title);

        // Parse and set questions, refreshing image URLs if needed
        const loadedQuestions = quiz.questions as unknown as any[];
        if (Array.isArray(loadedQuestions) && loadedQuestions.length > 0) {
          try {
            const questionsWithRefreshedUrls = await Promise.all(
              loadedQuestions.map(async (q, idx) => {
                let imageUrl = q.imageUrl;

                // If image URL exists, try to refresh it with a signed URL
                if (imageUrl && typeof imageUrl === 'string') {
                  try {
                    // Check if it's a valid URL format
                    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                      const url = new URL(imageUrl);
                      const fileName = url.pathname.split('/question-images/')[1];
                      if (fileName) {
                        const { data: signedData, error: signedError } = await supabase.storage
                          .from('question-images')
                          .createSignedUrl(fileName, 31536000); // 1 year expiry

                        if (!signedError && signedData?.signedUrl) {
                          imageUrl = signedData.signedUrl;
                        }
                      }
                    }
                  } catch (err) {
                    console.error('Error refreshing image URL:', err);
                    // Keep original URL if refresh fails
                  }
                }

                const base = {
                  id: q.id || String(idx + 1),
                  text: q.text || '',
                  timeLimit: q.timeLimit || 20,
                  source: q.source || 'manual',
                  imageUrl,
                };

                // Infer type if missing (legacy support)
                if (q.type === 'code-debug' || (q.codeSnippet && !q.options)) {
                  return {
                    ...base,
                    type: 'code-debug' as const,
                    codeSnippet: q.codeSnippet || '',
                    correctLine: q.correctLine || 1,
                    correctedCode: q.correctedCode || '',
                  };
                } else {
                  return {
                    ...base,
                    type: 'multiple-choice' as const,
                    options: q.options || ['', '', '', ''],
                    correctIndex: q.correctIndex ?? 0,
                  };
                }
              })
            );

            setQuestions(questionsWithRefreshedUrls);
          } catch (err) {
            console.error('Error processing questions:', err);
            // Fallback: set questions without refreshing URLs
            setQuestions(loadedQuestions.map((q, idx) => {
              const base = {
                id: q.id || String(idx + 1),
                text: q.text || '',
                timeLimit: q.timeLimit || 20,
                source: q.source || 'manual',
                imageUrl: q.imageUrl,
              };

              if (q.type === 'code-debug' || (q.codeSnippet && !q.options)) {
                return {
                  ...base,
                  type: 'code-debug' as const,
                  codeSnippet: q.codeSnippet || '',
                  correctLine: q.correctLine || 1,
                  correctedCode: q.correctedCode || '',
                };
              } else {
                return {
                  ...base,
                  type: 'multiple-choice' as const,
                  options: q.options || ['', '', '', ''],
                  correctIndex: q.correctIndex ?? 0,
                };
              }
            }));
          }
        } else {
          // If no questions, ensure at least one empty question exists
          setQuestions([{
            type: 'multiple-choice',
            id: '1',
            text: '',
            options: ['', '', '', ''],
            correctIndex: 0,
            timeLimit: 20,
            source: 'manual',
            imageUrl: undefined,
          }]);
        }

        // Clear localStorage backup when loading from DB
        localStorage.removeItem('zappy_quiz_draft');

        toast.success('Quiz loaded for editing');
      } catch (error: any) {
        console.error('Error loading quiz:', error);
        toast.error('Failed to load quiz');
        navigate('/dashboard');
      } finally {
        setIsLoadingQuiz(false);
      }
    };

    loadQuizForEditing();
  }, [editQuizId, user, navigate]);


  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        type: 'multiple-choice',
        id: Date.now().toString(),
        text: '',
        options: ['', '', '', ''],
        correctIndex: 0,
        timeLimit: 20,
        source: 'manual',
        imageUrl: undefined,
      },
    ]);
  };

  const handleImageUpload = async (questionId: string, file: File) => {
    if (!user) {
      toast.error('You must be logged in to upload images');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    setUploadingImageId(questionId);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${questionId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // For private buckets, try to get a signed URL first (valid for 1 year)
      // If that fails, fall back to public URL
      let imageUrl: string;

      try {
        const { data: signedData, error: signedError } = await supabase.storage
          .from('question-images')
          .createSignedUrl(fileName, 31536000); // 1 year expiry

        if (!signedError && signedData?.signedUrl) {
          imageUrl = signedData.signedUrl;
        } else {
          // Fallback to public URL (should work if policy allows)
          const { data: { publicUrl } } = supabase.storage
            .from('question-images')
            .getPublicUrl(fileName);
          imageUrl = publicUrl;
        }
      } catch (urlError) {
        // Final fallback
        const { data: { publicUrl } } = supabase.storage
          .from('question-images')
          .getPublicUrl(fileName);
        imageUrl = publicUrl;
      }

      // Update the question with the image URL
      updateQuestion(questionId, { imageUrl });

      // Auto-save the quiz to persist the image URL immediately
      if (quizTitle.trim() || draftQuizId) {
        try {
          await persistDraftQuiz(quizTitle.trim() || 'Untitled Quiz', questions.map(q =>
            q.id === questionId ? { ...q, imageUrl: imageUrl } : q
          ));
        } catch (saveError) {
          console.error('Auto-save failed:', saveError);
          // Don't show error to user, just log it
        }
      }

      toast.success('Image uploaded successfully!');
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error(error.message || 'Failed to upload image');
    } finally {
      setUploadingImageId(null);
    }
  };

  const removeImage = async (questionId: string) => {
    const question = questions.find(q => q.id === questionId);
    if (question?.imageUrl) {
      // Extract filename from URL and delete from storage
      try {
        const url = new URL(question.imageUrl);
        const fileName = url.pathname.split('/question-images/')[1];
        if (fileName) {
          await supabase.storage
            .from('question-images')
            .remove([fileName]);
        }
      } catch (err) {
        console.error('Error deleting image from storage:', err);
      }
    }

    updateQuestion(questionId, { imageUrl: undefined });

    // Auto-save after removing image
    if (quizTitle.trim() || draftQuizId) {
      try {
        await persistDraftQuiz(quizTitle.trim() || 'Untitled Quiz', questions.map(q =>
          q.id === questionId ? { ...q, imageUrl: undefined } : q
        ));
      } catch (saveError) {
        console.error('Auto-save failed:', saveError);
      }
    }

    // Reset file input
    if (fileInputRefs.current[questionId]) {
      fileInputRefs.current[questionId]!.value = '';
    }
  };

  const removeQuestion = (id: string) => {
    if (questions.length > 1) {
      setQuestions(questions.filter((q) => q.id !== id));
    }
  };

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    // @ts-ignore - complex union merges
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)));
  };

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(
      questions.map((q) => {
        if (q.id === questionId && q.type === 'multiple-choice') {
          return { ...q, options: q.options.map((opt, i) => (i === optionIndex ? value : opt)) };
        }
        return q;
      })
    );
  };

  const [questionCount, setQuestionCount] = useState(5);


  const generateWithAI = async () => {
    if (!aiTopic.trim()) {
      toast.error('Please enter a topic for AI generation');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to generate questions');
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-quiz', {
        body: { topic: aiTopic.trim(), numberOfQuestions: questionCount },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Edge function call failed');
      }

      if (data?.error) throw new Error(data.error);

      const generatedQuestions = (data.questions as Question[] | undefined) ?? [];
      if (!generatedQuestions.length) throw new Error('No questions were generated');

      const nextTitle = `${aiTopic} Trivia`;
      const tagged = generatedQuestions.map((q: any) => ({
        ...q,
        type: 'multiple-choice' as const,
        source: 'ai' as const,
        options: q.options || [],
        correctIndex: q.correctIndex ?? 0,
      }));

      setQuestions(tagged);
      setQuizTitle(nextTitle);

      // Persist immediately as a draft so generation is never lost
      try {
        await persistDraftQuiz(nextTitle, tagged);
      } catch (e: any) {
        console.error('Failed to persist draft quiz:', e);
        toast.error('Generated questions, but failed to save draft to database');
      }

      toast.success(`Generated ${tagged.length} questions!`);
    } catch (error: any) {
      console.error('Error generating questions:', error);
      toast.error(error.message || 'Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!quizTitle.trim()) {
      toast.error('Please enter a quiz title');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to save a quiz');
      return;
    }

    const emptyQuestions = questions.filter((q) => !q.text.trim());
    if (emptyQuestions.length > 0) {
      toast.error('Please fill in all question texts');
      return;
    }

    setIsSaving(true);

    try {
      const dbQuestions = JSON.parse(JSON.stringify(serializeQuestionsForDb(questions)));

      if (draftQuizId) {
        const { error } = await supabase
          .from('quizzes')
          .update({ title: quizTitle.trim(), questions: dbQuestions })
          .eq('id', draftQuizId)
          .eq('user_id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('quizzes').insert([
          {
            user_id: user.id,
            title: quizTitle.trim(),
            questions: dbQuestions,
          },
        ]);

        if (error) throw error;
      }

      toast.success('Quiz saved successfully!');
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error saving quiz:', error);
      toast.error(error.message || 'Failed to save quiz');
    } finally {
      setIsSaving(false);
    }
  };

  const answerColors = ['bg-answer-red', 'bg-answer-blue', 'bg-answer-yellow', 'bg-answer-green'];

  // Loading state for editing - only show if actually editing
  if (isLoadingQuiz && editQuizId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="mt-4 text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Ensure questions array is never empty
  const displayQuestions = questions.length > 0 ? questions : [{
    type: 'multiple-choice' as const,
    id: '1',
    text: '',
    options: ['', '', '', ''],
    correctIndex: 0,
    timeLimit: 20,
    source: 'manual' as const,
    imageUrl: undefined,
  }];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back to Dashboard</span>
          </Link>
          <div className="flex flex-col items-center">
            <Link to="/" className="flex items-center gap-2 font-display text-2xl font-bold gradient-text">
              <Zap className="w-7 h-7" />
              Zappy
            </Link>
            {editQuizId && (
              <span className="text-xs text-muted-foreground">Editing Quiz</span>
            )}
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {editQuizId ? 'Update Quiz' : 'Save Quiz'}
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Quiz Title */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Label htmlFor="title" className="text-lg font-semibold">Quiz Title</Label>
          <Input
            id="title"
            placeholder="Enter your quiz title..."
            className="mt-2 text-xl h-14"
            value={quizTitle}
            onChange={(e) => setQuizTitle(e.target.value)}
          />
        </motion.div>

        {/* AI Generation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card rounded-2xl p-6 mb-8"
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="font-display text-lg font-bold">AI Question Generator</h2>
          </div>
          <p className="text-muted-foreground mb-4">
            Enter a topic and let AI generate questions for you instantly!
          </p>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <Input
                placeholder="e.g., World History, Space Exploration, Pop Music..."
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                className="flex-1"
              />
              <div className="flex items-center gap-2">
                <Label htmlFor="questionCount" className="whitespace-nowrap text-sm">Questions:</Label>
                <select
                  id="questionCount"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="bg-muted rounded-md px-3 py-2 text-sm min-w-[70px]"
                >
                  {[5, 10, 15, 20].map(n => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button
              onClick={generateWithAI}
              disabled={isGenerating}
              className="neon-glow whitespace-nowrap w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Questions
                </>
              )}
            </Button>
          </div>
        </motion.div>

        {/* Questions */}
        <div className="space-y-6">
          <AnimatePresence mode="popLayout">
            {displayQuestions.map((question, qIndex) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                layout
                className="glass-card rounded-2xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-5 h-5 text-muted-foreground cursor-grab" />
                    <span className="font-display font-bold text-lg">
                      Question {qIndex + 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 mr-2">
                      <Label htmlFor={`type-${question.id}`} className="sr-only">Type</Label>
                      <select
                        id={`type-${question.id}`}
                        value={question.type}
                        onChange={(e) => {
                          const newType = e.target.value as QuestionType;
                          updateQuestion(question.id, {
                            type: newType,
                            // Reset relevant fields when switching
                            ...(newType === 'code-debug' ? {
                              codeSnippet: '',
                              correctLine: 1,
                              correctedCode: '',
                              options: undefined,
                              correctIndex: undefined
                            } : {
                              options: ['', '', '', ''],
                              correctIndex: 0,
                              codeSnippet: undefined,
                              correctLine: undefined,
                              correctedCode: undefined
                            })
                          });
                        }}
                        className="bg-muted rounded-md px-3 py-1 text-sm font-medium border-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="multiple-choice">Multiple Choice</option>
                        <option value="code-debug">Code Debug</option>
                      </select>
                    </div>

                    <select
                      value={question.timeLimit}
                      onChange={(e) => updateQuestion(question.id, { timeLimit: Number(e.target.value) })}
                      className="bg-muted rounded-md px-3 py-1 text-sm"
                    >
                      <option value={10}>10s</option>
                      <option value={20}>20s</option>
                      <option value={30}>30s</option>
                      <option value={60}>60s</option>
                      <option value={90}>90s</option>
                      <option value={120}>2m</option>
                    </select>
                    {questions.length > 1 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(question.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-4 mb-4">
                  <div>
                    <Label className="text-xs text-muted-foreground ml-1 mb-1.5 block uppercase tracking-wider font-bold">
                      Question Text
                    </Label>
                    <Textarea
                      placeholder={question.type === 'code-debug' ? "e.g. Find the bug in this function..." : "Enter your question..."}
                      value={question.text}
                      onChange={(e) => updateQuestion(question.id, { text: e.target.value })}
                      className="min-h-[60px] resize-none"
                    />
                  </div>

                  {question.type === 'code-debug' && (
                    <div className="grid gap-4">
                      <div>
                        <Label className="text-xs text-muted-foreground ml-1 mb-1.5 block uppercase tracking-wider font-bold">
                          Code Snippet (with error)
                        </Label>
                        <Textarea
                          placeholder="// Paste your code here..."
                          value={question.codeSnippet || ''}
                          onChange={(e) => updateQuestion(question.id, { codeSnippet: e.target.value })}
                          className="font-mono text-sm bg-black/40 border-white/10 min-h-[200px]"
                          spellCheck={false}
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-muted-foreground ml-1 mb-1.5 block uppercase tracking-wider font-bold">
                            Error Line Number
                          </Label>
                          <Input
                            type="number"
                            min={1}
                            placeholder="Line #"
                            value={question.correctLine || ''}
                            onChange={(e) => updateQuestion(question.id, { correctLine: parseInt(e.target.value) || 1 })}
                            className="font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground ml-1 mb-1.5 block uppercase tracking-wider font-bold">
                            Corrected Line Logic (For Display)
                          </Label>
                          <Input
                            placeholder="e.g. return a + b;"
                            value={question.correctedCode || ''}
                            onChange={(e) => updateQuestion(question.id, { correctedCode: e.target.value })}
                            className="font-mono bg-green-500/10 border-green-500/20"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Upload Section */}
                <div className="mb-4">
                  {question.imageUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={question.imageUrl}
                        alt="Question image"
                        className="max-h-40 rounded-lg object-contain border border-border"
                        onError={(e) => {
                          // If image fails to load, try to get a signed URL
                          const img = e.currentTarget;
                          const url = new URL(img.src);
                          const fileName = url.pathname.split('/question-images/')[1];
                          if (fileName && user) {
                            supabase.storage
                              .from('question-images')
                              .createSignedUrl(fileName, 3600)
                              .then(({ data, error }) => {
                                if (!error && data?.signedUrl) {
                                  img.src = data.signedUrl;
                                }
                              });
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(question.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center hover:bg-destructive/90 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={(el) => (fileInputRefs.current[question.id] = el)}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(question.id, file);
                        }}
                        className="hidden"
                        id={`image-upload-${question.id}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRefs.current[question.id]?.click()}
                        disabled={uploadingImageId === question.id}
                        className="text-muted-foreground"
                      >
                        {uploadingImageId === question.id ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Image className="w-4 h-4 mr-2" />
                            Add Image (Optional)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {question.type === 'multiple-choice' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {question.options.map((option, oIndex) => (
                      <div
                        key={oIndex}
                        className={`relative rounded-xl overflow-hidden ${answerColors[oIndex]}`}
                      >
                        <Input
                          placeholder={`Option ${oIndex + 1}`}
                          value={option}
                          onChange={(e) => updateOption(question.id, oIndex, e.target.value)}
                          className="bg-transparent border-0 text-white placeholder:text-white/60 pr-12"
                        />
                        <button
                          type="button"
                          onClick={() => updateQuestion(question.id, { correctIndex: oIndex })}
                          className={`absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center transition-all ${question.correctIndex === oIndex
                            ? 'bg-white text-green-600'
                            : 'bg-white/20 text-white/60 hover:bg-white/30'
                            }`}
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add Question Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6"
        >
          <Button
            variant="outline"
            size="lg"
            onClick={addQuestion}
            className="w-full border-dashed"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Question
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
