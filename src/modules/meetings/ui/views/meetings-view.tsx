"use client";

import {useTRPC} from "@/trpc/client";
import {useSuspenseQuery} from "@tanstack/react-query";
import {LoadingState} from "@/components/loading-state";
import {ErrorState} from "@/components/error-state";

export const MeetingsView = () => {
    const trpc = useTRPC();
    const {data} = useSuspenseQuery(trpc.meetings.getMany.queryOptions({}));
    return (
        <div>
            {JSON.stringify(data)}
        </div>
    )
}

export const MeetingViewLoading = () => {
    return (
        <LoadingState
            title="Loading..."
            description="Please wait while we load the agents."
        />
    )}

export const MeetingViewError = () => {
    return (
        <ErrorState
            title="Error"
            description="An error occurred while loading the agents."
        />)
}