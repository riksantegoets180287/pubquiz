import React, { useState, useEffect } from 'react';
import { Quiz, Team, Round, Score } from '../types/quiz.ts';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Users,
  Trophy,
  Save,
  CheckCircle2,
} from 'lucide-react';
import {
  addTeamApi,
  updateTeamApi,
  deleteTeamApi,
  saveRoundScoresApi,
} from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface ScoreBoardEntryProps {
  quiz: Quiz;
  onRefreshQuiz: () => Promise<void>;
  onGoToStandings: () => void;
}

export const ScoreBoardEntry: React.FC<ScoreBoardEntryProps> = ({
  quiz,
  onRefreshQuiz,
  onGoToStandings,
}) => {
  const { getAuthHeaders } = useAuth();

  // Active round being scored
  const [selectedRoundId, setSelectedRoundId] = useState<number>(
    quiz.rounds[0]?.id || 0
  );

  // Score matrix state: teamId -> roundId -> points string
  const [matrixScores, setMatrixScores] = useState<Record<number, Record<number, string>>>({});

  // Team management modal / state
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTableNumber, setNewTableNumber] = useState('');
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState('');
  const [editTableNumber, setEditTableNumber] = useState('');
  const [deleteConfirmTeam, setDeleteConfirmTeam] = useState<Team | null>(null);
  const [isDeletingTeam, setIsDeletingTeam] = useState(false);

  // Confirmation modal state
  const [confirmRoundId, setConfirmRoundId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Initialize matrix scores from quiz data
  useEffect(() => {
    const scoresMap: Record<number, Record<number, string>> = {};

    // Initialize all teams and rounds
    quiz.teams.forEach((team) => {
      scoresMap[team.id] = {};
      quiz.rounds.forEach((round) => {
        scoresMap[team.id][round.id] = '0';
      });
    });

    // Populate with existing scores
    quiz.scores.forEach((s) => {
      if (scoresMap[s.teamId]) {
        scoresMap[s.teamId][s.roundId] = s.points.toString();
      }
    });

    setMatrixScores(scoresMap);

    if (quiz.rounds.length > 0 && !selectedRoundId) {
      setSelectedRoundId(quiz.rounds[0].id);
    }
  }, [quiz]);

  const handleScoreChange = (teamId: number, roundId: number, value: string) => {
    setValidationError(null);
    setSaveSuccessMessage(null);
    setMatrixScores((prev) => ({
      ...prev,
      [teamId]: {
        ...(prev[teamId] || {}),
        [roundId]: value,
      },
    }));
  };

  const calculateTeamTotal = (teamId: number) => {
    let total = 0;
    const teamScores = matrixScores[teamId];
    if (!teamScores) return 0;

    quiz.rounds.forEach((round) => {
      const val = parseFloat(teamScores[round.id]);
      if (!isNaN(val) && val > 0) {
        total += val;
      }
    });

    return total;
  };

  const handlePromptSaveRound = (roundId: number) => {
    setValidationError(null);
    setSaveSuccessMessage(null);

    // Validate scores for this round
    for (const team of quiz.teams) {
      const rawVal = matrixScores[team.id]?.[roundId];
      if (rawVal === undefined || rawVal === '' || rawVal === null) {
        setValidationError(`Score voor team "${team.name}" mag niet leeg zijn. Vul minimaal 0 in.`);
        return;
      }
      const numVal = parseFloat(rawVal);
      if (isNaN(numVal) || numVal < 0) {
        setValidationError(`Ongeldige score voor team "${team.name}": moet een getal van 0 of hoger zijn.`);
        return;
      }
    }

    setConfirmRoundId(roundId);
  };

  const handleConfirmSaveRound = async () => {
    if (!confirmRoundId) return;
    setIsSaving(true);
    setValidationError(null);

    try {
      const teamScores = quiz.teams.map((team) => {
        const rawVal = matrixScores[team.id]?.[confirmRoundId] || '0';
        return {
          teamId: team.id,
          points: Math.round(parseFloat(rawVal) * 10) / 10,
        };
      });

      await saveRoundScoresApi(quiz.id, confirmRoundId, teamScores, getAuthHeaders());
      await onRefreshQuiz();

      const roundObj = quiz.rounds.find((r) => r.id === confirmRoundId);
      setSaveSuccessMessage(`Scores voor ${roundObj?.title || 'Ronde'} succesvol opgeslagen! De tussenstand is direct bijgewerkt.`);
      setConfirmRoundId(null);
    } catch (err: any) {
      setValidationError(err.message || 'Kon scores niet opslaan');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      await addTeamApi(quiz.id, newTeamName.trim(), newTableNumber.trim(), getAuthHeaders());
      setNewTeamName('');
      setNewTableNumber('');
      setShowAddTeamModal(false);
      await onRefreshQuiz();
    } catch (err: any) {
      alert(err.message || 'Kon team niet toevoegen');
    }
  };

  const handleUpdateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam || !editTeamName.trim()) return;
    try {
      await updateTeamApi(editingTeam.id, editTeamName.trim(), editTableNumber.trim(), getAuthHeaders());
      setEditingTeam(null);
      await onRefreshQuiz();
    } catch (err: any) {
      alert(err.message || 'Kon team niet bijwerken');
    }
  };

  const executeDeleteTeam = async () => {
    if (!deleteConfirmTeam) return;
    setIsDeletingTeam(true);
    setValidationError(null);
    try {
      await deleteTeamApi(deleteConfirmTeam.id, getAuthHeaders());
      setDeleteConfirmTeam(null);
      await onRefreshQuiz();
    } catch (err: any) {
      setValidationError(err.message || 'Kon team niet verwijderen');
    } finally {
      setIsDeletingTeam(false);
    }
  };

  const selectedRound = quiz.rounds.find((r) => r.id === selectedRoundId);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Score-invoer & Teams
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Voer per ronde de behaalde punten in. Na het opslaan wordt de tussenstand en ranglijst direct bijgewerkt.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddTeamModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Team Toevoegen</span>
          </button>

          <button
            onClick={onGoToStandings}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50 rounded-xl border border-amber-200 dark:border-amber-900/50 transition-colors cursor-pointer"
          >
            <Trophy className="w-4 h-4" />
            <span>Bekijk Live Stand</span>
          </button>
        </div>
      </div>

      {/* Messages banner */}
      {validationError && (
        <div className="mt-4 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{validationError}</span>
        </div>
      )}

      {saveSuccessMessage && (
        <div className="mt-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-200 text-sm flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span>{saveSuccessMessage}</span>
          </div>
          <button
            onClick={onGoToStandings}
            className="px-3 py-1 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shrink-0"
          >
            Naar Stand →
          </button>
        </div>
      )}

      {/* Round Selection Bar */}
      {quiz.rounds.length > 0 && (
        <div className="mt-6 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium text-slate-500 mr-1">Ronde selecteren:</span>
            {quiz.rounds.map((round) => (
              <button
                key={round.id}
                onClick={() => {
                  setSelectedRoundId(round.id);
                  setValidationError(null);
                  setSaveSuccessMessage(null);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                  selectedRoundId === round.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
                }`}
              >
                Ronde {round.roundNumber}
                {round.isScoresSaved && ' ✓'}
              </button>
            ))}
          </div>

          {selectedRound && (
            <button
              onClick={() => handlePromptSaveRound(selectedRound.id)}
              disabled={quiz.teams.length === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Save className="w-4 h-4" />
              <span>Scores Ronde {selectedRound.roundNumber} Opslaan & Stand Bijwerken</span>
            </button>
          )}
        </div>
      )}

      {/* Main Score Matrix Table */}
      {quiz.teams.length === 0 ? (
        <div className="mt-8 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center max-w-md mx-auto">
          <Users className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
            Nog geen teams toegevoegd
          </h3>
          <p className="text-xs text-slate-500 mb-6">
            Voeg de deelnemende teams toe (bijv. "De Pubhelden", tafel 4) om scores per ronde in te kunnen voeren.
          </p>
          <button
            onClick={() => setShowAddTeamModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Eerste Team Toevoegen</span>
          </button>
        </div>
      ) : quiz.rounds.length === 0 ? (
        <div className="mt-8 text-center py-12 text-slate-500">
          Voeg eerst minimaal één ronde toe in Quiz Beheer om scores in te kunnen voeren.
        </div>
      ) : (
        <div className="mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                  <th className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white w-12 text-center">
                    #
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white min-w-[200px]">
                    Teamnaam
                  </th>
                  <th className="py-3.5 px-4 font-semibold text-slate-600 dark:text-slate-400 w-24">
                    Tafel
                  </th>

                  {/* Round columns */}
                  {quiz.rounds.map((round) => (
                    <th
                      key={round.id}
                      className={`py-3.5 px-4 text-center font-semibold whitespace-nowrap min-w-[110px] ${
                        selectedRoundId === round.id
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-x border-indigo-200 dark:border-indigo-900'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col items-center">
                        <span>Ronde {round.roundNumber}</span>
                        <span className="text-[10px] font-normal text-slate-500 truncate max-w-[90px]">
                          {round.title}
                        </span>
                      </div>
                    </th>
                  ))}

                  <th className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-white min-w-[100px] bg-slate-100/70 dark:bg-slate-800">
                    Totaalstand
                  </th>
                  <th className="py-3.5 px-4 text-center w-20">
                    Acties
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {quiz.teams.map((team, index) => {
                  const teamTotal = calculateTeamTotal(team.id);

                  return (
                    <tr
                      key={team.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 text-center text-xs font-mono text-slate-400">
                        {index + 1}
                      </td>

                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                        {team.name}
                      </td>

                      <td className="py-3 px-4 text-xs text-slate-500">
                        {team.tableNumber || '-'}
                      </td>

                      {/* Score inputs per round */}
                      {quiz.rounds.map((round) => {
                        const isCurrentActive = selectedRoundId === round.id;
                        const scoreVal = matrixScores[team.id]?.[round.id] ?? '';

                        return (
                          <td
                            key={round.id}
                            className={`py-2 px-3 text-center ${
                              isCurrentActive
                                ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-x border-indigo-100 dark:border-indigo-950'
                                : ''
                            }`}
                          >
                            <input
                              type="number"
                              min="0"
                              step="0.5"
                              value={scoreVal}
                              onChange={(e) =>
                                handleScoreChange(team.id, round.id, e.target.value)
                              }
                              className={`w-20 px-2 py-1.5 text-center font-mono tabular-nums text-sm font-semibold rounded-lg border transition-colors ${
                                isCurrentActive
                                  ? 'bg-white dark:bg-slate-800 border-indigo-400 dark:border-indigo-600 text-indigo-900 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-500'
                                  : 'bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                              }`}
                              placeholder="0"
                            />
                          </td>
                        );
                      })}

                      {/* Total score column */}
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-base text-slate-900 dark:text-white bg-slate-50/70 dark:bg-slate-800/60">
                        {teamTotal}
                      </td>

                      {/* Team actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTeam(team);
                              setEditTeamName(team.name);
                              setEditTableNumber(team.tableNumber || '');
                            }}
                            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
                            title="Team bewerken"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmTeam(team)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                            title="Team verwijderen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirmation Modal before saving round scores */}
      {confirmRoundId !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 text-amber-600 dark:text-amber-400 mb-3">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Scores van Ronde Bevestigen
              </h3>
            </div>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Weet je zeker dat je de ingevoerde scores voor{' '}
              <strong className="text-slate-900 dark:text-white">
                {quiz.rounds.find((r) => r.id === confirmRoundId)?.title || 'deze ronde'}
              </strong>{' '}
              wilt opslaan?
            </p>

            <p className="text-xs text-slate-500 mb-6">
              De tussenstand en ranglijstverschuivingen (stijgers/dalers) worden direct herberekend. Je kunt scores later altijd nog corrigeren indien nodig.
            </p>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRoundId(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={handleConfirmSaveRound}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isSaving ? 'Bezig met opslaan...' : 'Ja, Scores Opslaan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Team Toevoegen */}
      {showAddTeamModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Nieuw Team Toevoegen
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Voer de teamnaam en eventueel een tafelnummer in.
            </p>

            <form onSubmit={handleAddTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Teamnaam *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Bijv. Quiztastic Four, De Breinbrekers"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tafelnummer / Plek (optioneel)
                </label>
                <input
                  type="text"
                  placeholder="Bijv. Tafel 5"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={!newTeamName.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Team Toevoegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Team Bewerken */}
      {editingTeam !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
              Team Bewerken
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Wijzig de naam of het tafelnummer van dit team.
            </p>

            <form onSubmit={handleUpdateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Teamnaam *
                </label>
                <input
                  type="text"
                  required
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Tafelnummer / Plek
                </label>
                <input
                  type="text"
                  value={editTableNumber}
                  onChange={(e) => setEditTableNumber(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  Annuleren
                </button>
                <button
                  type="submit"
                  disabled={!editTeamName.trim()}
                  className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Wijzigingen Opslaan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Team Definitief Verwijderen */}
      {deleteConfirmTeam !== null && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Team verwijderen?
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              Weet je zeker dat je team <strong className="text-slate-900 dark:text-white">"{deleteConfirmTeam.name}"</strong> wilt verwijderen?
            </p>
            <p className="text-xs text-rose-500 dark:text-rose-400 mb-6">
              Alle ingevoerde scores van dit team worden eveneens definitief gewist.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmTeam(null)}
                disabled={isDeletingTeam}
                className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Annuleren
              </button>
              <button
                type="button"
                onClick={executeDeleteTeam}
                disabled={isDeletingTeam}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                {isDeletingTeam ? 'Bezig met verwijderen...' : 'Ja, Team Verwijderen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
