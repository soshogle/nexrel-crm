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

  return (
    <div className="space-y-0 bg-white text-gray-900" style={{ fontFamily: globalStyles?.fonts?.body || 'sans-serif' }}>
      {components.map((comp) => {
        if (comp.type === 'Hero') {
          const img = comp.props?.imageUrl || comp.props?.image;
          return (
            <section key={comp.id} className="relative min-h-[300px] flex flex-col justify-center items-center text-center p-8 bg-gray-100">
              {img && (
                <div className="absolute inset-0 opacity-30">
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="relative z-10 max-w-2xl">
                <h1 className="text-3xl font-bold mb-4">{comp.props?.title || 'Hero'}</h1>
                <p className="text-lg text-gray-600 mb-6">{comp.props?.subtitle}</p>
                {comp.props?.ctaText && (
                  <a
                    href={comp.props?.ctaLink || '#'}
                    className="inline-block px-6 py-2 rounded text-white font-medium"
                    style={{ backgroundColor: primary }}
                  >
                    {comp.props.ctaText}
                  </a>
                )}
              </div>
            </section>
          );
        }
        if (comp.type === 'AboutSection') {
          return (
            <section key={comp.id} className="p-8 max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold mb-4">{comp.props?.title || 'About'}</h2>
              <p className="text-gray-600 whitespace-pre-wrap">{comp.props?.description}</p>
              {comp.props?.ctaText && (
                <a
                  href={comp.props?.ctaLink || '#'}
                  className="inline-block mt-4 px-4 py-2 border rounded font-medium hover:bg-gray-50"
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
          return (
            <section key={comp.id} className="p-8">
              <img src={img} alt={comp.props?.alt || comp.props?.title} className="max-w-full h-auto rounded-lg" />
              {comp.props?.title && <p className="mt-2 text-sm text-gray-500">{comp.props.title}</p>}
            </section>
          );
        }
        if (comp.type === 'ContactForm') {
          return (
            <section key={comp.id} className="p-8 bg-gray-50">
              <h2 className="text-2xl font-bold mb-4">Contact Us</h2>
              <div className="max-w-md space-y-4">
                <input
                  type="text"
                  placeholder="Name"
                  className="w-full px-4 py-2 border rounded"
                  disabled
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="w-full px-4 py-2 border rounded"
                  disabled
                />
                <textarea
                  placeholder="Message"
                  rows={4}
                  className="w-full px-4 py-2 border rounded"
                  disabled
                />
                <button
                  type="button"
                  className="px-6 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: primary }}
                  disabled
                >
                  Send
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500">Form preview — will be functional when deployed</p>
            </section>
          );
        }
        if (comp.type === 'CTASection') {
          return (
            <section key={comp.id} className="p-8 text-center bg-gray-100">
              <h2 className="text-2xl font-bold mb-2">{comp.props?.title}</h2>
              <p className="text-gray-600 mb-4">{comp.props?.description}</p>
              {comp.props?.ctaText && (
                <a
                  href={comp.props?.ctaLink || '#'}
                  className="inline-block px-6 py-2 rounded text-white font-medium"
                  style={{ backgroundColor: primary }}
                >
                  {comp.props.ctaText}
                </a>
              )}
            </section>
          );
        }
        return (
          <section key={comp.id} className="p-8 border-b">
            <p className="text-sm text-gray-500">{comp.type}</p>
            <pre className="text-xs overflow-auto max-h-24">{JSON.stringify(comp.props, null, 2)}</pre>
          </section>
        );
      })}
    </div>
  );
}
