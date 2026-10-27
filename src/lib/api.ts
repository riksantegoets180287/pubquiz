import { Question, Quiz, QuizListItem, Round, Team } from '../types/quiz.ts';

export async function fetchQuizzes(headers: Record<string, string>): Promise<QuizListItem[]> {
  const res = await fetch('/api/quizzes', { headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon quizzen niet ophalen');
  }
  return res.json();
}

export async function fetchQuiz(id: number, headers: Record<string, string> = {}): Promise<Quiz> {
  const res = await fetch(`/api/quizzes/${id}`, { headers });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon quiz niet ophalen');
  }
  return res.json();
}

export async function createQuizApi(
  title: string,
  description: string,
  headers: Record<string, string>
): Promise<Quiz> {
  const res = await fetch('/api/quizzes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon quiz niet aanmaken');
  }
  return res.json();
}

export async function updateQuizApi(
  id: number,
  data: Partial<Quiz>,
  headers: Record<string, string>
): Promise<Quiz> {
  const res = await fetch(`/api/quizzes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon quiz niet bijwerken');
  }
  return res.json();
}

export async function deleteQuizApi(
  id: number,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/quizzes/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon quiz niet verwijderen');
  }
}

export async function addRoundApi(
  quizId: number,
  title: string,
  theme: string,
  headers: Record<string, string>
): Promise<Round> {
  const res = await fetch(`/api/quizzes/${quizId}/rounds`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ title, theme }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon ronde niet toevoegen');
  }
  return res.json();
}

export async function updateRoundApi(
  roundId: number,
  data: Partial<Round>,
  headers: Record<string, string>
): Promise<Round> {
  const res = await fetch(`/api/rounds/${roundId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon ronde niet bijwerken');
  }
  return res.json();
}

export async function deleteRoundApi(
  roundId: number,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/rounds/${roundId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon ronde niet verwijderen');
  }
}

export async function reorderRoundsApi(
  quizId: number,
  roundIds: number[],
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/quizzes/${quizId}/rounds/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ roundIds }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon rondes niet herschikken');
  }
}

export async function addQuestionApi(
  roundId: number,
  data: {
    questionText: string;
    correctAnswer: string;
    points?: number;
    audioUrl?: string | null;
    audioFileName?: string | null;
    audioStartTime?: number;
  },
  headers: Record<string, string>
): Promise<Question> {
  const res = await fetch(`/api/rounds/${roundId}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon vraag niet toevoegen');
  }
  return res.json();
}

export async function updateQuestionApi(
  questionId: number,
  data: Partial<Question>,
  headers: Record<string, string>
): Promise<Question> {
  const res = await fetch(`/api/questions/${questionId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon vraag niet bijwerken');
  }
  return res.json();
}

export async function deleteQuestionApi(
  questionId: number,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/questions/${questionId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon vraag niet verwijderen');
  }
}

export async function reorderQuestionsApi(
  roundId: number,
  questionIds: number[],
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/rounds/${roundId}/questions/reorder`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ questionIds }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon vragen niet herschikken');
  }
}

export async function addTeamApi(
  quizId: number,
  name: string,
  tableNumber: string,
  headers: Record<string, string>
): Promise<Team> {
  const res = await fetch(`/api/quizzes/${quizId}/teams`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ name, tableNumber }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon team niet toevoegen');
  }
  return res.json();
}

export async function updateTeamApi(
  teamId: number,
  name: string,
  tableNumber: string,
  headers: Record<string, string>
): Promise<Team> {
  const res = await fetch(`/api/teams/${teamId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ name, tableNumber }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon team niet bijwerken');
  }
  return res.json();
}

export async function deleteTeamApi(
  teamId: number,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/teams/${teamId}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon team niet verwijderen');
  }
}

export async function saveRoundScoresApi(
  quizId: number,
  roundId: number,
  teamScores: { teamId: number; points: number }[],
  headers: Record<string, string>
): Promise<{ success: boolean }> {
  const res = await fetch(`/api/quizzes/${quizId}/rounds/${roundId}/scores`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify({ teamScores }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon scores niet opslaan');
  }
  return res.json();
}

export async function uploadAudioApi(
  file: File,
  headers: Record<string, string>
): Promise<{ audioUrl: string; audioFileName: string }> {
  const formData = new FormData();
  formData.append('audio', file);

  const res = await fetch('/api/upload-audio', {
    method: 'POST',
    headers: { ...headers },
    body: formData,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon audio niet uploaden');
  }
  return res.json();
}

export async function deleteAudioApi(
  fileName: string,
  headers: Record<string, string>
): Promise<void> {
  const res = await fetch(`/api/audio/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || 'Kon audio niet verwijderen');
  }
}
