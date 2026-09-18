const { asyncHandler, HttpError } = require("../middleware/error");
const { searchMulti, movieDetails } = require("../services/tmdb");

const search = asyncHandler(async (req, res) => {
  const query = String(req.query.query || req.query.q || "").trim();
  const movies = await searchMulti({
    query,
    genre: req.query.genre,
    rating: req.query.rating,
    year: req.query.year,
  });
  res.json({ movies });
});

const details = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  if (!id) throw new HttpError(400, "Անվավեր ֆիլմի ID։");
  const movie = await movieDetails(id, req.query.type || "movie");
  res.json({
    movie,
    key: movie.trailerKey,
  });
});

module.exports = (router) => {
  router.get("/movies/search", search);
  router.get("/movies/details/:id", details);
};
