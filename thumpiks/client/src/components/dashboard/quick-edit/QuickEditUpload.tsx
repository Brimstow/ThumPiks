import React from 'react';
import { ArrowLeft, UploadCloud } from 'lucide-react';

interface QuickEditUploadProps {
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDrop: (e: React.DragEvent) => void;
  onBack: () => void;
}

const QuickEditUpload: React.FC<QuickEditUploadProps> = ({
  fileInputRef,
  onFileUpload,
  onFileDrop,
  onBack,
}) => (
  <div className="max-w-2xl mx-auto px-4 py-8">
    <button
      onClick={onBack}
      className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      Back
    </button>

    <h2 className="text-2xl font-bold text-white mb-2">Upload an image</h2>
    <p className="text-gray-400 mb-6">
      Drop your image here or click to browse.
    </p>

    <div
      onDragOver={e => e.preventDefault()}
      onDrop={onFileDrop}
      onClick={() => fileInputRef.current?.click()}
      className="flex flex-col items-center justify-center gap-4 p-12 rounded-2xl
                 border-2 border-dashed border-gray-700 hover:border-emerald-500/50
                 bg-gray-800/30 hover:bg-gray-800/50 transition-all cursor-pointer"
    >
      <UploadCloud className="w-12 h-12 text-gray-500" />
      <div className="text-center">
        <p className="text-gray-300 font-medium">
          Drag & drop or <span className="text-emerald-400">browse</span>
        </p>
        <p className="text-gray-500 text-sm mt-1">
          JPG, PNG, WebP — up to 10MB
        </p>
      </div>
    </div>

    <input
      ref={fileInputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      onChange={onFileUpload}
      className="hidden"
    />
  </div>
);

export default QuickEditUpload;
