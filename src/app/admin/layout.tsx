import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Users, LayoutDashboard, Settings } from 'lucide-react';

export default async function AdminLayout({
                                              children,
                                          }: {
    children: React.ReactNode;
}) {
    // Check authentication
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect('/sign-in');
    }

    const navItems = [
        {
            title: 'Dashboard',
            href: '/admin',
            icon: LayoutDashboard,
        },
        {
            title: 'Users',
            href: '/admin/users',
            icon: Users,
        },
    ];

    return (
        <div className="min-h-screen bg-background">
            {/* Top Header */}
            <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container flex h-16 items-center px-4">
                    <div className="flex items-center gap-2 font-semibold">
                        <Settings className="h-6 w-6" />
                        <span className="text-lg">Admin Panel</span>
                    </div>
                    <div className="ml-auto flex items-center gap-4">
                        <Link
                            href="/"
                            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Back to App
                        </Link>
                        <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {session.user.name}
              </span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className="fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] w-64 border-r bg-background">
                    <nav className="flex flex-col gap-2 p-4">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
                                >
                                    <Icon className="h-4 w-4" />
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content */}
                <main className="flex-1 ml-64">
                    {children}
                </main>
            </div>
        </div>
    );
}
