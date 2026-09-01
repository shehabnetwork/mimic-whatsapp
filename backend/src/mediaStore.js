const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const MAX_ITEMS = 100;
const MAX_MEDIA_AGE_MS = 30 * 60 * 1000;
const mediaItems = new Map();

function pruneMedia() {
  const cutoff = Date.now() - MAX_MEDIA_AGE_MS;
  for (const [id, item] of mediaItems) {
    if (item.createdAt < cutoff) mediaItems.delete(id);
  }

  while (mediaItems.size >= MAX_ITEMS) {
    mediaItems.delete(mediaItems.keys().next().value);
  }
}

function decodeBase64(data) {
  if (typeof data !== 'string' || !data) throw new Error('Media data is required');
  const commaIndex = data.indexOf(',');
  const encoded = data.startsWith('data:') ? data.slice(commaIndex + 1) : data;
  if (!encoded || !/^[a-zA-Z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error('Invalid base64 media data');
  }
  return Buffer.from(encoded, 'base64');
}

function saveMedia({ data, mimeType, fileName }, maxBytes) {
  pruneMedia();
  const buffer = decodeBase64(data);
  if (!buffer.length) throw new Error('Media file is empty');
  if (maxBytes && buffer.length > maxBytes) throw new Error('Media file exceeds the size limit');

  const id = uuidv4().replace(/-/g, '');
  const item = {
    id,
    buffer,
    mimeType: mimeType || 'application/octet-stream',
    fileName: fileName || id,
    sha256: crypto.createHash('sha256').update(buffer).digest('hex'),
    createdAt: Date.now(),
  };
  mediaItems.set(id, item);
  return item;
}

function getMedia(id) {
  const item = mediaItems.get(id);
  if (!item) return null;
  if (item.createdAt < Date.now() - MAX_MEDIA_AGE_MS) {
    mediaItems.delete(id);
    return null;
  }
  return item;
}

module.exports = { getMedia, saveMedia };
