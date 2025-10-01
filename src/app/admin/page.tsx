import { db } from '@/db';
import { user, meetings, agent } from '@/db/schema';
import { count } from 'drizzle-orm';
import { Users, Video, Bot } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

async function getAdminStats() {
    try {
        const [totalUsers] = await db.select({ count: count() }).from(user);
        const [totalMeetings] = await db.select({ count: count() }).from(meetings);
        const [totalAgents] = await db.select({ count: count() }).from(agent);

        return {
            users: totalUsers.count,
            meetings: totalMeetings.count,
            agents: totalAgents.count,
        };
    } catch (error) {
        console.error('Error fetching admin stats:', error);
        return { users: 0, meetings: 0, agents: 0 };
    }
}

export default async function AdminDashboard() {
    const stats = await getAdminStats();

    const statCards = [
        {
            title: 'Total Users',
            value: stats.users,
            icon: Users,
            href: '/admin/users',
            bgColor: 'bg-blue-500/10',
            iconColor: 'text-blue-500',
        },
        {
            title: 'Total Meetings',
            value: stats.meetings,
            icon: Video,
            href: '/',
            bgColor: 'bg-green-500/10',
            iconColor: 'text-green-500',
        },
        {
            title: 'Total Agents',
            value: stats.agents,
            icon: Bot,
            href: '/',
            bgColor: 'bg-purple-500/10',
            iconColor: 'text-purple-500',
        },
    ];

    return (
        <div className="container py-8 px-6">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Overview of your application
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 mb-8">
                {statCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={card.title}
                            href={card.href}
                            className="group bg-card rounded-lg border p-6 shadow-sm hover:shadow-md transition-all"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {card.title}
                                    </p>
                                    <p className="text-3xl font-bold mt-2">{card.value}</p>
                                </div>
                                <div className={`${card.bgColor} p-3 rounded-full group-hover:scale-110 transition-transform`}>
                                    <Icon className={`h-6 w-6 ${card.iconColor}`} />
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <div className="bg-card rounded-lg border p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                    <div className="space-y-3">
                        <Link
                            href="/admin/users/create"
                            className="block p-3 rounded-lg border hover:bg-muted transition-colors"
                        >
                            <div className="font-medium">Create New User</div>
                            <div className="text-sm text-muted-foreground">
                                Add a new user to the system
                            </div>
                        </Link>
                        <Link
                            href="/admin/users"
                            className="block p-3 rounded-lg border hover:bg-muted transition-colors"
                        >
                            <div className="font-medium">Manage Users</div>
                            <div className="text-sm text-muted-foreground">
                                View and edit all users
                            </div>
                        </Link>
                    </div>
                </div>

                <div className="bg-card rounded-lg border p-6 shadow-sm">
                    <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                    <p className="text-sm text-muted-foreground">
                        Activity tracking coming soon...
                    </p>
                </div>
            </div>
        </div>
    );
}
