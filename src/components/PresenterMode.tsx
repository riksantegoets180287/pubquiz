import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Round, Question } from '../types/quiz.ts';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Music,
  CheckCircle,
  HelpCircle,
  Calculator,
  ArrowRight,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface PresenterModeProps {
  quiz: Quiz;
  onGoToScores: () => void;
  onBackToEditor: () => void;
}

export const PresenterMode: React.FC<PresenterModeProps> = ({
  quiz,
  onGoToScores,
  onBackToEditor,
}) => {
  const [selectedRoundIndex, setSelectedRoundIndex] = useState(0);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(true);

  // Audio player state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);

  const activeRound: Round | undefined = quiz.rounds[selectedRoundIndex];
  const activeQuestion: Question | undefined = activeRound?.questions[selectedQuestionIndex];

  // Reset audio when question changes and apply audioStartTime
  useEffect(() => {
    const startTime = activeQuestion?.audioStartTime || 0;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = startTime;
      setIsPlaying(false);
      setCurrentTime(startTime);
    } else {
      setCurrentTime(startTime);
    }
  }, [selectedRoundIndex, selectedQuestionIndex, activeQuestion]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === 'ArrowRight') {
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === ' ' && activeQuestion?.audioUrl) {
        e.preventDefault();
        togglePlayAudio();
      } else if (e.key.toLowerCase() === 'r' && activeQuestion?.audioUrl) {
        e.preventDefault();
        handleRestartAudio();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const handleNext = () => {
    if (!activeRound) return;
    if (selectedQuestionIndex < activeRound.questions.length - 1) {
      setSelectedQuestionIndex((prev) => prev + 1);
    } else if (selectedRoundIndex < quiz.rounds.length - 1) {
      setSelectedRoundIndex((prev) => prev + 1);
      setSelectedQuestionIndex(0);
    }
  };

  const handlePrevious = () => {
    if (!activeRound) return;
    if (selectedQuestionIndex > 0) {
      setSelectedQuestionIndex((prev) => prev - 1);
    } else if (selectedRoundIndex > 0) {
      setSelectedRoundIndex((prev) => prev - 1);
      const prevRound = quiz.rounds[selectedRoundIndex - 1];
      setSelectedQuestionIndex(Math.max(0, (prevRound?.questions.length || 1) - 1));
    }
  };

  const togglePlayAudio = () => {
    if (!audioRef.current || !activeQuestion?.audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      const startTime = activeQuestion.audioStartTime || 0;
      // If at start or before designated start time or ended, jump to startTime
      if (audioRef.current.currentTime < startTime || audioRef.current.ended) {
        audioRef.current.currentTime = startTime;
        setCurrentTime(startTime);
      }
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
    }
  };

  const handleRestartAudio = () => {
    if (!audioRef.current) return;
    const startTime = activeQuestion?.audioStartTime || 0;
    audioRef.current.currentTime = startTime;
    setCurrentTime(startTime);
    audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => console.error(e));
  };

  const handleRewind = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - seconds);
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (!activeRound || quiz.rounds.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Geen rondes beschikbaar in deze quiz
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Voeg eerst rondes en vragen toe in het beheerpaneel voordat je de presentatorweergave start.
        </p>
        <button
          onClick={onBackToEditor}
          className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
        >
          Terug naar Quiz Beheer
        </button>
      </div>
    );
  }

  const isLastQuestionInRound = selectedQuestionIndex === activeRound.questions.length - 1;
  const isLastRound = selectedRoundIndex === quiz.rounds.length - 1;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Hidden audio element */}
      {activeQuestion?.audioUrl && (
        <audio
          ref={audioRef}
          src={activeQuestion.audioUrl}
          onTimeUpdate={() => {
            if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
          }}
          onLoadedMetadata={() => {
            if (audioRef.current) {
              setDuration(audioRef.current.duration);
              const startTime = activeQuestion?.audioStartTime || 0;
              if (startTime > 0) {
                audioRef.current.currentTime = startTime;
                setCurrentTime(startTime);
              }
            }
          }}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Top Bar: Round & Question breadcrumb + Round Selector */}
      <div className="max-w-5xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>{quiz.title}</span>
            <span aria-hidden="true">·</span>
            <span className="text-indigo-400 font-semibold">
              Ronde {activeRound.roundNumber} van {quiz.rounds.length}
            </span>
            {activeRound.theme && (
              <>
                <span aria-hidden="true">·</span>
                <span>{activeRound.theme}</span>
              </>
            )}
          </div>
          <h2 className="text-xl font-bold text-white mt-0.5">
            {activeRound.title}
          </h2>
        </div>

        {/* Round Switcher Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs text-slate-400">Ga naar ronde:</label>
          <select
            value={selectedRoundIndex}
            onChange={(e) => {
              setSelectedRoundIndex(parseInt(e.target.value, 10));
              setSelectedQuestionIndex(0);
            }}
            className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          >
            {quiz.rounds.map((r, i) => (
              <option key={r.id} value={i}>
                Ronde {r.roundNumber}: {r.title} ({r.questions?.length || 0} vragen)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Question Selector Strip */}
      <div className="max-w-5xl mx-auto w-full py-3 flex items-center gap-1.5 overflow-x-auto">
        {activeRound.questions.map((q, idx) => (
          <button
            key={q.id}
            onClick={() => setSelectedQuestionIndex(idx)}
            className={`min-w-9 h-9 px-2 text-xs font-semibold rounded-xl flex items-center justify-center transition-all cursor-pointer ${
              selectedQuestionIndex === idx
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
            }`}
            title={`Vraag ${idx + 1}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      {/* Main Focus Area: The Question Card */}
      <div className="max-w-5xl mx-auto w-full my-auto py-6">
        {activeQuestion ? (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative">
            {/* Question Header & Points */}
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 text-sm text-slate-400 font-mono">
                <span className="text-indigo-400 font-bold text-base">
                  VRAAG {selectedQuestionIndex + 1}
                </span>
                <span>/ {activeRound.questions.length}</span>
              </div>

              <div className="text-xs text-slate-400 font-medium">
                {activeQuestion.points} {activeQuestion.points === 1 ? 'punt' : 'punten'}
              </div>
            </div>

            {/* Question Text (Large for clear reading aloud) */}
            <div className="mb-8">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white leading-relaxed tracking-tight">
                {activeQuestion.questionText}
              </h1>
            </div>

            {/* Audio Player Bar (if attached) */}
            {activeQuestion.audioUrl && (
              <div className="bg-slate-950/80 rounded-2xl border border-indigo-950 p-4 sm:p-5 mb-8">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 text-xs text-indigo-400 font-medium truncate">
                    <Music className="w-4 h-4 shrink-0" />
                    <span className="truncate">
                      Audiofragment: {activeQuestion.audioFileName || 'Muziekfragment'}
                    </span>
                    {activeQuestion.audioStartTime && activeQuestion.audioStartTime > 0 ? (
                      <span className="text-[10px] font-mono font-semibold text-amber-300 bg-amber-950/70 px-2 py-0.5 rounded border border-amber-800/80 shrink-0">
                        Start vanaf: {formatTime(activeQuestion.audioStartTime)}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>

                {/* Progress bar */}
                <input
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 mb-4"
                />

                {/* Playback Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={togglePlayAudio}
                      className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-sm transition-colors cursor-pointer shadow-md shadow-indigo-600/20"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="w-4 h-4 fill-current" />
                          <span>Pauzeren (Spatiebalk)</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          <span>Afspelen (Spatiebalk)</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleRestartAudio}
                      className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="Opnieuw starten vanaf begin (R)"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleRewind(5)}
                      className="px-3 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl transition-colors cursor-pointer"
                      title="5 seconden terugspoelen"
                    >
                      -5s
                    </button>
                  </div>

                  {/* Volume Control */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (audioRef.current) {
                          audioRef.current.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        if (audioRef.current) {
                          audioRef.current.volume = val;
                          audioRef.current.muted = false;
                          setIsMuted(false);
                        }
                      }}
                      className="w-20 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Host Correct Answer Box (Shielded for Host Only) */}
            <div className="bg-emerald-950/40 border border-emerald-900/60 rounded-2xl p-5 sm:p-6 transition-all">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 tracking-wider">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span>JUISTE ANTWOORD (ALLEEN PRESENTATORSCHERM)</span>
                </div>
                <button
                  onClick={() => setShowAnswer(!showAnswer)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showAnswer ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showAnswer ? 'Verberg' : 'Toon'}</span>
                </button>
              </div>

              {showAnswer ? (
                <p className="text-xl sm:text-2xl font-bold text-emerald-300">
                  {activeQuestion.correctAnswer}
                </p>
              ) : (
                <p className="text-sm italic text-slate-500">
                  Antwoord verborgen. Klik op 'Toon' om te bekijken.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400">
            Geen vragen in deze ronde.
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="max-w-5xl mx-auto w-full pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={selectedRoundIndex === 0 && selectedQuestionIndex === 0}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 text-white rounded-2xl font-semibold text-sm border border-slate-800 transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Vorige Vraag (Pijl Links)</span>
        </button>

        {/* Center shortcuts hint */}
        <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
          <span>Pijltjestoetsen: Navigeren</span>
          <span aria-hidden="true">·</span>
          <span>Spatie: Audio Play/Pause</span>
          <span aria-hidden="true">·</span>
          <span>R: Audio Herstart</span>
        </div>

        {/* Next / Finish Round Action */}
        {isLastQuestionInRound ? (
          <div className="flex items-center gap-2">
            {!isLastRound && (
              <button
                onClick={handleNext}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-semibold text-sm transition-colors cursor-pointer"
              >
                <span>Volgende Ronde</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onGoToScores}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-emerald-600/30"
            >
              <Calculator className="w-4 h-4" />
              <span>Ronde Klaar: Voer Scores In</span>
            </button>
          </div>
        ) : (
          <button
            onClick={handleNext}
            className="flex items-center justify-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-indigo-600/30"
          >
            <span>Volgende Vraag (Pijl Rechts)</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
