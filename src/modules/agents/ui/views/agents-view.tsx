"use client";


import {useSuspenseQuery} from "@tanstack/react-query";
import {useTRPC} from "@/trpc/client";
import {LoadingState} from "@/components/loading-state";
import {ErrorState} from "@/components/error-state";

export const AgentsView = () => {
    const trcp = useTRPC();
    const {data} = useSuspenseQuery(trcp.agents.getMany.queryOptions())

    return (
        <div>
            {JSON.stringify(data, null, 2)}
        </div>
    )
}
export const AgentViewLoading = () => {
    return (
        <LoadingState
            title="Loading..."
            description="Please wait while we load the agents."
        />
    )}

export const AgentViewError = () => {
    return (
        <ErrorState
            title="Error"
            description="An error occurred while loading the agents."
        />)
}
