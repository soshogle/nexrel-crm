'use client';

/**
 * Renders website structure for local preview when no Vercel deployment exists
 */

interface Component {
  id: string;
  type: string;
  props: Record<string, any>;
}

export function StructurePreview({
  components,
  globalStyles,
}: {
  components: Component[];
  globalStyles?: { colors?: Record<string, string>; fonts?: Record<string, string> };
}) {
  const primary = globalStyles?.colors?.primary || '#3B82F6';
  const accent = globalStyles?.colors?.accent || primary;
  const bg = globalStyles?.colors?.background || '#FFFFFF';
  const text = globalStyles?.colors?.text || '#1F2937';
  const textMuted = globalStyles?.colors?.textMuted || '#6B7280';
  const isDark = bg && (bg.toLowerCase().startsWith('#0') || bg.includes('0f0f0f') || bg.includes('1a1a1a'));

  return (
    <div
      className="space-y-0"
      style={{
        fontFamily: globalStyles?.fonts?.body || 'sans-serif',
        backgroundColor: bg,
        color: text,
      }}
    >
      {components.map((comp) => {
        if (comp.type === 'Hero') {
          const img = comp.props?.imageUrl || comp.props?.image;
          return (
            <section
              key={comp.id}
              className="relative min-h-[300px] flex flex-col justify-center items-center text-center p-8"
              style={{ backgroundColor: globalStyles?.colors?.primary || '#1a1a1a' }}
            >
              {img && (
                <div className="absolute inset-0 opacity-20">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-3xl font-bold mb-4" style={{ color: text }}>
                  {comp.props?.title || 'Hero'}
                </h1>
                <p className="text-lg mb-6" style={{ color: textMuted }}>
                  {comp.props?.subtitle}
                </p>
                <div className="flex flex-wrap gap-3 justify-center">
                  {comp.props?.ctaText && (
                    <a
                      href={comp.props?.ctaLink || '#'}
                      className="inline-block px-6 py-2 rounded text-white font-medium"
                      style={{ backgroundColor: accent }}
                    >
                      {comp.props.ctaText}
                    </a>
                  )}
                  {comp.props?.ctaSecondaryText && (
                    <a
                      href={comp.props?.ctaSecondaryLink || '#'}
                      className="inline-block px-6 py-2 rounded border font-medium"
                      style={{ borderColor: accent, color: accent }}
                    >
                      {comp.props.ctaSecondaryText}
                    </a>
                  )}
                </div>
              </div>
            </section>
          );
        }
        if (comp.type === 'AboutSection') {
          return (
            <section key={comp.id} className="p-8 max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">{comp.props?.title || 'About'}</h2>
              <p className="whitespace-pre-wrap" style={{ color: textMuted }}>
                {comp.props?.description}
              </p>
              {comp.props?.ctaText && (
                <a
                  href={comp.props?.ctaLink || '#'}
                  className="inline-block mt-4 px-4 py-2 border rounded font-medium"
                  style={{ borderColor: accent, color: accent }}
                >
                  {comp.props.ctaText}
                </a>
              )}
            </section>
          );
        }
        if (comp.type === 'ImageSection') {
          const img = comp.props?.imageUrl || comp.props?.image;
          if (!img) return null;
          const layout = comp.props?.layout || 'default';
          const isImageLeft = layout === 'image-left';
          return (
            <section key={comp.id} className="p-8">
              <div
                className={`flex flex-col gap-6 max-w-4xl mx-auto ${isImageLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
              >
                <img
                  src={img}
                  alt={comp.props?.alt || comp.props?.title}
                  className="flex-1 max-w-md w-full h-auto object-cover rounded-lg"
                />
                <div className="flex-1 flex flex-col justify-center">
                  {comp.props?.title && (
                    <h2 className="text-2xl font-bold mb-2">{comp.props.title}</h2>
                  )}
                  {comp.props?.description && (
                    <p style={{ color: textMuted }}>{comp.props.description}</p>
                  )}
                </div>
              </div>
            </section>
          );
        }
        if (comp.type === 'ContactForm') {
          return (
            <section
              key={comp.id}
              className="p-8"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#f9fafb' }}
            >
              <h2 className="text-2xl font-bold mb-4">{comp.props?.title || 'Contact Us'}</h2>
              <div className="max-w-md space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full px-4 py-2 border rounded bg-transparent"
                  disabled
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-2 border rounded bg-transparent"
                  disabled
                />
                <textarea
                  placeholder="Message"
                  rows={4}
                  className="w-full px-4 py-2 border rounded bg-transparent"
                  disabled
                />
                <button
                  type="button"
                  className="px-6 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: accent }}
                  disabled
                >
                  Send
                </button>
              </div>
              <p className="mt-2 text-xs" style={{ color: textMuted }}>
                Form preview — will be functional when deployed
              </p>
            </section>
          );
        }
        if (comp.type === 'CTASection') {
          const isPromo = comp.props?.variant === 'promo';
          return (
            <section
              key={comp.id}
              className={`p-8 text-center ${isPromo ? 'py-6' : ''}`}
              style={{
                backgroundColor: isPromo ? accent : isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6',
                color: isPromo ? '#fff' : text,
              }}
            >
              <h2 className="text-2xl font-bold mb-2">{comp.props?.title}</h2>
              <p className="mb-4" style={{ color: isPromo ? 'rgba(255,255,255,0.9)' : textMuted }}>
                {comp.props?.description}
              </p>
              {comp.props?.ctaText && (
                <a
                  href={comp.props?.ctaLink || '#'}
                  className="inline-block px-6 py-2 rounded font-medium"
                  style={{
                    backgroundColor: isPromo ? '#fff' : accent,
                    color: isPromo ? accent : '#fff',
                  }}
                >
                  {comp.props.ctaText}
                </a>
              )}
            </section>
          );
        }
        if (comp.type === 'ProductsGrid') {
          const products = comp.props?.products || [];
          return (
            <section key={comp.id} className="p-8">
              {comp.props?.title && (
                <h2 className="text-2xl font-bold mb-6 text-center">{comp.props.title}</h2>
              )}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {products.slice(0, 6).map((p: any, i: number) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    {p.image && (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-full h-40 object-cover"
                      />
                    )}
                    <div className="p-3">
                      <h3 className="font-semibold">{p.name}</h3>
                      {p.description && (
                        <p className="text-sm mt-1" style={{ color: textMuted }}>
                          {p.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {comp.props?.ctaText && (
                <div className="text-center mt-6">
                  <a
                    href={comp.props?.ctaLink || '#'}
                    className="inline-block px-6 py-2 rounded font-medium"
                    style={{ backgroundColor: accent, color: '#fff' }}
                  >
                    {comp.props.ctaText}
                  </a>
                </div>
              )}
            </section>
          );
        }
        if (comp.type === 'ServicesGrid') {
          const services = comp.props?.services || [];
          return (
            <section key={comp.id} className="p-8">
              {comp.props?.title && (
                <h2 className="text-2xl font-bold mb-6 text-center">{comp.props.title}</h2>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                {services.map((s: any, i: number) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    {s.image && (
                      <img
                        src={s.image}
                        alt={s.name}
                        className="w-full h-48 object-cover"
                      />
                    )}
                    <div className="p-4">
                      <h3 className="text-xl font-semibold mb-2">{s.name}</h3>
                      <p style={{ color: textMuted }}>{s.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              {comp.props?.ctaText && (
                <div className="text-center mt-6">
                  <a
                    href={comp.props?.ctaLink || '#'}
                    className="inline-block px-6 py-2 rounded font-medium"
                    style={{ backgroundColor: accent, color: '#fff' }}
                  >
                    {comp.props.ctaText}
                  </a>
                </div>
              )}
            </section>
          );
        }
        return (
          <section key={comp.id} className="p-8 border-b" style={{ borderColor: isDark ? 'rgba(255,255,255,0.1)' : undefined }}>
            <p className="text-sm" style={{ color: textMuted }}>{comp.type}</p>
            <pre className="text-xs overflow-auto max-h-24" style={{ color: textMuted }}>{JSON.stringify(comp.props, null, 2)}</pre>
          </section>
        );
      })}
    </div>
  );
}
