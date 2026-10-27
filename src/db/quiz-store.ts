import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import { questions, quizzes, rounds, scores, teams } from './schema.ts';

export async function getUserQuizzes(userId: string) {
  try {
    const list = await db
      .select()
      .from(quizzes)
      .where(eq(quizzes.userId, userId))
      .orderBy(desc(quizzes.updatedAt));

    // Fetch counts for each quiz
    const result = await Promise.all(
      list.map(async (q) => {
        const qRounds = await db.select().from(rounds).where(eq(rounds.quizId, q.id));
        const qTeams = await db.select().from(teams).where(eq(teams.quizId, q.id));
        let totalQuestions = 0;
        if (qRounds.length > 0) {
          const roundIds = qRounds.map((r) => r.id);
          const qQuestions = await db
            .select()
            .from(questions)
            .where(inArray(questions.roundId, roundIds));
          totalQuestions = qQuestions.length;
        }

        return {
          ...q,
          roundCount: qRounds.length,
          teamCount: qTeams.length,
          questionCount: totalQuestions,
        };
      })
    );

    return result;
  } catch (error) {
    console.error('Error in getUserQuizzes:', error);
    throw new Error('Kon quizzen niet ophalen.', { cause: error });
  }
}

export async function getFullQuiz(quizId: number) {
  try {
    const [quiz] = await db.select().from(quizzes).where(eq(quizzes.id, quizId));
    if (!quiz) return null;

    const quizRounds = await db
      .select()
      .from(rounds)
      .where(eq(rounds.quizId, quizId))
      .orderBy(asc(rounds.orderIndex), asc(rounds.roundNumber));

    const roundIds = quizRounds.map((r) => r.id);
    let quizQuestions: (typeof questions.$inferSelect)[] = [];
    if (roundIds.length > 0) {
      quizQuestions = await db
        .select()
        .from(questions)
        .where(inArray(questions.roundId, roundIds))
        .orderBy(asc(questions.orderIndex), asc(questions.questionNumber));
    }

    const quizTeams = await db
      .select()
      .from(teams)
      .where(eq(teams.quizId, quizId))
      .orderBy(asc(teams.name));

    const quizScores = await db
      .select()
      .from(scores)
      .where(eq(scores.quizId, quizId));

    // Nest questions into rounds
    const roundsWithQuestions = quizRounds.map((r) => ({
      ...r,
      questions: quizQuestions.filter((q) => q.roundId === r.id),
    }));

    return {
      ...quiz,
      rounds: roundsWithQuestions,
      teams: quizTeams,
      scores: quizScores,
    };
  } catch (error) {
    console.error('Error in getFullQuiz:', error);
    throw new Error('Kon volledige quiz niet ophalen.', { cause: error });
  }
}

export async function createQuiz(userId: string, title: string, description?: string) {
  try {
    const [newQuiz] = await db
      .insert(quizzes)
      .values({
        userId,
        title,
        description: description || '',
        currentRoundIndex: 0,
        currentQuestionIndex: 0,
      })
      .returning();
    return newQuiz;
  } catch (error) {
    console.error('Error in createQuiz:', error);
    throw new Error('Kon quiz niet aanmaken.', { cause: error });
  }
}

export async function updateQuiz(
  quizId: number,
  data: {
    title?: string;
    description?: string;
    currentRoundIndex?: number;
    currentQuestionIndex?: number;
  }
) {
  try {
    const [updated] = await db
      .update(quizzes)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(quizzes.id, quizId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Error in updateQuiz:', error);
    throw new Error('Kon quiz niet bijwerken.', { cause: error });
  }
}

export async function deleteQuiz(quizId: number) {
  try {
    await db.delete(quizzes).where(eq(quizzes.id, quizId));
    return { success: true };
  } catch (error) {
    console.error('Error in deleteQuiz:', error);
    throw new Error('Kon quiz niet verwijderen.', { cause: error });
  }
}

export async function addRound(quizId: number, title: string, theme?: string) {
  try {
    const existing = await db
      .select()
      .from(rounds)
      .where(eq(rounds.quizId, quizId))
      .orderBy(desc(rounds.orderIndex));

    const nextOrder = existing.length > 0 ? existing[0].orderIndex + 1 : 1;
    const nextRoundNumber = existing.length + 1;

    const [newRound] = await db
      .insert(rounds)
      .values({
        quizId,
        roundNumber: nextRoundNumber,
        title,
        theme: theme || '',
        orderIndex: nextOrder,
        isScoresSaved: false,
      })
      .returning();

    await updateQuiz(quizId, {});
    return newRound;
  } catch (error) {
    console.error('Error in addRound:', error);
    throw new Error('Kon ronde niet toevoegen.', { cause: error });
  }
}

export async function updateRound(
  roundId: number,
  data: {
    title?: string;
    theme?: string;
    orderIndex?: number;
    roundNumber?: number;
    isScoresSaved?: boolean;
  }
) {
  try {
    const [updated] = await db
      .update(rounds)
      .set(data)
      .where(eq(rounds.id, roundId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Error in updateRound:', error);
    throw new Error('Kon ronde niet bijwerken.', { cause: error });
  }
}

export async function deleteRound(roundId: number) {
  try {
    // Delete any scores referencing this round
    await db.delete(scores).where(eq(scores.roundId, roundId));
    // Delete questions in this round
    await db.delete(questions).where(eq(questions.roundId, roundId));
    // Find round to get quizId before deleting
    const [roundToDelete] = await db.select().from(rounds).where(eq(rounds.id, roundId));
    await db.delete(rounds).where(eq(rounds.id, roundId));

    if (roundToDelete) {
      const remaining = await db
        .select()
        .from(rounds)
        .where(eq(rounds.quizId, roundToDelete.quizId))
        .orderBy(asc(rounds.orderIndex));

      await Promise.all(
        remaining.map((r, idx) =>
          db
            .update(rounds)
            .set({ orderIndex: idx + 1, roundNumber: idx + 1 })
            .where(eq(rounds.id, r.id))
        )
      );
      await updateQuiz(roundToDelete.quizId, {});
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteRound:', error);
    throw new Error('Kon ronde niet verwijderen.', { cause: error });
  }
}

export async function reorderRounds(quizId: number, roundIds: number[]) {
  try {
    await Promise.all(
      roundIds.map((id, index) =>
        db
          .update(rounds)
          .set({ orderIndex: index + 1, roundNumber: index + 1 })
          .where(eq(rounds.id, id))
      )
    );
    return { success: true };
  } catch (error) {
    console.error('Error in reorderRounds:', error);
    throw new Error('Kon rondes niet herschikken.', { cause: error });
  }
}

export async function addQuestion(
  roundId: number,
  questionText: string,
  correctAnswer: string,
  points: number = 1,
  audioUrl?: string,
  audioFileName?: string,
  audioStartTime: number = 0
) {
  try {
    const existing = await db
      .select()
      .from(questions)
      .where(eq(questions.roundId, roundId))
      .orderBy(desc(questions.orderIndex));

    const nextOrder = existing.length > 0 ? existing[0].orderIndex + 1 : 1;
    const nextQuestionNumber = existing.length + 1;

    const [newQuestion] = await db
      .insert(questions)
      .values({
        roundId,
        questionNumber: nextQuestionNumber,
        questionText,
        correctAnswer,
        points: points || 1,
        audioUrl: audioUrl || null,
        audioFileName: audioFileName || null,
        audioStartTime: audioStartTime || 0,
        orderIndex: nextOrder,
      })
      .returning();

    return newQuestion;
  } catch (error) {
    console.error('Error in addQuestion:', error);
    throw new Error('Kon vraag niet toevoegen.', { cause: error });
  }
}

export async function updateQuestion(
  questionId: number,
  data: {
    questionText?: string;
    correctAnswer?: string;
    points?: number;
    audioUrl?: string | null;
    audioFileName?: string | null;
    audioStartTime?: number;
    orderIndex?: number;
    questionNumber?: number;
  }
) {
  try {
    const [updated] = await db
      .update(questions)
      .set(data)
      .where(eq(questions.id, questionId))
      .returning();
    return updated;
  } catch (error) {
    console.error('Error in updateQuestion:', error);
    throw new Error('Kon vraag niet bijwerken.', { cause: error });
  }
}

export async function deleteQuestion(questionId: number) {
  try {
    const [questionToDelete] = await db.select().from(questions).where(eq(questions.id, questionId));
    await db.delete(questions).where(eq(questions.id, questionId));

    if (questionToDelete) {
      const remaining = await db
        .select()
        .from(questions)
        .where(eq(questions.roundId, questionToDelete.roundId))
        .orderBy(asc(questions.orderIndex));

      await Promise.all(
        remaining.map((q, idx) =>
          db
            .update(questions)
            .set({ orderIndex: idx + 1, questionNumber: idx + 1 })
            .where(eq(questions.id, q.id))
        )
      );
    }

    return { success: true };
  } catch (error) {
    console.error('Error in deleteQuestion:', error);
    throw new Error('Kon vraag niet verwijderen.', { cause: error });
  }
}

export async function reorderQuestions(roundId: number, questionIds: number[]) {
  try {
    await Promise.all(
      questionIds.map((id, index) =>
        db
          .update(questions)
          .set({ orderIndex: index + 1, questionNumber: index + 1 })
          .where(eq(questions.id, id))
      )
    );
    return { success: true };
  } catch (error) {
    console.error('Error in reorderQuestions:', error);
    throw new Error('Kon vragen niet herschikken.', { cause: error });
  }
}

export async function addTeam(quizId: number, name: string, tableNumber?: string) {
  try {
    const [team] = await db
      .insert(teams)
      .values({
        quizId,
        name,
        tableNumber: tableNumber || '',
      })
      .returning();
    return team;
  } catch (error) {
    console.error('Error in addTeam:', error);
    throw new Error('Kon team niet toevoegen.', { cause: error });
  }
}

export async function updateTeam(teamId: number, name: string, tableNumber?: string) {
  try {
    const [team] = await db
      .update(teams)
      .set({
        name,
        tableNumber: tableNumber || '',
      })
      .where(eq(teams.id, teamId))
      .returning();
    return team;
  } catch (error) {
    console.error('Error in updateTeam:', error);
    throw new Error('Kon team niet bijwerken.', { cause: error });
  }
}

export async function deleteTeam(teamId: number) {
  try {
    await db.delete(teams).where(eq(teams.id, teamId));
    return { success: true };
  } catch (error) {
    console.error('Error in deleteTeam:', error);
    throw new Error('Kon team niet verwijderen.', { cause: error });
  }
}

export async function saveRoundScores(
  quizId: number,
  roundId: number,
  teamScores: { teamId: number; points: number }[]
) {
  try {
    for (const item of teamScores) {
      // Find existing score or insert
      const [existing] = await db
        .select()
        .from(scores)
        .where(
          and(
            eq(scores.quizId, quizId),
            eq(scores.roundId, roundId),
            eq(scores.teamId, item.teamId)
          )
        );

      if (existing) {
        await db
          .update(scores)
          .set({
            points: item.points,
            updatedAt: new Date(),
          })
          .where(eq(scores.id, existing.id));
      } else {
        await db.insert(scores).values({
          quizId,
          roundId,
          teamId: item.teamId,
          points: item.points,
        });
      }
    }

    // Mark round scores as saved
    await db
      .update(rounds)
      .set({ isScoresSaved: true })
      .where(eq(rounds.id, roundId));

    return { success: true };
  } catch (error) {
    console.error('Error in saveRoundScores:', error);
    throw new Error('Kon scores van de ronde niet opslaan.', { cause: error });
  }
}
