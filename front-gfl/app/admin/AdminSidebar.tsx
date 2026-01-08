'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Sheet, SheetContent } from 'components/ui/sheet';
import { ScrollArea } from 'components/ui/scroll-area';
import { FileText, MessageSquare, Music, Ban, Shield } from 'lucide-react';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
};

type NavSection = {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
};

const navSections: NavSection[] = [
  {
    title: 'Reports',
    icon: Shield,
    items: [
      { label: 'Guide Reports', href: '/admin/reports/guides', icon: FileText },
      { label: 'Comment Reports', href: '/admin/reports/comments', icon: MessageSquare },
      { label: 'Music Reports', href: '/admin/reports/music', icon: Music },
    ],
  },
  {
    title: 'Moderation',
    icon: Ban,
    items: [
      { label: 'Banned Users', href: '/admin/bans', icon: Ban },
    ],
  },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-6 h-16 border-b border-border/40 bg-background/95 backdrop-blur flex-shrink-0">
        <h2 className="text-lg font-bold">Admin Dashboard</h2>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="py-4">
          {navSections.map((section) => (
            <div key={section.title} className="mb-6">
              {/* Section Header */}
              <div className="px-6 mb-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  <section.icon className="h-4 w-4" />
                  {section.title}
                </div>
              </div>

              {/* Section Items */}
              <div className="space-y-1 px-3">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => onNavigate?.()}
                      className={`
                        flex items-center justify-between gap-3 px-3 py-2.5 rounded-md transition-all
                        ${isActive
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'hover:bg-accent/60 text-foreground'
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default function AdminSidebar({
  isMobile = false,
  isOpen = false,
  onClose = () => {}
}: {
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}) {
  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent side="left" className="w-[280px] p-0">
          <SidebarContent onNavigate={onClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside className="w-[280px] h-screen sticky top-0 left-0 border-r border-border/40 flex-shrink-0 max-[768px]:hidden">
      <SidebarContent />
    </aside>
  );
}
