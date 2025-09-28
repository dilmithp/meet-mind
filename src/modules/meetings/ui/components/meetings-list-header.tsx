"use client";

import React, { useState } from 'react'
import { Button } from "@/components/ui/button";
import { PlusIcon, XCircleIcon, FileTextIcon, DownloadIcon } from "lucide-react";
import { NewMeetingDialog } from "@/modules/meetings/ui/components/new-meeting-dialog";
import { MeetingsSearchFilter } from "@/modules/meetings/ui/components/meetings-search-filter";
import { StatusFilter } from "@/modules/meetings/ui/components/status-filter";
import { AgentIdFilter } from "@/modules/meetings/ui/components/agent-id-filter";
import { UseMeetingsFilter } from "@/modules/meetings/hooks/use-meetings-filter";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { DEFAULT_PAGE } from "@/constants";
import { toast } from "sonner";

export const MeetingsListHeader = () => {
    const [filter, setFilter] = UseMeetingsFilter();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isGeneratingReport, setIsGeneratingReport] = useState(false);

    const isAnyFilterModified = !!filter.status || !!filter.agentId || !!filter.search;

    const onClearFilters = () => {
        setFilter({
            status: null,
            agentId: "",
            search: "",
            page: DEFAULT_PAGE,
        });
    };

    const handleGenerateReport = async () => {
        try {
            setIsGeneratingReport(true);
            toast.info("Generating PDF report...");

            const response = await fetch('/api/meetings/report', {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate report');
            }

            // Get the PDF blob
            const blob = await response.blob();

            // Create download link
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `MeetMind-Meetings-Report-${new Date().toISOString().split('T')[0]}.pdf`;

            // Trigger download
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up
            window.URL.revokeObjectURL(url);

            toast.success("Report generated and downloaded successfully!");

        } catch (error) {
            console.error('Error generating report:', error);
            toast.error(error instanceof Error ? error.message : 'Failed to generate report');
        } finally {
            setIsGeneratingReport(false);
        }
    };

    return (
        <>
            <NewMeetingDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />

            <div className="py-4 px-4 md:px-8 flex flex-col gap-y-4">
                <div className="flex items-center justify-between">
                    <h5 className="font-medium text-xl">My Meetings</h5>

                    <div className="flex items-center gap-x-2">
                        <Button
                            variant="outline"
                            onClick={handleGenerateReport}
                            disabled={isGeneratingReport}
                            className="flex items-center gap-x-2"
                        >
                            {isGeneratingReport ? (
                                <DownloadIcon className="h-4 w-4 animate-spin" />
                            ) : (
                                <FileTextIcon className="h-4 w-4" />
                            )}
                            {isGeneratingReport ? "Generating..." : "Generate Report"}
                        </Button>

                        <Button onClick={() => setIsDialogOpen(true)}>
                            <PlusIcon className="h-4 w-4" />
                            New Meeting
                        </Button>
                    </div>
                </div>

                <ScrollArea>
                    <div className="flex items-center gap-x-2 p-1">
                        <MeetingsSearchFilter />
                        <StatusFilter />
                        <AgentIdFilter />

                        {isAnyFilterModified && (
                            <Button variant="outline" onClick={onClearFilters}>
                                <XCircleIcon className="size-4" />
                                Clear
                            </Button>
                        )}
                    </div>
                    <ScrollBar orientation="horizontal" />
                </ScrollArea>
            </div>
        </>
    );
};
