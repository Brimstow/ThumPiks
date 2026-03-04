/**
 * Color Extraction Service
 * 
 * Client-side dominant color extraction using k-means clustering
 * on canvas pixel data. No API calls needed.
 * 
 * Features:
 * - Extract dominant colors from any canvas/image
 * - K-means clustering for accurate color grouping
 * - Color contrast analysis
 * - Complementary/analogous palette suggestions
 * - Color score for thumbnail optimization
 */

// ============================================
// TYPES
// ============================================

export interface ExtractedColor {
  hex: string;
  rgb: [number, number, number];
  percentage: number; // How much of the image this color represents (0-100)
  name: string;       // Human-readable approximate name
}

export interface ColorAnalysisResult {
  dominantColors: ExtractedColor[];
  dominantColor: string;           // Hex of the most dominant color
  colorContrast: 'low' | 'medium' | 'high';
  saturationLevel: 'low' | 'medium' | 'high';
  brightness: 'dark' | 'medium' | 'bright';
  colorScore: number;              // 0-100 for thumbnail optimization
  suggestions: string[];
}

// ============================================
// K-MEANS CLUSTERING
// ============================================

interface Point {
  r: number;
  g: number;
  b: number;
}

function distance(a: Point, b: Point): number {
  return Math.sqrt(
    (a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2
  );
}

function kMeans(pixels: Point[], k: number, maxIterations: number = 20): Point[] {
  if (pixels.length === 0) return [];
  if (pixels.length <= k) return pixels;

  // Initialize centroids using k-means++ for better starting positions
  const centroids: Point[] = [];
  centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);

  for (let i = 1; i < k; i++) {
    const distances = pixels.map((p) => {
      const minDist = Math.min(...centroids.map((c) => distance(p, c)));
      return minDist * minDist;
    });
    const totalDist = distances.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalDist;
    for (let j = 0; j < pixels.length; j++) {
      r -= distances[j];
      if (r <= 0) {
        centroids.push(pixels[j]);
        break;
      }
    }
    if (centroids.length <= i) {
      centroids.push(pixels[Math.floor(Math.random() * pixels.length)]);
    }
  }

  // Iterate
  for (let iter = 0; iter < maxIterations; iter++) {
    // Assign pixels to nearest centroid
    const clusters: Point[][] = Array.from({ length: k }, () => []);

    for (const pixel of pixels) {
      let minDist = Infinity;
      let bestCluster = 0;
      for (let c = 0; c < centroids.length; c++) {
        const d = distance(pixel, centroids[c]);
        if (d < minDist) {
          minDist = d;
          bestCluster = c;
        }
      }
      clusters[bestCluster].push(pixel);
    }

    // Recalculate centroids
    let converged = true;
    for (let c = 0; c < k; c++) {
      if (clusters[c].length === 0) continue;

      const newCentroid: Point = {
        r: Math.round(clusters[c].reduce((s, p) => s + p.r, 0) / clusters[c].length),
        g: Math.round(clusters[c].reduce((s, p) => s + p.g, 0) / clusters[c].length),
        b: Math.round(clusters[c].reduce((s, p) => s + p.b, 0) / clusters[c].length),
      };

      if (distance(newCentroid, centroids[c]) > 1) {
        converged = false;
      }
      centroids[c] = newCentroid;
    }

    if (converged) break;
  }

  return centroids;
}

// ============================================
// COLOR UTILITIES
// ============================================

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function getColorName(r: number, g: number, b: number): string {
  const [h, s, l] = rgbToHsl(r, g, b);

  if (l < 10) return 'Black';
  if (l > 90 && s < 10) return 'White';
  if (s < 10) return l < 50 ? 'Dark Gray' : 'Light Gray';

  if (h < 15 || h >= 345) return s > 50 ? 'Red' : 'Rose';
  if (h < 45) return l > 60 ? 'Yellow' : 'Orange';
  if (h < 75) return 'Yellow';
  if (h < 150) return l > 40 ? 'Green' : 'Dark Green';
  if (h < 195) return 'Teal';
  if (h < 255) return l > 40 ? 'Blue' : 'Dark Blue';
  if (h < 285) return 'Purple';
  if (h < 345) return 'Pink';
  return 'Red';
}

function calculateContrast(colors: Point[]): 'low' | 'medium' | 'high' {
  if (colors.length < 2) return 'low';

  let maxDist = 0;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const d = distance(colors[i], colors[j]);
      if (d > maxDist) maxDist = d;
    }
  }

  // Max possible distance in RGB space is ~441 (sqrt(255^2 * 3))
  const contrastRatio = maxDist / 441;
  if (contrastRatio > 0.5) return 'high';
  if (contrastRatio > 0.25) return 'medium';
  return 'low';
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Extract dominant colors from a canvas or image element.
 * @param source - Canvas or image to analyze
 * @param numColors - Number of dominant colors to extract (default 5)
 */
export function extractColors(
  source: HTMLCanvasElement | HTMLImageElement,
  numColors: number = 5
): ColorAnalysisResult {
  // Get pixel data
  let canvas: HTMLCanvasElement;

  if (source instanceof HTMLCanvasElement) {
    canvas = source;
  } else {
    canvas = document.createElement('canvas');
    // Downsample for performance (max 200px wide)
    const scale = Math.min(1, 200 / (source.naturalWidth || source.width));
    canvas.width = Math.round((source.naturalWidth || source.width) * scale);
    canvas.height = Math.round((source.naturalHeight || source.height) * scale);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  }

  // For large canvases, sample a smaller version
  let sampleCanvas = canvas;
  if (canvas.width > 200 || canvas.height > 200) {
    sampleCanvas = document.createElement('canvas');
    const scale = Math.min(1, 200 / Math.max(canvas.width, canvas.height));
    sampleCanvas.width = Math.round(canvas.width * scale);
    sampleCanvas.height = Math.round(canvas.height * scale);
    const sctx = sampleCanvas.getContext('2d')!;
    sctx.drawImage(canvas, 0, 0, sampleCanvas.width, sampleCanvas.height);
  }

  const sctx = sampleCanvas.getContext('2d')!;
  const imageData = sctx.getImageData(0, 0, sampleCanvas.width, sampleCanvas.height);
  const data = imageData.data;

  // Sample pixels (skip every N pixels for speed)
  const pixels: Point[] = [];
  const step = Math.max(1, Math.floor(data.length / (4 * 5000))); // Max ~5000 samples

  for (let i = 0; i < data.length; i += 4 * step) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent pixels
    if (a < 128) continue;

    pixels.push({ r, g, b });
  }

  if (pixels.length === 0) {
    return {
      dominantColors: [],
      dominantColor: '#000000',
      colorContrast: 'low',
      saturationLevel: 'low',
      brightness: 'dark',
      colorScore: 0,
      suggestions: ['No visible pixels found.'],
    };
  }

  // Run k-means
  const centroids = kMeans(pixels, numColors);

  // Count pixels per cluster to calculate percentages
  const clusterCounts = new Array(centroids.length).fill(0);
  for (const pixel of pixels) {
    let minDist = Infinity;
    let bestCluster = 0;
    for (let c = 0; c < centroids.length; c++) {
      const d = distance(pixel, centroids[c]);
      if (d < minDist) {
        minDist = d;
        bestCluster = c;
      }
    }
    clusterCounts[bestCluster]++;
  }

  // Build sorted color list
  const totalPixels = pixels.length;
  const extractedColors: ExtractedColor[] = centroids
    .map((c, i) => ({
      hex: rgbToHex(c.r, c.g, c.b),
      rgb: [c.r, c.g, c.b] as [number, number, number],
      percentage: Math.round((clusterCounts[i] / totalPixels) * 100),
      name: getColorName(c.r, c.g, c.b),
    }))
    .sort((a, b) => b.percentage - a.percentage);

  // Analysis
  const dominant = extractedColors[0];
  const contrast = calculateContrast(centroids);

  // Saturation analysis
  const avgSaturation = centroids.reduce((sum, c) => {
    const [, s] = rgbToHsl(c.r, c.g, c.b);
    return sum + s;
  }, 0) / centroids.length;
  const saturationLevel: 'low' | 'medium' | 'high' =
    avgSaturation > 60 ? 'high' : avgSaturation > 30 ? 'medium' : 'low';

  // Brightness analysis
  const avgBrightness = centroids.reduce((sum, c) => {
    const [, , l] = rgbToHsl(c.r, c.g, c.b);
    return sum + l;
  }, 0) / centroids.length;
  const brightness: 'dark' | 'medium' | 'bright' =
    avgBrightness > 65 ? 'bright' : avgBrightness > 35 ? 'medium' : 'dark';

  // Color score for thumbnail optimization
  const colorScore = calculateColorScore(contrast, saturationLevel, brightness, extractedColors);

  // Suggestions
  const suggestions = generateColorSuggestions(contrast, saturationLevel, brightness, extractedColors);

  return {
    dominantColors: extractedColors,
    dominantColor: dominant.hex,
    colorContrast: contrast,
    saturationLevel,
    brightness,
    colorScore,
    suggestions,
  };
}

function calculateColorScore(
  contrast: 'low' | 'medium' | 'high',
  saturation: 'low' | 'medium' | 'high',
  brightness: 'dark' | 'medium' | 'bright',
  colors: ExtractedColor[]
): number {
  let score = 0;

  // Contrast (most important for thumbnails)
  if (contrast === 'high') score += 35;
  else if (contrast === 'medium') score += 20;
  else score += 5;

  // Saturation (vibrant colors grab attention)
  if (saturation === 'high') score += 30;
  else if (saturation === 'medium') score += 20;
  else score += 5;

  // Brightness (medium is best, too dark or too bright is bad)
  if (brightness === 'medium') score += 20;
  else score += 10;

  // Color variety bonus
  const uniqueNames = new Set(colors.map((c) => c.name));
  if (uniqueNames.size >= 3) score += 15;
  else if (uniqueNames.size >= 2) score += 10;
  else score += 3;

  return Math.min(100, score);
}

function generateColorSuggestions(
  contrast: 'low' | 'medium' | 'high',
  saturation: 'low' | 'medium' | 'high',
  brightness: 'dark' | 'medium' | 'bright',
  _colors: ExtractedColor[]
): string[] {
  const suggestions: string[] = [];

  if (contrast === 'low') {
    suggestions.push('Increase color contrast — high-contrast thumbnails get 2x more clicks.');
  }

  if (saturation === 'low') {
    suggestions.push('Boost saturation — vibrant colors stand out in YouTube\'s feed.');
  }

  if (brightness === 'dark') {
    suggestions.push('Consider a brighter color accent — dark thumbnails blend into dark mode UI.');
  } else if (brightness === 'bright') {
    suggestions.push('Add a dark element for contrast — all-bright thumbnails lack visual anchor.');
  }

  if (suggestions.length === 0) {
    suggestions.push('Color palette looks strong for thumbnail use.');
  }

  return suggestions;
}
