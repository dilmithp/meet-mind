import { getUsers, getUserStats } from './_lib/actions';
import Link from 'next/link';
import { UserTable } from './_components/user-table';
import { StatsCards } from './_components/stats-cards';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export const dynamic = 'force-dynamic';

type Props = {
    searchParams: { search?: string };
};

export default async function AdminUsersPage({ searchParams }: Props) {
    const search = searchParams.search;
    const users = await getUsers(search);
    const stats = await getUserStats();

    return (
        <div className="container py-8 px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage all users in the system
                    </p>
                </div>
                <Link href="/admin/users/create">
                    <Button size="default">
                        <Plus className="mr-2 h-4 w-4" />
                        Add New User
                    </Button>
                </Link>
            </div>

            <StatsCards stats={stats} />

            <div className="bg-card rounded-lg border shadow-sm">
                <UserTable users={users} initialSearch={search} />
            </div>

            {users.length === 0 && !search && (
                <div className="text-center py-12 bg-card rounded-lg border mt-8">
                    <div className="flex justify-center mb-4">
                        <div className="rounded-full bg-primary/10 p-3">
                            <svg
                                className="h-8 w-8 text-primary"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                            </svg>
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-1">No users yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        Get started by creating a new user
                    </p>
                    <Link href="/admin/users/create">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add New User
                        </Button>
                    </Link>
                </div>
            )}
        </div>
    );
}
