'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '../_lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type UserFormProps = {
    user?: User | null;
    onSubmit: (data: FormData) => Promise<{ success: boolean; error?: string }>;
    submitLabel: string;
};

export function UserForm({ user, onSubmit, submitLabel }: UserFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);

        try {
            const result = await onSubmit(formData);
            if (result.success) {
                toast.success(user ? 'User updated successfully' : 'User created successfully');
                router.push('/admin/users');
                router.refresh();
            } else {
                toast.error(result.error || 'An error occurred');
            }
        } catch (err) {
            toast.error('An unexpected error occurred');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name">
                        Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="name"
                        name="name"
                        type="text"
                        required
                        defaultValue={user?.name}
                        placeholder="John Doe"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">
                        Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        defaultValue={user?.email}
                        placeholder="john@example.com"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="image">Profile Image URL</Label>
                    <Input
                        id="image"
                        name="image"
                        type="url"
                        defaultValue={user?.image || ''}
                        placeholder="https://example.com/avatar.jpg"
                    />
                    <p className="text-xs text-muted-foreground">
                        Optional: URL to user's profile image
                    </p>
                </div>

                {user && (
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="emailVerified"
                            name="emailVerified"
                            defaultChecked={user.emailVerified}
                        />
                        <Label
                            htmlFor="emailVerified"
                            className="text-sm font-normal cursor-pointer"
                        >
                            Email verified
                        </Label>
                    </div>
                )}
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/users')}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {submitLabel}
                </Button>
            </div>
        </form>
    );
}
