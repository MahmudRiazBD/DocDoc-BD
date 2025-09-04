
'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  CircleUser,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  PawPrint,
  ChevronDown,
  Settings,
  Wind,
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Loader2 } from 'lucide-react';
import { UpdateProfileForm } from './users/UpdateProfileForm';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { purgeAllCache } from '@/app/actions/cache-actions';


const mainNavItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'ড্যাশবোর্ড',
  },
  {
    href: '/users',
    icon: Users,
    label: 'ব্যবহারকারী',
  },
];


const fileManagementNavItems = [
    {
      href: '/files',
      label: 'ফাইল সমূহ',
    },
    {
      href: '/clients',
      label: 'ক্লায়েন্ট তালিকা',
    },
    {
        href: '/institutions',
        label: 'প্রতিষ্ঠান তালিকা',
    },
    {
        href: '/bill-addresses',
        label: 'বিদ্যুৎ বিল ঠিকানা',
    },
    {
        href: '/bill-templates',
        label: 'বিল টেমপ্লেট',
    }
  ];


export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const supabase = createClient();
  const [user, setUser] = React.useState<any>(null);
  const [isProfileDialogOpen, setProfileDialogOpen] = React.useState(false);
  const [isPurging, startPurgeTransition] = React.useTransition();
  
  const [isFilesOpen, setFilesOpen] = React.useState(true);


  React.useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
            setUser(session?.user ?? null);
        } else if (event === 'SIGNED_OUT') {
            router.push('/login');
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, [router, supabase]);

  // Eagerly prefetch all navigation links to make page transitions instantaneous
  React.useEffect(() => {
    const allLinks = [...mainNavItems, ...fileManagementNavItems].map(item => item.href);
    allLinks.forEach(href => {
      router.prefetch(href);
    });
  }, [router]);


  const handleLogout = async () => {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        toast({
          title: 'সফলভাবে লগ-আউট হয়েছে',
        });
        router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'লগ-আউট ব্যর্থ হয়েছে',
        description: 'অনুগ্রহ করে আবার চেষ্টা করুন।',
      });
    }
  };
  
  const handlePurgeCache = () => {
    startPurgeTransition(async () => {
      const result = await purgeAllCache();
      if (result.success) {
        toast({
          title: 'ক্যাশ পরিষ্কার হয়েছে',
          description: 'অ্যাপ্লিকেশনের সমস্ত ক্যাশ সফলভাবে পরিষ্কার করা হয়েছে।',
          className: 'bg-accent text-accent-foreground',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'ক্যাশ পরিষ্কারে ব্যর্থ',
          description: 'ক্যাশ পরিষ্কার করার সময় একটি সমস্যা হয়েছে।',
        });
      }
    });
  };

  const NavLink = ({
    href,
    icon: Icon,
    label,
  }: {
    href: string;
    icon?: React.ElementType;
    label: string;
  }) => (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        pathname.startsWith(href) && href !== '/dashboard' && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground',
        pathname === '/dashboard' && href === '/dashboard' && 'bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground'
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {label}
    </Link>
  );

  const SideNav = ({ isMobile = false }) => (
    <nav
      className={cn(
        'grid items-start text-sm font-medium',
        isMobile && 'gap-2 text-lg'
      )}
    >
      {mainNavItems.map((item) => (
        <NavLink key={item.href} {...item} />
      ))}
       <Collapsible open={isFilesOpen} onOpenChange={setFilesOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              'flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              isFilesOpen && ''
            )}
          >
            <div className="flex items-center gap-3">
              <FolderKanban className="h-4 w-4" />
              <span>ফাইল ম্যানেজমেন্ট</span>
            </div>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
                isFilesOpen && 'rotate-180'
              )}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 pt-1 pl-7">
          {fileManagementNavItems.map((item) => (
            <NavLink key={item.href} href={item.href} label={item.label} />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </nav>
  );

  const MobileNav = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle navigation menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="flex flex-col">
        <SheetHeader className="flex flex-row items-center gap-2 text-lg font-semibold mb-4">
            <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-sidebar-foreground">
                <PawPrint className="h-6 w-6 text-primary" />
                 <SheetTitle className="sr-only">ডকডক বিডি</SheetTitle>
            </Link>
        </SheetHeader>
        <SideNav isMobile />
         <div className="mt-auto p-4">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handlePurgeCache}
              disabled={isPurging}
            >
              {isPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wind className="mr-2 h-4 w-4" />}
              ক্যাশ পরিষ্কার করুন
            </Button>
          </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <aside className="hidden border-r bg-sidebar md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 shrink-0 items-center border-b border-sidebar-border px-4 lg:h-[60px] lg:px-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-semibold text-sidebar-foreground"
            >
              <PawPrint className="h-6 w-6 text-primary" />
              <span>ডকডক বিডি</span>
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-2">
            <div className="px-2 lg:px-4">
              <SideNav />
            </div>
          </div>
          <div className="mt-auto border-t border-sidebar-border p-4">
            <Button
              variant="ghost"
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handlePurgeCache}
              disabled={isPurging}
            >
              {isPurging ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wind className="mr-2 h-4 w-4" />}
              ক্যাশ পরিষ্কার করুন
            </Button>
          </div>
        </div>
      </aside>
      <div className="flex flex-col max-h-screen">
        <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-muted/40 px-4 lg:h-[60px] lg:px-6">
          <MobileNav />
          <div className="w-full flex-1" />
           <Dialog open={isProfileDialogOpen} onOpenChange={setProfileDialogOpen}>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar>
                        <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.user_metadata?.name} />
                        <AvatarFallback>
                        {user?.user_metadata?.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2) || <CircleUser />}
                        </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                <DropdownMenuLabel>আমার অ্যাকাউন্ট</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                      <CircleUser className="mr-2 h-4 w-4" />
                      <span>প্রোফাইল</span>
                  </DropdownMenuItem>
                </DialogTrigger>
                <DropdownMenuItem asChild>
                    <Link href="/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>সেটিংস</span>
                    </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>লগ আউট</span>
                </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>প্রোফাইল আপডেট করুন</DialogTitle>
                    <DialogDescription>
                        আপনার ব্যক্তিগত তথ্য এখানে পরিবর্তন করুন।
                    </DialogDescription>
                </DialogHeader>
                {user && (
                    <UpdateProfileForm 
                        user={{ 
                            name: user.user_metadata.name, 
                            email: user.email,
                            role: user.user_metadata.role,
                            avatarUrl: user.user_metadata.avatar_url,
                        }}
                        setOpen={setProfileDialogOpen}
                    />
                )}
            </DialogContent>
           </Dialog>
        </header>        
        <main className="flex flex-1 flex-col gap-4 overflow-auto p-4 lg:gap-6 lg:p-6 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}

    