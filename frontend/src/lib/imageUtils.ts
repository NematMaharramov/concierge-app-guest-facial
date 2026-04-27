'use client';

export interface CropOptions {
  /** Target width in px (output will be exactly this) */
  width: number;
  /** Target height in px (output will be exactly this) */
  height: number;
  /** Output quality 0–1 for jpeg/webp, default 0.88 */
  quality?: number;
  /** Output MIME type, default image/jpeg */
  mimeType?: 'image/jpeg' | 'image/webp' | 'image/png';
}

/**
 * Loads an image File/Blob, centre-crops it to the given aspect ratio,
 * resizes to the target dimensions, and returns a new File ready for upload.
 *
 * Crop strategy: the largest centred rectangle matching the target aspect
 * ratio is extracted, then scaled to the target resolution.
 */
export async function cropAndResize(file: File, opts: CropOptions): Promise<File> {
  const { width, height, quality = 0.88, mimeType = 'image/jpeg' } = opts;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const srcW = img.naturalWidth;
      const srcH = img.naturalHeight;
      const targetAspect = width / height;
      const srcAspect = srcW / srcH;

      let cropX = 0, cropY = 0, cropW = srcW, cropH = srcH;

      if (srcAspect > targetAspect) {
        // Source is wider — crop sides
        cropW = Math.round(srcH * targetAspect);
        cropX = Math.round((srcW - cropW) / 2);
      } else if (srcAspect < targetAspect) {
        // Source is taller — crop top/bottom
        cropH = Math.round(srcW / targetAspect);
        cropY = Math.round((srcH - cropH) / 2);
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Could not get canvas context')); return; }

      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          const ext = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
          const outName = file.name.replace(/\.[^.]+$/, '') + `_cropped.${ext}`;
          resolve(new File([blob], outName, { type: mimeType }));
        },
        mimeType,
        quality,
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/** Crop presets for the different upload contexts */
export const CROP_PRESETS = {
  /** Category hero — landscape 16:9 */
  categoryPhoto:  { width: 1200, height: 675,  quality: 0.88, mimeType: 'image/jpeg' } as CropOptions,
  /** Service image — landscape 4:3 */
  serviceImage:   { width: 900,  height: 675,  quality: 0.88, mimeType: 'image/jpeg' } as CropOptions,
  /** Profile avatar — square */
  profilePhoto:   { width: 400,  height: 400,  quality: 0.90, mimeType: 'image/jpeg' } as CropOptions,
  /** Hero background — wide */
  heroBackground: { width: 1920, height: 1080, quality: 0.85, mimeType: 'image/jpeg' } as CropOptions,
};
