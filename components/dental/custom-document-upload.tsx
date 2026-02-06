/**
 * Custom Document Upload Component
 * Exact match to image - drag-drop area with progress bars
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, File, Image as ImageIcon, X } from 'lucide-react';

export function CustomDocumentUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([
    { name: 'X-Ray-JohnDoe.dicom', progress: 75 },
    { name: 'X-Ray-JohnDoe.dicom', progress: 75 },
  ]);

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 bg-gray-50'
        }`}
        onDragEnter={() => setDragActive(true)}
        onDragLeave={() => setDragActive(false)}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <File className="w-8 h-8 text-gray-400" />
            <ImageIcon className="w-8 h-8 text-gray-400" />
            <File className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600">Drag and drop a target</p>
          <p className="text-xs text-gray-500">PDF, JPG, DICOM</p>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white mt-2">
            <Upload className="w-4 h-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {/* Progress Bars */}
      <div className="space-y-2">
        {uploadingFiles.map((file, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-700">{file.name}</span>
              <span className="text-gray-600">{file.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${file.progress}%` }}
              />
            </div>
          </div>
        ))}
        <div className="text-xs text-purple-600 cursor-pointer">Progress...</div>
      </div>
    </div>
  );
}
