'use client';

import { useState, useEffect } from 'react';
import { setWebsiteBuilderContext } from '@/lib/website-builder-context';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Globe, Sparkles, Code, Palette, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { RebuildWebsiteForm } from '@/components/websites/rebuild-website-form';
import { NewWebsiteForm } from '@/components/websites/new-website-form';

function DesignerBackgroundCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  const slides = [
    {
      gradient: 'from-purple-400 via-pink-400 to-red-400',
      icon: <Code className="h-32 w-32 text-white/20" />,
      position: 'top-20 left-10',
      rotation: 'rotate-12',
    },
    {
      gradient: 'from-blue-400 via-cyan-400 to-teal-400',
      icon: <Palette className="h-32 w-32 text-white/20" />,
      position: 'top-40 right-20',
      rotation: '-rotate-12',
    },
    {
      gradient: 'from-indigo-400 via-purple-400 to-pink-400',
      icon: <Zap className="h-32 w-32 text-white/20" />,
      position: 'bottom-32 left-1/4',
      rotation: 'rotate-6',
    },
    {
      gradient: 'from-rose-400 via-orange-400 to-amber-400',
      icon: <Globe className="h-32 w-32 text-white/20" />,
      position: 'bottom-20 right-1/3',
      rotation: '-rotate-6',
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length]);

  return (
    <div className="fixed inset-0 overflow-hidden z-0">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 via-pink-50 to-cyan-50 animate-gradient-shift"></div>
      
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-200/30 via-transparent to-blue-200/30 animate-pulse"></div>
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-pink-200/30 via-transparent to-cyan-200/30 animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="absolute inset-0">
        {slides.map((slide, index) => {
          const isActive = index === currentSlide;
          const offset = (index - currentSlide + slides.length) % slides.length;
          const scale = isActive ? 1 : 0.8;
          const opacity = isActive ? 0.25 : 0.1;
          const translateX = (offset - currentSlide) * 100;
          
          return (
            <div
              key={index}
              className={`absolute ${slide.position} transition-all duration-1000 ease-in-out ${slide.rotation}`}
              style={{
                transform: `translateX(${translateX}px) scale(${scale})`,
                opacity: opacity,
                zIndex: isActive ? 10 : 5,
              }}
            >
              <div className={`w-72 h-56 bg-gradient-to-br ${slide.gradient} rounded-2xl shadow-2xl p-6 flex flex-col justify-between backdrop-blur-sm border border-white/20`}>
                <div className="flex justify-center items-center h-full">
                  {slide.icon}
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3 mt-2">
                  <div className="h-2 bg-white/30 rounded-full mb-2"></div>
                  <div className="h-2 bg-white/20 rounded-full w-3/4"></div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="absolute inset-0 overflow-hidden">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-purple-300/20 to-blue-300/20 blur-xl animate-float"
            style={{
              width: `${100 + i * 50}px`,
              height: `${100 + i * 50}px`,
              top: `${(i * 12) % 100}%`,
              left: `${(i * 15) % 100}%`,
              animationDelay: `${i * 0.5}s`,
              animationDuration: `${10 + i * 2}s`,
            }}
          />
        ))}
      </div>

      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
}

export default function NewWebsitePage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [step, setStep] = useState<'initial' | 'rebuild' | 'new'>('initial');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/websites');
        if (res.ok) {
          const data = await res.json();
          if (data.canCreateNew === false || (data.websites?.length ?? 0) >= 1) {
            router.replace('/dashboard/websites');
          }
        }
      } catch (e) {
        console.error('Failed to check website limit:', e);
      }
    };
    if (session) check();
  }, [session, router]);

  useEffect(() => {
    setWebsiteBuilderContext({
      page: 'new',
      step,
    });
    return () => { /* keep context on unmount for navigation */ };
  }, [step]);

  return (
    <div className="relative min-h-screen">
      <DesignerBackgroundCarousel />

      {step === 'initial' && (
        <div className="relative z-10 container mx-auto p-6 max-w-4xl">
          <Link href="/dashboard/websites">
            <Button variant="ghost" className="mb-6 bg-white/90 backdrop-blur-sm hover:bg-white/95">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Websites
            </Button>
          </Link>

          <div className="space-y-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg p-6 shadow-xl">
              <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Create New Website
              </h1>
              <p className="text-muted-foreground text-lg">
                Choose how you&apos;d like to create your website
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <Card
                className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/95 backdrop-blur-sm border-2 hover:border-purple-300"
                onClick={() => setStep('rebuild')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Globe className="h-6 w-6 text-purple-600" />
                    Rebuild Existing Website
                  </CardTitle>
                  <CardDescription className="text-base">
                    We&apos;ll clone and rebuild your current website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Enter your website URL and we&apos;ll extract all content, images, SEO data, and structure to rebuild it for you.
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:shadow-2xl transition-all duration-300 hover:scale-105 bg-white/95 backdrop-blur-sm border-2 hover:border-blue-300"
                onClick={() => setStep('new')}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Sparkles className="h-6 w-6 text-blue-600" />
                    Build New Website
                  </CardTitle>
                  <CardDescription className="text-base">
                    We&apos;ll build a completely new website for you
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Answer a few questions and upload your assets. We&apos;ll build a professional website tailored to your business.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {step === 'rebuild' && (
        <RebuildWebsiteForm onBack={() => setStep('initial')} />
      )}

      {step === 'new' && (
        <NewWebsiteForm onBack={() => setStep('initial')} />
      )}
    </div>
  );
}
