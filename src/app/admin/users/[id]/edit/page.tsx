import { getUserById, updateUser } from '../../_lib/actions';
import { UserForm } from '../../_components/user-form';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function EditUserPage({
                                               params,
                                           }: {
    params: { id: string };
}) {
    const user = await getUserById(params.id);

    if (!user) {
        notFound();
    }

    async function handleUpdateUser(formData: FormData) {
        'use server';

        const data = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            emailVerified: formData.get('emailVerified') === 'on',
            image: formData.get('image') as string || undefined,
        };

        return await updateUser(params.id, data);
    }

    return (
        <div className="container py-8 px-6 max-w-3xl">
            <Link href="/admin/users">
                <Button variant="ghost" size="sm" className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Users
                </Button>
            </Link>

            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
                <p className="text-muted-foreground mt-1">
                    Update information for {user.name}
                </p>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6 mb-6">
                <UserForm
                    user={user}
                    onSubmit={handleUpdateUser}
                    submitLabel="Update User"
                />
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">User Information</h2>
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">User ID</dt>
                        <dd className="mt-1 text-sm font-mono">{user.id}</dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
                        <dd className="mt-1 text-sm">
                            {new Date(user.createdAt).toLocaleString()}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-sm font-medium text-muted-foreground">Updated At</dt>
                        <dd className="mt-1 text-sm">
                            {new Date(user.updatedAt).toLocaleString()}
                        </dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}
