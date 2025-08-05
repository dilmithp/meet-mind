"use client";
import {Button} from "@/components/ui/button";
import {PanelLeftCloseIcon, PanelLeftIcon, SearchIcon} from "lucide-react";
import {useSidebar} from "@/components/ui/sidebar";
import {DashboardCommand} from "@/modules/dashboard/ui/components/dashboard-command";
import {useEffect, useState} from "react";

export const DashboardNavbar = () => {
    const [commandOpen, setCommandOpen] = useState(false)
    const {state, toggleSidebar, isMobile} = useSidebar();

    useEffect(() => {
        const down = (e:KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => {
            document.removeEventListener('keydown', down);
        }
    },[])

    return (
        <>
            <DashboardCommand open={commandOpen} setOpen={setCommandOpen}/>
            <nav className={'flex px-4 gap-x-2 items-center py-3 border-b bg-background'}>
                <Button className={"size-9"} variant={'outline'} onClick={toggleSidebar}>
                    {(state === "collapsed" || isMobile)
                        ? <PanelLeftIcon className={"size-4"}/>
                        : <PanelLeftCloseIcon className={"size-4"}/>}
                </Button>
                <Button
                className={'h-9 w-[240px] justify-start font-normal text-muted-foreground hover:text-muted-foreground'}
                variant={'outline'}
                onClick={() => setCommandOpen((open) => !open)}
                size={'sm'}
                >
                    <SearchIcon/>
                    Search
                    <kbd className={'ml-auto pointer-events-none inline-flex h-5 select-none items-center rounded border bg-muted px-1.5 gap-1 font-mono text-[10px] font-medium text-muted-foreground'}>
                        <span className={'text-xs'}>&#8984;</span>K
                    </kbd>
                </Button>
            </nav>
        </>
    );
};
