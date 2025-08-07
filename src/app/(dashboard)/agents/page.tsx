import React, {Suspense} from 'react'
import {AgentsView, AgentViewError, AgentViewLoading} from "@/modules/agents/ui/views/agents-view";
import {getQueryClient, trpc} from "@/trpc/server";
import {HydrationBoundary} from "@tanstack/react-query";
import {dehydrate} from "@tanstack/query-core";
import {ErrorBoundary} from "react-error-boundary";

const Page = async () => {
    const queryClient = getQueryClient();
    void queryClient.prefetchQuery(trpc.agents.getMany.queryOptions())
    return (
        <HydrationBoundary state={dehydrate(queryClient)}>
            <Suspense fallback={<AgentViewLoading/>}>
                <ErrorBoundary fallback={<AgentViewError/>}>
                    <AgentsView/>
                </ErrorBoundary>
            </Suspense>
        </HydrationBoundary>
    );
};
export default Page
