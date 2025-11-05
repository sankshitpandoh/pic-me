export type ConvertOptions = {
  targetFormat?: 'png' | 'jpeg' | 'webp' | 'svg' | 'original';
  quality?: number; // 0..1 for lossy formats
  resize?: { maxWidth?: number; maxHeight?: number; fit?: 'contain' | 'cover' };
  background?: string; // applied when exporting to JPEG if source has alpha
};

export type ConvertResult = {
  dataUrl: string;
  mime: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  fileName?: string;
};


