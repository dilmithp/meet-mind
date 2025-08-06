'use client'
import {useTRPC} from "@/trpc/client";
import {useQuery} from "@tanstack/react-query";

export const HomeView = () => {
    const trpc = useTRPC()
    const {data} = useQuery(trpc.hello.queryOptions({text:"Dilmith"}));
    return (
        <div className={'p-4 flex flex-col gap-4 max-w-md mx-auto'}>
            {data?.greeting}
        </div>
    )
}
