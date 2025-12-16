import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { TrendingUp, BarChart3 } from "lucide-react";

interface ScoreDashboardProps {
    items: any[];
}

export function ScoreDashboard({ items }: ScoreDashboardProps) {
    const completedItems = items.filter(i => i.status === 'completed');
    const averageScore = completedItems.length
        ? (completedItems.reduce((acc, curr) => acc + curr.grade, 0) / completedItems.length).toFixed(1)
        : "0.0";

    const scoreNum = parseFloat(averageScore);
    const percentage = (scoreNum / 5) * 100;

    // Calculate histogram data
    const distribution = [1, 2, 3, 4, 5].map(score => ({
        score: `${score}.0`,
        count: completedItems.filter(i => i.grade === score).length
    }));

    // 통일된 팔레트: 블루/인디고 계열로 일관
    const COLORS = ['#60a5fa', '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8'];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Average Score Card */}
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 md:col-span-1">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <TrendingUp className="size-5 text-blue-600" />
                        </div>
                        <CardTitle className="text-gray-700">Average Quality Score</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="flex items-baseline gap-2">
                        <span className="text-5xl text-blue-600 font-bold">{averageScore}</span>
                        <span className="text-2xl text-gray-400">/ 5.0</span>
                    </div>
                    <CardDescription className="mt-3">
                        Based on <span className="font-medium text-gray-700">{completedItems.length}</span> evaluated {completedItems.length === 1 ? 'item' : 'items'}
                    </CardDescription>
                    
                    {/* Progress bar */}
                    <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Distribution Chart Card */}
            <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50 md:col-span-2">
                <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-blue-100">
                            <BarChart3 className="size-5 text-blue-600" />
                        </div>
                        <CardTitle className="text--700">Score Distribution</CardTitle>
                    </div>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={distribution}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="score" 
                                tick={{ fill: '#6b7280' }}
                                axisLine={{ stroke: '#e5e7eb' }}
                            />
                            <YAxis 
                                tick={{ fill: '#6b7280' }}
                                axisLine={{ stroke: '#e5e7eb' }}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: 'white', 
                                    border: 'none',
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }}
                            />
                            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                                {distribution.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>
        </div>
    );
}
