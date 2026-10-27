/*
# PubQuiz Master Pro — database schema

## Summary
Creates the full data model for a multi-user pubquiz hosting app, scoped per
authenticated presenter. Each presenter owns their quizzes and everything
nested under them (rounds, questions, teams, scores).

## New Tables
1. `quizzes` — a pubquiz created by a presenter.
   - id (uuid, pk), user_id (uuid, owner, defaults to auth.uid()),
     title, description, current_round_index, current_question_index,
     created_at, updated_at.
2. `rounds` — a round inside a quiz.
   - id (uuid, pk), quiz_id (fk -> quizzes on delete cascade),
     round_number, title, theme, order_index, is_scores_saved, created_at.
3. `questions` — a question inside a round.
   - id (uuid, pk), round_id (fk -> rounds on delete cascade),
     question_number, question_text, correct_answer, points,
     audio_url, audio_file_name, audio_start_time, order_index, created_at.
4. `teams` — a team registered for a quiz.
   - id (uuid, pk), quiz_id (fk -> quizzes on delete cascade),
     name, table_number, created_at.
5. `scores` — points per team per round.
   - id (uuid, pk), quiz_id (fk), round_id (fk), team_id (fk),
     points, created_at, updated_at. Unique (quiz_id, round_id, team_id).

## Security
- RLS enabled on every table.
- Grants: CRUD to `authenticated` only (app requires sign-in).
- Owner-scoped policies: a presenter can only access rows that belong to a
  quiz they own. Child tables scope through `quizzes.user_id = auth.uid()`.
- `quizzes.user_id` defaults to `auth.uid()` so inserts from the client that
  omit user_id still satisfy the INSERT policy.

## Storage
- Public bucket `quiz-audio` for MP3 uploads, with policies allowing
  authenticated users to manage only their own audio folder.
*/

-- quizzes
CREATE TABLE IF NOT EXISTS quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  current_round_index integer NOT NULL DEFAULT 0,
  current_question_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON quizzes TO authenticated;

DROP POLICY IF EXISTS "select_own_quizzes" ON quizzes;
CREATE POLICY "select_own_quizzes" ON quizzes FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_quizzes" ON quizzes;
CREATE POLICY "insert_own_quizzes" ON quizzes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_quizzes" ON quizzes;
CREATE POLICY "update_own_quizzes" ON quizzes FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_quizzes" ON quizzes;
CREATE POLICY "delete_own_quizzes" ON quizzes FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- rounds
CREATE TABLE IF NOT EXISTS rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  round_number integer NOT NULL,
  title text NOT NULL,
  theme text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  is_scores_saved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE rounds ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON rounds TO authenticated;

DROP POLICY IF EXISTS "select_own_rounds" ON rounds;
CREATE POLICY "select_own_rounds" ON rounds FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = rounds.quiz_id AND quizzes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_rounds" ON rounds;
CREATE POLICY "insert_own_rounds" ON rounds FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = rounds.quiz_id AND quizzes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_rounds" ON rounds;
CREATE POLICY "update_own_rounds" ON rounds FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = rounds.quiz_id AND quizzes.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = rounds.quiz_id AND quizzes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_rounds" ON rounds;
CREATE POLICY "delete_own_rounds" ON rounds FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = rounds.quiz_id AND quizzes.user_id = auth.uid())
  );

-- questions
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  question_number integer NOT NULL,
  question_text text NOT NULL,
  correct_answer text NOT NULL,
  points integer NOT NULL DEFAULT 1,
  audio_url text,
  audio_file_name text,
  audio_start_time integer NOT NULL DEFAULT 0,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON questions TO authenticated;

DROP POLICY IF EXISTS "select_own_questions" ON questions;
CREATE POLICY "select_own_questions" ON questions FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM rounds
      JOIN quizzes ON quizzes.id = rounds.quiz_id
      WHERE rounds.id = questions.round_id AND quizzes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "insert_own_questions" ON questions;
CREATE POLICY "insert_own_questions" ON questions FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds
      JOIN quizzes ON quizzes.id = rounds.quiz_id
      WHERE rounds.id = questions.round_id AND quizzes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "update_own_questions" ON questions;
CREATE POLICY "update_own_questions" ON questions FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM rounds
      JOIN quizzes ON quizzes.id = rounds.quiz_id
      WHERE rounds.id = questions.round_id AND quizzes.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM rounds
      JOIN quizzes ON quizzes.id = rounds.quiz_id
      WHERE rounds.id = questions.round_id AND quizzes.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "delete_own_questions" ON questions;
CREATE POLICY "delete_own_questions" ON questions FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM rounds
      JOIN quizzes ON quizzes.id = rounds.quiz_id
      WHERE rounds.id = questions.round_id AND quizzes.user_id = auth.uid()
    )
  );

-- teams
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  name text NOT NULL,
  table_number text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON teams TO authenticated;

DROP POLICY IF EXISTS "select_own_teams" ON teams;
CREATE POLICY "select_own_teams" ON teams FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = teams.quiz_id AND quizzes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_teams" ON teams;
CREATE POLICY "insert_own_teams" ON teams FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = teams.quiz_id AND quizzes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_teams" ON teams;
CREATE POLICY "update_own_teams" ON teams FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = teams.quiz_id AND quizzes.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = teams.quiz_id AND quizzes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_teams" ON teams;
CREATE POLICY "delete_own_teams" ON teams FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = teams.quiz_id AND quizzes.user_id = auth.uid())
  );

-- scores
CREATE TABLE IF NOT EXISTS scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  round_id uuid NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quiz_id, round_id, team_id)
);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON scores TO authenticated;

DROP POLICY IF EXISTS "select_own_scores" ON scores;
CREATE POLICY "select_own_scores" ON scores FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = scores.quiz_id AND quizzes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_scores" ON scores;
CREATE POLICY "insert_own_scores" ON scores FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = scores.quiz_id AND quizzes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_scores" ON scores;
CREATE POLICY "update_own_scores" ON scores FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = scores.quiz_id AND quizzes.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = scores.quiz_id AND quizzes.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_scores" ON scores;
CREATE POLICY "delete_own_scores" ON scores FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = scores.quiz_id AND quizzes.user_id = auth.uid())
  );

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rounds_quiz_id ON rounds(quiz_id);
CREATE INDEX IF NOT EXISTS idx_questions_round_id ON questions(round_id);
CREATE INDEX IF NOT EXISTS idx_teams_quiz_id ON teams(quiz_id);
CREATE INDEX IF NOT EXISTS idx_scores_quiz_id ON scores(quiz_id);
CREATE INDEX IF NOT EXISTS idx_scores_round_team ON scores(round_id, team_id);

-- Storage bucket for audio uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('quiz-audio', 'quiz-audio', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: authenticated users manage their own folder
DROP POLICY IF EXISTS "auth upload own audio" ON storage.objects;
CREATE POLICY "auth upload own audio" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'quiz-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth select own audio" ON storage.objects;
CREATE POLICY "auth select own audio" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'quiz-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "auth delete own audio" ON storage.objects;
CREATE POLICY "auth delete own audio" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'quiz-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Public read for audio (so presenter screen and answer sheets can load URLs)
DROP POLICY IF EXISTS "public read audio" ON storage.objects;
CREATE POLICY "public read audio" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'quiz-audio');
