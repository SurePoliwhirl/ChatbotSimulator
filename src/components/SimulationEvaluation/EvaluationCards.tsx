import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { MessageSquare, ChevronDown, Bot, User, CheckCircle2, TrendingUp, Sparkles } from "lucide-react";
import { EvaluationItem } from "./EvaluationRow";

interface EvaluationCardsProps {
    items: EvaluationItem[];
}

const getSpeakerInfo = (speaker: string) => {
    if (speaker === "Bot 1") return { label: "Bot 1", color: "bg-blue-100 text-blue-700" };
    if (speaker === "Bot 2") return { label: "Bot 2", color: "bg-purple-100 text-purple-700" };
    return { label: speaker, color: "bg-gray-100 text-gray-700" };
};

export function EvaluationCards({ items }: EvaluationCardsProps) {
    const [openItems, setOpenItems] = useState<string[]>([]);
    const [expandedDetails, setExpandedDetails] = useState<string[]>([]);

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleDetail = (id: string) => {
        setExpandedDetails(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    return (
        <div className="mt-0 mb-0">
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50/70 via-indigo-50/60 to-slate-50/60 gap-0">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 rounded-lg bg-slate-100">
                            <MessageSquare className="w-5 h-5 text-slate-600" />
                        </div>
                        <CardTitle className="text-gray-700">Scenario Conversation Log</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0 pb-0">
                    {items.length > 0 && (
                        <div className="pl-2 pr-6 pt-16 pb-4 mb-4">
                            <Badge
                                variant="secondary"
                                className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-6 py-2 rounded-md text-xl font-semibold border-0"
                            >
                                토론 주제 : {items[0].topic}
                            </Badge>
                        </div>
                    )}
                    <div className="divide-y divide-gray-100">
                        {items.map((item, index) => (
                            <Collapsible
                                key={item.id}
                                open={openItems.includes(item.id)}
                                onOpenChange={() => toggleItem(item.id)}
                            >
                                <CollapsibleTrigger className="w-full p-4 ml-2 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl font-semibold text-gray-700">로그 {index + 1} 분석 결과</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-medium text-gray-500">
                                                {openItems.includes(item.id) ? "접기" : "펼치기"}
                                            </span>
                                            <ChevronDown
                                                className={`w-4 h-4 text-gray-400 transition-transform ${openItems.includes(item.id) ? "rotate-180" : ""
                                                    }`}
                                            />
                                        </div>
                                    </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <div className="px-6 pb-6 pt-2">
                                        {/* Personas Section */}
                                        <div className="mb-6 pb-3 border-b border-gray-200">
                                            <div className="flex flex-col gap-1.5 text-xs text-gray-600 mt-2">
                                                <div className="flex items-center gap-2 py-1">
                                                    <User className="w-3.5 h-3.5 text-blue-500" />
                                                    <span className="font-medium text-gray-700">Bot 1:</span>
                                                    <span className="text-gray-600">{item.persona1}</span>
                                                </div>
                                                <div className="flex items-center gap-2 py-1">
                                                    <Bot className="w-3.5 h-3.5 text-purple-500" />
                                                    <span className="font-medium text-gray-700">Bot 2:</span>
                                                    <span className="text-gray-600">{item.persona2}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <Collapsible
                                            open={expandedDetails.includes(item.id)}
                                            onOpenChange={() => toggleDetail(item.id)}
                                        >
                                            {/* Internal Expand/Collapse Trigger */}
                                            <CollapsibleTrigger asChild>
                                                <div className="flex items-center justify-between mb-4 cursor-pointer p-1 rounded transition-colors group">
                                                    <span className="text-xs font-medium text-gray-500 group-hover:text-gray-700">
                                                        {expandedDetails.includes(item.id) ? "접기" : "대화 내역 보기"}
                                                    </span>
                                                    <ChevronDown
                                                        className={`w-4 h-4 text-gray-400 transition-transform ${expandedDetails.includes(item.id) ? "rotate-180" : ""
                                                            } group-hover:text-gray-600`}
                                                    />
                                                </div>
                                            </CollapsibleTrigger>

                                            <CollapsibleContent>
                                                {/* Full Dialogue Log */}
                                                <div className="space-y-4 mb-6">
                                                    {item.dialogueLog.map((msg, idx) => {
                                                        const info = getSpeakerInfo(msg.speaker);
                                                        return (
                                                            <div key={idx} className="flex gap-3 text-sm">
                                                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${info.color} shadow h-fit`}>
                                                                    {info.label}:
                                                                </span>
                                                                <p className="text-gray-700 flex-1 leading-relaxed">{msg.text}</p>
                                                            </div>
                                                        );
                                                    })}
                                                </div>

                                                {/* Flow Score and Analysis */}
                                                <div className="pt-4 border-t border-gray-100">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-xl text-gray-700 font-medium">Flow Score</span>
                                                        <Badge className="bg-gradient-to-r from-emerald-600 to-teal-600 text-black border-0 px-2.5 py-1 text-xs font-semibold rounded-md">
                                                            {item.grade} / 5
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-start gap-2 bg-emerald-50/50 p-3 rounded border border-emerald-100 mb-4">
                                                        <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-base font-semibold text-gray-700">분석 결과</span>
                                                            </div>
                                                            <p className="text-sm text-gray-800 leading-relaxed">
                                                                {item.explanation}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </CollapsibleContent>
                                        </Collapsible>
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div >
    );
}
