// Synthetic audio pipeline check, not microphone or pronunciation acceptance.
const fs = require('node:fs');
const path = require('node:path');
async function main() {
  if (!process.argv.includes('--live')) {
    console.log('No provider calls. Use --live for three synthetic TTS-to-transcription checks through the local frontend proxy (six Sarvam calls maximum).'); return;
  }
  const env = path.resolve(__dirname, '../../.env');
  if (fs.existsSync(env)) process.loadEnvFile(env);
  const { createClient, readConfig } = require('./sarvam-client');
  const fixtures = require('./test-set/reports.json');
  const client = createClient({ ...readConfig(), maxCalls: 3 });
  const results = [];
  for (const language of ['en', 'hi', 'kn']) {
    const fixture = fixtures.find(row => row.id === language + '-01');
    const audio = await client.speak(fixture.input.rawText, language);
    const bytes = Buffer.from(audio.audio, 'base64');
    if (bytes.length > 2 * 1024 * 1024) throw new Error('Synthetic audio exceeds the upload limit.');
    const response = await fetch(`http://127.0.0.1:5173/api/ai/transcribe?language=${language}`, {
      method: 'POST', signal: AbortSignal.timeout(25000), headers: { 'Content-Type': 'audio/wav', 'x-demo-user': 'PHASE5-SYNTHETIC-AUDIO', 'x-demo-role': 'Worker' }, body: bytes,
    });
    const value = await response.json();
    const passed = response.ok && value.detectedLanguage === language && typeof value.transcript === 'string' && value.transcript.trim().length > 0 && value.requiresTranscriptReview === true;
    results.push({ language, passed, status: response.status, audioBytes: bytes.length, expected: fixture.input.rawText, transcript: value.transcript,
      detectedLanguage: value.detectedLanguage, modelVersion: value.modelVersion, errorCode: value.error?.code, semanticReview: 'PENDING_HUMAN_REVIEW' });
    console.log(JSON.stringify({ language, passed, status: response.status }));
    if (!response.ok) break;
  }
  const report = { _label: 'SIMULATED', executedAt: new Date().toISOString(), input: 'Synthetic bulbul:v3 WAV; not a physical microphone',
    endpoint: 'Frontend proxy to authenticated backend transcription', passed: results.filter(row => row.passed).length, total: 3, maxProviderCalls: 6, results };
  const file = path.resolve(__dirname, '../../..', 'backup/phase5-speech-evaluation.json');
  fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(report, null, 2) + '\n');
  if (report.passed !== 3) process.exitCode = 1;
}
if (require.main === module) main().catch(() => { console.error('Synthetic speech check failed. Check local services, audio limits and Sarvam configuration; no credentials are printed.'); process.exitCode = 1; });
