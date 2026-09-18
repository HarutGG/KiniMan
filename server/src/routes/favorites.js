const mongoose = require("mongoose");
const { asyncHandler, HttpError } = require("../middleware/error");
const { optionalAuth, requireUser, resolveUser } = require("../middleware/auth");
const { movieDetails, normalizeMovie } = require("../services/tmdb");

function mongoRequired() {
  if (mongoose.connection.readyState !== 1) {
    throw new HttpError(
      503,
      "MongoDB-ն միացված չէ։ Ցանկը պահելու համար միացրեք տվյալների բազան։",
    );
  }
}

const add = asyncHandler(async (req, res) => {
  mongoRequired();
  const movieId = Number(req.body.movieId || req.body.tmdbId || req.body.id);
  if (!movieId) throw new HttpError(400, "Պետք է նշել movieId։");
  const user = await resolveUser(req);
  if (!user.savedMovies.includes(movieId)) {
    user.savedMovies.unshift(movieId);
  }
  await user.save();
  res.json({ savedMovies: user.savedMovies, ok: true });
});

const remove = asyncHandler(async (req, res) => {
  mongoRequired();
  const movieId = Number(
    req.body.movieId || req.body.tmdbId || req.body.id || req.query.movieId,
  );
  if (!movieId) throw new HttpError(400, "Պետք է նշել movieId։");
  const user = await resolveUser(req);
  user.savedMovies = user.savedMovies.filter((id) => id !== movieId);
  await user.save();
  res.json({ savedMovies: user.savedMovies, ok: true });
});

const list = asyncHandler(async (req, res) => {
  mongoRequired();
  const user = await resolveUser(req);
  const movies = [];
  for (const id of user.savedMovies.slice(0, 24)) {
    try {
      movies.push(await movieDetails(id, "movie"));
    } catch {
      movies.push(
        normalizeMovie({ id, title: String(id), vote_average: 0 }, "movie"),
      );
    }
  }
  res.json({ movies, savedMovies: user.savedMovies });
});

module.exports = (router) => {
  router.post("/favorites", optionalAuth, requireUser, add);
  router.delete("/favorites", optionalAuth, requireUser, remove);
  router.get("/favorites", optionalAuth, requireUser, list);
};
