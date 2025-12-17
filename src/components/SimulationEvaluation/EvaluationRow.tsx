import { useState } from 'react';
import { ChevronDown, ChevronUp, Info, MessageSquare, User, Bot } from 'lucide-react';
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { TableCell, TableRow } from "../ui/table";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "../ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";

export interface EvaluationItem {
    id: string;
    topic: string;
    persona1: string;
    persona2: string;
    dialogueLog: Array<{ speaker: string; text: string }>;
    grade: 1 | 2 | 3 | 4 | 5 | undefined;
    scores?: { [key: string]: number };
    explanation: string;
    status: 'pending' | 'completed';
}

interface EvaluationRowProps {
    item: EvaluationItem;
}

export function EvaluationRow({ item }: EvaluationRowProps) {
    const [isOpen, setIsOpen] = useState(false);

    if (item.status === 'pending') {
        return null;
    }

    const getBadgeColor = (grade: number) => {
        if (grade >= 5) return "bg-green-100 text-green-700 hover:bg-green-200 border-green-200";
        if (grade >= 3) return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-200";
        return "bg-red-100 text-red-700 hover:bg-red-200 border-red-200";
    };

    return (
        <TableRow className="align-top hover:bg-gray-50/50">
            {/* Scenario Context */}
            <TableCell className="w-[20%] min-w-[200px] py-4 align-top">
                <div className="flex flex-col gap-2">
                    <div className="font-semibold text-gray-900">{item.topic}</div>
                    <div className="flex flex-col gap-1 text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-blue-500" />
                            <span>{item.persona1}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Bot className="w-3 h-3 text-purple-500" />
                            <span>{item.persona2}</span>
                        </div>
                    </div>
                </div>
            </TableCell>

            {/* Dialogue Preview / Full Log */}
            <TableCell className="w-[60%] py-4 align-top">
                <div className="space-y-3">
                    {/* Show first 3 turns always */}
                    {item.dialogueLog.slice(0, 3).map((turn, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className={`font-semibold shrink-0 w-16 ${turn.speaker === 'Bot 1' ? 'text-blue-600' : 'text-purple-600'}`}>
                                {turn.speaker}:
                            </span>
                            <span className="text-gray-700 text-pretty">{turn.text}</span>
                        </div>
                    ))}

                    {/* Collapsible for the rest */}
                    {item.dialogueLog.length > 3 && (
                        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
                            <CollapsibleContent className="space-y-3 mt-3 animate-in fade-in slide-in-from-top-1">
                                {item.dialogueLog.slice(3).map((turn, idx) => (
                                    <div key={`more-${idx}`} className="flex items-start gap-2 text-sm">
                                        <span className={`font-semibold shrink-0 w-16 ${turn.speaker === 'Bot 1' ? 'text-blue-600' : 'text-purple-600'}`}>
                                            {turn.speaker}:
                                        </span>
                                        <span className="text-gray-700 text-pretty">{turn.text}</span>
                                    </div>
                                ))}
                            </CollapsibleContent>
                            <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="sm" className="mt-2 h-6 text-xs text-gray-400 hover:text-gray-900 gap-1 pl-0">
                                    {isOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                                    {isOpen ? '접기 (Show Less)' : `더 보기 (${item.dialogueLog.length - 3} more lines)`}
                                </Button>
                            </CollapsibleTrigger>
                        </Collapsible>
                    )}
                </div>
            </TableCell>

            {/* Evaluation Result */}
            <TableCell className="w-[20%] py-4 align-top text-right">
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Flow Score</span>
                        <Badge variant="outline" className={`px-2.5 py-1 text-sm font-semibold rounded-md ${getBadgeColor(item.grade || 0)}`}>
                            {item.grade || '?'} / 5
                        </Badge>
                    </div>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <div className="text-xs text-gray-600 text-right bg-gray-50 p-3 rounded-lg border border-gray-100 max-w-[240px] cursor-help hover:bg-gray-100 transition-colors">
                                    <p className="font-semibold text-gray-900 mb-1 flex items-center justify-end gap-1">
                                        <MessageSquare className="w-3 h-3" /> Analysis
                                    </p>
                                    {item.explanation}
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                                <p>Detailed analysis of conversation flow and logic.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                </div>
            </TableCell>
        </TableRow>
    );
}
