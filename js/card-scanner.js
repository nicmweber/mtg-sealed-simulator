// Camera card scanner: OCR the card's title strip with Tesseract.js (CDN),
// then fuzzy-match the text against the set's known card names.
// Runs fully client-side; requires HTTPS for camera access.

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';

let tesseractLoadPromise = null;
let worker = null;

/**
 * Inject the Tesseract.js script once
 */
function loadTesseract() {
  if (window.Tesseract) return Promise.resolve();
  if (!tesseractLoadPromise) {
    tesseractLoadPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = TESSERACT_CDN;
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load OCR library (offline?)'));
      document.head.appendChild(s);
    });
  }
  return tesseractLoadPromise;
}

async function getWorker() {
  if (worker) return worker;
  await loadTesseract();
  worker = await window.Tesseract.createWorker('eng');
  await worker.setParameters({
    // Single line of text; card names use letters, apostrophes, hyphens, commas
    tessedit_pageseg_mode: '7',
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzÁáÉéÍíÓóÚú',- "
  });
  return worker;
}

/**
 * Levenshtein edit distance (iterative, two-row)
 */
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 0; i < a.length; i++) {
    const curr = [i + 1];
    for (let j = 0; j < b.length; j++) {
      curr.push(Math.min(
        prev[j + 1] + 1,
        curr[j] + 1,
        prev[j] + (a[i] === b[j] ? 0 : 1)
      ));
    }
    prev = curr;
  }
  return prev[b.length];
}

function cleanText(text) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-záéíóú0-9',\- ]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Match OCR output against the card list.
 * Returns { card, confidence } or null if nothing clears the threshold.
 */
export function matchOcrToCard(text, allCards) {
  const ocr = cleanText(text);
  if (ocr.length < 4) return null;
  const ocrTokens = ocr.split(' ').filter(t => t.length >= 3);

  let best = null;
  let bestScore = 0;

  for (const card of allCards) {
    if ((card.type_line || '').includes('Basic Land')) continue;
    // The physical title strip shows the front-face name
    const name = cleanText(card.name.split(' // ')[0]);
    if (!name) continue;

    // Edit-distance similarity
    const sim = 1 - levenshtein(ocr, name) / Math.max(ocr.length, name.length);

    // Token containment: how many name tokens appear in the OCR text
    const nameTokens = name.split(' ').filter(t => t.length >= 3);
    let tokenFrac = 0;
    if (nameTokens.length > 0 && ocrTokens.length > 0) {
      const hits = nameTokens.filter(nt =>
        ocrTokens.some(ot => ot === nt || (nt.length >= 4 && ot.includes(nt)) || (ot.length >= 4 && nt.includes(ot)))
      ).length;
      tokenFrac = hits / nameTokens.length;
    }

    const score = Math.max(sim, tokenFrac * 0.92);
    if (score > bestScore) {
      bestScore = score;
      best = card;
    }
  }

  if (best && bestScore >= 0.62) {
    return { card: best, confidence: Math.round(bestScore * 100) / 100 };
  }
  return null;
}

/**
 * Map a rect in video-element display coordinates to intrinsic frame
 * coordinates, accounting for object-fit: cover cropping.
 */
function displayRectToFrameRect(videoEl, rect) {
  const vw = videoEl.videoWidth;
  const vh = videoEl.videoHeight;
  const ew = videoEl.clientWidth;
  const eh = videoEl.clientHeight;
  const scale = Math.max(ew / vw, eh / vh);
  const offX = (vw * scale - ew) / 2;
  const offY = (vh * scale - eh) / 2;
  return {
    x: Math.max(0, (rect.x + offX) / scale),
    y: Math.max(0, (rect.y + offY) / scale),
    w: Math.min(vw, rect.w / scale),
    h: Math.min(vh, rect.h / scale)
  };
}

/**
 * Start the scanner.
 * opts: {
 *   videoEl        — <video> element to attach the stream to
 *   cards          — card list to match against
 *   getStripRect() — returns the name-strip rect in video-element coords
 *   onStatus(msg)  — status text updates
 *   onDetect({card, confidence}) — called on a confident match
 * }
 * Returns a controller with stop().
 */
export async function startScanner({ videoEl, cards, getStripRect, onStatus, onDetect }) {
  let stream = null;
  let running = true;
  let busy = false;
  let timer = null;

  onStatus('Starting camera…');

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    });
  } catch (err) {
    onStatus(err.name === 'NotAllowedError'
      ? 'Camera permission denied — allow camera access and try again'
      : `Camera unavailable: ${err.message}`);
    return { stop() {} };
  }

  videoEl.srcObject = stream;
  try { await videoEl.play(); } catch (e) { /* autoplay policies */ }

  onStatus('Loading card reader…');
  let w;
  try {
    w = await getWorker();
  } catch (err) {
    onStatus(err.message);
    stream.getTracks().forEach(t => t.stop());
    return { stop() {} };
  }

  if (!running) {
    stream.getTracks().forEach(t => t.stop());
    return { stop() {} };
  }

  onStatus('Line up the card name in the box');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  async function tick() {
    if (!running || busy) return;
    if (videoEl.videoWidth === 0) return;
    busy = true;
    try {
      const strip = displayRectToFrameRect(videoEl, getStripRect());
      if (strip.w < 20 || strip.h < 8) { busy = false; return; }

      // Upscale the strip for better OCR, grayscale it
      const targetW = 800;
      const s = targetW / strip.w;
      canvas.width = targetW;
      canvas.height = Math.round(strip.h * s);
      ctx.filter = 'grayscale(1) contrast(1.4)';
      ctx.drawImage(videoEl, strip.x, strip.y, strip.w, strip.h, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';

      const { data } = await w.recognize(canvas);
      const text = (data.text || '').trim();
      if (text) {
        const match = matchOcrToCard(text, cards);
        if (match && running) onDetect(match);
      }
    } catch (e) {
      // Keep scanning through transient errors
    }
    busy = false;
  }

  timer = setInterval(tick, 1100);

  return {
    stop() {
      running = false;
      clearInterval(timer);
      if (stream) stream.getTracks().forEach(t => t.stop());
      videoEl.srcObject = null;
      // Worker is kept alive for fast re-open
    }
  };
}
