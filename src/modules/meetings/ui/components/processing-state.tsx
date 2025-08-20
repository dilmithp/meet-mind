import React from 'react'
import {EmptyState} from "@/components/empty-state";


export const ProcessingState = () => {
    return (
        <div className={'bg-white rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center justify-center'}>
            <EmptyState
                title={"Meeting Is Completed"}
                description={"this meeting is completed. You can view the recording and notes soon."}
                image={"/processing.svg"}
            />
        </div>
    )
}
