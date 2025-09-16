"use client";
import {useTRPC} from "@/trpc/client";
import {useMutation, useQueryClient, useSuspenseQuery} from "@tanstack/react-query";
import {LoadingState} from "@/components/loading-state";
import {ErrorState} from "@/components/error-state";
import {MeetingIdViewHeader} from "@/modules/meetings/ui/views/meeting-id-view-header";
import {useRouter} from "next/navigation";
import {toast} from "sonner";
import {UseConfirm} from "@/hooks/use-confirm";
import {useState} from "react";
import {UpdateMeetingDialog} from "@/modules/meetings/ui/components/update-meeting-dialog";
import {UpcomingState} from "@/modules/meetings/ui/components/upcoming-state";
import {ActiveState} from "@/modules/meetings/ui/components/active-state";
import {CancelledState} from "@/modules/meetings/ui/components/cancel-state";
import {ProcessingState} from "@/modules/meetings/ui/components/processing-state";
import {CompletedState} from "@/modules/meetings/ui/components/completed-state";

interface Props {
    meetingId: string;
}

export const MeetingIdView = ({ meetingId }: Props) => {
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    const router = useRouter();
    const[updateMeetingDialogOpen, setUpdateMeetingDialogOpen] = useState(false);

    const [RemoveConfirmation, confirmRemove] = UseConfirm(
        "Are you sure you want to delete this Meetings?",
        "The following Meetings will be deleted"
    );
    const {data} = useSuspenseQuery(
        trpc.meetings.getOne.queryOptions({ id: meetingId }),
    );
    const removeMeeting = useMutation(
        trpc.meetings.remove.mutationOptions({
            onSuccess:async () => {
                await queryClient.invalidateQueries(trpc.meetings.getMany.queryOptions({}));
                await queryClient.invalidateQueries(
                    trpc.premium.getFreeUsage.queryOptions(),
                );
                router.push("/meetings");
            },
            onError:(error) => {
                toast.error(error.message)
            },
        })
    )
    const handleRemoveMeeting = async () => {
        const ok = await confirmRemove();
        if (!ok) return;

        await removeMeeting.mutateAsync({id: meetingId});
    }
    const isActive = data.status === "active";
    const isUpcoming = data.status === "upcoming";
    const isCancelled = data.status === "cancelled";
    const isCompleted = data.status === "completed";
    const isProcessing = data.status === "processing";

    return (
        <>
            <RemoveConfirmation/>
            <UpdateMeetingDialog
                open={updateMeetingDialogOpen}
                onOpenChange={setUpdateMeetingDialogOpen}
                initialValues={data}
            />
            <div className="flex-1 py-4 px-4 md:px-8 flex flex-col gap-y-4">
                <MeetingIdViewHeader
                    meetingId={meetingId}
                    meetingName={data.name}
                    onEdit={() => setUpdateMeetingDialogOpen(true)}
                    onRemove={handleRemoveMeeting}
                />
                {isCancelled && <CancelledState />}
                {isProcessing && <ProcessingState />}
                {isCompleted && <CompletedState data={data}/>}
                {isUpcoming && <UpcomingState
                    meetingId={meetingId}
                    onCancelMeeting={() => {}}
                    isCancelling={false}
                />}
                {isActive && <ActiveState meetingId={meetingId} />}
            </div>
        </>
    );
};
export const MeetingIdViewLoading = () => {
    return (
        <LoadingState
            title="Loading Meetings..."
            description="Please wait while we load the Meeting."
        />
    )}

export const MeetingIdViewError = () => {
    return (
        <ErrorState
            title="Error Loading Meetings"
            description="An error occurred while loading the Meeting ."
        />)
}