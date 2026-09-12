const FORMATS = new Set(['png', 'jpeg', 'webp']);
const DETAILS = new Set(['current', 'low', 'high']);

export const exportPresets = Object.freeze({
  hd: { width: 1920, height: 1080 },
  square: { width: 2048, height: 2048 },
  uhd: { width: 3840, height: 2160 },
});

export function normalizeExportSettings(input = {}, limits = {}) {
  const maxDimension = Math.max(256, Math.min(8192, Math.floor(limits.maxDimension || 8192)));
  const maxPixels = Math.max(256 * 256, Math.floor(limits.maxPixels || 33_177_600));
  let width = Math.max(256, Math.min(maxDimension, Math.round(Number(input.width) || 1920)));
  let height = Math.max(256, Math.min(maxDimension, Math.round(Number(input.height) || 1080)));
  if (width * height > maxPixels) {
    const scale = Math.sqrt(maxPixels / (width * height));
    width = Math.max(256, Math.floor(width * scale));
    height = Math.max(256, Math.floor(height * scale));
  }
  const format = FORMATS.has(input.format) ? input.format : 'png';
  return {
    width,
    height,
    format,
    mimeType: `image/${format}`,
    extension: format === 'jpeg' ? 'jpg' : format,
    quality: Math.max(0.1, Math.min(1, Number(input.quality) || 0.92)),
    transparent: format !== 'jpeg' && Boolean(input.transparent),
    detail: DETAILS.has(input.detail) ? input.detail : 'current',
    effects: input.effects !== false,
  };
}
