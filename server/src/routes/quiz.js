const { randomUUID } = require("crypto");
const mongoose = require("mongoose");
const QuizSession = require("../models/QuizSession");
const { asyncHandler, HttpError } = require("../middleware/error");
const { optionalAuth, resolveUser } = require("../middleware/auth");
const { geminiRecommend } = require("../services/gemini");
const { discoverMovies } = require("../services/tmdb");

function mergePair(a = {}, b = {}) {
  return {
    mood: a.mood || b.mood,
    vibe: a.vibe === b.vibe ? a.vibe : a.vibe || b.vibe,
    pace: a.pace || b.pace,
    duration: a.duration === "series" || b.duration === "series" ? "series" : a.duration || b.duration,
    mealPreference: a.mealPreference || b.mealPreference,
    isPairMode: true,
  };
}

const recommend = asyncHandler(async (req, res) => {
  const body = req.body || {};
  let answers = {
    mood: body.mood,
    vibe: body.vibe,
    pace: body.pace,
    duration: body.duration,
    mealPreference: body.mealPreference || "salty",
    isPairMode: Boolean(body.isPairMode),
    surprise: Boolean(body.surprise || body.mode === "surprise"),
  };

  if (body.mode === "pair" && body.answersA && body.answersB) {
    answers = { ...mergePair(body.answersA, body.answersB), mealPreference: body.mealPreference || body.answersA.mealPreference || "salty" };
  } else if (body.answers) {
    answers = { ...answers, ...body.answers, isPairMode: body.mode === "pair" };
  }

  if (answers.surprise && !answers.mood) {
    answers = {
      mood: "chill",
      vibe: "neon",
      pace: "medium",
      duration: "feature",
      mealPreference: answers.mealPreference,
      surprise: true,
      isPairMode: false,
    };
  }

  if (!answers.mood || !answers.vibe || !answers.pace || !answers.duration) {
    throw new HttpError(
      400,
      "Անհրաժեշտ են mood, vibe, pace և duration դաշտերը։",
    );
  }

  const insight = await geminiRecommend(answers);
  const movies = await discoverMovies({
    mediaType: insight.media_type,
    genreIds: insight.tmdb_genre_ids,
    duration: answers.duration,
    surprise: answers.surprise,
  });

  const decorated = movies.map((movie) => ({
    ...movie,
    aiReason: insight.ai_reasoning_hy,
    snack: {
      food: insight.snack_recommendation_hy,
      drink: "",
      note: insight.snack_recommendation_hy,
    },
    snack_recommendation_hy: insight.snack_recommendation_hy,
  }));

  const sessionId = randomUUID();
  const recommendedMovieIds = decorated.map((m) => m.tmdbId);

  if (mongoose.connection.readyState === 1) {
    await QuizSession.create({
      sessionId,
      answers,
      recommendedMovieIds,
    });
    try {
      const user = await resolveUser(req);
      if (user) {
        user.history.unshift({ movieIds: recommendedMovieIds, sessionId, at: new Date() });
        user.history = user.history.slice(0, 30);
        await user.save();
      }
    } catch {
      /* quiz works without saved history */
    }
  }

  res.json({
    sessionId,
    movies: decorated,
    ai_reasoning_hy: insight.ai_reasoning_hy,
    snack_recommendation_hy: insight.snack_recommendation_hy,
    genres: insight.genres,
    mediaType: insight.media_type,
  });
});

module.exports = (router) => {
  router.post("/quiz/recommend", optionalAuth, recommend);
};
