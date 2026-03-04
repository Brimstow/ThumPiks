/**
 * MobileEditor Component
 * Main mobile editor shell that composes all mobile editor parts
 * Touch-first interface with bottom navigation and sheet panels
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useEditorStore } from '../../../stores/editorStore';
import type { Layer, AdjustmentState } from '../types/editor.types';
import type { MobileToolTab, MobileAITool, ProcessingState, CropPreset, ExportPlatformConfig } from './types';
import { MOBILE_ADJUSTMENTS } from './types';

// Components
import { MobileCanvas } from './MobileCanvas';
import { MobileToolbar } from './MobileToolbar';
import { MobileLayerSelector } from './MobileLayerSelector';

// Sheets
import { CropSheet } from './sheets/CropSheet';
import { AIToolsSheet } from './sheets/AIToolsSheet';
import { AdjustmentsSheet } from './sheets/AdjustmentsSheet';
import { ExportSheet } from './sheets/ExportSheet';
import { AskAISheet } from './sheets/AskAISheet';

// FAB
import { AskAIFab } from './AskAIFab';

export interface MobileEditorProps {
  thumbnailId?: string;
  thumbnailData?: {
    id: string;
    title?: string;
    imageUrl: string;
    parameters?: {
      edits?: Partial<AdjustmentState>;
      [key: string]: unknown;
    };
  };
  initialImage?: string;
  onSave: (data: { layers: Layer[]; preview: string }) => void;
  onClose: () => void;
}

export function MobileEditor({
  thumbnailId,
  thumbnailData,
  initialImage,
  onSave,
  onClose,
}: MobileEditorProps) {
  // Get state from Zustand store
  const store = useEditorStore();
  const { 
    layers, 
    layerOrder, 
    selection, 
    adjustments,
    selectLayer,
    clearSelection,
    updateAdjustments,
    addImageLayer,
  } = store;

  // Local state
  const [activeTab, setActiveTab] = useState<MobileToolTab | null>(null);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(
    selection.layerIds[0] || null
  );
  const [cropPreset, setCropPreset] = useState<string | null>('youtube');
  const [showCropGrid, setShowCropGrid] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [estimatedSize, setEstimatedSize] = useState(500000); // 500KB default
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    tool: null,
    progress: 0,
    error: null,
  });

  // Ask AI state
  const [isAskAIOpen, setIsAskAIOpen] = useState(false);
  const [isAIProcessing, setIsAIProcessing] = useState(false);

  // Initialize with image if provided
  useEffect(() => {
    const imageUrl = initialImage || thumbnailData?.imageUrl;
    if (imageUrl && layers.length === 0) {
      addImageLayer(imageUrl, 'Background', true);
    }
  }, [initialImage, thumbnailData?.imageUrl, layers.length, addImageLayer]);

  // Apply stored edits if available
  useEffect(() => {
    if (thumbnailData?.parameters?.edits) {
      const edits = thumbnailData.parameters.edits;
      if (edits.brightness !== undefined || 
          edits.contrast !== undefined || 
          edits.saturation !== undefined) {
        updateAdjustments(edits);
      }
    }
  }, [thumbnailData?.parameters?.edits, updateAdjustments]);

  // Sync selection state
  useEffect(() => {
    if (selection.layerIds[0] !== selectedLayerId) {
      setSelectedLayerId(selection.layerIds[0] || null);
    }
  }, [selection.layerIds, selectedLayerId]);

  // Handle tab change - opens/closes sheets
  const handleTabChange = useCallback((tab: MobileToolTab) => {
    setActiveTab(prev => prev === tab ? null : tab);
  }, []);

  // Handle layer selection
  const handleLayerSelect = useCallback((layerId: string) => {
    setSelectedLayerId(layerId);
    selectLayer(layerId);
  }, [selectLayer]);

  // Handle layer tap on canvas
  const handleLayerTap = useCallback((layerId: string) => {
    handleLayerSelect(layerId);
  }, [handleLayerSelect]);

  // Handle crop preset selection
  const handleCropPresetSelect = useCallback((preset: CropPreset) => {
    setCropPreset(preset.id);
    // TODO: Apply crop aspect ratio to canvas
  }, []);

  // Handle rotate 90
  const handleRotate90 = useCallback(() => {
    // TODO: Rotate canvas/layer 90 degrees
  }, []);

  // Handle AI tool selection
  const handleAIToolSelect = useCallback(async (tool: MobileAITool) => {
    setProcessingState({
      isProcessing: true,
      tool,
      progress: 0,
      error: null,
    });

    try {
      // Simulate progress for now
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setProcessingState(prev => ({ ...prev, progress: i }));
      }

      // TODO: Call actual AI service
      // await aiService[tool](selectedLayerId);

      setProcessingState({
        isProcessing: false,
        tool: null,
        progress: 100,
        error: null,
      });
    } catch (error) {
      setProcessingState({
        isProcessing: false,
        tool: null,
        progress: 0,
        error: error instanceof Error ? error.message : 'Processing failed',
      });
    }
  }, []);

  // Handle adjustment change
  const handleAdjustmentChange = useCallback((
    key: keyof Pick<AdjustmentState, 'brightness' | 'contrast' | 'saturation'>,
    value: number
  ) => {
    updateAdjustments({ [key]: value });
  }, [updateAdjustments]);

  // Handle reset adjustments
  const handleResetAdjustments = useCallback(() => {
    const resetValues = MOBILE_ADJUSTMENTS.reduce((acc, config) => {
      acc[config.id] = config.default;
      return acc;
    }, {} as Record<string, number>);
    updateAdjustments(resetValues);
  }, [updateAdjustments]);

  // Handle export
  const handleExport = useCallback(async (platform: ExportPlatformConfig, quality: number) => {
    setIsExporting(true);
    try {
      // TODO: Generate canvas to blob
      // const blob = await canvasToBlob(platform.dimensions, quality);
      
      // For now, call onSave with current state
      onSave({
        layers,
        preview: '', // TODO: Generate preview image
      });

      // Close sheet after export
      setActiveTab(null);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  }, [layers, onSave]);

  // Handle save
  const handleSave = useCallback(() => {
    onSave({
      layers,
      preview: '', // TODO: Generate preview
    });
  }, [layers, onSave]);

  // Handle Ask AI submit
  const handleAskAISubmit = useCallback(async (prompt: string) => {
    setIsAIProcessing(true);
    try {
      // TODO: Connect to actual AI command parser
      // For now, simulate processing
      console.log('Ask AI prompt:', prompt);
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Close sheet after successful processing
      setIsAskAIOpen(false);
    } catch (error) {
      console.error('Ask AI failed:', error);
    } finally {
      setIsAIProcessing(false);
    }
  }, []);

  // Calculate sheet snap point based on tab
  const getSheetSnapPoint = useCallback((tab: MobileToolTab) => {
    switch (tab) {
      case 'export':
        return 'full' as const;
      default:
        return 'half' as const;
    }
  }, []);

  // Mobile adjustments subset
  const mobileAdjustments = useMemo(() => ({
    brightness: adjustments.brightness,
    contrast: adjustments.contrast,
    saturation: adjustments.saturation,
  }), [adjustments.brightness, adjustments.contrast, adjustments.saturation]);

  return (
    <div className="fixed inset-0 bg-[#0a0a14] flex flex-col z-50">
      {/* Header */}
      <header className="flex items-center justify-between px-4 h-14 bg-[#1a1a2e] border-b border-gray-700/50 safe-area-inset-top z-30">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white touch-manipulation"
          aria-label="Close editor"
        >
          <ArrowLeft size={24} />
        </button>
        
        <h1 className="text-white font-medium truncate max-w-[200px]">
          {thumbnailData?.title || 'Edit Thumbnail'}
        </h1>

        <div className="flex items-center gap-2">
          <button
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-white touch-manipulation"
            aria-label="Preview"
          >
            <Eye size={20} />
          </button>
          <button
            onClick={handleSave}
            className="w-10 h-10 flex items-center justify-center text-blue-400 hover:text-blue-300 touch-manipulation"
            aria-label="Save"
          >
            <Save size={20} />
          </button>
        </div>
      </header>

      {/* Layer selector - only show when we have multiple layers */}
      {layers.length > 1 && (
        <MobileLayerSelector
          layers={layers}
          layerOrder={layerOrder}
          selectedLayerId={selectedLayerId}
          onSelectLayer={handleLayerSelect}
          className="top-14"  // Below header
        />
      )}

      {/* Main canvas area */}
      <main 
        className={cn(
          'flex-1 overflow-hidden',
          layers.length > 1 ? 'pt-24' : 'pt-0',  // Account for layer selector
          'pb-16'  // Account for bottom toolbar
        )}
      >
        <MobileCanvas
          layers={layers}
          selectedLayerId={selectedLayerId}
          adjustments={adjustments}
          onLayerTap={handleLayerTap}
        />
      </main>

      {/* Ask AI FAB - positioned above toolbar */}
      <AskAIFab
        onClick={() => setIsAskAIOpen(true)}
        isActive={isAskAIOpen}
        disabled={processingState.isProcessing || isAIProcessing}
      />

      {/* Bottom toolbar */}
      <MobileToolbar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        disabled={processingState.isProcessing}
      />

      {/* Sheets */}
      <CropSheet
        isOpen={activeTab === 'crop'}
        onClose={() => setActiveTab(null)}
        selectedPreset={cropPreset}
        onPresetSelect={handleCropPresetSelect}
        showGrid={showCropGrid}
        onToggleGrid={() => setShowCropGrid(!showCropGrid)}
        onRotate90={handleRotate90}
      />

      <AIToolsSheet
        isOpen={activeTab === 'ai'}
        onClose={() => setActiveTab(null)}
        onToolSelect={handleAIToolSelect}
        processingState={processingState}
      />

      <AdjustmentsSheet
        isOpen={activeTab === 'adjust'}
        onClose={() => setActiveTab(null)}
        adjustments={mobileAdjustments}
        onAdjustmentChange={handleAdjustmentChange}
        onReset={handleResetAdjustments}
      />

      <ExportSheet
        isOpen={activeTab === 'export'}
        onClose={() => setActiveTab(null)}
        onExport={handleExport}
        estimatedSize={estimatedSize}
        isExporting={isExporting}
      />

      {/* Ask AI Sheet */}
      <AskAISheet
        isOpen={isAskAIOpen}
        onClose={() => setIsAskAIOpen(false)}
        onSubmit={handleAskAISubmit}
        isProcessing={isAIProcessing}
      />
    </div>
  );
}

export default MobileEditor;
