"use client";


import {useSuspenseQuery} from "@tanstack/react-query";
import {useTRPC} from "@/trpc/client";
import {LoadingState} from "@/components/loading-state";
import {ErrorState} from "@/components/error-state";
import {DataTable} from "@/modules/agents/ui/components/data-table";
import {columns} from "@/modules/agents/ui/components/columns";
import {EmptyState} from "@/components/empty-state";
import {UseAgentsFilter} from "@/modules/agents/hooks/use-agents-filter";
import {DataPagination} from "@/modules/agents/ui/components/data-pagination";



export const AgentsView = () => {
    const [filters, setFilters] = UseAgentsFilter();
    const trpc = useTRPC();
    const {data} = useSuspenseQuery(trpc.agents.getMany.queryOptions({
        ...filters,
    }))

    return (
        <div className={'flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4'}>
            <DataTable data={data.items} columns={columns}/>
            <DataPagination
                page={filters.page}
                totalPages={data.totalPages}
                onPageChange={(page) => setFilters({page})}
            />
            {data.items.length === 0 && (
                <EmptyState title={"Create Your first agent"} description={"Create an agent to join your meeting. Each agent will follow your instructions and can interact with participants during the call"}/>
            )}
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
