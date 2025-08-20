import React from 'react'
import {EmptyState} from "@/components/empty-state";
import {Button} from "@/components/ui/button";
import {VideoIcon} from "lucide-react";
import Link from "next/link";

interface Props{
    meetingId: string;
}

export const ActiveState = ({meetingId}:Props) => {
    return (
        <div className={'bg-white rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center justify-center'}>
            <EmptyState
                title={"Meeting Is Active"}
                description={"This meeting will be active until the end time."}
                image={"/upcoming.svg"}
            />
            <div className={'flex flex-col-reverse lg:flex-row justify-center items-center gap-2 w-full'}>
                <Button asChild className={'w-full lg:w-auto'}>
                    <Link href={`/call/${meetingId}`}>
                        <VideoIcon/>
                        Join Meeting
                    </Link>
                </Button>
            </div>
        </div>
    )
}
