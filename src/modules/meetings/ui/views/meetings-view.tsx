"use client";

import {useTRPC} from "@/trpc/client";
import {useSuspenseQuery} from "@tanstack/react-query";
import {LoadingState} from "@/components/loading-state";
import {ErrorState} from "@/components/error-state";
import {DataTable} from "@/components/data-table";
import {columns} from "@/modules/meetings/ui/components/columns";
import {EmptyState} from "@/components/empty-state";
import {useRouter} from "next/navigation";
import {UseMeetingsFilter} from "@/modules/meetings/hooks/use-meetings-filter";
import {DataPagination} from "@/components/data-pagination";

export const MeetingsView = () => {
    const trpc = useTRPC();
    const router = useRouter();
    const [filters, setFilters] = UseMeetingsFilter();
    const {data} = useSuspenseQuery(trpc.meetings.getMany.queryOptions({
        ...filters,
    }));
    return (
        <div className={'flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4'}>
            <DataTable data={data.items} columns={columns}
                       onRowClick={(row) => router.push(`/meetings/${row.id}`)}/>
            <DataPagination
                page={filters.page}
                totalPages={data.totalPages}
                onPageChange={(page) => setFilters({page})}/>
            {data.items.length === 0 && (
                <EmptyState title={"Create Your first meeting"} description={"Create a meeting to connect with your AI Support Agent"}/>
            )}
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