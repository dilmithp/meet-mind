import { MeetingGetOne } from "@/modules/meetings/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BookOpenTextIcon, ClockFadingIcon, FileTextIcon, FileVideoIcon, SparkleIcon, SparklesIcon, DownloadIcon } from "lucide-react";
import Link from "next/link";
import { GeneratedAvatar } from "@/components/generated-avatar";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { formatDuration } from "@/lib/utils";
import Markdown from "react-markdown";
import { Transcript } from "@/components/ui/transcript";
import { ChatProvider } from "@/modules/agents/ui/components/chat-provider";
import { MeetingNotes } from "./meeting-notes";
import { Button } from "@/components/ui/button";

// Import the new PDF components and hooks
import { PDFDownloadLink } from '@react-pdf/renderer';
import { SummaryPdfDocument } from './summary-pdf-document';
import { useState, useEffect } from "react";

interface Props {
    data: MeetingGetOne;
}

export const CompletedState = ({ data }: Props) => {
    // This state ensures the PDF link only renders on the client
    const [isClient, setIsClient] = useState(false);
    useEffect(() => {
        setIsClient(true);
    }, []);

    return (
        <div className={'flex flex-col gap-y-4'}>
            <Tabs defaultValue={'summary'}>
                <div className={'bg-white rounded-lg border px-3'}>
                    <ScrollArea>
                        <TabsList className={'p-0 bg-background justify-start rounded-none h-13'}>
                            <TabsTrigger
                                value={'summary'}
                                className={'text-muted-foreground rounded-none bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-accent-foreground h-full hover:text-accent-foreground'}
                            >
                                <BookOpenTextIcon/>
                                Summary & Notes
                            </TabsTrigger>
                            <TabsTrigger
                                value={'transcript'}
                                className={'text-muted-foreground rounded-none bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-accent-foreground h-full hover:text-accent-foreground'}
                            >
                                <FileTextIcon/>
                                Transcript
                            </TabsTrigger>
                            <TabsTrigger
                                value={'recording'}
                                className={'text-muted-foreground rounded-none bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-accent-foreground h-full hover:text-accent-foreground'}
                            >
                                <FileVideoIcon/>
                                Recording
                            </TabsTrigger>
                            <TabsTrigger
                                value={'chat'}
                                className={'text-muted-foreground rounded-none bg-background data-[state=active]:shadow-none border-b-2 border-transparent data-[state=active]:border-b-primary data-[state=active]:text-accent-foreground h-full hover:text-accent-foreground'}
                            >
                                <SparkleIcon/>
                                Ask AI
                            </TabsTrigger>
                        </TabsList>
                        <ScrollBar orientation={'horizontal'}/>
                    </ScrollArea>
                </div>
                <TabsContent value= "chat">
                    <ChatProvider meetingId ={data.id} meetingName={data.name}/>
                </TabsContent>
                <TabsContent value= "transcript">
                    <Transcript meetingId ={data.id} />
                </TabsContent>
                <TabsContent value={"recording"}>
                    <div className={'bg-white rounded-lg border px-4 py-5'}>
                        <video
                            src={data.recordingUrl!}
                            className={'w-full rounded-lg'}
                            controls
                        />
                    </div>
                </TabsContent>
                <TabsContent value={"summary"}>
                    <div className={'bg-white rounded-lg border mb-6'}>
                        <div className={'p-4'}>
                            <div className={'px-4 py-5 gap-y-5 flex flex-col'}>
                                <h2 className={'text-2xl font-medium capitalize'}>{data.name}</h2>
                                <div className={'flex gap-x-2 items-center'}>
                                    <Link
                                        href={`/agents/${data.agent.id}`}
                                        className={'flex items-center gap-x-2 underline underline-offset-4 capitalize'}
                                    >
                                        <GeneratedAvatar seed={data.agent.name} variant={'botttsNeutral'} className={'size-5'}/>
                                        {data.agent.name}
                                    </Link>
                                    <p>{data.startedAt ? format(new Date(data.startedAt), "PPP") : ""}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className={'flex gap-x-2 items-center'}>
                                        <SparklesIcon className={'size-4'}/>
                                        <p className="font-medium">AI Generated Summary</p>
                                    </div>

                                    {/* Replace the old Button with the new PDFDownloadLink */}
                                    {isClient && (
                                        <PDFDownloadLink
                                            document={<SummaryPdfDocument data={data} />}
                                            fileName={`Summary - ${data.name.replace(/\s/g, '_')}.pdf`}
                                        >
                                            {({ loading }) => (
                                                <Button disabled={loading} variant="outline" size="sm">
                                                    <DownloadIcon className="size-4 mr-2" />
                                                    {loading ? 'Generating...' : 'Download PDF'}
                                                </Button>
                                            )}
                                        </PDFDownloadLink>
                                    )}
                                </div>
                                <Badge variant={'outline'} className={'flex items-center gap-x-2 [&>svg]:size-4 w-fit'}>
                                    <ClockFadingIcon className={'text-blue-700'}/>
                                    {data.duration ? formatDuration(data.duration) : "No duration"}
                                </Badge>
                                <div>
                                    <Markdown
                                        components={{
                                            h2: (props) => <h2 className={'text-xl font-medium mb-6'} {...props}/>,
                                            h3: (props) => <h3 className={'text-lg font-medium mb-6'} {...props}/>,
                                            h4: (props) => <h4 className={'text-base font-medium mb-6'} {...props}/>,
                                            p: (props) => <p className={'leading-relaxed mb-6'} {...props}/>,
                                            ul: (props) => <ul className={'list-disc list-inside mb-6'} {...props}/>,
                                            ol: (props) => <ol className={'list-decimal list-inside mb-6'} {...props}/>,
                                            li: (props) => <li className={'mb-1'} {...props}/>,
                                            strong: (props) => <strong className={'font-semibold'} {...props}/>,
                                            code: (props) => <code className={'bg-gray-100 px-1 py-0.5'} {...props}/>,
                                            blockquote: (props) => <blockquote className={'border-l-4 pl-4 italic my-4'} {...props}/>,
                                        }}
                                    >
                                        {data.summary || "No summary was generated for this meeting."}
                                    </Markdown>
                                </div>
                            </div>
                        </div>
                    </div>
                    <MeetingNotes meetingId={data.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
};