export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName?: string | null;
}

export interface Question {
  id: string;
  roundId: string;
  questionNumber: number;
  questionText: string;
  correctAnswer: string;
  points: number;
  audioUrl?: string | null;
  audioFileName?: string | null;
  audioStartTime?: number | null;
  orderIndex: number;
  createdAt?: string;
}

export interface Round {
  id: string;
  quizId: string;
  roundNumber: number;
  title: string;
  theme?: string | null;
  orderIndex: number;
  isScoresSaved: boolean;
  questions: Question[];
  createdAt?: string;
}

export interface Team {
  id: string;
  quizId: string;
  name: string;
  tableNumber?: string | null;
  createdAt?: string;
}

export interface Score {
  id: string;
  quizId: string;
  roundId: string;
  teamId: string;
  points: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quiz {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  currentRoundIndex: number;
  currentQuestionIndex: number;
  rounds: Round[];
  teams: Team[];
  scores: Score[];
  createdAt: string;
  updatedAt: string;
}

export interface QuizListItem {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  currentRoundIndex: number;
  currentQuestionIndex: number;
  roundCount: number;
  teamCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TeamStanding {
  teamId: string;
  teamName: string;
  tableNumber?: string | null;
  totalPoints: number;
  currentRank: number;
  previousRank: number;
  rankDelta: number;
  roundPoints: Record<string, number>;
}
