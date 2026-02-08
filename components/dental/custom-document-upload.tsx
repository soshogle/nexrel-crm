/**
 * Custom Document Upload Component
 * Exact match to image - drag-drop area with progress bars
 */

'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, File, Image as ImageIcon, X } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useClinic } from '@/lib/dental/clinic-context';

interface CustomDocumentUploadProps {
  leadId?: string;
}

export function CustomDocumentUpload({ leadId }: CustomDocumentUploadProps) {
  const { data: session } = useSession();
  const { activeClinic } = useClinic();
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
      formData.append('documentType', 'OTHER');
      formData.append('accessLevel', 'RESTRICTED');
      if (activeClinic?.id) {
        formData.append('clinicId', activeClinic.id);
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: Math.min(f.progress + 10, 90) } : f
        ));
      }, 200);

      const response = await fetch('/api/dental/documents', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      const data = await response.json();

      if (response.ok) {
        setUploadingFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 100 } : f
        ));
        toast.success('Document uploaded successfully');
        
        // Remove from list after 2 seconds
        setTimeout(() => {
          setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        }, 2000);
      } else {
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
        toast.error(data.error || 'Failed to upload document');
      }
    } catch (error: any) {
      setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
      toast.error('Failed to upload document: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleButtonClick = () => {
    if (!leadId) {
      toast.error('Please select a patient first');
      return;
    }
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.dcm,.dicom,application/pdf,image/jpeg,image/png,application/dicom"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Drag and Drop Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive ? 'border-purple-400 bg-purple-50' : 'border-gray-300 bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <File className="w-8 h-8 text-gray-400" />
            <ImageIcon className="w-8 h-8 text-gray-400" />
            <File className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-600">Drag and drop a target</p>
          <p className="text-xs text-gray-500">PDF, JPG, DICOM</p>
          <Button 
            className="bg-purple-600 hover:bg-purple-700 text-white mt-2"
            onClick={handleButtonClick}
            disabled={uploading || !leadId}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploading ? 'Uploading...' : 'Upload'}
          </Button>
        </div>
      </div>

      {/* Progress Bars */}
      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          {uploadingFiles.map((file) => (
            <div key={file.id} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-700 truncate flex-1 mr-2">{file.name}</span>
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
        </div>
      )}
    </div>
  );
}
