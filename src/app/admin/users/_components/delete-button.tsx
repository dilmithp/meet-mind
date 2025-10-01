'use client';

import { deleteUser } from '../_lib/actions';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { UseConfirm } from '@/hooks/use-confirm';
import { toast } from 'sonner';

type DeleteButtonProps = {
    userId: string;
    userName: string;
};

export function DeleteButton({ userId, userName }: DeleteButtonProps) {
    const router = useRouter();
    const [ConfirmDialog, confirm] = UseConfirm(
        'Delete User',
        `Are you sure you want to delete "${userName}"? This will permanently delete all associated data. This action cannot be undone.`
    );

    async function handleDelete() {
        const confirmed = await confirm();
        if (!confirmed) return;

        const result = await deleteUser(userId);

        if (result.success) {
            toast.success('User deleted successfully');
            router.refresh();
        } else {
            toast.error(result.error || 'Failed to delete user');
        }
    }

    return (
        <>
            <ConfirmDialog />
            <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
            >
                <Trash2 className="h-4 w-4" />
            </Button>
        </>
    );
}
