const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const MODEL = 'Xenova/multilingual-e5-small';
const REVISION = '761b726dd34fb83930e26aab4e9ac3899aa1fa78';
const VERSION = `${MODEL}@${REVISION}:q8:mean:l2:v1`;
const ROOT = path.resolve(__dirname, '../../../..');
const CACHE = path.join(ROOT, 'backup/ai-search');
let pipelinePromise;
async function extractor({ download = false } = {}) {
  if (!pipelinePromise) pipelinePromise = (async () => {
    const { pipeline, env } = await import('@huggingface/transformers');
    env.cacheDir = path.join(ROOT, 'backup/ai-models');
    env.allowRemoteModels = download;
    return pipeline('feature-extraction', MODEL, { revision: REVISION, dtype: 'q8', device: 'cpu', local_files_only: !download,
      session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 } });
  })().catch(error => { pipelinePromise = null; throw error; });
  return pipelinePromise;
}
function createEmbedder({ download = false } = {}) {
  const vectors = new Map();
  let loaded = false, queue = Promise.resolve();
  const file = path.join(CACHE, 'embeddings-v1.json');
  function load() {
    if (loaded) return;
    loaded = true;
    try {
      if (fs.statSync(file).size > 12 * 1024 * 1024) return;
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (data.modelVersion !== VERSION || !Array.isArray(data.vectors)) return;
      for (const [key, vector] of data.vectors.slice(-4000)) if (typeof key === 'string' && valid(vector)) vectors.set(key, vector);
    } catch { /* A missing/corrupt optional cache never prevents keyword search. */ }
  }
  function valid(vector) { return Array.isArray(vector) && vector.length === 384 && vector.every(Number.isFinite); }
  return {
    modelVersion: VERSION,
    async embed(texts, kind = 'passage') {
      if (!['passage', 'query'].includes(kind)) throw new Error('Unsupported embedding task');
      load();
      // Inference is serialized to bound CPU/RAM; concurrent searches share model loading.
      const run = async () => {
        const keys = texts.map(text => crypto.createHash('sha256').update(`${VERSION}\0${kind}\0${text}`).digest('hex'));
        const missing = [...new Map(texts.map((text, index) => [keys[index], text])).entries()].filter(([key]) => !vectors.has(key));
        if (missing.length) {
          const pipe = await extractor({ download });
          for (let offset = 0; offset < missing.length; offset += 8) {
            const batch = missing.slice(offset, offset + 8);
            const output = await pipe(batch.map(([, text]) => `${kind}: ${text}`), { pooling: 'mean', normalize: true, truncation: true, max_length: 512 });
            const rows = output.tolist();
            if (rows.length !== batch.length || rows.some(row => !valid(row))) throw new Error('Invalid local embedding output');
            rows.forEach((row, index) => vectors.set(batch[index][0], row));
          }
          while (vectors.size > 4000) vectors.delete(vectors.keys().next().value);
          // Store hashes/vectors only, never source text or credentials.
          try {
            fs.mkdirSync(CACHE, { recursive: true });
            const temporary = file + '.' + crypto.randomUUID() + '.tmp';
            fs.writeFileSync(temporary, JSON.stringify({ modelVersion: VERSION, vectors: [...vectors] }));
            fs.renameSync(temporary, file);
          } catch { /* Read-only hosts can still search using memory. */ }
        }
        return keys.map(key => vectors.get(key));
      };
      const job = queue.then(run, run); queue = job.catch(() => {});
      return job;
    },
  };
}
if (require.main === module) {
  if (!process.argv.includes('--download')) {
    console.error('Use --download for the explicit one-time model setup. Runtime search never downloads a model.');
    process.exitCode = 1;
  } else createEmbedder({ download: true }).embed(['Local embedding installation check.'], 'query')
    .then(rows => console.log(JSON.stringify({ ready: true, dimensions: rows[0].length, modelVersion: VERSION })))
    .catch(() => { console.error('Local embedding setup failed. Keyword search remains available.'); process.exitCode = 1; });
}
module.exports = { createEmbedder, MODEL, REVISION, VERSION };
