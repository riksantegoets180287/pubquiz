import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  HelpCircle,
  LogOut,
  LogIn,
  ListOrdered,
  MonitorPlay,
  Calculator,
  Trophy,
  Printer,
  ChevronLeft,
} from 'lucide-react';
import { Quiz } from '../types/quiz.ts';

interface NavbarProps {
  currentView: 'quizzes' | 'editor' | 'presenter' | 'scores' | 'standings' | 'sheets';
  setCurrentView: (view: 'quizzes' | 'editor' | 'presenter' | 'scores' | 'standings' | 'sheets') => void;
  activeQuiz: Quiz | null;
  onBackToQuizzes: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  activeQuiz,
  onBackToQuizzes,
}) => {
  const { user, signInWithGoogle, signOut, loading } = useAuth();

  return (
    <header className="no-print bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Brand & Current Quiz */}
        <div className="flex items-center gap-3 shrink-0">
          {activeQuiz ? (
            <button
              onClick={onBackToQuizzes}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700 transition-colors cursor-pointer"
              title="Terug naar alle quizzen"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Alle Quizzen</span>
            </button>
          ) : null}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
              <HelpCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white whitespace-nowrap block">
                PubQuiz Master
              </span>
              {activeQuiz && (
                <span className="text-xs text-slate-400 truncate max-w-[180px] sm:max-w-xs block font-normal">
                  {activeQuiz.title}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Zone 2: Navigation Links when a quiz is active */}
        {activeQuiz ? (
          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
            <button
              onClick={() => setCurrentView('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'editor'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <ListOrdered className="w-3.5 h-3.5" />
              <span>Quiz Beheer</span>
            </button>

            <button
              onClick={() => setCurrentView('presenter')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'presenter'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <MonitorPlay className="w-3.5 h-3.5" />
              <span>Presentator</span>
            </button>

            <button
              onClick={() => setCurrentView('scores')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'scores'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>Scores Invoeren</span>
            </button>

            <button
              onClick={() => setCurrentView('standings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'standings'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Live Stand</span>
            </button>

            <button
              onClick={() => setCurrentView('sheets')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                currentView === 'sheets'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Antwoordbladen</span>
            </button>
          </nav>
        ) : (
          <div className="hidden sm:block text-xs text-slate-400">
            Kies of maak een quiz om te beginnen
          </div>
        )}

        {/* Zone 3: Auth / Host Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {loading ? (
            <div className="w-6 h-6 border-2 border-slate-600 border-t-white rounded-full animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-2.5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Beheerder'}
                  className="w-8 h-8 rounded-full border border-slate-700 object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200">
                  {user.email?.charAt(0).toUpperCase() || 'P'}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <p className="text-xs font-medium text-slate-200 truncate max-w-[120px]">
                  {user.displayName || user.email?.split('@')[0]}
                </p>
                <p className="text-[10px] text-slate-400">Presentator</p>
              </div>
              <button
                onClick={signOut}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Uitloggen"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-lg transition-colors shadow-sm cursor-pointer whitespace-nowrap"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-900" />
              <span>Inloggen met Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Mobile subnav when a quiz is active */}
      {activeQuiz && (
        <div className="md:hidden border-t border-slate-800 px-2 py-2 flex items-center justify-around overflow-x-auto gap-1">
          <button
            onClick={() => setCurrentView('editor')}
            className={`p-2 text-xs font-medium rounded-lg whitespace-nowrap ${
              currentView === 'editor' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Beheer
          </button>
          <button
            onClick={() => setCurrentView('presenter')}
            className={`p-2 text-xs font-medium rounded-lg whitespace-nowrap ${
              currentView === 'presenter' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Presentator
          </button>
          <button
            onClick={() => setCurrentView('scores')}
            className={`p-2 text-xs font-medium rounded-lg whitespace-nowrap ${
              currentView === 'scores' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Scores
          </button>
          <button
            onClick={() => setCurrentView('standings')}
            className={`p-2 text-xs font-medium rounded-lg whitespace-nowrap ${
              currentView === 'standings' ? 'bg-amber-600 text-white' : 'text-slate-400'
            }`}
          >
            Stand
          </button>
          <button
            onClick={() => setCurrentView('sheets')}
            className={`p-2 text-xs font-medium rounded-lg whitespace-nowrap ${
              currentView === 'sheets' ? 'bg-indigo-600 text-white' : 'text-slate-400'
            }`}
          >
            Print
          </button>
        </div>
      )}
    </header>
  );
};
