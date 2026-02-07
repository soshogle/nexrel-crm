/**
 * Card Modal Component
 * Opens card content in a half-screen overlay modal
 */

'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface CardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function CardModal({ isOpen, onClose, title, children }: CardModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed right-0 top-0 h-full w-1/2 bg-white shadow-2xl z-50 overflow-y-auto animate-in slide-in-from-right duration-300">
        <Card className="h-full border-0 rounded-none shadow-none">
          <CardHeader className="border-b border-gray-200 px-6 py-4 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-gray-900">{title}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-600" />
            </Button>
          </CardHeader>
          <CardContent className="p-6 overflow-y-auto h-[calc(100%-73px)]">
            {children}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
