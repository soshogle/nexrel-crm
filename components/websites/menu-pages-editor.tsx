'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ChevronDown, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

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
  const [navOpen, setNavOpen] = useState(false);

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

  const updateNavItem = (section: 'navItems' | 'topLinks' | 'footerLinks', index: number, field: 'label' | 'href', value: string) => {
    setNav((n) => {
      const arr = [...(n[section] as { label: string; href: string }[])];
      arr[index] = { ...arr[index], [field]: value };
      return { ...n, [section]: arr };
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

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Customize menu labels and page titles. Changes appear on your live site within 30 seconds after Publish.
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
          <button
            type="button"
            className="flex items-center gap-2 text-sm font-medium hover:underline"
          >
            {navOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            Navigation Menu
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pt-3 space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Main nav items (dropdown labels)</p>
            {nav.navItems.map((item, i) => (
              <div key={i} className="pl-2 border-l-2 border-muted space-y-1">
                <div className="flex gap-2">
                  <Input
                    value={item.label}
                    onChange={(e) => updateNavItem('navItems', i, 'label', e.target.value)}
                    placeholder="Label"
                    className="h-8 text-sm flex-1"
                  />
                  <Input
                    value={item.href}
                    onChange={(e) => updateNavItem('navItems', i, 'href', e.target.value)}
                    placeholder="/path"
                    className="h-8 text-sm w-32"
                  />
                </div>
                {item.children?.map((child, j) => (
                  <div key={j} className="flex gap-2 pl-4">
                    <Input
                      value={child.label}
                      onChange={(e) => updateNavItemChild(i, j, 'label', e.target.value)}
                      placeholder="Sub-label"
                      className="h-7 text-xs flex-1"
                    />
                    <Input
                      value={child.href}
                      onChange={(e) => updateNavItemChild(i, j, 'href', e.target.value)}
                      placeholder="/path"
                      className="h-7 text-xs w-28"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Top bar links</p>
            <div className="grid grid-cols-2 gap-2">
              {nav.topLinks.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={link.label}
                    onChange={(e) => updateNavItem('topLinks', i, 'label', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    value={link.href}
                    onChange={(e) => updateNavItem('topLinks', i, 'href', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Footer links</p>
            <div className="grid grid-cols-2 gap-2">
              {nav.footerLinks.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={link.label}
                    onChange={(e) => updateNavItem('footerLinks', i, 'label', e.target.value)}
                    className="h-8 text-sm"
                  />
                  <Input
                    value={link.href}
                    onChange={(e) => updateNavItem('footerLinks', i, 'href', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Button
        size="sm"
        onClick={handleSave}
        disabled={saving}
        className={saved ? 'bg-emerald-600 hover:bg-emerald-600' : ''}
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <>
            <Check className="h-4 w-4 mr-1" />
            Saved
          </>
        ) : (
          'Save Menu & Pages'
        )}
      </Button>
    </div>
  );
}
