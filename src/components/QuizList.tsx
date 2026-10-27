import React, { useState } from 'react';
import { QuizListItem } from '../types/quiz.ts';
import {
  Plus,
  Trash2,
  Play,
  Settings,
  Calculator,
  Trophy,
  Printer,
  Sparkles,
  Calendar,
} from 'lucide-react';

interface QuizListProps {
  quizzes: QuizListItem[];
  isLoading: boolean;
  onCreateQuiz: (title: string, description: string) => Promise<void>;
  onSelectQuiz: (id: string, targetView?: 'editor' | 'presenter' | 'scores' | 'standings' | 'sheets') => void;
  onDeleteQuiz: (id: string) => Promise<void>;
  isAuthenticated: boolean;
  onSignInPrompt: () => void;
}

export const QuizList: React.FC<QuizListProps> = ({
  quizzes,
  isLoading,
  onCreateQuiz,
  onSelectQuiz,
  onDeleteQuiz,
  isAuthenticated,
  onSignInPrompt,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateQuiz(title.trim(), description.trim());
      setTitle('');
      setDescription('');
      setShowCreateModal(false);
    } catch (err: any) {
      alert(err.message || 'Kon quiz niet aanmaken');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await onDeleteQuiz(id);
      setDeleteConfirmId(null);
    } catch (err: any) {
      alert(err.message || 'Kon quiz niet verwijderen');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-8 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Mijn Pubquizzen
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Beheer al je quizzen, stel rondes samen, bedien tijdens de quiz en genereer antwoordbladen.
          </p>
        </div>

        <button
          onClick={() => {
            if (!isAuthenticated) {
              onSignInPrompt();
            } else {
              setShowCreateModal(true);
            }
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nieuwe Quiz Aanmaken</span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <div className="w-8 h-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-sm">Quizzen laden uit database...</p>
        </div>
      ) : quizzes.length === 0 ? (
        /* Empty state */
        <div className="py-16 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-indigo-100 dark:border-indigo-900/50 shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Nog geen pubquiz aangemaakt
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Begin direct met het samenstellen van je eerste pubquiz. Voeg rondes, vragen, audio en teams toe.
          </p>
          <button
            onClick={() => {
              if (!isAuthenticated) {
                onSignInPrompt();
              } else {
                setShowCreateModal(true);
              }
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Eerste Quiz Aanmaken</span>
          </button>
        </div>
      ) : (
        /* Grid of quizzes */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
          {quizzes.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between hover:shadow-md transition-shadow relative"
            >
              <div>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3
                    onClick={() => onSelectQuiz(quiz.id, 'editor')}
                    className="text-lg font-bold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors leading-snug line-clamp-2"
                  >
                    {quiz.title}
                  </h3>

                  <button
                    onClick={() => setDeleteConfirmId(quiz.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
                    title="Quiz verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {quiz.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-2">
                    {quiz.description}
                  </p>
                )}

                {/* Unboxed metadata according to frontend-design zero-pill discipline */}
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {quiz.roundCount} {quiz.roundCount === 1 ? 'ronde' : 'rondes'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{quiz.questionCount} vragen</span>
                  <span aria-hidden="true">·</span>
                  <span>{quiz.teamCount} teams</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-2">
                <button
                  onClick={() => onSelectQuiz(quiz.id, 'presenter')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Presentatorweergave</span>
                </button>

                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={() => onSelectQuiz(quiz.id, 'editor')}
                    className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
                    title="Quiz bewerken"
                  >
                    <Settings className="w-3.5 h-3.5 mb-1 text-slate-500" />
                    <span>Beheer</span>
                  </button>

                  <button
                    onClick={() => onSelectQuiz(quiz.id, 'scores')}
                    className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
                    title="Punten invoeren"
                  >
                    <Calculator className="w-3.5 h-3.5 mb-1 text-slate-500" />
                    <span>Scores</span>
                  </button>

                  <button
                    onClick={() => onSelectQuiz(quiz.id, 'standings')}
                    className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
                    title="Live tussenstand & beamer"
                  >
                    <Trophy className="w-3.5 h-3.5 mb-1 text-amber-500" />
                    <span>Stand</span>
                  </button>

                  <button
                    onClick={() => onSelectQuiz(quiz.id, 'sheets')}
                    className="flex flex-col items-center justify-center p-2 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium transition-colors cursor-pointer"
                    title="Antwoordbladen printen / PDF"
                  >
                    <Printer className="w-3.5 h-3.5 mb-1 text-slate-500" />
                    <span>Print</span>
                  </button>
                </div>
              </div>

              {/* Delete confirmation modal */}
              {deleteConfirmId === quiz.id && (
                <div className="absolute inset-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs rounded-2xl p-6 flex flex-col justify-center items-center text-center z-10 border border-rose-200 dark:border-rose-900">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Quiz definitief verwijderen?
                  </p>
                  <p className="text-xs text-slate-500 mb-4">
                    Alle rondes, vragen, teams en ingevoerde scores worden permanent gewist.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Annuleren
                    </button>
                    <button
                      onClick={() => handleDelete(quiz.id)}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nieuwe Quiz Aanmaken */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Nieuwe Pubquiz Aanmaken
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Geef je quiz een naam. Je kunt hierna direct rondes en vragen toevoegen.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Quiz Titel *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Bijv. Vrijdagavond Pubquiz Cafe De Valk"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Beschrijving of Notitie (optioneel)
                </label>
                <textarea
                  rows={3}
                  placeholder="Bijv. 6 rondes inclusief muziekronde en plaatjesronde."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Opslaan...' : 'Quiz Aanmaken'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
