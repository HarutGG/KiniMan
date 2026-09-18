const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { HttpError } = require("./error");

const JWT_SECRET = () => process.env.JWT_SECRET || "kinoman-dev-secret";

function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  req.guestId =
    req.headers["x-guest-id"] ||
    req.body?.guestId ||
    req.query?.guestId ||
    null;

  if (!token) return next();

  try {
    const payload = jwt.verify(token, JWT_SECRET());
    req.userId = payload.sub;
  } catch {
    /* ignore invalid token for optional auth */
  }
  next();
}

function requireUser(req, _res, next) {
  if (!req.userId && !req.guestId) {
    return next(
      new HttpError(
        401,
        "Ցանկը պահելու համար մուտք գործեք կամ օգտագործեք հյուրի նույնականացում։",
      ),
    );
  }
  next();
}

async function resolveUser(req) {
  if (req.userId) {
    const user = await User.findById(req.userId);
    if (!user) {
      throw new HttpError(401, "Օգտատերը չի գտնվել։");
    }
    return user;
  }
  if (req.guestId) {
    let user = await User.findOne({ guestId: req.guestId });
    if (!user) {
      user = await User.create({
        email: `guest-${req.guestId}@kinoman.local`,
        password: crypto.randomBytes(16).toString("hex"),
        guestId: req.guestId,
        savedMovies: [],
        history: [],
      });
    }
    return user;
  }
  return null;
}

function signToken(user) {
  return jwt.sign({ sub: String(user._id) }, JWT_SECRET(), { expiresIn: "14d" });
}

module.exports = { optionalAuth, requireUser, resolveUser, signToken };
