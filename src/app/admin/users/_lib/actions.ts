'use server';

import { db } from '@/db';
import { user } from '@/db/schema';
import { eq, desc, count, like, or } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export type User = typeof user.$inferSelect;
export type CreateUserInput = {
    name: string;
    email: string;
    image?: string;
};
export type UpdateUserInput = {
    name?: string;
    email?: string;
    emailVerified?: boolean;
    image?: string;
};

async function checkAuth() {
    const session = await auth.api.getSession({
        headers: await headers(),
    });

    if (!session) {
        redirect('/sign-in');
    }

    return session;
}

export async function getUsers(search?: string) {
    await checkAuth();

    try {
        if (search) {
            return await db
                .select()
                .from(user)
                .where(
                    or(
                        like(user.name, `%${search}%`),
                        like(user.email, `%${search}%`)
                    )
                )
                .orderBy(desc(user.createdAt));
        }

        return await db
            .select()
            .from(user)
            .orderBy(desc(user.createdAt));
    } catch (error) {
        console.error('Error fetching users:', error);
        return [];
    }
}

export async function getUserStats() {
    await checkAuth();

    try {
        const [totalUsers] = await db.select({ count: count() }).from(user);
        const [verifiedUsers] = await db
            .select({ count: count() })
            .from(user)
            .where(eq(user.emailVerified, true));

        return {
            total: totalUsers.count,
            verified: verifiedUsers.count,
            unverified: totalUsers.count - verifiedUsers.count,
        };
    } catch (error) {
        console.error('Error fetching user stats:', error);
        return { total: 0, verified: 0, unverified: 0 };
    }
}

export async function getUserById(id: string): Promise<User | null> {
    await checkAuth();

    try {
        const result = await db.select().from(user).where(eq(user.id, id));
        return result[0] || null;
    } catch (error) {
        console.error('Error fetching user:', error);
        return null;
    }
}

export async function createUser(data: CreateUserInput) {
    await checkAuth();

    try {
        const newUser = await db.insert(user).values({
            id: nanoid(),
            name: data.name,
            email: data.email,
            emailVerified: false,
            image: data.image || null,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        revalidatePath('/admin/users');
        revalidatePath('/admin');
        return { success: true, user: newUser[0] };
    } catch (error: any) {
        console.error('Error creating user:', error);
        if (error.message?.includes('unique') || error.code === '23505') {
            return { success: false, error: 'Email already exists' };
        }
        return { success: false, error: 'Failed to create user' };
    }
}

export async function updateUser(id: string, data: UpdateUserInput) {
    await checkAuth();

    try {
        const updatedUser = await db.update(user)
            .set({
                ...data,
                updatedAt: new Date(),
            })
            .where(eq(user.id, id))
            .returning();

        if (!updatedUser[0]) {
            return { success: false, error: 'User not found' };
        }

        revalidatePath('/admin/users');
        revalidatePath(`/admin/users/${id}/edit`);
        revalidatePath('/admin');
        return { success: true, user: updatedUser[0] };
    } catch (error: any) {
        console.error('Error updating user:', error);
        if (error.message?.includes('unique') || error.code === '23505') {
            return { success: false, error: 'Email already exists' };
        }
        return { success: false, error: 'Failed to update user' };
    }
}

export async function deleteUser(id: string) {
    await checkAuth();

    try {
        await db.delete(user).where(eq(user.id, id));
        revalidatePath('/admin/users');
        revalidatePath('/admin');
        return { success: true };
    } catch (error) {
        console.error('Error deleting user:', error);
        return { success: false, error: 'Failed to delete user' };
    }
}
