import { supabase } from './supabase.ts';
import { Question, Quiz, QuizListItem, Round, Team } from '../types/quiz.ts';

function assertNoError(error: unknown, fallback: string) {
  if (error) {
    const msg = (error as { message?: string }).message || fallback;
    throw new Error(msg);
  }
}

export async function fetchQuizzes(): Promise<QuizListItem[]> {
  const { data: list, error } = await supabase
    .from('quizzes')
    .select('*')
    .order('updated_at', { ascending: false });
  assertNoError(error, 'Kon quizzen niet ophalen');

  const items: QuizListItem[] = [];
  for (const q of list ?? []) {
    const { data: rs } = await supabase
      .from('rounds')
      .select('id')
      .eq('quiz_id', q.id);
    const { data: ts } = await supabase
      .from('teams')
      .select('id')
      .eq('quiz_id', q.id);

    let totalQuestions = 0;
    if (rs && rs.length > 0) {
      const { data: qs } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .in('round_id', rs.map((r) => r.id));
      totalQuestions = qs?.length ?? 0;
      const { count } = await supabase
        .from('questions')
        .select('id', { count: 'exact', head: true })
        .in('round_id', rs.map((r) => r.id));
      totalQuestions = count ?? 0;
    }

    items.push({
      id: q.id,
      userId: q.user_id,
      title: q.title,
      description: q.description,
      currentRoundIndex: q.current_round_index,
      currentQuestionIndex: q.current_question_index,
      roundCount: rs?.length ?? 0,
      teamCount: ts?.length ?? 0,
      questionCount: totalQuestions,
      createdAt: q.created_at,
      updatedAt: q.updated_at,
    });
  }
  return items;
}

export async function fetchQuiz(id: string): Promise<Quiz> {
  const { data: quiz, error } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  assertNoError(error, 'Kon quiz niet ophalen');
  if (!quiz) throw new Error('Quiz niet gevonden');

  const { data: rs } = await supabase
    .from('rounds')
    .select('*')
    .eq('quiz_id', id)
    .order('order_index', { ascending: true });

  const roundIds = (rs ?? []).map((r) => r.id);
  let questionsRaw: any[] = [];
  if (roundIds.length > 0) {
    const { data: qs } = await supabase
      .from('questions')
      .select('*')
      .in('round_id', roundIds)
      .order('order_index', { ascending: true });
    questionsRaw = qs ?? [];
  }

  const { data: ts } = await supabase
    .from('teams')
    .select('*')
    .eq('quiz_id', id)
    .order('name', { ascending: true });

  const { data: ss } = await supabase
    .from('scores')
    .select('*')
    .eq('quiz_id', id);

  const rounds: Round[] = (rs ?? []).map((r) => ({
    id: r.id,
    quizId: r.quiz_id,
    roundNumber: r.round_number,
    title: r.title,
    theme: r.theme,
    orderIndex: r.order_index,
    isScoresSaved: r.is_scores_saved,
    createdAt: r.created_at,
    questions: questionsRaw
      .filter((q) => q.round_id === r.id)
      .map((q) => ({
        id: q.id,
        roundId: q.round_id,
        questionNumber: q.question_number,
        questionText: q.question_text,
        correctAnswer: q.correct_answer,
        points: q.points,
        audioUrl: q.audio_url,
        audioFileName: q.audio_file_name,
        audioStartTime: q.audio_start_time,
        orderIndex: q.order_index,
        createdAt: q.created_at,
      })),
  }));

  const teams: Team[] = (ts ?? []).map((t) => ({
    id: t.id,
    quizId: t.quiz_id,
    name: t.name,
    tableNumber: t.table_number,
    createdAt: t.created_at,
  }));

  const scores = (ss ?? []).map((s) => ({
    id: s.id,
    quizId: s.quiz_id,
    roundId: s.round_id,
    teamId: s.team_id,
    points: s.points,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  }));

  return {
    id: quiz.id,
    userId: quiz.user_id,
    title: quiz.title,
    description: quiz.description,
    currentRoundIndex: quiz.current_round_index,
    currentQuestionIndex: quiz.current_question_index,
    rounds,
    teams,
    scores,
    createdAt: quiz.created_at,
    updatedAt: quiz.updated_at,
  };
}

export async function createQuizApi(title: string, description: string): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from('quizzes')
    .insert({ title, description })
    .select('id')
    .single();
  assertNoError(error, 'Kon quiz niet aanmaken');
  if (!data) throw new Error('Kon quiz niet aanmaken');
  return { id: data.id };
}

export async function updateQuizApi(id: string, data: Partial<Quiz>): Promise<void> {
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.title !== undefined) update.title = data.title;
  if (data.description !== undefined) update.description = data.description;
  if (data.currentRoundIndex !== undefined) update.current_round_index = data.currentRoundIndex;
  if (data.currentQuestionIndex !== undefined) update.current_question_index = data.currentQuestionIndex;
  const { error } = await supabase.from('quizzes').update(update).eq('id', id);
  assertNoError(error, 'Kon quiz niet bijwerken');
}

export async function deleteQuizApi(id: string): Promise<void> {
  const { error } = await supabase.from('quizzes').delete().eq('id', id);
  assertNoError(error, 'Kon quiz niet verwijderen');
}

export async function addRoundApi(quizId: string, title: string, theme: string): Promise<void> {
  const { data: existing } = await supabase
    .from('rounds')
    .select('order_index')
    .eq('quiz_id', quizId)
    .order('order_index', { ascending: false });
  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;
  const nextNumber = (existing?.length ?? 0) + 1;
  const { error } = await supabase.from('rounds').insert({
    quiz_id: quizId,
    round_number: nextNumber,
    title,
    theme: theme || '',
    order_index: nextOrder,
    is_scores_saved: false,
  });
  assertNoError(error, 'Kon ronde niet toevoegen');
  await updateQuizApi(quizId, {});
}

export async function updateRoundApi(roundId: string, data: Partial<Round>): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.title !== undefined) update.title = data.title;
  if (data.theme !== undefined) update.theme = data.theme;
  if (data.orderIndex !== undefined) update.order_index = data.orderIndex;
  if (data.roundNumber !== undefined) update.round_number = data.roundNumber;
  if (data.isScoresSaved !== undefined) update.is_scores_saved = data.isScoresSaved;
  const { error } = await supabase.from('rounds').update(update).eq('id', roundId);
  assertNoError(error, 'Kon ronde niet bijwerken');
}

export async function deleteRoundApi(roundId: string): Promise<void> {
  await supabase.from('scores').delete().eq('round_id', roundId);
  const { data: round } = await supabase.from('rounds').select('quiz_id').eq('id', roundId).maybeSingle();
  const { error } = await supabase.from('rounds').delete().eq('id', roundId);
  assertNoError(error, 'Kon ronde niet verwijderen');
  if (round?.quiz_id) {
    const { data: remaining } = await supabase
      .from('rounds')
      .select('id')
      .eq('quiz_id', round.quiz_id)
      .order('order_index', { ascending: true });
    await Promise.all(
      (remaining ?? []).map((r, idx) =>
        supabase.from('rounds').update({ order_index: idx + 1, round_number: idx + 1 }).eq('id', r.id)
      )
    );
    await updateQuizApi(round.quiz_id, {});
  }
}

export async function reorderRoundsApi(quizId: string, roundIds: string[]): Promise<void> {
  await Promise.all(
    roundIds.map((id, index) =>
      supabase.from('rounds').update({ order_index: index + 1, round_number: index + 1 }).eq('id', id)
    )
  );
  await updateQuizApi(quizId, {});
}

export async function addQuestionApi(
  roundId: string,
  data: {
    questionText: string;
    correctAnswer: string;
    points?: number;
    audioUrl?: string | null;
    audioFileName?: string | null;
    audioStartTime?: number;
  }
): Promise<void> {
  const { data: existing } = await supabase
    .from('questions')
    .select('order_index')
    .eq('round_id', roundId)
    .order('order_index', { ascending: false });
  const nextOrder = (existing?.[0]?.order_index ?? 0) + 1;
  const nextNumber = (existing?.length ?? 0) + 1;
  const { error } = await supabase.from('questions').insert({
    round_id: roundId,
    question_number: nextNumber,
    question_text: data.questionText,
    correct_answer: data.correctAnswer,
    points: data.points || 1,
    audio_url: data.audioUrl || null,
    audio_file_name: data.audioFileName || null,
    audio_start_time: data.audioStartTime || 0,
    order_index: nextOrder,
  });
  assertNoError(error, 'Kon vraag niet toevoegen');
}

export async function updateQuestionApi(
  questionId: string,
  data: Partial<Question>
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.questionText !== undefined) update.question_text = data.questionText;
  if (data.correctAnswer !== undefined) update.correct_answer = data.correctAnswer;
  if (data.points !== undefined) update.points = data.points;
  if (data.audioUrl !== undefined) update.audio_url = data.audioUrl;
  if (data.audioFileName !== undefined) update.audio_file_name = data.audioFileName;
  if (data.audioStartTime !== undefined) update.audio_start_time = data.audioStartTime;
  if (data.orderIndex !== undefined) update.order_index = data.orderIndex;
  if (data.questionNumber !== undefined) update.question_number = data.questionNumber;
  const { error } = await supabase.from('questions').update(update).eq('id', questionId);
  assertNoError(error, 'Kon vraag niet bijwerken');
}

export async function deleteQuestionApi(questionId: string): Promise<void> {
  const { data: q } = await supabase.from('questions').select('round_id').eq('id', questionId).maybeSingle();
  const { error } = await supabase.from('questions').delete().eq('id', questionId);
  assertNoError(error, 'Kon vraag niet verwijderen');
  if (q?.round_id) {
    const { data: remaining } = await supabase
      .from('questions')
      .select('id')
      .eq('round_id', q.round_id)
      .order('order_index', { ascending: true });
    await Promise.all(
      (remaining ?? []).map((r, idx) =>
        supabase.from('questions').update({ order_index: idx + 1, question_number: idx + 1 }).eq('id', r.id)
      )
    );
  }
}

export async function reorderQuestionsApi(roundId: string, questionIds: string[]): Promise<void> {
  await Promise.all(
    questionIds.map((id, index) =>
      supabase.from('questions').update({ order_index: index + 1, question_number: index + 1 }).eq('id', id)
    )
  );
}

export async function addTeamApi(quizId: string, name: string, tableNumber: string): Promise<void> {
  const { error } = await supabase.from('teams').insert({
    quiz_id: quizId,
    name,
    table_number: tableNumber || '',
  });
  assertNoError(error, 'Kon team niet toevoegen');
}

export async function updateTeamApi(teamId: string, name: string, tableNumber: string): Promise<void> {
  const { error } = await supabase
    .from('teams')
    .update({ name, table_number: tableNumber || '' })
    .eq('id', teamId);
  assertNoError(error, 'Kon team niet bijwerken');
}

export async function deleteTeamApi(teamId: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', teamId);
  assertNoError(error, 'Kon team niet verwijderen');
}

export async function saveRoundScoresApi(
  quizId: string,
  roundId: string,
  teamScores: { teamId: string; points: number }[]
): Promise<void> {
  for (const item of teamScores) {
    const { data: existing } = await supabase
      .from('scores')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('round_id', roundId)
      .eq('team_id', item.teamId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('scores')
        .update({ points: item.points, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      assertNoError(error, 'Kon scores niet opslaan');
    } else {
      const { error } = await supabase.from('scores').insert({
        quiz_id: quizId,
        round_id: roundId,
        team_id: item.teamId,
        points: item.points,
      });
      assertNoError(error, 'Kon scores niet opslaan');
    }
  }

  const { error: roundErr } = await supabase
    .from('rounds')
    .update({ is_scores_saved: true })
    .eq('id', roundId);
  assertNoError(roundErr, 'Kon ronde-status niet bijwerken');
}

export async function uploadAudioApi(file: File): Promise<{ audioUrl: string; audioFileName: string }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error('Niet ingelogd');

  const ext = file.name.split('.').pop() || 'mp3';
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]+$/, '');
  const filePath = `${userId}/${sanitizedName}-${unique}.${ext}`;

  const { error } = await supabase.storage.from('quiz-audio').upload(filePath, file, {
    contentType: file.type || 'audio/mpeg',
    upsert: false,
  });
  assertNoError(error, 'Kon audio niet uploaden');

  const { data: urlData } = supabase.storage.from('quiz-audio').getPublicUrl(filePath);
  return { audioUrl: urlData.publicUrl, audioFileName: file.name };
}

export async function deleteAudioApi(fileName: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return;

  const files = fileName.split('/').filter(Boolean);
  const last = files[files.length - 1] ?? fileName;
  const baseName = last.replace(/\.[^.]+$/, '');

  const { data: list } = await supabase.storage.from('quiz-audio').list(userId);
  const match = (list ?? []).find((f) => f.name.startsWith(baseName));
  if (match) {
    await supabase.storage.from('quiz-audio').remove([`${userId}/${match.name}`]);
  }
}
