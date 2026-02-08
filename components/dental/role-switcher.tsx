/**
 * Role Switcher Component
 * Allows users to switch between Clinical and Administrative dashboards
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Stethoscope, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoleSwitcherProps {
  currentRole: 'clinical' | 'admin';
  className?: string;
}

export function RoleSwitcher({ currentRole, className }: RoleSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const switchToClinical = () => {
    router.push('/dashboard/dental/clinical');
  };

  const switchToAdmin = () => {
    router.push('/dashboard/dental/admin');
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button
        variant={currentRole === 'clinical' ? 'default' : 'outline'}
        size="sm"
        onClick={switchToClinical}
        className={cn(
          'flex items-center gap-2',
          currentRole === 'clinical' && 'bg-blue-600 hover:bg-blue-700'
        )}
      >
        <Stethoscope className="w-4 h-4" />
        <span>Clinical</span>
        {currentRole === 'clinical' && (
          <Badge variant="secondary" className="ml-1 bg-blue-100 text-blue-700">
            Active
          </Badge>
        )}
      </Button>
      <Button
        variant={currentRole === 'admin' ? 'default' : 'outline'}
        size="sm"
        onClick={switchToAdmin}
        className={cn(
          'flex items-center gap-2',
          currentRole === 'admin' && 'bg-purple-600 hover:bg-purple-700'
        )}
      >
        <ClipboardList className="w-4 h-4" />
        <span>Administrative</span>
        {currentRole === 'admin' && (
          <Badge variant="secondary" className="ml-1 bg-purple-100 text-purple-700">
            Active
          </Badge>
        )}
      </Button>
    </div>
  );
}
