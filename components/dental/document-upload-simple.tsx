/**
 * Document Upload - Simple version matching image
 * Drag-drop area with progress bars
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, File, Image as ImageIcon, FileText } from 'lucide-react';

export function DocumentUploadSimple() {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(75); // Mock progress

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag and Drop Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50'
        }`}
      >
        <p className="text-xs text-gray-600 mb-3">Drag and drop a target</p>
        <div className="flex items-center justify-center gap-4 mb-3">
          <FileText className="w-6 h-6 text-gray-400" />
          <ImageIcon className="w-6 h-6 text-gray-400" />
          <File className="w-6 h-6 text-gray-400" />
        </div>
        <Button className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-8">
          <Upload className="w-3 h-3 mr-1" />
          Upload
        </Button>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2">
        <div className="text-xs text-gray-600 mb-1">Upload progress</div>
        <div className="space-y-2">
          {/* Mock upload progress */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-700">X-Ray-JohnDoe.dicom</span>
              <span className="text-xs text-gray-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-700">X-Ray-JohnDoe.dicom</span>
              <span className="text-xs text-gray-600">{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
