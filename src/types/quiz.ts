export interface UserProfile {
  id: number;
  uid: string;
  email: string;
  displayName?: string | null;
}

export interface Question {
  id: number;
  roundId: number;
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
  id: number;
  quizId: number;
  roundNumber: number;
  title: string;
  theme?: string | null;
  orderIndex: number;
  isScoresSaved: boolean;
  questions: Question[];
  createdAt?: string;
}

export interface Team {
  id: number;
  quizId: number;
  name: string;
  tableNumber?: string | null;
  createdAt?: string;
}

export interface Score {
  id: number;
  quizId: number;
  roundId: number;
  teamId: number;
  points: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Quiz {
  id: number;
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
  id: number;
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
  teamId: number;
  teamName: string;
  tableNumber?: string | null;
  totalPoints: number;
  currentRank: number;
  previousRank: number;
  rankDelta: number; // >0: climbed, <0: fell, 0: same
  roundPoints: Record<number, number>; // roundId -> points
}
