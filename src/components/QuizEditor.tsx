import React, { useState, useRef } from 'react';
import { Question, Quiz, Round } from '../types/quiz.ts';
import {
  Plus,
  Trash2,
  Edit2,
  ChevronUp,
  ChevronDown,
  Upload,
  Music,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Check,
  X,
  FileAudio,
  HelpCircle,
  Award,
} from 'lucide-react';
import {
  addRoundApi,
  updateRoundApi,
  deleteRoundApi,
  reorderRoundsApi,
  addQuestionApi,
  updateQuestionApi,
  deleteQuestionApi,
  reorderQuestionsApi,
  uploadAudioApi,
  deleteAudioApi,
  updateQuizApi,
} from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface QuizEditorProps {
  quiz: Quiz;
  onRefreshQuiz: () => Promise<void>;
  onStartPresenter: () => void;
}

export const QuizEditor: React.FC<QuizEditorProps> = ({
  quiz,
  onRefreshQuiz,
  onStartPresenter,
}) => {
  const { getAuthHeaders } = useAuth();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(quiz.title);
  const [description, setDescription] = useState(quiz.description || '');

  // Add round state
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [newRoundTheme, setNewRoundTheme] = useState('');

  // Edit round state
  const [editingRoundId, setEditingRoundId] = useState<number | null>(null);
  const [editRoundTitle, setEditRoundTitle] = useState('');
  const [editRoundTheme, setEditRoundTheme] = useState('');

  // Add question state
  const [addQuestionRoundId, setAddQuestionRoundId] = useState<number | null>(null);
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newCorrectAnswer, setNewCorrectAnswer] = useState('');
  const [newPoints, setNewPoints] = useState(1);
  const [newAudioFile, setNewAudioFile] = useState<File | null>(null);
  const [newAudioStartMin, setNewAudioStartMin] = useState(0);
  const [newAudioStartSec, setNewAudioStartSec] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  // Edit question state
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editQuestionText, setEditQuestionText] = useState('');
  const [editCorrectAnswer, setEditCorrectAnswer] = useState('');
  const [editPoints, setEditPoints] = useState(1);
  const [editAudioFile, setEditAudioFile] = useState<File | null>(null);
  const [editAudioStartMin, setEditAudioStartMin] = useState(0);
  const [editAudioStartSec, setEditAudioStartSec] = useState(0);

  // Delete confirmation modals
  const [deleteConfirmRound, setDeleteConfirmRound] = useState<Round | null>(null);
  const [deleteConfirmQuestion, setDeleteConfirmQuestion] = useState<Question | null>(null);
  const [deleteConfirmAudioQuestion, setDeleteConfirmAudioQuestion] = useState<Question | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  // Mini audio player state
  const [playingAudioUrl, setPlayingAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSaveQuizDetails = async () => {
    if (!title.trim()) return;
    try {
      await updateQuizApi(quiz.id, { title: title.trim(), description: description.trim() }, getAuthHeaders());
      setIsEditingTitle(false);
      await onRefreshQuiz();
    } catch (err: any) {
      setEditorError(err.message || 'Kon quizgegevens niet bijwerken');
    }
  };

  const handleAddRound = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundTitle.trim()) return;
    try {
      await addRoundApi(quiz.id, newRoundTitle.trim(), newRoundTheme.trim(), getAuthHeaders());
      setNewRoundTitle('');
      setNewRoundTheme('');
      setShowAddRoundModal(false);
      await onRefreshQuiz();
    } catch (err: any) {
      setEditorError(err.message || 'Kon ronde niet toevoegen');
    }
  };

  const handleUpdateRound = async (roundId: number) => {
    if (!editRoundTitle.trim()) return;
    try {
      await updateRoundApi(roundId, { title: editRoundTitle.trim(), theme: editRoundTheme.trim() }, getAuthHeaders());
      setEditingRoundId(null);
      await onRefreshQuiz();
    } catch (err: any) {
      setEditorError(err.message || 'Kon ronde niet bijwerken');
    }
  };

  const executeDeleteRound = async () => {
    if (!deleteConfirmRound) return;
    setIsDeleting(true);
    setEditorError(null);
    try {
      await deleteRoundApi(deleteConfirmRound.id, getAuthHeaders());
      setDeleteConfirmRound(null);
      await onRefreshQuiz();
    } catch (err: any) {
      setEditorError(err.message || 'Kon ronde niet verwijderen');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveRound = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= quiz.rounds.length) return;

    const newRounds = [...quiz.rounds];
    const temp = newRounds[index];
    newRounds[index] = newRounds[targetIndex];
    newRounds[targetIndex] = temp;

    const roundIds = newRounds.map((r) => r.id);
    try {
      await reorderRoundsApi(quiz.id, roundIds, getAuthHeaders());
      await onRefreshQuiz();
    } catch (err: any) {
      alert(err.message || 'Kon volgorde niet bijwerken');
    }
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addQuestionRoundId || !newQuestionText.trim() || !newCorrectAnswer.trim()) return;

    setIsUploading(true);
    try {
      let audioUrl: string | undefined = undefined;
      let audioFileName: string | undefined = undefined;

      if (newAudioFile) {
        const uploadRes = await uploadAudioApi(newAudioFile, getAuthHeaders());
        audioUrl = uploadRes.audioUrl;
        audioFileName = uploadRes.audioFileName;
      }

      const audioStartTime = (Number(newAudioStartMin) || 0) * 60 + (Number(newAudioStartSec) || 0);

      await addQuestionApi(
        addQuestionRoundId,
        {
          questionText: newQuestionText.trim(),
          correctAnswer: newCorrectAnswer.trim(),
          points: newPoints,
          audioUrl,
          audioFileName,
          audioStartTime,
        },
        getAuthHeaders()
      );

      setNewQuestionText('');
      setNewCorrectAnswer('');
      setNewPoints(1);
      setNewAudioFile(null);
      setNewAudioStartMin(0);
      setNewAudioStartSec(0);
      setAddQuestionRoundId(null);
      await onRefreshQuiz();
    } catch (err: any) {
      alert(err.message || 'Kon vraag niet toevoegen');
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !editQuestionText.trim() || !editCorrectAnswer.trim()) return;

    setIsUploading(true);
    try {
      let audioUrl = editingQuestion.audioUrl;
      let audioFileName = editingQuestion.audioFileName;

      if (editAudioFile) {
        const uploadRes = await uploadAudioApi(editAudioFile, getAuthHeaders());
        audioUrl = uploadRes.audioUrl;
        audioFileName = uploadRes.audioFileName;
      }

      const audioStartTime = (Number(editAudioStartMin) || 0) * 60 + (Number(editAudioStartSec) || 0);

      await updateQuestionApi(
        editingQuestion.id,
        {
          questionText: editQuestionText.trim(),
          correctAnswer: editCorrectAnswer.trim(),
          points: editPoints,
          audioUrl,
          audioFileName,
          audioStartTime,
        },
        getAuthHeaders()
      );

      setEditingQuestion(null);
      setEditAudioFile(null);
      await onRefreshQuiz();
    } catch (err: any) {
      setEditorError(err.message || 'Kon vraag niet bijwerken');
    } finally {
      setIsUploading(false);
    }
  };

  const executeDeleteQuestion = async () => {
    if (!deleteConfirmQuestion) return;
    setIsDeleting(true);
    setEditorError(null);
    try {
      await deleteQuestionApi(deleteConfirmQuestion.id, getAuthHeaders());
      setDeleteConfirmQuestion(null);
      await onRefreshQuiz();
    } catch (err: any) {
      setEditorError(err.message || 'Kon vraag niet verwijderen');
    } finally {
      setIsDeleting(false);
    }
  };

  const executeRemoveAudio = async () => {
    if (!deleteConfirmAudioQuestion) return;
    setIsDeleting(true);
    setEditorError(null);
    try {
      if (deleteConfirmAudioQuestion.audioFileName) {
        await deleteAudioApi(deleteConfirmAudioQuestion.audioFileName, getAuthHeaders()).catch(() => {});
      }
      await updateQuestionApi(
        deleteConfirmAudioQuestion.id,
        { audioUrl: null, audioFileName: null },
        getAuthHeaders()
      );
      if (playingAudioUrl === deleteConfirmAudioQuestion.audioUrl) {
        setPlayingAudioUrl(null);
      }
      setDeleteConfirmAudioQuestion(null);
      await onRefreshQuiz();
    } catch (err: any) {
      setEditorError(err.message || 'Kon audio niet verwijderen');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveQuestion = async (round: Round, qIndex: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? qIndex - 1 : qIndex + 1;
    if (targetIndex < 0 || targetIndex >= round.questions.length) return;

    const newQuestions = [...round.questions];
    const temp = newQuestions[qIndex];
    newQuestions[qIndex] = newQuestions[targetIndex];
    newQuestions[targetIndex] = temp;

    const qIds = newQuestions.map((q) => q.id);
    try {
      await reorderQuestionsApi(round.id, qIds, getAuthHeaders());
      await onRefreshQuiz();
    } catch (err: any) {
      alert(err.message || 'Kon volgorde niet bijwerken');
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const togglePlayAudio = (url: string, startTime: number = 0) => {
    if (playingAudioUrl === url) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioUrl(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setPlayingAudioUrl(url);
      const audio = new Audio(url);
      audioRef.current = audio;
      if (startTime > 0) {
        audio.currentTime = startTime;
      }
      audio.play().catch((err) => console.error('Audio play error:', err));
      audio.onended = () => setPlayingAudioUrl(null);
    }
  };

  const totalQuestions = quiz.rounds.reduce((acc, r) => acc + (r.questions?.length || 0), 0);
  const totalPoints = quiz.rounds.reduce(
    (acc, r) => acc + (r.questions?.reduce((qAcc, q) => qAcc + (q.points || 1), 0) || 0),
    0
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hidden audio element helper */}
      <audio ref={audioRef} className="hidden" />

      {/* Error alert banner */}
      {editorError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/60 border border-rose-900 text-rose-200 text-xs flex items-center justify-between gap-2">
          <span>{editorError}</span>
          <button
            onClick={() => setEditorError(null)}
            className="text-rose-400 hover:text-white cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Info with inline edit */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 mb-8 shadow-xs">
        {isEditingTitle ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Quiz Titel
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-base font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Beschrijving
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveQuizDetails}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> Opslaan
              </button>
              <button
                onClick={() => {
                  setTitle(quiz.title);
                  setDescription(quiz.description || '');
                  setIsEditingTitle(false);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Annuleren
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {quiz.title}
                </h1>
                <button
                  onClick={() => setIsEditingTitle(true)}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
                  title="Quiztitel bewerken"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </div>
              {quiz.description && (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {quiz.description}
                </p>
              )}

              {/* Zero-pill unboxed metadata */}
              <div className="flex items-center gap-2 text-xs text-slate-500 mt-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {quiz.rounds.length} {quiz.rounds.length === 1 ? 'ronde' : 'rondes'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{totalQuestions} vragen</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">{totalPoints} punten totaal</span>
                <span aria-hidden="true">·</span>
                <span>{quiz.teams.length} teams geregistreerd</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setShowAddRoundModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ronde Toevoegen</span>
              </button>

              <button
                onClick={onStartPresenter}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Presentatorweergave</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Rounds list */}
      {quiz.rounds.length === 0 ? (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center max-w-lg mx-auto">
          <Award className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Deze quiz heeft nog geen rondes
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Voeg minimaal één ronde toe (bijv. "Ronde 1: Algemene Kennis" of "Ronde 2: Muziekronde") om vragen te kunnen invoeren.
          </p>
          <button
            onClick={() => setShowAddRoundModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Eerste Ronde Toevoegen</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {quiz.rounds.map((round, rIndex) => (
            <div
              key={round.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs"
            >
              {/* Round Header Bar */}
              <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {editingRoundId === round.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={editRoundTitle}
                      onChange={(e) => setEditRoundTitle(e.target.value)}
                      placeholder="Rondenaam"
                      className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editRoundTheme}
                      onChange={(e) => setEditRoundTheme(e.target.value)}
                      placeholder="Thema (optioneel)"
                      className="px-3 py-1.5 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white"
                    />
                    <button
                      onClick={() => handleUpdateRound(round.id)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setEditingRoundId(null)}
                      className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        Ronde {round.roundNumber}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        {round.title}
                      </h3>
                      {round.theme && (
                        <span className="text-xs text-slate-500 font-normal">
                          · {round.theme}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          setEditingRoundId(round.id);
                          setEditRoundTitle(round.title);
                          setEditRoundTheme(round.theme || '');
                        }}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded cursor-pointer"
                        title="Ronde bewerken"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-xs text-slate-500 mt-0.5">
                      {round.questions?.length || 0} vragen
                      {round.isScoresSaved && ' · Scores reeds geregistreerd'}
                    </p>
                  </div>
                )}

                {/* Round Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMoveRound(rIndex, 'up')}
                    disabled={rIndex === 0}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Ronde omhoog verplaatsen"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMoveRound(rIndex, 'down')}
                    disabled={rIndex === quiz.rounds.length - 1}
                    className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 disabled:opacity-30 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Ronde omlaag verplaatsen"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => setAddQuestionRoundId(round.id)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer ml-2"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Vraag Toevoegen</span>
                  </button>

                  <button
                    onClick={() => setDeleteConfirmRound(round)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer ml-1"
                    title="Ronde verwijderen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Questions inside Round */}
              <div className="p-6">
                {(!round.questions || round.questions.length === 0) ? (
                  <div className="py-6 text-center text-xs text-slate-500">
                    Nog geen vragen in deze ronde.{' '}
                    <button
                      onClick={() => setAddQuestionRoundId(round.id)}
                      className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline cursor-pointer"
                    >
                      Voeg een eerste vraag toe
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {round.questions.map((question, qIndex) => (
                      <div
                        key={question.id}
                        className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
                      >
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <span className="font-mono text-xs font-bold text-slate-400 dark:text-slate-500 shrink-0 mt-0.5 w-6">
                            {qIndex + 1}.
                          </span>

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-snug">
                              {question.questionText}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                              <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                Antwoord: {question.correctAnswer}
                              </span>
                              <span aria-hidden="true" className="text-slate-300">·</span>
                              <span className="text-slate-500 tabular-nums">
                                {question.points} {question.points === 1 ? 'punt' : 'punten'}
                              </span>

                              {/* Audio Indicator & Inline player */}
                              {question.audioUrl && (
                                <>
                                  <span aria-hidden="true" className="text-slate-300">·</span>
                                  <span className="inline-flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
                                    <Music className="w-3.5 h-3.5" />
                                    <span className="truncate max-w-[130px]">
                                      {question.audioFileName || 'Audio'}
                                    </span>
                                    {question.audioStartTime && question.audioStartTime > 0 ? (
                                      <span className="text-[10px] font-mono bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded border border-amber-300 dark:border-amber-800 shrink-0 font-medium">
                                        Vanaf {formatTime(question.audioStartTime)}
                                      </span>
                                    ) : null}
                                    <button
                                      type="button"
                                      onClick={() => togglePlayAudio(question.audioUrl!, question.audioStartTime || 0)}
                                      className="p-1 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded cursor-pointer"
                                      title={playingAudioUrl === question.audioUrl ? 'Pauzeren' : `Afspelen${question.audioStartTime ? ` vanaf ${formatTime(question.audioStartTime)}` : ''}`}
                                    >
                                      {playingAudioUrl === question.audioUrl ? (
                                        <Pause className="w-3.5 h-3.5 fill-current" />
                                      ) : (
                                        <Play className="w-3.5 h-3.5 fill-current" />
                                      )}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setDeleteConfirmAudioQuestion(question)}
                                      className="text-slate-400 hover:text-rose-500 text-[11px] ml-1 cursor-pointer"
                                      title="Audio verwijderen"
                                    >
                                      Verwijder audio
                                    </button>
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Question Actions */}
                        <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleMoveQuestion(round, qIndex, 'up')}
                            disabled={qIndex === 0}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded cursor-pointer"
                            title="Vraag omhoog"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveQuestion(round, qIndex, 'down')}
                            disabled={qIndex === round.questions.length - 1}
                            className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 rounded cursor-pointer"
                            title="Vraag omlaag"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingQuestion(question);
                              setEditQuestionText(question.questionText);
                              setEditCorrectAnswer(question.correctAnswer);
                              setEditPoints(question.points || 1);
                              setEditAudioFile(null);
                              const start = question.audioStartTime || 0;
                              setEditAudioStartMin(Math.floor(start / 60));
                              setEditAudioStartSec(start % 60);
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer ml-1"
                            title="Vraag bewerken"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmQuestion(question)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Vraag verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Ronde Toevoegen */}
      {showAddRoundModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Ronde Toevoegen
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Geef de ronde een duidelijke titel en eventueel een categoriethema.
            </p>

            <form onSubmit={handleAddRound} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Rondenaam *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Bijv. Algemene Kennis, Film & TV, Muziekronde"
                  value={newRoundTitle}
                  onChange={(e) => setNewRoundTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Thema of Categorie (optioneel)
                </label>
                <input
                  type="text"
                  placeholder="Bijv. Jaren 90, Sport, Aardrijkskunde"
                  value={newRoundTheme}
                  onChange={(e) => setNewRoundTheme(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddRoundModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={!newRoundTitle.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  Ronde Toevoegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vraag Toevoegen */}
      {addQuestionRoundId !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Vraag Toevoegen
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Vul de vraag en het juiste antwoord in. Optioneel kun je een MP3 audiofragment toevoegen.
            </p>

            <form onSubmit={handleAddQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Vraagtekst *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Bijv. Welke artiest scoorde in 1982 een wereldhit met 'Thriller'?"
                  value={newQuestionText}
                  onChange={(e) => setNewQuestionText(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Juiste Antwoord *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Bijv. Michael Jackson"
                  value={newCorrectAnswer}
                  onChange={(e) => setNewCorrectAnswer(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Dit antwoord wordt uitsluitend getoond op jouw presentatorscherm en op het antwoordenblad voor nakijkers.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Aantal Punten
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newPoints}
                  onChange={(e) => setNewPoints(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Audio Upload */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  MP3 Audiofragment (optioneel voor muziekvragen)
                </label>

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors border border-slate-200 dark:border-slate-700">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{newAudioFile ? 'Ander bestand kiezen' : 'Kies MP3-bestand'}</span>
                    <input
                      type="file"
                      accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setNewAudioFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  {newAudioFile && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 truncate max-w-xs">
                      <FileAudio className="w-4 h-4 shrink-0" />
                      <span className="truncate">{newAudioFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setNewAudioFile(null)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Afspelen vanaf Starttijd (voor nieuwe vraag) */}
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Afspelen vanaf (Starttijd)
                    </label>
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                      {newAudioStartMin * 60 + newAudioStartSec > 0
                        ? `Begint op ${formatTime(newAudioStartMin * 60 + newAudioStartSec)}`
                        : 'Start vanaf het begin (0:00)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Stel in op welke seconde of minuut het fragment moet beginnen (bijv. direct bij het refrein).
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={newAudioStartMin}
                        onChange={(e) => setNewAudioStartMin(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-16 px-2.5 py-1.5 text-center font-mono text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                        placeholder="00"
                      />
                      <span className="text-xs text-slate-500 font-medium">min</span>
                    </div>
                    <span className="text-slate-400 font-bold">:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={newAudioStartSec}
                        onChange={(e) => setNewAudioStartSec(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                        className="w-16 px-2.5 py-1.5 text-center font-mono text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                        placeholder="00"
                      />
                      <span className="text-xs text-slate-500 font-medium">sec</span>
                    </div>
                    {(newAudioStartMin > 0 || newAudioStartSec > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewAudioStartMin(0);
                          setNewAudioStartSec(0);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-auto cursor-pointer"
                      >
                        Reset naar 0:00
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setAddQuestionRoundId(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !newQuestionText.trim() || !newCorrectAnswer.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {isUploading ? 'Uploaden & opslaan...' : 'Vraag Toevoegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vraag Bewerken */}
      {editingQuestion !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Vraag Bewerken
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Pas vraagtekst, correct antwoord, punten of audio aan.
            </p>

            <form onSubmit={handleUpdateQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Vraagtekst *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editQuestionText}
                  onChange={(e) => setEditQuestionText(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Juiste Antwoord *
                </label>
                <input
                  type="text"
                  required
                  value={editCorrectAnswer}
                  onChange={(e) => setEditCorrectAnswer(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Aantal Punten
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={editPoints}
                  onChange={(e) => setEditPoints(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className="w-24 px-3 py-1.5 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              {/* Audio management */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  MP3 Audiofragment
                </label>

                {editingQuestion.audioUrl && !editAudioFile && (
                  <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                    <Music className="w-4 h-4 text-indigo-600" />
                    <span className="truncate flex-1">
                      {editingQuestion.audioFileName || 'Huidig audiofragment'}
                    </span>
                    <button
                      type="button"
                      onClick={() => togglePlayAudio(editingQuestion.audioUrl!)}
                      className="px-2 py-1 bg-white dark:bg-slate-700 rounded text-slate-700 dark:text-slate-200 cursor-pointer text-xs"
                    >
                      {playingAudioUrl === editingQuestion.audioUrl ? 'Pauzeer' : 'Test'}
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer transition-colors border border-slate-200 dark:border-slate-700">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {editingQuestion.audioUrl ? 'Audio vervangen' : 'Kies MP3-bestand'}
                    </span>
                    <input
                      type="file"
                      accept="audio/mp3,audio/mpeg,audio/wav,audio/m4a"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditAudioFile(e.target.files[0]);
                        }
                      }}
                    />
                  </label>

                  {editAudioFile && (
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 truncate max-w-xs">
                      <FileAudio className="w-4 h-4 shrink-0" />
                      <span className="truncate">{editAudioFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setEditAudioFile(null)}
                        className="text-slate-400 hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Afspelen vanaf Starttijd (voor bewerken vraag) */}
                <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Afspelen vanaf (Starttijd)
                    </label>
                    <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400">
                      {editAudioStartMin * 60 + editAudioStartSec > 0
                        ? `Begint op ${formatTime(editAudioStartMin * 60 + editAudioStartSec)}`
                        : 'Start vanaf het begin (0:00)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Stel in op welke seconde of minuut het fragment moet beginnen (bijv. direct bij het refrein).
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={editAudioStartMin}
                        onChange={(e) => setEditAudioStartMin(Math.max(0, parseInt(e.target.value, 10) || 0))}
                        className="w-16 px-2.5 py-1.5 text-center font-mono text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                        placeholder="00"
                      />
                      <span className="text-xs text-slate-500 font-medium">min</span>
                    </div>
                    <span className="text-slate-400 font-bold">:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={editAudioStartSec}
                        onChange={(e) => setEditAudioStartSec(Math.max(0, Math.min(59, parseInt(e.target.value, 10) || 0)))}
                        className="w-16 px-2.5 py-1.5 text-center font-mono text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white"
                        placeholder="00"
                      />
                      <span className="text-xs text-slate-500 font-medium">sec</span>
                    </div>
                    {(editAudioStartMin > 0 || editAudioStartSec > 0) && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditAudioStartMin(0);
                          setEditAudioStartSec(0);
                        }}
                        className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 ml-auto cursor-pointer"
                      >
                        Reset naar 0:00
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !editQuestionText.trim() || !editCorrectAnswer.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  {isUploading ? 'Uploaden & opslaan...' : 'Wijzigingen Opslaan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ronde Definitief Verwijderen */}
      {deleteConfirmRound !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Ronde {deleteConfirmRound.roundNumber} verwijderen?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Weet je zeker dat je ronde <strong className="text-slate-900 dark:text-white">"{deleteConfirmRound.title}"</strong> wilt verwijderen?
            </p>
            <p className="text-xs text-rose-500 dark:text-rose-400 mb-6">
              Let op: alle {deleteConfirmRound.questions?.length || 0} bijbehorende vragen en eventuele scores van deze ronde worden eveneens definitief gewist.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRound(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={executeDeleteRound}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {isDeleting ? 'Bezig met verwijderen...' : 'Ja, Ronde Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vraag Definitief Verwijderen */}
      {deleteConfirmQuestion !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Vraag verwijderen?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
              "{deleteConfirmQuestion.questionText}"
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmQuestion(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={executeDeleteQuestion}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {isDeleting ? 'Bezig met verwijderen...' : 'Ja, Vraag Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Audiofragment Verwijderen */}
      {deleteConfirmAudioQuestion !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Audiofragment verwijderen?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Weet je zeker dat je het audiobestand van deze vraag wilt loskoppelen en wissen?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmAudioQuestion(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={executeRemoveAudio}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {isDeleting ? 'Bezig met wissen...' : 'Ja, Audio Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
