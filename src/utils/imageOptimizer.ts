/**
 * Client-side file optimization utility to dramatically speed up upload times over slow internet
 */

export interface OptimizedFileResult {
  fileData: string; // Base64 without data:mime prefix
  originalSize: number;
  optimizedSize: number;
  mimeType: string;
  isOptimized: boolean;
}

export async function optimizeFileForUpload(file: File): Promise<OptimizedFileResult> {
  const originalSize = file.size;

  // If it's a PDF, read directly as base64
  if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
    const base64 = await fileToBase64(file);
    return {
      fileData: base64,
      originalSize,
      optimizedSize: originalSize,
      mimeType: 'application/pdf',
      isOptimized: false,
    };
  }

  // If it's an image, optimize dimensions and compression to save 90% of bandwidth
  if (file.type.startsWith('image/')) {
    try {
      const optimized = await compressImage(file, 2048, 0.88);
      return {
        fileData: optimized.base64,
        originalSize,
        optimizedSize: optimized.size,
        mimeType: 'image/jpeg',
        isOptimized: optimized.size < originalSize,
      };
    } catch (err) {
      console.warn('Image compression fallback to original:', err);
    }
  }

  // Fallback for other files
  const base64 = await fileToBase64(file);
  return {
    fileData: base64,
    originalSize,
    optimizedSize: originalSize,
    mimeType: file.type || 'application/pdf',
    isOptimized: false,
  };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = err => reject(err);
    reader.readAsDataURL(file);
  });
}

function compressImage(
  file: File,
  maxDimension: number,
  quality: number
): Promise<{ base64: string; size: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // Scale down if larger than maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Could not get 2D canvas context'));
        return;
      }

      // Fill with solid white background to preserve transparent PNGs
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // Draw with smooth scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Export as high-quality JPEG
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1];
      const approxBytes = Math.round((base64.length * 3) / 4);

      resolve({ base64, size: approxBytes });
    };

    img.onerror = err => {
      URL.revokeObjectURL(url);
      reject(err);
    };

    img.src = url;
  });
}
