import jsPDF from "jspdf";
import "jspdf-autotable";
import { AgentsGetMany } from "@/modules/agents/types";

export const generateAgentsPdf = (agents: AgentsGetMany) => {
    const doc = new jsPDF();

    doc.text("My Agents Report", 14, 20);

    const tableData = agents.map((agent) => [
        agent.name,
        agent.instructions,
        agent.meetingCount,
    ]);

    (doc as any).autoTable({
        head: [["Name", "Instructions", "Meetings"]],
        body: tableData,
        startY: 30,
    });

    doc.save("my-agents-report.pdf");
};