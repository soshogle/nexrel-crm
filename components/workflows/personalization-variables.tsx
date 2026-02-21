'use client';

import React, { useRef } from 'react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Braces } from 'lucide-react';

export interface PersonalizationVariable {
  token: string;
  label: string;
  group: string;
}

const CONTACT_VARS: PersonalizationVariable[] = [
  { token: '{{firstName}}', label: 'First Name', group: 'Contact' },
  { token: '{{lastName}}', label: 'Last Name', group: 'Contact' },
  { token: '{{fullName}}', label: 'Full Name', group: 'Contact' },
  { token: '{{email}}', label: 'Email', group: 'Contact' },
  { token: '{{phone}}', label: 'Phone', group: 'Contact' },
  { token: '{{company}}', label: 'Company', group: 'Contact' },
];

const BUSINESS_VARS: PersonalizationVariable[] = [
  { token: '{{businessName}}', label: 'Business Name', group: 'Business' },
  { token: '{{agentName}}', label: 'Agent / Sender Name', group: 'Business' },
  { token: '{{agentEmail}}', label: 'Agent Email', group: 'Business' },
  { token: '{{agentPhone}}', label: 'Agent Phone', group: 'Business' },
];

const CONTEXT_VARS: PersonalizationVariable[] = [
  { token: '{{notes}}', label: 'Notes', group: 'Context' },
  { token: '{{lastCallSummary}}', label: 'Last Call Summary', group: 'Context' },
  { token: '{{lastEmailSubject}}', label: 'Last Email Subject', group: 'Context' },
  { token: '{{todayDate}}', label: "Today's Date", group: 'Context' },
];

export const ALL_VARIABLES = [...CONTACT_VARS, ...BUSINESS_VARS, ...CONTEXT_VARS];

interface PersonalizationVariablesProps {
  /** The textarea ref to insert at cursor position. If not provided, calls onInsert callback. */
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  /** Optional input ref (e.g. for subject line). Insert goes to whichever field has focus. */
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Called with the inserted token so parent can update state (used when no ref has focus) */
  onInsert?: (token: string, cursorPosition?: number) => void;
  /** Which variable groups to show. Defaults to all. */
  groups?: ('Contact' | 'Business' | 'Context')[];
  /** Compact mode shows just the button, full mode shows inline badges */
  mode?: 'button' | 'inline';
}

export function PersonalizationVariables({
  textareaRef,
  inputRef,
  onInsert,
  groups,
  mode = 'inline',
}: PersonalizationVariablesProps) {
  const vars = groups
    ? ALL_VARIABLES.filter((v) => groups.includes(v.group as 'Contact' | 'Business' | 'Context'))
    : ALL_VARIABLES;

  const grouped = vars.reduce<Record<string, PersonalizationVariable[]>>((acc, v) => {
    (acc[v.group] ??= []).push(v);
    return acc;
  }, {});

  const insertIntoElement = (
    el: HTMLInputElement | HTMLTextAreaElement,
    token: string
  ) => {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    const newValue = before + token + after;
    const newCursor = start + token.length;

    const proto = el instanceof HTMLTextAreaElement
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    const nativeValueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    nativeValueSetter?.call(el, newValue);
    el.dispatchEvent(new Event('input', { bubbles: true }));

    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    });
  };

  const handleInsert = (token: string) => {
    // Insert into whichever field currently has focus (subject input or body textarea)
    const activeEl = document.activeElement;
    if (inputRef?.current && activeEl === inputRef.current) {
      insertIntoElement(inputRef.current, token);
      return;
    }
    if (textareaRef?.current && activeEl === textareaRef.current) {
      insertIntoElement(textareaRef.current, token);
      return;
    }
    // Fallback: use textarea if provided, else input, else callback
    if (textareaRef?.current) {
      insertIntoElement(textareaRef.current, token);
      return;
    }
    if (inputRef?.current) {
      insertIntoElement(inputRef.current, token);
      return;
    }
    onInsert?.(token);
  };

  const insertHint = inputRef && textareaRef
    ? 'Click in Subject or Body first, then select a variable'
    : inputRef
      ? 'Click in the field first, then select a variable'
      : textareaRef
        ? 'Click in the field first, then select a variable'
        : undefined;

  if (mode === 'button') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 border-purple-200 text-purple-700 hover:bg-purple-50"
            title={insertHint}
          >
            <Braces className="w-3 h-3" />
            Insert Variable
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-3">
            {Object.entries(grouped).map(([group, gVars]) => (
              <div key={group}>
                <p className="text-xs font-semibold text-gray-500 mb-1">{group}</p>
                <div className="flex flex-wrap gap-1">
                  {gVars.map((v) => (
                    <Badge
                      key={v.token}
                      variant="outline"
                      className="cursor-pointer text-xs hover:bg-purple-100 hover:border-purple-400 transition-colors"
                      onClick={() => handleInsert(v.token)}
                    >
                      {v.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  // Inline mode: show all variables as clickable badges
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Braces className="w-3 h-3" />
        <span>Click to insert:</span>
      </div>
      {Object.entries(grouped).map(([group, gVars]) => (
        <div key={group} className="flex flex-wrap gap-1 items-center">
          <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mr-1">{group}</span>
          {gVars.map((v) => (
            <Badge
              key={v.token}
              variant="outline"
              className="cursor-pointer text-[11px] py-0 px-1.5 hover:bg-purple-100 hover:border-purple-400 transition-colors"
              onClick={() => handleInsert(v.token)}
            >
              {v.label}
            </Badge>
          ))}
        </div>
      ))}
    </div>
  );
}
