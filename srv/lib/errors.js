module.exports = function errors(err, req, res, next) {
  if (res.headersSent) return next(err);
  const malformed = err.type === 'entity.parse.failed';
  const status = malformed ? 400 : (err.status || 500);
  res.status(status).json({error:{code:malformed ? 'INVALID_JSON' : (err.code || 'INTERNAL_ERROR'),message: status >= 500 ? 'Internal server error' : err.message,details:err.details || {}}});
};
