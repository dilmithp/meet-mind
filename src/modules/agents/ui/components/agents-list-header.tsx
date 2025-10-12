"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon, XCircleIcon, FileDownIcon } from "lucide-react";
import { NewAgentDialog } from "@/modules/agents/ui/components/new-agent-dialog";
import { useAgentsFilter } from "@/modules/agents/hooks/use-agents-filter";
import { AgentsSearchFilter } from "@/modules/agents/ui/components/agents-search-filter";
import { DEFAULT_PAGE } from "@/constants";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useTRPC } from "@/trpc/client";
import { generateAgentsPdf } from "@/lib/pdf-utils";
import { useQueryClient } from "@tanstack/react-query";

export const AgentsListHeader = () => {
    const [filters, setFilters] = useAgentsFilter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const trpc = useTRPC();
    const queryClient = useQueryClient();

    const isAnyFilterModified = !!filters.search;

    const onClearFilters = () => {
        void setFilters({
            search: "",
            page: DEFAULT_PAGE,
        });
    };

    const handleGenerateReport = async () => {
        const agents = await queryClient.fetchQuery(
            trpc.agents.getAll.queryOptions({
                search: filters.search,
            })
        );
        generateAgentsPdf(agents);
    };

    return (
        <>
            <NewAgentDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
            <div className={"py-4 px-4 md:px-8 flex flex-col gap-y-4"}>
                <div className={"flex items-center justify-between"}>
                    <h5 className={"font-medium text-xl"}>My Agents</h5>
                    <div className="flex gap-x-2">
                        <Button onClick={() => setIsDialogOpen(true)}>
                            <PlusIcon />
                            New Agent
                        </Button>
                        <Button onClick={handleGenerateReport} variant="outline">
                            <FileDownIcon />
                            Generate report
                        </Button>
                    </div>
                </div>
                <ScrollArea>
                    <div className={"flex items-center gap-x-2 p-1"}>
                        <AgentsSearchFilter />
                        {isAnyFilterModified && (
                            <Button variant={"outline"} size={"sm"} onClick={onClearFilters}>
                                <XCircleIcon />
                                Clear
                            </Button>
                        )}
                    </div>
                    <ScrollBar orientation={"horizontal"} />
                </ScrollArea>
            </div>
        </>
    );
};