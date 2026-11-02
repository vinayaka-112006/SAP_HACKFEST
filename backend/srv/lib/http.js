const fail = (status, code, message, details = {}) => {
  throw Object.assign(new Error(message), { status, code, details });
};
const wrap = (fn) => (req, res, next) =>
  Promise.resolve()
    .then(() => fn(req, res))
    .catch(next);
function required(body, fields) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    fail(400, "INVALID_INPUT", "Expected a JSON object");
  for (const f of fields)
    if (
      typeof body[f] !== "string" ||
      !body[f].trim() ||
      body[f].length > 12000
    )
      fail(400, "INVALID_INPUT", `Required non-empty string: ${f}`);
}
const label = (body) => ({ _label: "SIMULATED", _stub: false, ...body });
module.exports = { fail, wrap, required, label };
