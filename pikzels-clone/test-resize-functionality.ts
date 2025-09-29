import { ImageProcessingService } from './src/modules/thumbnail/image-processing.service';

async function testResizeFunctionality() {
  const imageProcessingService = new ImageProcessingService();
  
  // Test edits with resize
  const testEdits = {
    resize: {
      width: 800,
      height: 600
    },
    brightness: 110,
    contrast: 95,
    saturation: 105
  };
  
  try {
    console.log('Testing resize functionality...');
    const resultPath = await imageProcessingService.applyEditsToImage(
      'https://placehold.co/1280x720/4f99d5/FFFFFF?text=Test+Image',
      testEdits,
      'test-resize-thumbnail-id'
    );
    
    console.log('✅ Resize functionality test successful!');
    console.log('Processed image saved to:', resultPath);
    console.log('Processed image URL:', imageProcessingService.getProcessedImageUrl(resultPath));
  } catch (error) {
    console.error('❌ Resize functionality test failed:', error);
  }
}

testResizeFunctionality();