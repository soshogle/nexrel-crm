'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GripVertical, Trash2, ChevronUp, ChevronDown, Image as ImageIcon, Settings2, MessageSquare, Video } from 'lucide-react';
import { MediaPicker } from './media-picker';
import { SectionLayoutEditor } from './section-layout-editor';
import { PopupChatConfigEditor } from './popup-chat-config-editor';
import { VideoEmbedEditor } from './video-embed-editor';
import { ImageMotionConfigEditor } from './image-motion-config-editor';

interface Component {
  id: string;
  type: string;
  props: Record<string, any>;
  layout?: any;
}

interface SectionEditorProps {
  websiteId: string;
  pagePath: string;
  components: Component[];
  onReorder: (fromIndex: number, toIndex: number) => Promise<void>;
  onDelete: (sectionType: string) => Promise<void>;
  onUpdateImage: (sectionType: string, imageUrl: string, alt?: string) => Promise<void>;
  onUpdateLayout?: (sectionType: string, layout: any) => Promise<void>;
  onUpdateProps?: (sectionType: string, props: Record<string, any>) => Promise<void>;
  /** When true, only show reorder + delete (beginner-friendly). Hover to see "More" for image/layout. */
  compactMode?: boolean;
  /** Shown in empty state when build is in progress */
  isBuilding?: boolean;
  buildProgress?: number;
}

function SortableSectionCard({
  comp,
  index,
  total,
  onMoveUp,
  onMoveDown,
  onDelete,
  onImageClick,
  onLayoutClick,
  onConfigClick,
  hasImageProp,
  moveIndex,
  hasLayoutEditor,
  hasConfigEditor,
}: {
  comp: Component;
  index: number;
  total: number;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onImageClick: () => void;
  onLayoutClick?: () => void;
  onConfigClick?: () => void;
  hasImageProp: boolean;
  moveIndex: number | null;
  hasLayoutEditor: boolean;
  hasConfigEditor: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: comp.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card ref={setNodeRef} style={style} className="group">
      <CardHeader className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2" {...attributes} {...listeners}>
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
            <CardTitle className="text-sm font-medium">
              {comp.type} {comp.props?.title && `- ${comp.props.title}`}
            </CardTitle>
          </div>
          <div className={`flex items-center gap-1 transition-opacity ${hasLayoutEditor || hasConfigEditor ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
            {hasConfigEditor && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onConfigClick}
                className="h-8 w-8 p-0"
                title="Configure"
              >
                {(comp.type === 'VideoSection' || comp.props?.videoUrl) ? (
                  <Video className="h-4 w-4" />
                ) : (
                  <MessageSquare className="h-4 w-4" />
                )}
              </Button>
            )}
            {hasLayoutEditor && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onLayoutClick}
                className="h-8 w-8 p-0"
                title="Edit layout"
              >
                <Settings2 className="h-4 w-4" />
              </Button>
            )}
            {hasImageProp && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onImageClick}
                className="h-8 w-8 p-0"
              >
                <ImageIcon className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={onMoveUp}
              disabled={index === 0 || moveIndex !== null}
              className="h-8 w-8 p-0"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onMoveDown}
              disabled={index === total - 1 || moveIndex !== null}
              className="h-8 w-8 p-0"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onDelete}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      {comp.props?.title && (
        <CardContent className="py-2 px-4 text-sm text-muted-foreground">
          {comp.props.subtitle && <p>{comp.props.subtitle}</p>}
          {comp.props.ctaText && <p>CTA: {comp.props.ctaText}</p>}
        </CardContent>
      )}
    </Card>
  );
}

export function SectionEditor({
  websiteId,
  pagePath,
  components,
  onReorder,
  onDelete,
  onUpdateImage,
  onUpdateLayout,
  onUpdateProps,
  compactMode = false,
  isBuilding = false,
  buildProgress = 0,
}: SectionEditorProps) {
  const [moveIndex, setMoveIndex] = useState<number | null>(null);
  const [mediaPickerFor, setMediaPickerFor] = useState<string | null>(null);
  const [layoutEditorFor, setLayoutEditorFor] = useState<string | null>(null);
  const [configEditorFor, setConfigEditorFor] = useState<{ type: string; comp: Component } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = components.findIndex((c) => c.id === active.id);
    const newIndex = components.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    setMoveIndex(oldIndex);
    try {
      await onReorder(oldIndex, newIndex);
    } finally {
      setMoveIndex(null);
    }
  };

  const handleMoveUp = async (index: number) => {
    if (index <= 0) return;
    setMoveIndex(index);
    try {
      await onReorder(index, index - 1);
    } finally {
      setMoveIndex(null);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index >= components.length - 1) return;
    setMoveIndex(index);
    try {
      await onReorder(index, index + 1);
    } finally {
      setMoveIndex(null);
    }
  };

  const imageProps = ['imageUrl', 'backgroundImage', 'src'];

  if (components.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/30 p-12 text-center">
        <p className="text-muted-foreground mb-2">
          No sections yet. Your website structure will appear here once the build completes.
        </p>
        {isBuilding && (
          <div className="max-w-xs mx-auto mb-4">
            <div className="flex items-center justify-between mb-1.5 text-sm">
              <span className="text-muted-foreground">Building…</span>
              <span className="text-muted-foreground">{buildProgress}%</span>
            </div>
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${buildProgress}%` }}
              />
            </div>
          </div>
        )}
        <p className="text-sm text-muted-foreground">
          <strong>Tip:</strong> {isBuilding ? 'Scroll up to see the full progress bar, or ' : ''}Use the AI Chat tab to add sections{isBuilding ? '' : ', or wait for the build to finish'}.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={components.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {components.map((comp, index) => {
            const hasImageProp = imageProps.some((p) => comp.props?.[p]);
            const hasConfigEditor =
              !!onUpdateProps &&
              (comp.type === 'PopupSection' || comp.type === 'ChatWidget' || comp.type === 'VideoSection' || comp.props?.videoUrl ||
                (hasImageProp && comp.props?.imageUrl));
            return (
              <SortableSectionCard
                key={comp.id}
                comp={comp}
                index={index}
                total={components.length}
                onMoveUp={() => handleMoveUp(index)}
                onMoveDown={() => handleMoveDown(index)}
                onDelete={() => onDelete(comp.type)}
                onImageClick={() => setMediaPickerFor(comp.type)}
                onLayoutClick={onUpdateLayout ? () => setLayoutEditorFor(comp.type) : undefined}
                onConfigClick={() => setConfigEditorFor({ type: comp.type, comp })}
                hasImageProp={!!hasImageProp}
                moveIndex={moveIndex}
                hasLayoutEditor={!compactMode && !!onUpdateLayout}
                hasConfigEditor={!compactMode && hasConfigEditor}
              />
            );
          })}
        </SortableContext>
      </DndContext>

      {layoutEditorFor && onUpdateLayout && (
        <SectionLayoutEditor
          sectionType={layoutEditorFor}
          sectionTitle={components.find((c) => c.type === layoutEditorFor)?.props?.title}
          layout={components.find((c) => c.type === layoutEditorFor)?.layout}
          onSave={async (layout) => {
            await onUpdateLayout(layoutEditorFor, layout);
            setLayoutEditorFor(null);
          }}
        />
      )}

      {configEditorFor && onUpdateProps && (
        <>
          {(configEditorFor.type === 'PopupSection' || configEditorFor.type === 'ChatWidget') && (
            <PopupChatConfigEditor
              sectionType={configEditorFor.type as 'PopupSection' | 'ChatWidget'}
              comp={configEditorFor.comp}
              onSave={async (props) => {
                await onUpdateProps(configEditorFor.type, props);
                setConfigEditorFor(null);
              }}
              onClose={() => setConfigEditorFor(null)}
            />
          )}
          {(configEditorFor.type === 'VideoSection' || configEditorFor.comp.props?.videoUrl) && configEditorFor.type !== 'PopupSection' && configEditorFor.type !== 'ChatWidget' && (
            <VideoEmbedEditor
              sectionType={configEditorFor.type}
              comp={configEditorFor.comp}
              onSave={async (props) => {
                await onUpdateProps(configEditorFor.type, props);
                setConfigEditorFor(null);
              }}
              onClose={() => setConfigEditorFor(null)}
            />
          )}
          {configEditorFor.comp.props?.imageUrl && configEditorFor.type !== 'PopupSection' && configEditorFor.type !== 'ChatWidget' && configEditorFor.type !== 'VideoSection' && !configEditorFor.comp.props?.videoUrl && (
            <ImageMotionConfigEditor
              sectionType={configEditorFor.type}
              comp={configEditorFor.comp}
              onSave={async (props) => {
                await onUpdateProps(configEditorFor.type, props);
                setConfigEditorFor(null);
              }}
              onClose={() => setConfigEditorFor(null)}
            />
          )}
        </>
      )}

      {mediaPickerFor && (
        <MediaPicker
          websiteId={websiteId}
          open={!!mediaPickerFor}
          onClose={() => setMediaPickerFor(null)}
          onSelect={async (url, alt) => {
            await onUpdateImage(mediaPickerFor!, url, alt);
            setMediaPickerFor(null);
          }}
          type="IMAGE"
        />
      )}
    </div>
  );
}
