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
import { LogIn, Sparkles, AlertCircle } from 'lucide-react';

function AppContent() {
  const { user, loading: authLoading, token, getAuthHeaders, signInWithGoogle } = useAuth();
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [activeQuizId, setActiveQuizId] = useState<number | null>(null);
  const [isLoadingQuizzes, setIsLoadingQuizzes] = useState(false);
  const [currentView, setCurrentView] = useState<
    'quizzes' | 'editor' | 'presenter' | 'scores' | 'standings' | 'sheets'
  >('quizzes');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load quizzes when token is available
  const loadQuizzes = async () => {
    if (!token) {
      setQuizzes([]);
      return;
    }
    setIsLoadingQuizzes(true);
    setErrorMessage(null);
    try {
      const data = await fetchQuizzes(getAuthHeaders());
      setQuizzes(data);
    } catch (err: any) {
      console.error('Failed to load quizzes:', err);
      setErrorMessage(err.message || 'Kon quizzen niet ophalen');
    } finally {
      setIsLoadingQuizzes(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadQuizzes();
    }
  }, [token]);

  // Load active quiz details when activeQuizId changes
  const loadActiveQuiz = async (quizId: number) => {
    try {
      const data = await fetchQuiz(quizId, getAuthHeaders());
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
    const newQuiz = await createQuizApi(title, description, getAuthHeaders());
    await loadQuizzes();
    setActiveQuizId(newQuiz.id);
    setCurrentView('editor');
  };

  const handleDeleteQuiz = async (id: number) => {
    await deleteQuizApi(id, getAuthHeaders());
    if (activeQuizId === id) {
      setActiveQuizId(null);
      setCurrentView('quizzes');
    }
    await loadQuizzes();
  };

  const handleSelectQuiz = (
    id: number,
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

  // If user is not signed in
  if (!authLoading && !user) {
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

          <button
            onClick={signInWithGoogle}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-sm"
          >
            <LogIn className="w-4 h-4 text-slate-900" />
            <span>Inloggen met Google</span>
          </button>
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

          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-lg mx-auto shadow-2xl">
            <h2 className="text-base font-bold text-white mb-2">
              Log in op het beheerdersgedeelte
            </h2>
            <p className="text-xs text-slate-400 mb-6">
              Veilig opgeslagen in je Cloud SQL database. Alleen jij hebt toegang tot jouw quizvragen en antwoorden.
            </p>

            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 text-sm font-bold text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-slate-900" />
              <span>Inloggen met Google Account</span>
            </button>
          </div>
        </main>

        <footer className="py-6 text-center text-xs text-slate-600 border-t border-slate-900">
          PubQuiz Master Pro · Veilig quizbeheer voor presentatoren en nakijkers
        </footer>
      </div>
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
            onSignInPrompt={signInWithGoogle}
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

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
