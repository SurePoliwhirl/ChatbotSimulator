import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { TrendingUp, BarChart3, ListChecks } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface ScoreDashboardProps {
    items: any[];
}

export function ScoreDashboard({ items }: ScoreDashboardProps) {
    const completedItems = items.filter(i => i.status === 'completed');

    // 1. Calculate Overall Average
    const totalAverage = completedItems.length
        ? (completedItems.reduce((acc, curr) => acc + (curr.grade || 0), 0) / completedItems.length).toFixed(1)
        : "0.0";
    const totalScoreNum = parseFloat(totalAverage);
    const percentage = (totalScoreNum / 5) * 100;

    // 2. Helper for Detailed Averages (Per Metric)
    const getAverage = (key: string) => {
        if (!completedItems.length) return "0.0";
        const total = completedItems.reduce((acc, curr) => {
            const score = curr.scores?.[key] || 0;
            return acc + score;
        }, 0);
        return (total / completedItems.length).toFixed(1);
    };

    // Metric Config
    const METRICS = [
        { key: "맥락 유지", label: "Context", color: "#3b82f6", bg: "bg-blue-100", textColor: "text-blue-600" },
        { key: "주제 적합성", label: "Topic", color: "#f59e0b", bg: "bg-amber-100", textColor: "text-amber-600" },
        { key: "페르소나 일관성", label: "Persona", color: "#8b5cf6", bg: "bg-purple-100", textColor: "text-purple-600" },
    ];

    const detailedStats = METRICS.map(m => ({
        ...m,
        value: getAverage(m.key)
    }));

    // 3. Prepare Chart Data
    // Ensure we handle potential missing keys gracefully
    const chartData = completedItems.map((item, index) => ({
        name: `Log ${index + 1}`,
        "Context": item.scores?.["맥락 유지"] || 0,
        "Topic": item.scores?.["주제 적합성"] || 0,
        "Persona": item.scores?.["페르소나 일관성"] || 0,
        "average": item.grade || 0 // Average per conversation
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* 1. Average Score Card (Left Column) */}
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 md:col-span-1 flex flex-col h-[500px]">
                <CardHeader className="pb-3 flex-none">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <TrendingUp className="size-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-gray-700">Average Quality Score</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0">
                    {/* Big Score */}
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-5xl text-blue-600 font-bold">{totalAverage}</span>
                        <span className="text-2xl text-gray-400">/ 5.0</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-6 flex-none">
                        <div
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>

                    {/* Detailed Metric Averages */}
                    <div className="space-y-3 mb-6 flex-none">
                        {detailedStats.map((stat) => (
                            <div key={stat.label} className="flex items-center justify-between bg-white/60 p-2 rounded-lg">
                                <span className="text-sm font-medium text-gray-600 flex items-center gap-2">
                                    <span className={`w-2 h-2 rounded-full ${stat.bg.replace('bg-', 'bg-').replace('100', '500')}`} />
                                    {stat.key}
                                </span>
                                <span className={`font-bold ${stat.textColor}`}>{stat.value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Per Conversation List (New Addition) */}
                    <div className="flex items-center gap-2 mb-2 pt-4 border-t border-blue-100 flex-none">
                        <ListChecks className="size-4 text-gray-500" />
                        <span className="text-sm font-semibold text-gray-700">Conversations</span>
                    </div>
                    <ScrollArea className="flex-1 -mx-2 px-2">
                        <div className="space-y-2">
                            {completedItems.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between text-sm p-2 rounded hover:bg-white/50 transition-colors">
                                    <span className="text-gray-600">Log {idx + 1}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-bold ${item.grade >= 4 ? 'text-green-600' : item.grade >= 3 ? 'text-amber-600' : 'text-red-600'}`}>
                                            {item.grade?.toFixed(1) || "0.0"}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* 2. Chart Card (Right Column, spans 2) */}
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 md:col-span-2 h-[500px]">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <BarChart3 className="size-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle className="text-gray-700">Score Distribution by Metric</CardTitle>
                            <CardDescription>
                                Analysis of Context, Topic, and Persona scores across conversations
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="h-[400px]">
                    <div className="h-full w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                                <XAxis
                                    dataKey="name"
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                    tickLine={false}
                                />
                                <YAxis
                                    domain={[0, 5]}
                                    tick={{ fill: '#6b7280', fontSize: 12 }}
                                    axisLine={{ stroke: '#e5e7eb' }}
                                    tickLine={false}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.5)' }}
                                    contentStyle={{
                                        borderRadius: '12px',
                                        border: 'none',
                                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '20px' }} iconType="circle" />

                                <Bar dataKey="Context" name="맥락 유지" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                                <Bar dataKey="Topic" name="주제 적합성" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={60} />
                                <Bar dataKey="Persona" name="페르소나 일관성" fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={60} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
