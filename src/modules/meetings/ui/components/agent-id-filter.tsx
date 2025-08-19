import React, {useState} from 'react'
import {UseMeetingsFilter} from "@/modules/meetings/hooks/use-meetings-filter";
import {useTRPC} from "@/trpc/client";
import {useQuery} from "@tanstack/react-query";
import {CommandSelect} from "@/components/command-select";
import {GeneratedAvatar} from "@/components/generated-avatar";

export const AgentIdFilter = () => {
    const [filter, setFilter] = UseMeetingsFilter();
    const trpc = useTRPC();
    const [agentSearch, setAgentSearch] = useState("");
    const {data} = useQuery(
        trpc.agents.getMany.queryOptions({
            pageSize: 100,
            search: agentSearch,
        })
    )
    return (
        <CommandSelect
            ClassName={'h-9'}
            placeholder={'Agent'}
            options={(data?.items || []).map(agent => ({
                id: agent.id,
                value: agent.id,
                children:(
                    <div className={'flex items-center gap-x-2'}>
                        <GeneratedAvatar
                            seed={agent.name}
                            variant={"botttsNeutral"}
                            className={'size-4'}
                        />
                        {agent.name}
                    </div>
                )
            }))}
            onSelect={(value) => setFilter({ agentId: value })}
            onSearch={setAgentSearch}
            value={filter.agentId ?? ''}
        />
    )
}
