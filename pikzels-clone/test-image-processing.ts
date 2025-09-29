import { ImageProcessingService } from './src/modules/thumbnail/image-processing.service';

async function testImageProcessing() {
  const imageProcessingService = new ImageProcessingService();
  
  // Test edits
  const testEdits = {
    brightness: 120,
    contrast: 90,
    saturation: 110,
    hue: 45,
    blur: 2,
    rotation: 15,
    flipHorizontal: false,
    flipVertical: true,
    crop: {
      x: 10,
      y: 20,
      width: 80,
      height: 60
    }
  };
  
  try {
    console.log('Testing image processing...');
    const resultPath = await imageProcessingService.applyEditsToImage(
      'https://placehold.co/1280x720/4f99d5/FFFFFF?text=Test+Image',
      testEdits,
      'test-thumbnail-id'
    );
    
    console.log('✅ Image processing successful!');
    console.log('Processed image saved to:', resultPath);
    console.log('Processed image URL:', imageProcessingService.getProcessedImageUrl(resultPath));
  } catch (error) {
    console.error('❌ Image processing failed:', error);
  }
}

testImageProcessing();