'use client'
import {Button} from "@/components/ui/button";
import {Label} from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import {useRouter} from "next/navigation";

export const HomeView = () => {
    const router = useRouter();
    const {data: session} = authClient.useSession();
    if (!session) {
        return (
            <p>loading...</p>
        )
    }
    return (
        <div className={'p-4 flex flex-col gap-4 max-w-md mx-auto'}>
            <Label className="text-2xl">Welcome, {session.user.name}</Label>
            <Button onClick={() =>
                authClient.signOut({
                    fetchOptions: {
                        onSuccess: () => router.push('/sign-in'),
                    }
                })}>
                Sign Out
            </Button>
        </div>
    )
}
