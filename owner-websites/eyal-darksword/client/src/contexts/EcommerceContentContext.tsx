import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";

export interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
}

export interface EcommerceContent {
  products: unknown[];
  pages: PageData[];
  videos: { url: string; title?: string }[];
  policies: Record<string, { title: string; slug: string; content: string }>;
}

const EcommerceContentContext = createContext<{
  content: EcommerceContent | null;
  loading: boolean;
  getPageBySlug: (slug: string) => PageData | undefined;
} | null>(null);

export function EcommerceContentProvider({ children }: { children: ReactNode }) {
  const [content, setContent] = useState<EcommerceContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ecommerce-content")
      .then((r) => r.json())
      .then((data) => {
        if (data.pages && Array.isArray(data.pages) && data.pages.length > 0) {
          setContent({
            products: data.products ?? [],
            pages: data.pages,
            videos: data.videos ?? [],
            policies: data.policies ?? {},
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getPageBySlug = useMemo(() => {
    return (slug: string) => content?.pages?.find((p) => p.slug === slug);
  }, [content]);

  const value = useMemo(
    () => ({ content, loading, getPageBySlug }),
    [content, loading, getPageBySlug]
  );

  return (
    <EcommerceContentContext.Provider value={value}>
      {children}
    </EcommerceContentContext.Provider>
  );
}

export function useEcommerceContent() {
  const ctx = useContext(EcommerceContentContext);
  return ctx;
}
