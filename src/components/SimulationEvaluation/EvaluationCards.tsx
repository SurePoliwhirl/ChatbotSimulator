import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Badge } from "../ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { MessageSquare, ChevronDown, Bot, User, CheckCircle2, TrendingUp } from "lucide-react";
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

    const toggleItem = (id: string) => {
        setOpenItems(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Conversation Log */}
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50/70 via-indigo-50/60 to-slate-50/60">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-100">
                            <MessageSquare className="w-5 h-5 text-slate-600" />
                        </div>
                        <CardTitle className="text-gray-700">Scenario Conversation Log</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-gray-100">
                        {items.map((item) => (
                            <Collapsible
                                key={item.id}
                                open={openItems.includes(item.id)}
                                onOpenChange={() => toggleItem(item.id)}
                            >
                                <CollapsibleTrigger className="w-full p-6 hover:bg-blue-50/60 transition-colors">
                                    <div className="flex items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-md text-xs font-semibold">
                                                    {item.topic}
                                                </Badge>
                                                <ChevronDown
                                                    className={`w-4 h-4 text-gray-400 transition-transform ${
                                                        openItems.includes(item.id) ? "rotate-180" : ""
                                                    }`}
                                                />
                                            </div>
                                            <div className="mt-3 text-left">
                                                {item.dialogueLog.slice(0, 1).map((msg, idx) => {
                                                    const info = getSpeakerInfo(msg.speaker);
                                                    return (
                                                        <div key={idx} className="flex gap-3 text-sm">
                                                            <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${info.color} shadow`}>
                                                                {info.label}:
                                                            </span>
                                                            <p className="text-gray-700 flex-1 leading-relaxed">{msg.text}</p>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </CollapsibleTrigger>

                                <CollapsibleContent>
                                    <div className="px-6 pb-6 space-y-4">
                                        {item.dialogueLog.slice(1).map((msg, idx) => {
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
                                        {item.dialogueLog.length > 3 && (
                                            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium ml-16">
                                                더 보기 ({item.dialogueLog.length - 3} more lines)
                                            </button>
                                        )}
                                    </div>
                                </CollapsibleContent>
                            </Collapsible>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Flow Evaluation */}
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50/70 via-indigo-50/60 to-slate-50/60">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-emerald-100">
                            <TrendingUp className="w-5 h-5 text-emerald-600" />
                        </div>
                        <CardTitle className="text-gray-700">Flow Evaluation</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="space-y-6">
                        {items.map((item) => (
                            <div
                                key={item.id}
                                className="p-4 rounded-lg bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-100 hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-md text-xs font-semibold">
                                        {item.topic}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-500">Flow Score</span>
                                        <Badge className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-0 px-2.5 py-1 text-xs font-semibold rounded-md">
                                            {item.grade} / 5
                                        </Badge>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 bg-white p-3 rounded border border-emerald-100">
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium text-gray-500">Analysis</span>
                                        </div>
                                        <p className="text-sm text-gray-700 leading-relaxed">
                                            {item.explanation}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
