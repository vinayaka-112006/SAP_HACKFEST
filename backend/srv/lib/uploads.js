// Protected local file storage for onboarding documents and incident photos.
// Files live outside the web root; SQLite keeps only metadata and a random storage name.
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { projectRoot } = require("./database-config");

const root = path.resolve(projectRoot, "uploads");
const maxBytes = 5 * 1024 * 1024;
const types = {
  "application/pdf": { ext: ".pdf", magic: (buffer) => buffer.subarray(0, 5).toString("latin1") === "%PDF-" },
  "image/png": { ext: ".png", magic: (buffer) => buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/jpeg": {
    ext: ".jpg",
    magic: (buffer) => buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])) && buffer.subarray(-2).equals(Buffer.from([0xff, 0xd9])),
  },
  "image/webp": {
    ext: ".webp",
    magic: (buffer) => buffer.subarray(0, 4).toString("latin1") === "RIFF" && buffer.subarray(8, 12).toString("latin1") === "WEBP",
  },
};
const uploadTypes = {
  certificate: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
  resume: ["application/pdf"],
  identity: ["application/pdf", "image/png", "image/jpeg"],
  "incident-photo": ["image/png", "image/jpeg", "image/webp"],
};

function fail(code, message, status = 400) {
  throw Object.assign(new Error(message), { status, code });
}

function safeName(name) {
  const base = path.basename(String(name || "document"));
  return base.replace(/[^A-Za-z0-9._ -]/g, "_").slice(0, 180) || "document";
}

function validate(documentType, mimeType, fileName, size) {
  const allowed = uploadTypes[documentType];
  if (!allowed) fail("INVALID_DOCUMENT_TYPE", "Choose a supported document type");
  if (!Number.isFinite(size) || size <= 0) fail("EMPTY_DOCUMENT", "The uploaded file is empty");
  if (size > maxBytes) fail("DOCUMENT_TOO_LARGE", "Files must be 5 MB or smaller");
  if (!types[mimeType] || !allowed.includes(mimeType))
    fail("UNSUPPORTED_FILE_TYPE", "Allowed formats: " + allowed.map((type) => type.split("/")[1].toUpperCase()).join(", "));
  if (/\.(exe|sh|bat|cmd|js|mjs|php|html?|svg|dll|com|scr)$/i.test(fileName || ""))
    fail("UNSUPPORTED_FILE_TYPE", "Executable or script uploads are rejected");
  return { mimeType, ext: types[mimeType].ext, name: safeName(fileName) };
}

function store(buffer, mimeType, documentType, fileName) {
  const meta = validate(documentType, mimeType, fileName, buffer.length);
  if (!types[mimeType].magic(buffer))
    fail("DOCUMENT_CONTENT_MISMATCH", "The file content does not match its declared type");
  fs.mkdirSync(root, { recursive: true });
  const storageName = `${crypto.randomUUID()}${meta.ext}`;
  const destination = path.join(root, storageName);
  fs.writeFileSync(destination, buffer, { flag: "wx", mode: 0o600 });
  return {
    storageName,
    fileName: meta.name,
    mimeType,
    size: buffer.length,
    checksum: crypto.createHash("sha256").update(buffer).digest("hex"),
  };
}

function location(storageName) {
  const resolved = path.resolve(root, String(storageName));
  if (!resolved.startsWith(root + path.sep)) fail("INVALID_STORAGE_REFERENCE", "Invalid stored file reference", 500);
  return resolved;
}

function read(storageName) {
  const file = location(storageName);
  if (!fs.existsSync(file)) fail("DOCUMENT_MISSING", "The stored document is no longer available", 404);
  return fs.readFileSync(file);
}

function remove(storageName) {
  try {
    fs.unlinkSync(location(storageName));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

module.exports = { root, maxBytes, types, uploadTypes, validate, store, read, remove, location, safeName };
