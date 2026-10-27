import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { QuizList } from './components/QuizList.tsx';
import { QuizEditor } from './components/QuizEditor.tsx';
import { PresenterMode } from './components/PresenterMode.tsx';
import { ScoreBoardEntry } from './components/ScoreBoardEntry.tsx';
import { LeaderboardView } from './components/LeaderboardView.tsx';
import { AnswerSheets } from './components/AnswerSheets.tsx';
import { Quiz, QuizListItem } from './types/quiz.ts';
import {
  fetchQuizzes,
  fetchQuiz,
  createQuizApi,
  deleteQuizApi,
} from './lib/api.ts';
import { Sparkles, AlertCircle, LogIn, Loader2 } from 'lucide-react';

function AppContent() {
  const { user, loading, signIn, signUp, signOut } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [currentView, setCurrentView] = useState<
    'quizzes' | 'editor' | 'presenter' | 'scores' | 'standings' | 'sheets'
  >('quizzes');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadQuizzes = async () => {
    if (!user) {
      setQuizzes([]);
      return;
    }
    setIsLoadingQuizzes(true);
    setErrorMessage(null);
    try {
      const data = await fetchQuizzes();
      setQuizzes(data);
    } catch (err: any) {
      console.error('Failed to load quizzes:', err);
      setErrorMessage(err.message || 'Kon quizzen niet ophalen');
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadQuizzes();
    } else {
      setQuizzes([]);
    }
  }, [user]);

  const loadActiveQuiz = async (quizId: string) => {
    try {
      const data = await fetchQuiz(quizId);
      setActiveQuiz(data);
    } catch (err: any) {
      console.error('Failed to load active quiz:', err);
      setErrorMessage(err.message || 'Kon geselecteerde quiz niet ophalen');
    }
  };

  useEffect(() => {
    if (activeQuizId) {
      loadActiveQuiz(activeQuizId);
    } else {
      setActiveQuiz(null);
    }
  }, [activeQuizId]);

  const handleCreateQuiz = async (title: string, description: string) => {
    const newQuiz = await createQuizApi(title, description);
    await loadQuizzes();
    setActiveQuizId(newQuiz.id);
    setCurrentView('editor');
  };

  const handleDeleteQuiz = async (id: string) => {
    await deleteQuizApi(id);
    if (activeQuizId === id) {
      setActiveQuizId(null);
      setCurrentView('quizzes');
    }
    await loadQuizzes();
  };

  const handleSelectQuiz = (
    id: string,
    targetView: 'editor' | 'presenter' | 'scores' | 'standings' | 'sheets' = 'editor'
  ) => {
    setActiveQuizId(id);
    setCurrentView(targetView);
  };

  const handleBackToQuizzes = () => {
    setActiveQuizId(null);
    setCurrentView('quizzes');
  };

  const refreshActiveQuiz = async () => {
    if (activeQuizId) {
      await loadActiveQuiz(activeQuizId);
      await loadQuizzes();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
            <p className="text-sm text-slate-400">PubQuiz Master Pro laden...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthScreen
        onSignIn={signIn}
        onSignUp={signUp}
        error={errorMessage}
        setError={setErrorMessage}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        activeQuiz={activeQuiz}
        onBackToQuizzes={handleBackToQuizzes}
      />

      {errorMessage && (
        <div className="no-print max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-200 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white cursor-pointer font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <main>
        {currentView === 'quizzes' && (
          <QuizList
            quizzes={quizzes}
            isLoading={isLoadingQuizzes}
            onCreateQuiz={handleCreateQuiz}
            onSelectQuiz={handleSelectQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            isAuthenticated={!!user}
            onSignInPrompt={() => {}}
          />
        )}

        {currentView === 'editor' && activeQuiz && (
          <QuizEditor
            quiz={activeQuiz}
            onRefreshQuiz={refreshActiveQuiz}
            onStartPresenter={() => setCurrentView('presenter')}
          />
        )}

        {currentView === 'presenter' && activeQuiz && (
          <PresenterMode
            quiz={activeQuiz}
            onGoToScores={() => setCurrentView('scores')}
            onBackToEditor={() => setCurrentView('editor')}
          />
        )}

        {currentView === 'scores' && activeQuiz && (
          <ScoreBoardEntry
            quiz={activeQuiz}
            onRefreshQuiz={refreshActiveQuiz}
            onGoToStandings={() => setCurrentView('standings')}
          />
        )}

        {currentView === 'standings' && activeQuiz && (
          <LeaderboardView
            quiz={activeQuiz}
            onBackToAdmin={() => setCurrentView('editor')}
          />
        )}

        {currentView === 'sheets' && activeQuiz && (
          <AnswerSheets
            quiz={activeQuiz}
            onBackToEditor={() => setCurrentView('editor')}
          />
        )}
      </main>
    </div>
  );
}

interface AuthScreenProps {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (email: string, password: string) => Promise<void>;
  error: string | null;
  setError: (e: string | null) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onSignIn, onSignUp, error, setError }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setBusy(true);
    setLocalError(null);
    setError(null);
    try {
      if (mode === 'signin') {
        await onSignIn(email.trim(), password);
      } else {
        await onSignUp(email.trim(), password);
      }
    } catch (err: any) {
      setLocalError(err.message || 'Er ging iets mis');
    } finally {
      setBusy(false);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      <header className="px-6 py-5 border-b border-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            PubQuiz Master Pro
          </span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-16 text-center my-auto">
        <div className="w-20 h-20 bg-indigo-950/60 text-indigo-400 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-indigo-900/60 shadow-xl">
          <Sparkles className="w-10 h-10" />
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 text-balance">
          De ultieme live pubquiz bediening voor de presentator
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed text-pretty">
          Bereid quizrondes en audiofragmenten voor, bedien tijdens de quiz vraag-voor-vraag op je laptop, genereer A4 antwoordbladen en toon de live stand met verschuivingen op de beamer.
        </p>

        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md mx-auto shadow-2xl text-left">
          <h2 className="text-base font-bold text-white mb-2">
            {mode === 'signin' ? 'Inloggen' : 'Account aanmaken'}
          </h2>
          <p className="text-xs text-slate-400 mb-6">
            {mode === 'signin'
              ? 'Log in om je quizzen te beheren.'
              : 'Maak een account aan om je quizzen veilig op te slaan.'}
          </p>

          {displayError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{displayError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                E-mailadres
              </label>
              <input
                type="email"
                required
                placeholder="jij@voorbeeld.nl"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Wachtwoord
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="Minimaal 6 tekens"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-800 border border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-white"
              />
            </div>

            <button
              type="submit"
              disabled={busy || !email.trim() || !password}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl transition-all shadow-md cursor-pointer"
            >
              {busy ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              <span>{mode === 'signin' ? 'Inloggen' : 'Account aanmaken'}</span>
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin');
              setLocalError(null);
              setError(null);
            }}
            className="w-full mt-4 text-xs text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
          >
            {mode === 'signin'
              ? 'Nog geen account? Maak er een aan'
              : 'Al een account? Log in'}
          </button>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-slate-600 border-t border-slate-900">
        PubQuiz Master Pro · Veilig quizbeheer voor presentatoren en nakijkers
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppContent />
      </ErrorBoundary>
    </AuthProvider>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crash:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <div className="w-12 h-12 bg-rose-950/60 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-900">
              <AlertCircle className="w-7 h-7 text-rose-400" />
            </div>
            <h1 className="text-lg font-bold text-white mb-2">
              Er ging iets mis
            </h1>
            <p className="text-xs text-slate-400 mb-1">
              De app liep op een onverwachte fout.
            </p>
            <p className="text-xs text-rose-300 mb-4 font-mono break-all">
              {this.state.message}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
            >
              Pagina vernieuwen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
