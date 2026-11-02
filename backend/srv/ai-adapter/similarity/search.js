const { buildCorpus } = require('./corpus');
const { error } = require('../validation');
const STOP = new Set('a an the is are was were of to in on for and or it this that after before with using use tool report please something wrong details unknown'.split(' '));
const terms = text => [...new Set((text.toLocaleLowerCase().normalize('NFKC').match(/[\p{L}\p{M}\p{N}]+/gu) || []).filter(word => word.length > 1 && !STOP.has(word)))];
function cosine(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length || !a.length || !a.every(Number.isFinite) || !b.every(Number.isFinite)) throw new Error('Invalid vectors');
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const norm = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0) * b.reduce((sum, value) => sum + value * value, 0));
  if (!norm) throw new Error('Zero vector');
  return Math.max(-1, Math.min(1, dot / norm));
}
function createSearch({ embedder, loadSources }) {
  return async function search(input) {
    if (!input || typeof input.query !== 'string' || !input.query.trim() || input.query.length > 2000)
      throw error('AI_INVALID_INPUT', 'Provide a search report of 1–2000 characters.');
    const limit = input.limit === undefined ? 5 : Number(input.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 10) throw error('AI_INVALID_INPUT', 'Search limit must be 1–10.');
    for (const key of ['toolId', 'category', 'excludeIncidentId']) if (input[key] != null && (typeof input[key] !== 'string' || !input[key].trim() || input[key].length > 120))
      throw error('AI_INVALID_INPUT', `Invalid ${key}.`);
    if (input.asOf != null && (typeof input.asOf !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,7})?Z$/.test(input.asOf) ||
      !Number.isFinite(Date.parse(input.asOf)) || new Date(input.asOf).toISOString().slice(0, 19) !== input.asOf.slice(0, 19)))
      throw error('AI_INVALID_INPUT', 'Search anchor must be a valid UTC timestamp.');
    const sources = await loadSources();
    const asOf = input.asOf || new Date().toISOString();
    const corpus = buildCorpus(sources, { ...input, asOf });
    const warnings = [...(sources.warnings || []), ...corpus.warnings];
    const tokens = terms(input.query);
    const result = { _label: 'SIMULATED', _stub: false, query: input.query, method: 'KEYWORD', embeddingModelVersion: null,
      corpusVersion: corpus.corpusVersion, indexedPassages: corpus.passages.length, totalPassages: corpus.totalPassages,
      filters: { toolId: input.toolId || null, category: input.category || null, excludedIncidentId: input.excludeIncidentId || null, asOf },
      scoreMeaning: 'Relevance ranking only; not fault confidence or duplicate probability.',
      searchPolicy: { version: 'hybrid-1', semanticMinimum: 0.8, semanticTopWindow: 0.03, keywordMinimum: 0.2 },
      disclaimer: 'Past records are context only. Needs technician verification. No duplicate merge, repair instruction, exposure decision or approval is performed.', warnings, matches: [] };
    if (!tokens.length || !corpus.passages.length) return result;
    let queryVector, passageVectors;
    try {
      [queryVector] = await embedder.embed([input.query], 'query');
      passageVectors = await embedder.embed(corpus.passages.map(row => `${row.title}\n${row.text}`), 'passage');
      if (passageVectors.length !== corpus.passages.length) throw new Error('Mismatched vector count');
      passageVectors.forEach(vector => cosine(queryVector, vector));
      result.method = 'HYBRID'; result.embeddingModelVersion = embedder.modelVersion;
    } catch {
      warnings.push('Local embeddings are unavailable. Results use keyword search only; no remote embedding calls were made.');
      queryVector = null; passageVectors = null;
    }
    const documentTerms = corpus.passages.map(row => new Set(terms(`${row.title}\n${row.text}`)));
    const weights = new Map(tokens.map(token => [token, Math.log(1 + corpus.passages.length / (1 + documentTerms.filter(set => set.has(token)).length))]));
    const totalWeight = [...weights.values()].reduce((a, b) => a + b, 0);
    const semanticScores = queryVector ? passageVectors.map(vector => cosine(queryVector, vector)) : [];
    const bestSemantic = semanticScores.length ? Math.max(...semanticScores) : 0;
    result.matches = corpus.passages.map((row, index) => {
      const matchedTerms = tokens.filter(token => documentTerms[index].has(token));
      const lexicalScore = matchedTerms.reduce((sum, token) => sum + weights.get(token), 0) / totalWeight;
      const semanticSimilarity = queryVector ? semanticScores[index] : null;
      // E5 cosine thresholds are provisional relevance controls, never probabilities.
      const eligible = lexicalScore >= 0.2 || (semanticSimilarity !== null && semanticSimilarity >= 0.8 && semanticSimilarity >= bestSemantic - 0.03);
      const relevanceScore = semanticSimilarity === null ? lexicalScore : 0.6 * lexicalScore + 0.4 * Math.max(0, semanticSimilarity);
      return { eligible, ...row, excerpt: row.text, text: undefined,
        relevanceScore: Number(relevanceScore.toFixed(4)), lexicalScore: Number(lexicalScore.toFixed(4)),
        semanticSimilarity: semanticSimilarity === null ? null : Number(semanticSimilarity.toFixed(4)),
        matchedTerms, label: 'Needs technician verification',
        citation: { sourceType: row.sourceType, sourceId: row.sourceId, incidentId: row.incidentId || null, section: row.section || null,
          sourceVersion: row.sourceVersion, chunkId: row.chunkId, span: row.span },
      };
    }).filter(row => row.eligible).sort((a, b) => b.relevanceScore - a.relevanceScore || a.chunkId.localeCompare(b.chunkId))
      .slice(0, limit).map(({ eligible, text, ...row }) => row);
    return result;
  };
}
module.exports = { createSearch, cosine, terms };
