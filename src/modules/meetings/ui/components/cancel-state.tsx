import React from 'react'
import {EmptyState} from "@/components/empty-state";


export const CancelledState = () => {
    return (
        <div className={'bg-white rounded-lg px-4 py-5 flex flex-col gap-y-8 items-center justify-center'}>
            <EmptyState
                title={"Meeting Is Cancelled"}
                description={"This meeting has been cancelled and will not take place."}
                image={"/cancelled.svg"}
            />
        </div>
    )
}
