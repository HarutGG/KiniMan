const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    movieIds: { type: [Number], default: [] },
    sessionId: String,
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    savedMovies: { type: [Number], default: [] },
    history: { type: [historySchema], default: [] },
    guestId: { type: String, index: true },
  },
  { timestamps: true },
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
