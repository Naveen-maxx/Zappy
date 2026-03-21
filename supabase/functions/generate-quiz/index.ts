import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Security: Restrict CORS to allowed origins only
// Update this array with your production domain(s)
const ALLOWED_ORIGINS = [
  // Add your production domain(s) here, e.g.:
  'https://zappy-quiz.vercel.app'
  // 'https://yourdomain.com',
  // 'https://www.yourdomain.com',
];

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow localhost for development
  if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) return true;
  // Allow common development ports
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true;
  // Allow ngrok for mobile testing
  if (origin.endsWith('.ngrok-free.dev') || origin.endsWith('.ngrok.io')) return true;
  // Allow local LAN IPs for mobile testing (192.168.x.x, 10.x.x.x, 172.x.x.x)
  if (/^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin)) return true;
  return false;
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = isAllowedOrigin(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin!,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Credentials': 'true',
  };
}

// Input validation constants
const MAX_TOPIC_LENGTH = 200;

// Rate limiting constants
const RATE_LIMIT_WINDOW_MS = 3600000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_HOUR = 10;

interface GeminiQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  timeLimit: number;
}

// Shuffle array using Fisher-Yates algorithm
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Check if correct answer positions are too repetitive
function hasRepetitivePattern(positions: number[]): boolean {
  if (positions.length < 2) return false;

  // If ALL answers land on the same option, it's definitely repetitive
  const unique = new Set(positions);
  if (unique.size === 1) return true;

  // If any 3+ consecutive same positions
  let run = 1;
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] === positions[i - 1]) {
      run++;
      if (run >= 3) return true;
    } else {
      run = 1;
    }
  }

  // If distribution is extremely skewed (e.g., > 60% on one index)
  const counts = [0, 0, 0, 0];
  for (const p of positions) {
    if (p >= 0 && p < 4) counts[p]++;
  }
  const max = Math.max(...counts);
  return max / positions.length > 0.6;
}

// Randomize option positions and update correctIndex
function randomizeOptions(questions: GeminiQuestion[]): Question[] {
  let attempts = 0;
  let result: Question[];

  do {
    result = questions.map((q, index) => {
      const correctAnswer = q.correctAnswer;
      const shuffledOptions = shuffleArray(q.options);
      const correctIndex = shuffledOptions.findIndex((opt) => opt === correctAnswer);

      return {
        id: (Date.now() + index).toString(),
        text: q.question,
        options: shuffledOptions,
        correctIndex: correctIndex !== -1 ? correctIndex : 0,
        timeLimit: 20,
      };
    });

    const positions = result.map((q) => q.correctIndex);
    if (!hasRepetitivePattern(positions)) break;

    attempts++;
  } while (attempts < 8);

  return result;
}

const GEMINI_MODEL_CANDIDATES = [
  // Current recommended aliases / versions (try in order)
  'gemini-flash-latest',
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  // Older fallbacks
  'gemini-1.5-flash-latest',
  'gemini-1.5-flash',
];

function stripCodeFences(text: string) {
  let s = text.trim();
  if (s.startsWith('```json')) s = s.slice(7);
  else if (s.startsWith('```')) s = s.slice(3);
  if (s.endsWith('```')) s = s.slice(0, -3);
  return s.trim();
}

function extractJsonArray(text: string) {
  const s = stripCodeFences(text);
  const first = s.indexOf('[');
  const last = s.lastIndexOf(']');
  if (first !== -1 && last !== -1 && last > first) return s.slice(first, last + 1).trim();
  return s;
}

function isClassroomSafe(text: string) {
  const t = text.toLowerCase();
  // Minimal blocklist (avoid obvious adult/profanity); keep simple and conservative.
  const blocked = [
    'porn',
    'sex',
    'nude',
    'nudity',
    'rape',
    'suicide',
    'kill yourself',
    'terrorism',
    'cocaine',
    'heroin',
    'meth',
    'fuck',
    'shit',
  ];
  return !blocked.some((w) => t.includes(w));
}

function validateGeminiQuestions(value: unknown, expectedCount: number): GeminiQuestion[] {
  if (!Array.isArray(value)) throw new Error('Response is not a JSON array');
  if (value.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} questions but got ${value.length}`);
  }

  const out: GeminiQuestion[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error('Invalid question item');

    const q = item as Record<string, unknown>;
    const keys = Object.keys(q).sort().join(',');
    if (keys !== 'correctAnswer,options,question') {
      throw new Error('Invalid keys in question object');
    }

    const question = q.question;
    const options = q.options;
    const correctAnswer = q.correctAnswer;

    if (typeof question !== 'string' || !question.trim()) throw new Error('Missing question text');
    if (!Array.isArray(options) || options.length !== 4) throw new Error('Each question must have 4 options');
    if (typeof correctAnswer !== 'string' || !correctAnswer.trim()) throw new Error('Missing correctAnswer');

    const cleanedOptions = options.map((o) => (typeof o === 'string' ? o.trim() : '')).filter(Boolean);
    if (cleanedOptions.length !== 4) throw new Error('Options must be non-empty strings');

    const unique = new Set(cleanedOptions.map((o) => o.toLowerCase()));
    if (unique.size !== 4) throw new Error('Options must be unique');

    const normalizedCorrect = correctAnswer.trim();
    if (!cleanedOptions.includes(normalizedCorrect)) throw new Error('correctAnswer must match one of the options');

    if (!isClassroomSafe(question) || cleanedOptions.some((o) => !isClassroomSafe(o))) {
      throw new Error('Content is not classroom-safe');
    }

    out.push({ question: question.trim(), options: cleanedOptions, correctAnswer: normalizedCorrect });
  }

  return out;
}

async function callGemini(topic: string, numberOfQuestions: number, apiKey: string): Promise<GeminiQuestion[]> {
  const prompt = `You are an AI generating multiple-choice quiz questions.\n\nGenerate questions for the topic: "${topic}"\nNumber of questions: ${numberOfQuestions}\n\nReturn ONLY valid JSON.\nDo not include any text outside the JSON.\nDo not include markdown or code fences.\nEach question must have 4 options and one correct answer.\n\nReturn the JSON strictly in this format:\n[\n  {\n    "question": "Question text",\n    "options": ["Option A", "Option B", "Option C", "Option D"],\n    "correctAnswer": "Option C"\n  }\n]\n`;

  let lastNon404Error: string | null = null;
  let last404Error: string | null = null;

  for (const modelId of GEMINI_MODEL_CANDIDATES) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // Model not found → try next candidate
      if (response.status === 404) {
        last404Error = errorText;
        console.error(`Gemini model not found (${modelId})`, errorText);
        continue;
      }

      lastNon404Error = errorText;
      console.error('Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent || typeof textContent !== 'string') {
      console.error('Gemini returned no text content');
      throw new Error('No content in Gemini response');
    }

    const jsonString = extractJsonArray(textContent);

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse JSON from Gemini response');
      throw new Error('Gemini returned invalid JSON');
    }

    return validateGeminiQuestions(parsed, numberOfQuestions);
  }

  console.error('No supported Gemini model found. Last 404:', last404Error);
  if (lastNon404Error) console.error('Last non-404 error:', lastNon404Error);
  throw new Error('No supported Gemini model available');
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client for rate limiting
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract user ID from authorization header for rate limiting
    const authHeader = req.headers.get('authorization');
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (!error && user) {
        userId = user.id;
      }
    }

    // Rate limiting check (only for authenticated users)
    if (userId) {
      const { data: rateLimit, error: rateLimitError } = await supabase
        .from('api_rate_limits')
        .select('*')
        .eq('user_id', userId)
        .eq('endpoint', 'generate-quiz')
        .single();

      const now = Date.now();

      if (rateLimit && !rateLimitError) {
        const windowStart = new Date(rateLimit.window_start).getTime();

        if (now - windowStart > RATE_LIMIT_WINDOW_MS) {
          // Reset window
          await supabase
            .from('api_rate_limits')
            .upsert({
              user_id: userId,
              endpoint: 'generate-quiz',
              request_count: 1,
              window_start: new Date().toISOString()
            }, { onConflict: 'user_id,endpoint' });
        } else if (rateLimit.request_count >= MAX_REQUESTS_PER_HOUR) {
          // Rate limit exceeded
          console.log(`Rate limit exceeded for user ${userId}`);
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. You can generate up to 10 quizzes per hour. Please try again later.' }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        } else {
          // Increment counter
          await supabase
            .from('api_rate_limits')
            .update({ request_count: rateLimit.request_count + 1 })
            .eq('user_id', userId)
            .eq('endpoint', 'generate-quiz');
        }
      } else {
        // First request - create rate limit record
        await supabase
          .from('api_rate_limits')
          .insert({
            user_id: userId,
            endpoint: 'generate-quiz',
            request_count: 1,
            window_start: new Date().toISOString()
          });
      }
    }

    const { topic, numberOfQuestions } = await req.json();

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return new Response(
        JSON.stringify({ error: 'Topic is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Security: Enforce topic length limits to prevent API abuse
    const trimmedTopic = topic.trim();
    if (trimmedTopic.length > MAX_TOPIC_LENGTH) {
      return new Response(
        JSON.stringify({ error: `Topic must be ${MAX_TOPIC_LENGTH} characters or less` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const questionCount = Math.min(Math.max(parseInt(numberOfQuestions) || 5, 5), 20);

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let questions: GeminiQuestion[] | null = null;
    let lastErrorMessage: string | null = null;

    // Retry once (2 total attempts)
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        questions = await callGemini(topic.trim(), questionCount, apiKey);
        break;
      } catch (error) {
        lastErrorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Attempt ${attempt} failed:`, lastErrorMessage);
      }
    }

    if (!questions) {
      console.error('AI generation failed after retries:', lastErrorMessage);
      return new Response(
        JSON.stringify({
          error: 'AI generation failed. Please try again with a different topic.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Randomize options and ensure no repetitive patterns
    const formattedQuestions = randomizeOptions(questions!);

    console.log(`Successfully generated ${formattedQuestions.length} questions for topic: ${topic}`);

    return new Response(
      JSON.stringify({ questions: formattedQuestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in generate-quiz function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate quiz' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
