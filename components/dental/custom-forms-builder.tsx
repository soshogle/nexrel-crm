/**
 * Custom Forms Builder Component
 * Exact match to image - Toolbox/Canvas tabs with form preview
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GripVertical, FileText, CheckSquare, ChevronDown, Calendar, PenTool } from 'lucide-react';

export function CustomFormsBuilder() {
  const [activeTab, setActiveTab] = useState<'toolbox' | 'drag' | 'canvas'>('toolbox');

  const formElements = [
    { type: 'Text Input', icon: FileText },
    { type: 'Checkbox Group', icon: CheckSquare },
    { type: 'Dropdown Menu', icon: ChevronDown },
    { type: 'Date Picker', icon: Calendar },
    { type: 'Signature Field', icon: PenTool },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-8">
        <TabsTrigger 
          value="toolbox" 
          className={`text-xs ${activeTab === 'toolbox' ? 'bg-purple-600 text-white' : ''}`}
        >
          Toolbox
        </TabsTrigger>
        <TabsTrigger 
          value="drag" 
          className={`text-xs ${activeTab === 'drag' ? 'bg-purple-600 text-white' : ''}`}
        >
          Drag and Drop
        </TabsTrigger>
        <TabsTrigger 
          value="canvas" 
          className={`text-xs ${activeTab === 'canvas' ? 'bg-purple-600 text-white' : ''}`}
        >
          Canvas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="toolbox" className="mt-3">
        <div className="grid grid-cols-2 gap-3">
          {/* Left: Toolbox */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-700 mb-2">Form Elements</h4>
            {formElements.map((element, idx) => {
              const IconComponent = element.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50"
                >
                  <GripVertical className="w-4 h-4 text-gray-400" />
                  <IconComponent className="w-4 h-4 text-gray-600" />
                  <span className="text-xs text-gray-700">{element.type}</span>
                </div>
              );
            })}
          </div>

          {/* Right: Canvas Preview */}
          <div className="border border-gray-200 rounded p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-semibold text-gray-700">New Patient Registration</h4>
              <Button size="sm" className="h-6 text-xs bg-purple-600 hover:bg-purple-700">
                Preview Form
              </Button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Personal Info</label>
                <Input placeholder="Name" className="h-7 text-xs mb-2" />
                <Input placeholder="Email" className="h-7 text-xs mb-2" />
                <Input placeholder="Phone" className="h-7 text-xs" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Medical History</label>
                <div className="space-y-1">
                  {['Crosnical', 'Expention', 'Medical History', 'Other'].map((item) => (
                    <label key={item} className="flex items-center gap-2 text-xs">
                      <input type="checkbox" className="w-3 h-3" />
                      <span>{item}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">Insurance</label>
                <select className="w-full h-7 text-xs border border-gray-300 rounded px-2">
                  <option>Choose Insurance</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="drag" className="mt-3">
        <div className="text-center py-8 text-gray-400 text-xs">Drag and Drop Interface</div>
      </TabsContent>

      <TabsContent value="canvas" className="mt-3">
        <div className="text-center py-8 text-gray-400 text-xs">Canvas View</div>
      </TabsContent>
    </Tabs>
  );
}
