// --- Image upload helpers for SATYATAG evidence capture ---

/** Image formats accepted for package surface uploads. */
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/gif',
  'image/bmp',
  'image/avif',
];

/**
 * Validates that a selected file is a browser-supported image.
 * Returns the mime type on success, or null if the file is not an image.
 */
export const validateImageFile = (file: File): string | null => {
  const mime = file.type.toLowerCase();
  if (ACCEPTED_IMAGE_TYPES.includes(mime)) return mime;
  // Fall back to extension check for formats the browser may not fully type.
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'avif', 'gif', 'bmp'].includes(ext)) {
    return mime || 'image/*';
  }
  return null;
};

/**
 * Reads a File and returns it as a data URL so the uploaded photograph
 * can persist through the whole demo and be embedded into the PDF report.
 */
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read image file'));
    reader.readAsDataURL(file);
  });
};

/** Reads an image's dimensions so we can compute quality metadata. */
export const readImageMeta = (dataUrl: string): Promise<{ width: number; height: number }> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = dataUrl;
  });
};

/** Derives a deterministic quality score from image metadata (0–100). */
export const deriveQuality = ({ width, height }: { width: number; height: number }): number => {
  const pixels = width * height;
  if (pixels >= 3000000) return 96;
  if (pixels >= 1500000) return 92;
  if (pixels >= 900000) return 88;
  if (pixels >= 500000) return 82;
  return 74;
};

export const qualityTier = (score: number): 'Good' | 'Acceptable' | 'Poor' => {
  if (score >= 90) return 'Good';
  if (score >= 80) return 'Acceptable';
  return 'Poor';
};

/** Formats a File's size in human-readable KB/MB. */
export const formatFileSize = (bytes: number): string => {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
};

/**
 * Converts any supported image data URL to a JPEG data URL (downscaled).
 * jsPDF can only embed JPEG/PNG natively, and WEBP/HEIC need conversion.
 */
export const toJpegDataUrl = (dataUrl: string, maxDim = 1200): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxDim / Math.max(img.width || 1, img.height || 1));
        const w = Math.max(1, Math.round((img.width || 1) * scale));
        const h = Math.max(1, Math.round((img.height || 1) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

/**
 * Downscales an uploaded image so it can be persisted in localStorage and
 * embedded in the PDF without exceeding quota. Returns a compressed JPEG
 * data URL at max 1400px on its longest edge.
 */
export const downscaleImage = (dataUrl: string, maxDim = 1400): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const longest = Math.max(img.width || 1, img.height || 1);
        if (longest <= maxDim) {
          resolve(dataUrl);
          return;
        }
        const scale = maxDim / longest;
        const w = Math.max(1, Math.round((img.width || 1) * scale));
        const h = Math.max(1, Math.round((img.height || 1) * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};
