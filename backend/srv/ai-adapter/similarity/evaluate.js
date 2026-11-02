const fs = require('node:fs');
const path = require('node:path');
const { createEmbedder } = require('./embeddings');
const { createSearch, cosine } = require('./search');
const { buildCorpus } = require('./corpus');
// Synthetic evaluation corpus only. Never imported into application storage.
const sources = {
  incidents: [
    { incidentId: 'EVAL-TORQUE', toolId: 'TOOL-B', category: 'TORQUE', rawText: 'Bolts remain loose after tightening with the torque wrench.', reportedAt: '2026-10-20T00:00:00Z', state: 'Closed' },
    { incidentId: 'EVAL-WEAR', toolId: 'TOOL-A', category: 'WEAR', rawText: 'The tool tip is worn and visibly rounded.', reportedAt: '2026-10-20T00:00:00Z', state: 'Closed' },
    { incidentId: 'EVAL-ELECTRICAL', toolId: 'TOOL-C', category: 'ELECTRICAL', rawText: 'Power cable insulation is torn and frayed.', reportedAt: '2026-10-20T00:00:00Z', state: 'Closed' },
  ], repairs: [],
  sops: [{ docId: 'EVAL-SOP', title: 'Torque records review', section: '2', text: 'For reported loose bolts, an authorized technician reviews torque verification records before deciding any action. Synthetic evaluation passage.' }],
};
const cases = [
  ['en-torque', 'Bolts remain loose after using the torque wrench.', 'EVAL-TORQUE'],
  ['hi-torque', 'टूल इस्तेमाल करने के बाद बोल्ट ढीले रह जाते हैं।', 'EVAL-TORQUE'],
  ['kn-torque', 'ಟೂಲ್ ಬಳಸಿದ ನಂತರ ಬೋಲ್ಟ್‌ಗಳು ಸಡಿಲವಾಗಿವೆ.', 'EVAL-TORQUE'],
  ['en-wear', 'The tip of the tool is worn.', 'EVAL-WEAR'],
  ['hi-wear', 'टूल की नोक घिस गई है।', 'EVAL-WEAR'],
  ['kn-wear', 'ಟೂಲ್ ತುದಿ ಸವೆದಿದೆ.', 'EVAL-WEAR'],
  ['kn-wear-reviewed-translation', 'ಟೂಲ್ ತುದಿ ಸವೆದಿದೆ. English: The tip of the tool is worn.', 'EVAL-WEAR'],
  ['en-electrical', 'The insulation on the power cable is torn.', 'EVAL-ELECTRICAL'],
  ['hi-electrical', 'बिजली की केबल का इन्सुलेशन फटा हुआ है।', 'EVAL-ELECTRICAL'],
  ['kn-electrical', 'ವಿದ್ಯುತ್ ಕೇಬಲ್‌ನ ಹೊದಿಕೆ ಹರಿದಿದೆ.', 'EVAL-ELECTRICAL'],
  ['irrelevant-weather', 'What is the weather forecast tomorrow?', null],
  ['irrelevant-food', 'Chocolate cake recipe with strawberries.', null],
];
async function main() {
  const embedder = createEmbedder();
  const search = createSearch({ embedder, loadSources: async () => sources });
  const passages = buildCorpus(sources, { asOf: '2026-11-01T00:00:00Z' }).passages;
  const passageVectors = await embedder.embed(passages.map(row => `${row.title}\n${row.text}`), 'passage');
  const results = [];
  for (const [id, query, expectedSource] of cases) {
    const result = await search({ query, limit: 3, asOf: '2026-11-01T00:00:00Z' });
    const [queryVector] = await embedder.embed([query], 'query');
    results.push({ id, method: result.method, expectedSource,
      passed: expectedSource ? result.matches.some(row => row.sourceId === expectedSource) : result.matches.length === 0,
      returned: result.matches.map(row => ({ sourceId: row.sourceId, semanticSimilarity: row.semanticSimilarity, lexicalScore: row.lexicalScore })),
      semanticCandidates: passages.map((row, index) => ({ sourceId: row.sourceId, score: Number(cosine(queryVector, passageVectors[index]).toFixed(4)) })).sort((a, b) => b.score - a.score).slice(0, 2) });
  }
  const report = { dataset: 'Small synthetic relevance-policy calibration set; not held-out or production accuracy',
    knownLimitation: 'Short Kannada-only wear wording can be ambiguous; the worker flow includes reviewed English translation to improve retrieval.',
    cases: results.length, passed: results.filter(row => row.passed).length, results };
  // Resolve from the actual CAP root rather than assuming a user's checkout name.
  const output = path.resolve(__dirname, '../../../..', 'backup/phase3-retrieval-evaluation.json');
  fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  if (report.passed !== report.cases || results.some(row => row.method !== 'HYBRID')) process.exitCode = 1;
}
if (require.main === module) main().catch(() => { console.error('Local retrieval evaluation failed. Check model setup.'); process.exitCode = 1; });
