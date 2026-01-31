/**
 * AI Worker
 * Handles TensorFlow.js operations in a Web Worker to keep main thread responsive
 * Uses WASM backend for true isolation from GPU/rendering
 */

import type { WorkerMessage, WorkerTaskType } from './ai-worker-types';

// TensorFlow.js will be imported dynamically to avoid bundling issues
let tf: any = null;
let bodySegmentation: any = null;

let isInitialized = false;
let segmentationModel: any = null;

/**
 * Initialize TensorFlow.js with WASM backend
 */
async function initialize() {
  if (isInitialized) return;
  
  try {
    // Dynamic import to avoid bundling the entire TF.js in main bundle
    const tfModule = await import('@tensorflow/tfjs');
    tf = tfModule;
    const wasmBackend = await import('@tensorflow/tfjs-backend-wasm');
    
    // Set WASM paths (use local files for better performance and offline support)
    wasmBackend.setWasmPaths('/wasm/');
    
    // Set backend to WASM (CPU-based, no GPU contention)
    await tf.setBackend('wasm');
    await tf.ready();
    
    console.log('[Worker] Initialized with backend:', tf.getBackend());
    isInitialized = true;
  } catch (error) {
    console.error('[Worker] Failed to initialize:', error);
    throw error;
  }
}

/**
 * Lazy load segmentation model
 */
async function loadSegmentationModel() {
  if (segmentationModel) return segmentationModel;
  
  console.log('[Worker] Loading segmentation model...');
  
  bodySegmentation = await import('@tensorflow-models/body-segmentation');
  
  segmentationModel = await bodySegmentation.createSegmenter(
    bodySegmentation.SupportedModels.MediaPipeSelfieSegmentation,
    {
      runtime: 'mediapipe',
      solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation',
      modelType: 'general',
    }
  );
  
  console.log('[Worker] Segmentation model loaded');
  return segmentationModel;
}

/**
 * Load image from data URL
 */
async function loadImage(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return createImageBitmap(blob);
}

/**
 * Convert blob to data URL
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Remove background from image
 */
async function removeBackground(data: { image: string; returnMask?: boolean }) {
  await initialize();
  const model = await loadSegmentationModel();
  
  const img = await loadImage(data.image);
  
  // Run segmentation
  const segmentation = await model.segmentPeople(img, {
    flipHorizontal: false,
    multiSegmentation: false,
    segmentBodyParts: false,
  });
  
  if (!segmentation || segmentation.length === 0) {
    throw new Error('No person detected in image');
  }
  
  // Create OffscreenCanvas for processing
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  // Get mask
  const mask = segmentation[0].mask;
  const maskCanvas = await mask.toCanvasImageSource();
  
  if (data.returnMask) {
    // Return just the mask
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(maskCanvas as any, 0, 0);
    
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const maskDataUrl = await blobToDataUrl(blob);
    
    return { maskBase64: maskDataUrl.split(',')[1] };
  }
  
  // Apply mask to create transparent background
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Create temp canvas for mask
  const tempCanvas = new OffscreenCanvas(canvas.width, canvas.height);
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) throw new Error('Failed to get temp canvas context');
  
  tempCtx.drawImage(maskCanvas as any, 0, 0);
  const maskData = tempCtx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Apply mask (set alpha based on mask value)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const maskValue = maskData.data[i]; // Red channel of mask
    imageData.data[i + 3] = maskValue; // Alpha channel
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  // Convert to blob
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const resultDataUrl = await blobToDataUrl(blob);
  
  return { imageBase64: resultDataUrl.split(',')[1] };
}

/**
 * Enhance image
 */
async function enhance(data: { image: string; type: string; strength: number }) {
  await initialize();
  
  const img = await loadImage(data.image);
  
  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');
  
  ctx.drawImage(img, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  const strength = data.strength || 0.5;
  
  // Apply enhancement based on type
  switch (data.type) {
    case 'sharpen':
      applySharpen(pixels, canvas.width, canvas.height, strength);
      break;
    case 'denoise':
      applyDenoise(pixels, canvas.width, canvas.height, strength);
      break;
    case 'color':
      applyColorEnhance(pixels, strength);
      break;
    case 'auto':
    default:
      applyColorEnhance(pixels, strength);
      break;
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  const resultDataUrl = await blobToDataUrl(blob);
  
  return { imageBase64: resultDataUrl.split(',')[1] };
}

/**
 * Apply sharpen filter
 */
function applySharpen(data: Uint8ClampedArray, width: number, height: number, strength: number) {
  const kernel = [
    0, -1 * strength, 0,
    -1 * strength, 1 + 4 * strength, -1 * strength,
    0, -1 * strength, 0,
  ];
  applyConvolution(data, width, height, kernel);
}

/**
 * Apply denoise (blur) filter
 */
function applyDenoise(data: Uint8ClampedArray, width: number, height: number, strength: number) {
  const s = strength * 0.111;
  const kernel = [s, s, s, s, s, s, s, s, s];
  applyConvolution(data, width, height, kernel);
}

/**
 * Apply color enhancement
 */
function applyColorEnhance(data: Uint8ClampedArray, strength: number) {
  const satMult = 1 + strength * 0.5;
  const contMult = 1 + strength * 0.3;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
    
    // Increase saturation
    data[i] = Math.min(255, gray + (data[i] - gray) * satMult);
    data[i + 1] = Math.min(255, gray + (data[i + 1] - gray) * satMult);
    data[i + 2] = Math.min(255, gray + (data[i + 2] - gray) * satMult);
    
    // Increase contrast
    data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contMult + 128));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contMult + 128));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contMult + 128));
  }
}

/**
 * Apply convolution kernel
 */
function applyConvolution(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  kernel: number[]
) {
  const copy = new Uint8ClampedArray(data);
  const kSize = 3;
  const kHalf = Math.floor(kSize / 2);
  
  for (let y = kHalf; y < height - kHalf; y++) {
    for (let x = kHalf; x < width - kHalf; x++) {
      let r = 0, g = 0, b = 0;
      
      for (let ky = 0; ky < kSize; ky++) {
        for (let kx = 0; kx < kSize; kx++) {
          const idx = ((y + ky - kHalf) * width + (x + kx - kHalf)) * 4;
          const k = kernel[ky * kSize + kx];
          r += copy[idx] * k;
          g += copy[idx + 1] * k;
          b += copy[idx + 2] * k;
        }
      }
      
      const idx = (y * width + x) * 4;
      data[idx] = Math.min(255, Math.max(0, r));
      data[idx + 1] = Math.min(255, Math.max(0, g));
      data[idx + 2] = Math.min(255, Math.max(0, b));
    }
  }
}

/**
 * Message handler
 */
self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { id, type, taskType, data } = e.data;
  
  if (type !== 'task' || !taskType) return;
  
  try {
    let result;
    
    switch (taskType) {
      case 'removeBackground':
        result = await removeBackground(data);
        break;
      case 'enhance':
        result = await enhance(data);
        break;
      default:
        throw new Error(`Unknown task type: ${taskType}`);
    }
    
    // Send success response
    self.postMessage({
      id,
      type: 'success',
      data: result,
    } as WorkerMessage);
  } catch (error) {
    console.error('[Worker] Task failed:', error);
    
    // Send error response
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    } as WorkerMessage);
  }
};

// Signal that worker is ready
console.log('[Worker] AI Worker initialized and ready');
