"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";

export default function ViralMarketingPage() {
  const [Component, setComponent] = useState<any>(null);

  useEffect(() => {
    import("@/components/marketing/viral-page").then((mod) => {
      setComponent(() => mod.ViralPage);
    });
  }, []);

  if (!Component) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50/50 via-white to-pink-50/50 flex items-center justify-center">
        <div className="animate-spin h-10 w-10 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return <Component />;
}
