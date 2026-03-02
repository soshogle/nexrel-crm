/**
 * Redesigned Form Responses Component
 * Exact match to image - table with Date, Patient Name, Form Title, Submission Date, Time
 */

'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface FormResponse {
  date: string;
  patientName: string;
  formTitle: string;
  submissionDate: string;
  time: string;
}

interface RedesignedFormResponsesProps {
  responses?: FormResponse[];
}

export function RedesignedFormResponses({ responses }: RedesignedFormResponsesProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('date');
  
  const allResponses = responses && responses.length > 0 ? responses : [];
  
  // Filter responses based on search
  const displayResponses = allResponses.filter((response) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      response.patientName.toLowerCase().includes(query) ||
      response.formTitle.toLowerCase().includes(query) ||
      response.date.includes(query)
    );
  });

  return (
    <div className="space-y-3">
      {/* Search and Filters */}
      <div className="flex items-center gap-2">
        <Input 
          placeholder="Search..." 
          className="h-7 text-xs border border-gray-300 flex-1" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-7 text-xs w-24 border border-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">By Date</SelectItem>
            <SelectItem value="form">Form Type</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="space-y-1">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-700 border-b border-gray-200 pb-1">
          <div className="col-span-1"></div>
          <div className="col-span-2">Date</div>
          <div className="col-span-3">Patient Name</div>
          <div className="col-span-3">Form Title</div>
          <div className="col-span-2">Submission Date</div>
          <div className="col-span-1">Time</div>
        </div>

        {/* Table Rows */}
        {displayResponses.length === 0 && (
          <div className="text-xs text-gray-500 py-3">
            No form responses yet
          </div>
        )}
        {displayResponses.slice(0, 3).map((response, idx) => (
          <div key={idx} className="grid grid-cols-12 gap-2 items-center text-xs border-b border-gray-100 pb-1">
            <div className="col-span-1">
              <Checkbox className="w-3 h-3" />
            </div>
            <div className="col-span-2 text-gray-600">{response.date}</div>
            <div className="col-span-3 font-medium text-gray-900">{response.patientName}</div>
            <div className="col-span-3 text-gray-600">{response.formTitle}</div>
            <div className="col-span-2 text-gray-600">{response.submissionDate}</div>
            <div className="col-span-1 text-gray-600">{response.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
