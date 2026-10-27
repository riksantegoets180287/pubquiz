import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users table (authenticated via Firebase)
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Quizzes table
export const quizzes = pgTable('quizzes', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(), // Firebase UID of creator
  title: text('title').notNull(),
  description: text('description').default(''),
  currentRoundIndex: integer('current_round_index').default(0).notNull(),
  currentQuestionIndex: integer('current_question_index').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Rounds table
export const rounds = pgTable('rounds', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .references(() => quizzes.id, { onDelete: 'cascade' })
    .notNull(),
  roundNumber: integer('round_number').notNull(),
  title: text('title').notNull(),
  theme: text('theme').default(''),
  orderIndex: integer('order_index').notNull().default(0),
  isScoresSaved: boolean('is_scores_saved').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Questions table
export const questions = pgTable('questions', {
  id: serial('id').primaryKey(),
  roundId: integer('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  questionNumber: integer('question_number').notNull(),
  questionText: text('question_text').notNull(),
  correctAnswer: text('correct_answer').notNull(),
  audioUrl: text('audio_url'),
  audioFileName: text('audio_file_name'),
  audioStartTime: integer('audio_start_time').default(0).notNull(),
  orderIndex: integer('order_index').notNull().default(0),
  points: integer('points').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Teams table
export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .references(() => quizzes.id, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  tableNumber: text('table_number').default(''),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Scores table (points per team per round)
export const scores = pgTable('scores', {
  id: serial('id').primaryKey(),
  quizId: integer('quiz_id')
    .references(() => quizzes.id, { onDelete: 'cascade' })
    .notNull(),
  roundId: integer('round_id')
    .references(() => rounds.id, { onDelete: 'cascade' })
    .notNull(),
  teamId: integer('team_id')
    .references(() => teams.id, { onDelete: 'cascade' })
    .notNull(),
  points: integer('points').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const quizzesRelations = relations(quizzes, ({ many }) => ({
  rounds: many(rounds),
  teams: many(teams),
  scores: many(scores),
}));

export const roundsRelations = relations(rounds, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [rounds.quizId],
    references: [quizzes.id],
  }),
  questions: many(questions),
  scores: many(scores),
}));

export const questionsRelations = relations(questions, ({ one }) => ({
  round: one(rounds, {
    fields: [questions.roundId],
    references: [rounds.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  quiz: one(quizzes, {
    fields: [teams.quizId],
    references: [quizzes.id],
  }),
  scores: many(scores),
}));

export const scoresRelations = relations(scores, ({ one }) => ({
  quiz: one(quizzes, {
    fields: [scores.quizId],
    references: [quizzes.id],
  }),
  round: one(rounds, {
    fields: [scores.roundId],
    references: [rounds.id],
  }),
  team: one(teams, {
    fields: [scores.teamId],
    references: [teams.id],
  }),
}));
