const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { asyncHandler, HttpError } = require("../middleware/error");
const { optionalAuth, signToken, resolveUser } = require("../middleware/auth");

const register = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  if (!email || !password || password.length < 6) {
    throw new HttpError(400, "Մուտքագրեք վավեր էլ․ փոստ և առնվազն 6 նիշ գաղտնաբառ։");
  }
  const exists = await User.findOne({ email });
  if (exists) throw new HttpError(409, "Այս էլ․ փոստով հաշիվ արդեն կա։");
  const hash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hash, savedMovies: [], history: [] });
  res.status(201).json({
    token: signToken(user),
    user: { id: user._id, email: user.email, savedMovies: user.savedMovies },
  });
});

const login = asyncHandler(async (req, res) => {
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = await User.findOne({ email });
  if (!user || user.guestId) {
    throw new HttpError(401, "Սխալ էլ․ փոստ կամ գաղտնաբառ։");
  }
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) throw new HttpError(401, "Սխալ էլ․ փոստ կամ գաղտնաբառ։");
  res.json({
    token: signToken(user),
    user: { id: user._id, email: user.email, savedMovies: user.savedMovies },
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await resolveUser(req);
  if (!user) throw new HttpError(401, "Մուտքը պարտադիր է։");
  res.json({
    user: {
      id: user._id,
      email: user.email,
      savedMovies: user.savedMovies,
      history: user.history,
    },
  });
});

module.exports = (router) => {
  router.post("/auth/register", register);
  router.post("/auth/login", login);
  router.get("/auth/me", optionalAuth, me);
};
