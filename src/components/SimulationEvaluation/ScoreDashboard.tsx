import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

interface ScoreDashboardProps {
    items: any[];
}

export function ScoreDashboard({ items }: ScoreDashboardProps) {
    const completedItems = items.filter(i => i.status === 'completed');
    const averageScore = completedItems.length
        ? (completedItems.reduce((acc, curr) => acc + curr.grade, 0) / completedItems.length).toFixed(1)
        : "0.0";

    // Calculate histogram data
    const distribution = [1, 2, 3, 4, 5].map(score => ({
        score: `${score}점`,
        count: completedItems.filter(i => i.grade === score).length
    }));

    const getBarColor = (index: number) => {
        // 0->1pt (red), 4->5pt (green)
        if (index === 4) return "#22c55e"; // 5
        if (index === 3) return "#86efac"; // 4
        if (index === 2) return "#fbbf24"; // 3
        if (index === 1) return "#fca5a5"; // 2
        return "#ef4444"; // 1
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Average Score Card */}
            <Card className="bg-white shadow-sm border-gray-100 md:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Average Quality Score</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl font-bold tracking-tight text-gray-900">{averageScore}</span>
                        <span className="text-gray-400 font-medium">/ 5.0</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Based on {completedItems.length} evaluated items
                    </p>
                </CardContent>
            </Card>

            {/* Distribution Chart Card */}
            <Card className="bg-white shadow-sm border-gray-100 md:col-span-2">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">Score Distribution</CardTitle>
                </CardHeader>
                <CardContent className="h-[120px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={distribution} barSize={40}>
                            <XAxis
                                dataKey="score"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 12, fill: '#9ca3af' }}
                                dy={10}
                            />
                            <Tooltip
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getBarColor(index)} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
