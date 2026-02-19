'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronDown, ChevronRight, Check, GripVertical, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
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

const DEFAULT_PAGE_LABELS: Record<string, string> = {
  properties: 'Properties',
  forSale: 'For Sale',
  forLease: 'For Lease',
  selling: 'Selling',
  buying: 'Buying',
  renting: 'Renting',
  prestige: 'Prestige Properties',
  secretProperties: 'Secret Properties',
};

const PAGE_LABEL_KEYS = Object.keys(DEFAULT_PAGE_LABELS) as (keyof typeof DEFAULT_PAGE_LABELS)[];

const DEFAULT_NAV = {
  navItems: [
    { label: 'Selling', href: '/selling', children: [{ label: 'For Sale', href: '/for-sale' }, { label: 'Sold Properties', href: '/sold' }, { label: 'Property Concierge', href: '/property-concierge' }, { label: 'Market Appraisal', href: '/market-appraisal' }] },
    { label: 'Buying', href: '/buying', children: [{ label: 'For Sale', href: '/for-sale' }, { label: 'Prestige Properties', href: '/prestige' }, { label: 'Secret Properties', href: '/secret-properties' }] },
    { label: 'Renting', href: '/renting', children: [{ label: 'For Lease', href: '/for-lease' }] },
    { label: 'About', href: '/about', children: undefined as { label: string; href: string }[] | undefined },
    { label: 'News & Media', href: '/news', children: [{ label: 'Blog', href: '/blog' }] },
  ],
  topLinks: [
    { label: 'Properties', href: '/properties' },
    { label: 'Get A Quote', href: '/get-a-quote' },
    { label: 'Contact', href: '/contact' },
    { label: 'Secret Properties', href: '/secret-properties' },
  ],
  footerLinks: [
    { label: 'Properties', href: '/properties' },
    { label: 'Buying', href: '/buying' },
    { label: 'Selling', href: '/selling' },
    { label: 'Renting', href: '/renting' },
    { label: 'About', href: '/about' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: '/contact' },
  ],
};

type NavItem = { label: string; href: string; children?: { label: string; href: string }[] };
type NavConfig = { navItems: NavItem[]; topLinks: { label: string; href: string }[]; footerLinks: { label: string; href: string }[] };

interface MenuPagesEditorProps {
  websiteId: string;
  navConfig: NavConfig | Record<string, unknown> | null;
  pageLabels: Record<string, string> | null;
  onSave: (updates: { navConfig?: NavConfig; pageLabels?: Record<string, string> }) => Promise<void>;
  onUpdateLocal: (updates: { navConfig?: NavConfig; pageLabels?: Record<string, string> }) => void;
}

function SortableNavItem({
  item,
  index,
  onUpdate,
  onRemove,
  onUpdateChild,
  onRemoveChild,
  onReorderChildren,
  onAddChild,
}: {
  item: NavItem;
  index: number;
  onUpdate: (field: 'label' | 'href', value: string) => void;
  onRemove: () => void;
  onUpdateChild: (childIndex: number, field: 'label' | 'href', value: string) => void;
  onRemoveChild: (childIndex: number) => void;
  onReorderChildren: (from: number, to: number) => void;
  onAddChild: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `nav-${index}`,
  });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const childIds = (item.children ?? []).map((_, j) => `nav-${index}-child-${j}`);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleChildDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = childIds.indexOf(String(active.id));
    const newIdx = childIds.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return;
    onReorderChildren(oldIdx, newIdx);
  };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-start group">
      <button
        type="button"
        className="mt-2 p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="flex-1 border-l-2 border-muted pl-3 space-y-2">
        <div className="flex gap-2 items-center">
          <Input
            value={item.label}
            onChange={(e) => onUpdate('label', e.target.value)}
            placeholder="Label"
            className="h-8 text-sm flex-1"
          />
          <Input
            value={item.href}
            onChange={(e) => onUpdate('href', e.target.value)}
            placeholder="/path"
            className="h-8 text-sm w-28"
          />
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100" onClick={onRemove} aria-label="Remove">
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
        <div className="space-y-1">
          {item.children && item.children.length > 0 && (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleChildDragEnd}>
              <SortableContext items={childIds} strategy={verticalListSortingStrategy}>
                {item.children.map((child, j) => (
                  <SortableChildLink
                    key={j}
                    id={childIds[j]}
                    child={child}
                    onUpdate={(f, v) => onUpdateChild(j, f, v)}
                    onRemove={() => onRemoveChild(j)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={onAddChild}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add sub-link
          </Button>
        </div>
      </div>
    </div>
  );
}

function SortableChildLink({
  id,
  child,
  onUpdate,
  onRemove,
}: {
  id: string;
  child: { label: string; href: string };
  onUpdate: (field: 'label' | 'href', value: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-center pl-4 group/child">
      <button
        type="button"
        className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <Input value={child.label} onChange={(e) => onUpdate('label', e.target.value)} placeholder="Sub-label" className="h-7 text-xs flex-1" />
      <Input value={child.href} onChange={(e) => onUpdate('href', e.target.value)} placeholder="/path" className="h-7 text-xs w-24" />
      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 opacity-0 group-hover/child:opacity-100" onClick={onRemove} aria-label="Remove">
        <Trash2 className="h-3.5 w-3.5 text-destructive" />
      </Button>
    </div>
  );
}

function SortableLink({
  link,
  id,
  onUpdate,
  onRemove,
}: {
  link: { label: string; href: string };
  id: string;
  onUpdate: (field: 'label' | 'href', value: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div ref={setNodeRef} style={style} className="flex gap-2 items-center group">
      <button
        type="button"
        className="p-1 rounded hover:bg-muted cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <Input value={link.label} onChange={(e) => onUpdate('label', e.target.value)} className="h-8 text-sm flex-1" />
      <Input value={link.href} onChange={(e) => onUpdate('href', e.target.value)} className="h-8 text-sm flex-1" />
      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 opacity-0 group-hover:opacity-100" onClick={onRemove} aria-label="Remove">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}

export function MenuPagesEditor({
  websiteId,
  navConfig,
  pageLabels,
  onSave,
  onUpdateLocal,
}: MenuPagesEditorProps) {
  const [labels, setLabels] = useState<Record<string, string>>({ ...DEFAULT_PAGE_LABELS });
  const [nav, setNav] = useState<NavConfig>(DEFAULT_NAV);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [navOpen, setNavOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    if (pageLabels && Object.keys(pageLabels).length > 0) {
      setLabels({ ...DEFAULT_PAGE_LABELS, ...pageLabels });
    }
  }, [pageLabels]);

  useEffect(() => {
    const stored = navConfig as NavConfig | null;
    if (stored?.navItems?.length) {
      setNav((prev) => ({
        navItems: stored.navItems ?? prev.navItems,
        topLinks: stored.topLinks ?? prev.topLinks,
        footerLinks: stored.footerLinks ?? prev.footerLinks,
      }));
    }
  }, [navConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave({ navConfig: nav, pageLabels: labels });
      onUpdateLocal({ navConfig: nav, pageLabels: labels });
      setSaved(true);
      toast.success('Menu & page labels saved');
      setTimeout(() => setSaved(false), 3000);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const updateLabel = (key: string, value: string) => {
    setLabels((l) => ({ ...l, [key]: value }));
  };

  const handleNavItemsDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = nav.navItems.findIndex((_, i) => `nav-${i}` === active.id);
    const newIndex = nav.navItems.findIndex((_, i) => `nav-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    setNav((n) => ({ ...n, navItems: arrayMove(n.navItems, oldIndex, newIndex) }));
  };

  const handleTopLinksDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = nav.topLinks.findIndex((_, i) => `top-${i}` === active.id);
    const newIndex = nav.topLinks.findIndex((_, i) => `top-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    setNav((n) => ({ ...n, topLinks: arrayMove(n.topLinks, oldIndex, newIndex) }));
  };

  const handleFooterLinksDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = nav.footerLinks.findIndex((_, i) => `footer-${i}` === active.id);
    const newIndex = nav.footerLinks.findIndex((_, i) => `footer-${i}` === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
    setNav((n) => ({ ...n, footerLinks: arrayMove(n.footerLinks, oldIndex, newIndex) }));
  };

  const updateNavItem = (index: number, field: 'label' | 'href', value: string) => {
    setNav((n) => {
      const arr = [...n.navItems];
      arr[index] = { ...arr[index], [field]: value };
      return { ...n, navItems: arr };
    });
  };

  const updateNavItemChild = (parentIndex: number, childIndex: number, field: 'label' | 'href', value: string) => {
    setNav((n) => {
      const items = [...n.navItems];
      const parent = { ...items[parentIndex], children: [...(items[parentIndex].children ?? [])] };
      parent.children![childIndex] = { ...parent.children![childIndex], [field]: value };
      items[parentIndex] = parent;
      return { ...n, navItems: items };
    });
  };

  const removeNavItem = (index: number) => {
    setNav((n) => ({ ...n, navItems: n.navItems.filter((_, i) => i !== index) }));
  };

  const removeNavItemChild = (parentIndex: number, childIndex: number) => {
    setNav((n) => {
      const items = [...n.navItems];
      const parent = { ...items[parentIndex], children: (items[parentIndex].children ?? []).filter((_, j) => j !== childIndex) };
      items[parentIndex] = parent;
      return { ...n, navItems: items };
    });
  };

  const reorderNavItemChildren = (parentIndex: number, from: number, to: number) => {
    setNav((n) => {
      const items = [...n.navItems];
      const children = [...(items[parentIndex].children ?? [])];
      const [removed] = children.splice(from, 1);
      children.splice(to, 0, removed);
      items[parentIndex] = { ...items[parentIndex], children };
      return { ...n, navItems: items };
    });
  };

  const updateTopLink = (index: number, field: 'label' | 'href', value: string) => {
    setNav((n) => {
      const arr = [...n.topLinks];
      arr[index] = { ...arr[index], [field]: value };
      return { ...n, topLinks: arr };
    });
  };

  const removeTopLink = (index: number) => {
    setNav((n) => ({ ...n, topLinks: n.topLinks.filter((_, i) => i !== index) }));
  };

  const updateFooterLink = (index: number, field: 'label' | 'href', value: string) => {
    setNav((n) => {
      const arr = [...n.footerLinks];
      arr[index] = { ...arr[index], [field]: value };
      return { ...n, footerLinks: arr };
    });
  };

  const removeFooterLink = (index: number) => {
    setNav((n) => ({ ...n, footerLinks: n.footerLinks.filter((_, i) => i !== index) }));
  };

  const addNavItem = () => {
    setNav((n) => ({ ...n, navItems: [...n.navItems, { label: 'New', href: '/new', children: [] }] }));
  };

  const addNavItemChild = (parentIndex: number) => {
    setNav((n) => {
      const items = [...n.navItems];
      const parent = { ...items[parentIndex], children: [...(items[parentIndex].children ?? []), { label: 'New', href: '/new' }] };
      items[parentIndex] = parent;
      return { ...n, navItems: items };
    });
  };

  const addTopLink = () => {
    setNav((n) => ({ ...n, topLinks: [...n.topLinks, { label: 'New', href: '/new' }] }));
  };

  const addFooterLink = () => {
    setNav((n) => ({ ...n, footerLinks: [...n.footerLinks, { label: 'New', href: '/new' }] }));
  };

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Drag items to reorder. Edit labels and links. Changes appear on your live site within 30 seconds after Save.
      </p>

      <div className="space-y-3">
        <p className="text-sm font-medium">Page Labels</p>
        <div className="grid gap-2">
          {PAGE_LABEL_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-2">
              <Label className="text-xs w-32 shrink-0 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</Label>
              <Input
                value={labels[key] ?? ''}
                onChange={(e) => updateLabel(key, e.target.value)}
                placeholder={DEFAULT_PAGE_LABELS[key]}
                className="h-8 text-sm"
              />
            </div>
          ))}
        </div>
      </div>

      <Collapsible open={navOpen} onOpenChange={setNavOpen}>
        <CollapsibleTrigger asChild>
          <button type="button" className="flex items-center gap-2 text-sm font-medium hover:underline">
            {navOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Navigation Menu
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Main nav items — drag to reorder</p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addNavItem}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleNavItemsDragEnd}>
              <SortableContext items={nav.navItems.map((_, i) => `nav-${i}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {nav.navItems.map((item, i) => (
                    <SortableNavItem
                      key={i}
                      item={item}
                      index={i}
                      onUpdate={(f, v) => updateNavItem(i, f, v)}
                      onRemove={() => removeNavItem(i)}
                      onUpdateChild={(j, f, v) => updateNavItemChild(i, j, f, v)}
                      onRemoveChild={(j) => removeNavItemChild(i, j)}
                      onReorderChildren={reorderNavItemChildren.bind(null, i)}
                      onAddChild={() => addNavItemChild(i)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Top bar links — drag to reorder</p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addTopLink}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleTopLinksDragEnd}>
              <SortableContext items={nav.topLinks.map((_, i) => `top-${i}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {nav.topLinks.map((link, i) => (
                    <SortableLink
                      key={i}
                      id={`top-${i}`}
                      link={link}
                      onUpdate={(f, v) => updateTopLink(i, f, v)}
                      onRemove={() => removeTopLink(i)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Footer links — drag to reorder</p>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={addFooterLink}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Add
              </Button>
            </div>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleFooterLinksDragEnd}>
              <SortableContext items={nav.footerLinks.map((_, i) => `footer-${i}`)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {nav.footerLinks.map((link, i) => (
                    <SortableLink
                      key={i}
                      id={`footer-${i}`}
                      link={link}
                      onUpdate={(f, v) => updateFooterLink(i, f, v)}
                      onRemove={() => removeFooterLink(i)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button size="sm" onClick={handleSave} disabled={saving} className={saved ? 'bg-emerald-600 hover:bg-emerald-600' : ''}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <><Check className="h-4 w-4 mr-1" />Saved</> : 'Save Menu & Pages'}
      </Button>
    </div>
  );
}
