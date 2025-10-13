"use client"

import { ColumnDef } from "@tanstack/react-table"
import {AgentsGetMany} from "@/modules/agents/types";
import {GeneratedAvatar} from "@/components/generated-avatar";
import {CornerDownRightIcon, VideoIcon} from "lucide-react";
import {Badge} from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';

// This type is used to define the shape of our data.
// You can use a Zod schema here if you want.


export const columns: ColumnDef<AgentsGetMany[number]>[] = [
    {
        accessorKey: "name",
        header: "Agent Name",
        cell: ({ row }) => {
            return (
                <div className={'flex flex-col gap-y-1'}>
                    <div className={'flex items-center gap-x-2'}>
                        <GeneratedAvatar
                            seed={row.original.name}
                            variant={"botttsNeutral"}
                            className={'size-6'}
                        />
                        <span className={'font-semibold capitalize'}>{row.original.name}</span>
                    </div>
                    <div className={'flex items-center gap-x-2'}>
                        <CornerDownRightIcon className={'size-3 text-muted-foreground'}/>
                        <span className={'text-sm text-muted-foreground max-w-[200px] truncate capitalize'}>
                            {row.original.instructions}
                        </span>
                    </div>
                </div>
            )
        },
    },
    {
        accessorKey: "meetingCount",
        header: "Meetings",
        cell: ({ row }) => {
            const relative = row.original.createdAt ? formatDistanceToNow(new Date(row.original.createdAt), { addSuffix: true }) : null;
            return (
                // Reserve right space and center the badge; on small screens, move time under the badge
                <div className={'relative w-full flex items-center justify-center pr-36 min-h-[56px]'}>
                    <div className={'flex items-center justify-center'}>
                        <Badge
                            variant={'outline'}
                            className={'flex items-center gap-x-2 [&>svg]:size-4'}
                        >
                            <VideoIcon className={'text-blue-700'}/>
                            { row.original.meetingCount} {row.original.meetingCount === 1 ? 'Meeting' : 'Meetings' }
                        </Badge>
                    </div>

                    {/* Right-side time for md+ screens (truncated to avoid overflow) */}
                    {relative && (
                        <div className={'absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground hidden sm:block max-w-[180px] truncate text-right'}>
                            {relative}
                        </div>
                    )}

                    {/* On very small screens, show time under the badge to prevent overlap */}
                    {relative && (
                        <div className={'block sm:hidden absolute left-1/2 transform -translate-x-1/2 top-full mt-2 text-sm text-muted-foreground'}>
                            {relative}
                        </div>
                    )}
                </div>
            )
        }
    },

]