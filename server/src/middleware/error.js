class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "HttpError";
  }
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function errorHandler(err, _req, res, _next) {
  const status = err.status || 500;
  const message =
    err.message || "Սերվերի ներքին սխալ։ Խնդրում ենք փորձել մի փոքր ուշ։";
  if (status >= 500) {
    console.error("[KinoMan]", err);
  }
  res.status(status).json({
    error: message,
    status,
  });
}

function notFound(_req, res) {
  res.status(404).json({
    error: "Նշված երթուղին չի գտնվել։",
    status: 404,
  });
}

module.exports = { HttpError, asyncHandler, errorHandler, notFound };
