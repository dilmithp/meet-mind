import { createUser } from '../_lib/actions';
import { UserForm } from '../_components/user-form';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CreateUserPage() {
    async function handleCreateUser(formData: FormData) {
        'use server';

        const data = {
            name: formData.get('name') as string,
            email: formData.get('email') as string,
            image: formData.get('image') as string || undefined,
        };

        return await createUser(data);
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
                <h1 className="text-3xl font-bold tracking-tight">Create New User</h1>
                <p className="text-muted-foreground mt-1">
                    Add a new user to the system
                </p>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-6">
                <UserForm onSubmit={handleCreateUser} submitLabel="Create User" />
            </div>
        </div>
    );
}
