/**
 * Custom Document Upload Component V2
 * EXACT match to image - file type icons (PDF, JPG, PTN) with upload button
 */

'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Image as ImageIcon, File } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';

interface CustomDocumentUploadProps {
  leadId?: string;
}

export function CustomDocumentUploadV2({ leadId }: CustomDocumentUploadProps) {
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Array<{ name: string; progress: number; id: string }>>([]);
  const [uploading, setUploading] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!leadId) {
      toast.error('Please select a patient first');
      return;
    }

    if (!session?.user?.id) {
      toast.error('Please sign in');
      return;
    }

    // Validate file type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/dicom', 'application/x-dicom'];
    const validExtensions = ['.pdf', '.jpg', '.jpeg', '.png', '.dcm', '.dicom'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();

    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExtension)) {
      toast.error('Invalid file type. Please upload PDF, JPG, PNG, or DICOM files.');
      return;
    }

    uploadFile(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const uploadFile = async (file: File) => {
    if (!leadId || !session?.user?.id) return;

    const fileId = Date.now().toString();
    setUploadingFiles(prev => [...prev, { name: file.name, progress: 0, id: fileId }]);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('leadId', leadId);
      formData.append('userId', session.user.id);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev =>
          prev.map(f => (f.id === fileId ? { ...f, progress: Math.min(f.progress + 20, 90) } : f))
        );
      }, 200);

      const response = await fetch('/api/dental/documents', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (response.ok) {
        setUploadingFiles(prev => prev.map(f => (f.id === fileId ? { ...f, progress: 100 } : f)));
        toast.success('File uploaded successfully');

        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
          if (uploadingFiles.length <= 1) {
            setUploading(false);
          }
        }, 1000);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error: any) {
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      toast.error('Failed to upload file: ' + error.message);
      if (uploadingFiles.length <= 1) {
        setUploading(false);
      }
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Area - EXACT match to image */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-4 text-center transition-colors
          ${dragActive ? 'border-purple-500 bg-purple-50' : 'border-gray-300 bg-gray-50'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center">
          <div className="text-xs text-gray-600 mb-3">Drag and drop here</div>
          
          {/* File Type Icons - EXACT match to image */}
          <div className="flex items-center justify-center gap-4 mb-3">
            {/* PDF Icon - Red */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-12 bg-red-500 rounded flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] text-gray-600">PDF</span>
            </div>

            {/* JPG Icon - Green */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-12 bg-green-500 rounded flex items-center justify-center">
                <ImageIcon className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] text-gray-600">JPG</span>
            </div>

            {/* PTN/DICOM Icon - Blue */}
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-12 bg-blue-500 rounded flex items-center justify-center">
                <File className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] text-gray-600">DICOM</span>
            </div>
          </div>

          {/* Upload Button */}
          <Button
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 text-white px-4"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !leadId}
          >
            <Upload className="w-3 h-3 mr-1" />
            Upload
          </Button>
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept=".pdf,.jpg,.jpeg,.png,.dcm,.dicom"
      />

      {/* Progress Bars - EXACT match to image */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div key={file.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate flex-1">{file.name}</span>
                <span className="text-gray-500 ml-2">{file.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-purple-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Progress List - Matching image format */}
      <div className="space-y-1.5 text-xs">
        <div className="text-gray-600">
          <span className="font-medium">2-day_job.docs.docx</span> (PTN)
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div className="bg-purple-600 h-1 rounded-full" style={{ width: '45%' }} />
        </div>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="text-gray-600">
          <span className="font-medium">2-day_job.docs.docx</span> (PTN)
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1">
          <div className="bg-purple-600 h-1 rounded-full" style={{ width: '75%' }} />
        </div>
      </div>

      <div className="space-y-1 text-xs">
        <div className="text-gray-700 font-medium">Upload progress</div>
        <div className="text-gray-600">Progress</div>
      </div>
    </div>
  );
}
