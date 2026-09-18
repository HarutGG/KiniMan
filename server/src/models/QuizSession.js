const mongoose = require("mongoose");

const quizSessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true, index: true },
  answers: { type: mongoose.Schema.Types.Mixed, required: true },
  recommendedMovieIds: { type: [Number], default: [] },
  createdAt: { type: Date, default: Date.now },
});

module.exports =
  mongoose.models.QuizSession ||
  mongoose.model("QuizSession", quizSessionSchema);
