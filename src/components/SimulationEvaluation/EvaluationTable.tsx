import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../ui/table";
import { EvaluationRow, EvaluationItem } from "./EvaluationRow";

interface EvaluationTableProps {
    items: EvaluationItem[];
}

export function EvaluationTable({ items }: EvaluationTableProps) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            <Table>
                <TableHeader className="bg-gray-50/50">
                    <TableRow>
                        <TableHead className="w-[20%] font-semibold text-gray-600 pl-4 py-4">Scenario</TableHead>
                        <TableHead className="w-[60%] font-semibold text-gray-600 py-4">Conversation Log</TableHead>
                        <TableHead className="w-[20%] font-semibold text-gray-600 text-right pr-4 py-4">Flow Evaluation</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => (
                        <EvaluationRow key={item.id} item={item} />
                    ))}
                    {items.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={3} className="h-32 text-center text-gray-400">
                                No evaluation data available. Upload a conversation log file to start.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    );
}
