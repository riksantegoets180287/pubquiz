import React, { useState, useEffect } from 'react';
import { Quiz, Team, TeamStanding } from '../types/quiz.ts';
import {
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Sparkles,
  Medal,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface LeaderboardViewProps {
  quiz: Quiz;
  onBackToAdmin: () => void;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  quiz,
  onBackToAdmin,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Filter to rounds that have scores or all rounds
  const savedRounds = quiz.rounds.filter((r) => r.isScoresSaved);
  // Default to the last saved round index, or all rounds
  const [selectedRoundFilter, setSelectedRoundFilter] = useState<number>(
    savedRounds.length > 0 ? savedRounds[savedRounds.length - 1].roundNumber : quiz.rounds.length
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Fullscreen request failed:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.error('Exit fullscreen failed:', err);
      });
    }
  };

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });
  };

  // Compute standings up to selectedRoundFilter
  const computeStandings = (): TeamStanding[] => {
    if (quiz.teams.length === 0) return [];

    const activeRounds = quiz.rounds.filter(
      (r) => r.roundNumber <= selectedRoundFilter
    );

    const prevRounds = quiz.rounds.filter(
      (r) => r.roundNumber < selectedRoundFilter
    );

    // Initial alphabetical start seed
    const initialSeed = [...quiz.teams].sort((a, b) => a.name.localeCompare(b.name));
    const initialRankMap = new Map<string, number>();
    initialSeed.forEach((t, idx) => {
      initialRankMap.set(t.id, idx + 1);
    });

    // Compute previous standings
    let prevRankMap = new Map<string, number>();
    if (prevRounds.length === 0) {
      // Compare with start seed
      prevRankMap = initialRankMap;
    } else {
      const prevTotals = quiz.teams.map((team) => {
        let total = 0;
        prevRounds.forEach((r) => {
          const sc = quiz.scores.find((s) => s.teamId === team.id && s.roundId === r.id);
          if (sc) total += sc.points;
        });
        return { team, total };
      });

      // Sort by score desc, name asc
      prevTotals.sort((a, b) => {
        if (b.total !== a.total) return b.total - a.total;
        return a.team.name.localeCompare(b.team.name);
      });

      // Assign ranks with ties
      let curRank = 1;
      prevTotals.forEach((item, idx) => {
        if (idx > 0 && item.total === prevTotals[idx - 1].total) {
          prevRankMap.set(item.team.id, prevRankMap.get(prevTotals[idx - 1].team.id)!);
        } else {
          curRank = idx + 1;
          prevRankMap.set(item.team.id, curRank);
        }
      });
    }

    // Compute current standings
    const currentTotals = quiz.teams.map((team) => {
      let total = 0;
      const roundPoints: Record<string, number> = {};

      activeRounds.forEach((r) => {
        const sc = quiz.scores.find((s) => s.teamId === team.id && s.roundId === r.id);
        const pts = sc ? sc.points : 0;
        roundPoints[r.id] = pts;
        total += pts;
      });

      return {
        team,
        total,
        roundPoints,
      };
    });

    // Sort by score desc, then alphabetical by team name
    currentTotals.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.team.name.localeCompare(b.team.name);
    });

    // Assign current ranks with ties
    const standings: TeamStanding[] = [];
    currentTotals.forEach((item, idx) => {
      let rank = idx + 1;
      if (idx > 0 && item.total === currentTotals[idx - 1].total) {
        rank = standings[idx - 1].currentRank;
      }

      const prevRank = prevRankMap.get(item.team.id) || rank;
      // rankDelta: positive means climbed (e.g. from 4 to 2 => 4 - 2 = +2)
      const rankDelta = prevRank - rank;

      standings.push({
        teamId: item.team.id,
        teamName: item.team.name,
        tableNumber: item.team.tableNumber,
        totalPoints: item.total,
        currentRank: rank,
        previousRank: prevRank,
        rankDelta,
        roundPoints: item.roundPoints,
      });
    });

    return standings;
  };

  const standings = computeStandings();

  return (
    <div
      className={`min-h-[calc(100vh-4rem)] flex flex-col justify-between transition-colors ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-slate-950 p-6 sm:p-10 overflow-y-auto'
          : 'bg-slate-950 py-8 px-4 sm:px-6 lg:px-8'
      }`}
    >
      <div className="max-w-6xl mx-auto w-full">
        {/* Top Header Bar for Beamer / Host */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToAdmin}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-800 transition-colors cursor-pointer"
              title="Terug naar beheerder"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div>
              <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
                Officiële Tussenstand
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {quiz.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={triggerConfetti}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-300 bg-amber-950/60 hover:bg-amber-900/80 border border-amber-800/60 rounded-xl transition-colors cursor-pointer shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Confetti Feest!</span>
            </button>

            <button
              onClick={toggleFullscreen}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors cursor-pointer"
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span>Sluit Volledig Scherm</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span>Volledig Scherm (Beamer)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Round Filter Tabs */}
        {quiz.rounds.length > 1 && (
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2">
            <span className="text-xs text-slate-400 whitespace-nowrap mr-2">
              Toon stand na:
            </span>
            {quiz.rounds.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoundFilter(r.roundNumber)}
                className={`px-3.5 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                  selectedRoundFilter === r.roundNumber
                    ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                Ronde {r.roundNumber} ({r.title})
              </button>
            ))}
          </div>
        )}

        {/* Standings Table / Podium Cards */}
        {standings.length === 0 ? (
          <div className="mt-12 text-center py-16 bg-slate-900/50 rounded-3xl border border-slate-800 text-slate-400">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <p className="text-base font-semibold text-slate-300">
              Nog geen teams of scores geregistreerd
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Voeg teams toe en sla scores van een ronde op om de live stand te bekijken.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {standings.map((standing, index) => {
              const isTop1 = standing.currentRank === 1;
              const isTop2 = standing.currentRank === 2;
              const isTop3 = standing.currentRank === 3;

              return (
                <div
                  key={standing.teamId}
                  className={`flex items-center justify-between p-4 sm:p-5 rounded-2xl border transition-all ${
                    isTop1
                      ? 'bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/50 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/30'
                      : isTop2
                      ? 'bg-gradient-to-r from-slate-800/40 via-slate-900 to-slate-900 border-slate-700'
                      : isTop3
                      ? 'bg-gradient-to-r from-amber-950/20 via-slate-900 to-slate-900 border-amber-800/30'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  {/* Left: Position Rank & Team Details */}
                  <div className="flex items-center gap-4 sm:gap-6 min-w-0">
                    {/* Rank Badge */}
                    <div
                      className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-extrabold text-lg sm:text-xl shrink-0 ${
                        isTop1
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/40'
                          : isTop2
                          ? 'bg-slate-300 text-slate-900'
                          : isTop3
                          ? 'bg-amber-700 text-amber-100'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {standing.currentRank}
                    </div>

                    {/* Team Name */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">
                          {standing.teamName}
                        </h3>
                        {isTop1 && (
                          <Medal className="w-5 h-5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      {standing.tableNumber && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {standing.tableNumber}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Shift Indicator & Total Points */}
                  <div className="flex items-center gap-5 sm:gap-8 shrink-0">
                    {/* Rank Shift Indicator */}
                    <div className="text-right">
                      {standing.rankDelta > 0 ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-semibold text-xs sm:text-sm">
                          <ArrowUp className="w-4 h-4 stroke-[3]" />
                          <span>{standing.rankDelta} {standing.rankDelta === 1 ? 'plaats' : 'plaatsen'} gestegen</span>
                        </div>
                      ) : standing.rankDelta < 0 ? (
                        <div className="flex items-center gap-1.5 text-rose-400 font-semibold text-xs sm:text-sm">
                          <ArrowDown className="w-4 h-4 stroke-[3]" />
                          <span>{Math.abs(standing.rankDelta)} {Math.abs(standing.rankDelta) === 1 ? 'plaats' : 'plaatsen'} gezakt</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-slate-400 font-medium text-xs sm:text-sm">
                          <Minus className="w-4 h-4" />
                          <span>Gelijk gebleven</span>
                        </div>
                      )}
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Vorige positie: #{standing.previousRank}
                      </div>
                    </div>

                    {/* Total Points */}
                    <div className="text-right min-w-[70px] sm:min-w-[100px]">
                      <span className="font-mono tabular-nums text-2xl sm:text-3xl font-extrabold text-white block">
                        {standing.totalPoints}
                      </span>
                      <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
                        Punten
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="max-w-6xl mx-auto w-full pt-8 text-center text-xs text-slate-500">
        PubQuiz Master Live Stand · Bij gelijke stand worden teams op naam gesorteerd.
      </div>
    </div>
  );
};
