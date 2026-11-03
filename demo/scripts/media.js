// Media helpers for the ToolSathi demonstration videos.
// Narration is generated offline with the Windows speech synthesiser; the application's
// own Sarvam/Groq providers are used only inside the recorded application itself.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const FFMPEG = process.env.TOOLSATHI_FFMPEG || 'ffmpeg';
const FFPROBE = process.env.TOOLSATHI_FFPROBE || 'ffprobe';

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `${path.basename(command)} ${args.slice(0, 6).join(' ')} failed (${result.status}):\n${(result.stderr || '').slice(-1500)}`,
    );
  }
  return result;
}

function ffmpeg(args, cwd) {
  return run(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { cwd });
}

function probe(file) {
  const result = run(FFPROBE, [
    '-v', 'error',
    '-show_entries', 'format=duration,size,bit_rate:stream=codec_type,codec_name,width,height,sample_rate,channels',
    '-of', 'json',
    file,
  ]);
  const data = JSON.parse(result.stdout);
  const video = (data.streams || []).find((stream) => stream.codec_type === 'video') || null;
  const audio = (data.streams || []).find((stream) => stream.codec_type === 'audio') || null;
  return {
    duration: Number(data.format?.duration || 0),
    size: Number(data.format?.size || 0),
    bitRate: Number(data.format?.bit_rate || 0),
    video,
    audio,
  };
}

// ---------------------------------------------------------------- narration --

function speechFile(manifestPath) {
  return path.join(__dirname, 'sapi.ps1');
}

function writeSpeechScript() {
  const script = path.join(__dirname, 'sapi.ps1');
  if (!fs.existsSync(script)) {
    fs.writeFileSync(script, [
      'param([string]$Manifest)',
      'Add-Type -AssemblyName System.Speech',
      '$items = Get-Content -Raw -Encoding UTF8 $Manifest | ConvertFrom-Json',
      '$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer',
      '$synth.Rate = 0',
      '$synth.Volume = 100',
      'foreach ($item in $items) {',
      '  $synth.SetOutputToWaveFile($item.file)',
      '  $synth.Speak($item.text)',
      '}',
      '$synth.Dispose()',
      '',
    ].join('\r\n'));
  }
  return script;
}

// Synthesise every sentence of every chapter in one process, then return the measured
// timing of each chapter's narration track (cues are derived from real audio durations).
function narrate(chapters, workDir) {
  fs.mkdirSync(workDir, { recursive: true });
  const items = [];
  for (const chapter of chapters) {
    chapter._sentences = [];
    chapter.narration.forEach((sentence, index) => {
      const file = path.join(workDir, `${chapter.id}-s${String(index + 1).padStart(2, '0')}.wav`);
      chapter._sentences.push({ text: sentence, file });
      items.push({ file, text: sentence });
    });
  }
  const manifest = path.join(workDir, 'sapi-manifest.json');
  fs.writeFileSync(manifest, JSON.stringify(items, null, 2));
  const script = writeSpeechScript();
  run('powershell', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, '-Manifest', manifest]);

  const gap = path.join(workDir, 'gap.wav');
  ffmpeg(['-f', 'lavfi', '-i', 'anullsrc=r=22050:cl=mono', '-t', '0.32', '-c:a', 'pcm_s16le', gap]);

  for (const chapter of chapters) {
    const listFile = path.join(workDir, `${chapter.id}-concat.txt`);
    const lines = [];
    chapter._sentences.forEach((sentence, index) => {
      const info = probe(sentence.file);
      if (!info.audio || !(info.duration > 0)) throw new Error(`Narration audio missing for ${chapter.id} sentence ${index + 1}`);
      sentence.duration = info.duration;
      lines.push(`file '${sentence.file.replace(/'/g, "'\\''")}'`);
      if (index < chapter._sentences.length - 1) lines.push(`file '${gap.replace(/'/g, "'\\''")}'`);
    });
    fs.writeFileSync(listFile, lines.join('\n') + '\n');
    const out = path.join(workDir, `${chapter.id}-narration.wav`);
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-c:a', 'pcm_s16le', out]);
    const info = probe(out);
    chapter.narrationAudio = out;
    chapter.narrationDuration = info.duration;
    let cursor = 0;
    chapter.cues = chapter._sentences.map((sentence) => {
      const start = cursor;
      cursor += sentence.duration + 0.32;
      return { start, end: start + sentence.duration, text: sentence.text };
    });
  }
}

// ------------------------------------------------------------------ subtitles --

function assTime(seconds) {
  const value = Math.max(0, seconds);
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const secs = Math.floor(value % 60);
  const centis = Math.round((value - Math.floor(value)) * 100);
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(Math.min(99, centis)).padStart(2, '0')}`;
}

function wrap(text, width = 64) {
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && (line + ' ' + word).length > width) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines.slice(0, 3).join('\\N');
}

function writeAss(chapter, file) {
  const head = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'PlayResX: 1920',
    'PlayResY: 1080',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    'YCbCr Matrix: TV.709',
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    'Style: Caption,Segoe UI,38,&H00FFFFFF,&H000000FF,&H00101010,&HA0000000,0,0,0,0,100,100,0,0,3,10,0,2,180,180,46,1',
    'Style: Title,Segoe UI Semibold,56,&H00F5FBFF,&H000000FF,&H00000000,&HCC08131F,-1,0,0,0,100,100,0,0,3,8,0,8,100,100,64,1',
    'Style: Note,Segoe UI Semibold,26,&H00B9E9F7,&H000000FF,&H00000000,&HCC08131F,0,0,0,0,100,100,0,0,3,6,0,3,60,60,24,1',
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];
  const events = [];
  events.push(`Dialogue: 0,${assTime(0)},${assTime(Math.min(5, chapter.targetDuration))},Title,,0,0,0,,${chapter.number} · ${chapter.title.replace(/[,]/g, ' ')}`);
  const note = 'SIMULATED integrations · SYNTHETIC manufacturing data';
  events.push(`Dialogue: 0,${assTime(0.4)},${assTime(chapter.targetDuration)},Note,,0,0,0,,${note}`);
  for (const cue of chapter.cues) {
    if (cue.start >= chapter.targetDuration) break;
    const end = Math.min(cue.end, chapter.targetDuration);
    if (end - cue.start < 0.3) continue;
    events.push(`Dialogue: 1,${assTime(cue.start)},${assTime(end)},Caption,,0,0,0,,${wrap(cue.text)}`);
  }
  fs.writeFileSync(file, head.concat(events).join('\n') + '\n');
  return file;
}

// --------------------------------------------------------------- render/concat --

const WIDTH = 1920;
const HEIGHT = 1080;
const FPS = 25;

function renderChapter(chapter, rawVideo, outFile, workDir) {
  const info = probe(rawVideo);
  const leadIn = 0.8;
  const tail = 0.9;
  const audioDriven = chapter.narrationDuration + leadIn + tail;
  const videoDriven = info.duration + 0.4;
  chapter.targetDuration = Math.max(audioDriven, videoDriven, 6);
  const hold = Math.max(0, chapter.targetDuration - info.duration);
  const assFile = path.join(workDir, `${chapter.id}.ass`);
  writeAss(chapter, assFile);
  // The narration starts after a short lead-in so the first frame is readable.
  const delay = Math.round(leadIn * 1000);
  const filter = [
    `[0:v]scale=${WIDTH}:${HEIGHT}:flags=lanczos,fps=${FPS},tpad=stop_mode=clone:stop_duration=${hold.toFixed(3)},format=yuv420p[v0]`,
    '[v0]ass=' + path.basename(assFile) + '[v]',
    `[1:a]adelay=${delay}|${delay},apad,atrim=0:${chapter.targetDuration.toFixed(3)},asetpts=N/SR/TB[a]`,
  ].join(';');
  ffmpeg(
    [
      '-i', rawVideo,
      '-i', chapter.narrationAudio,
      '-filter_complex', filter,
      '-map', '[v]', '-map', '[a]',
      '-t', chapter.targetDuration.toFixed(3),
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-profile:v', 'high', '-level', '4.1',
      '-pix_fmt', 'yuv420p', '-g', String(FPS * 2),
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart',
      outFile,
    ],
    workDir,
  );
  return probe(outFile);
}

function concat(files, outFile, workDir) {
  const listFile = path.join(workDir, `concat-${Date.now()}.txt`);
  fs.writeFileSync(listFile, files.map((file) => `file '${file.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  ffmpeg(['-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', '-movflags', '+faststart', outFile], workDir);
  fs.rmSync(listFile, { force: true });
  return probe(outFile);
}

function extractClip(source, outFile, start, duration, workDir) {
  ffmpeg(
    [
      '-ss', start.toFixed(3), '-t', duration.toFixed(3), '-i', source,
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
      '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
      '-movflags', '+faststart', outFile,
    ],
    workDir,
  );
  return probe(outFile);
}

function thumbnail(video, outFile, at, workDir) {
  ffmpeg(['-ss', at.toFixed(2), '-i', video, '-frames:v', '1', '-vf', `scale=${WIDTH}:${HEIGHT}`, outFile], workDir);
  return outFile;
}

function srtFromCues(chapter) {
  return chapter.cues.map((cue, index) => {
    const fmt = (seconds) => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = Math.floor(seconds % 60);
      const ms = Math.round((seconds - Math.floor(seconds)) * 1000);
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
    };
    return `${index + 1}\n${fmt(cue.start)} --> ${fmt(cue.end)}\n${wrap(cue.text, 70).replace(/\\N/g, '\n')}\n`;
  }).join('\n');
}

module.exports = { run, ffmpeg, probe, narrate, renderChapter, concat, extractClip, thumbnail, srtFromCues, WIDTH, HEIGHT, FPS };
