/**
 * Forms Builder with Toolbox/Canvas Tabs
 * Exact match to image design
 */

'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { GripVertical, FileText, CheckSquare, List, Calendar, PenTool, Eye } from 'lucide-react';

export function FormsBuilderTabs() {
  const [activeTab, setActiveTab] = useState<'toolbox' | 'drag' | 'canvas'>('toolbox');

  const formElements = [
    { type: 'Text Input', icon: FileText },
    { type: 'Checkbox Group', icon: CheckSquare },
    { type: 'Dropdown Menu', icon: List },
    { type: 'Date Picker', icon: Calendar },
    { type: 'Signature Field', icon: PenTool },
  ];

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
      <TabsList className="grid w-full grid-cols-3 h-8">
        <TabsTrigger
          value="toolbox"
          className={`text-xs ${
            activeTab === 'toolbox' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'
          }`}
        >
          Toolbox
        </TabsTrigger>
        <TabsTrigger
          value="drag"
          className={`text-xs ${
            activeTab === 'drag' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'
          }`}
        >
          Drag and Drop
        </TabsTrigger>
        <TabsTrigger
          value="canvas"
          className={`text-xs ${
            activeTab === 'canvas' ? 'bg-purple-600 text-white' : 'bg-white text-gray-600'
          }`}
        >
          Canvas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="toolbox" className="mt-3">
        <div className="space-y-2">
          {formElements.map((element, idx) => {
            const Icon = element.icon;
            return (
              <div
                key={idx}
                className="flex items-center gap-2 p-2 border border-gray-200 rounded cursor-move hover:bg-gray-50"
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                <Icon className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-900">{element.type}</span>
              </div>
            );
          })}
        </div>
      </TabsContent>

      <TabsContent value="drag" className="mt-3">
        <div className="text-center py-8 text-gray-400 text-xs">
          Drag elements here
        </div>
      </TabsContent>

      <TabsContent value="canvas" className="mt-3">
        <div className="border border-gray-200 rounded p-4 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-900">New Patient Registration</h3>
            <Button size="sm" className="h-7 text-xs bg-purple-600 hover:bg-purple-700">
              <Eye className="w-3 h-3 mr-1" />
              Preview Form
            </Button>
          </div>

          {/* Form Preview */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Personal Info</label>
              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full h-8 text-xs border border-gray-300 rounded px-2"
                  disabled
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full h-8 text-xs border border-gray-300 rounded px-2"
                  disabled
                />
                <input
                  type="tel"
                  placeholder="Phone"
                  className="w-full h-8 text-xs border border-gray-300 rounded px-2"
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Medical History</label>
              <div className="space-y-1">
                {['Crosnical', 'Expention', 'Medical History', 'Other'].map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-xs text-gray-700">
                    <input type="checkbox" disabled className="w-3 h-3" />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-700 mb-1 block">Insurance</label>
              <select
                disabled
                className="w-full h-8 text-xs border border-gray-300 rounded px-2"
              >
                <option>Choose Insurance</option>
              </select>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
