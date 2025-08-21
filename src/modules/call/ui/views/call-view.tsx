"use client";
import {useTRPC} from "@/trpc/client";
import {useSuspenseQuery} from "@tanstack/react-query";
import {ErrorState} from "@/components/error-state";
import {CallProvider} from "@/modules/call/ui/components/call-provider";

interface Props {
    meetingId: string;
}

export const CallView = ({meetingId}:Props) => {
    const trpc = useTRPC();
    const {data} = useSuspenseQuery(trpc.meetings.getOne.queryOptions({id: meetingId}));
    if (data.status === "completed"){
        return(
            <div className={'flex h-screen items-center justify-center'}>
                <ErrorState
                    title={'Meeting Has Ended'}
                    description={'This meeting has ended. You can view the recording and notes.'}
                />
            </div>
        )
    }
    return <CallProvider meetingId={meetingId} meetingName={data.name}/>
}
