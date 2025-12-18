import { useState } from 'react';
import { UploadSection } from './UploadSection';
import { EvaluationItem } from './EvaluationRow';
import { parseJson, parseCsv, parseTxt } from './parsers';
import { evaluateConversation } from './evaluationService';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  CheckCircle2,
  TrendingUp,
  BarChart3,
  FileText,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  User,
  Bot,
} from "lucide-react";

export function SimulationEvaluation() {
    const [items, setItems] = useState<EvaluationItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
    const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());

    // Real API integration
    const runAnalysis = async (parsedItems: EvaluationItem[]) => {
        setIsAnalyzing(true);
        setProgress(0);

        // Initialize items with 'pending' status
        const initialItems = parsedItems.map(item => ({ ...item, status: 'pending' as const }));
        setItems(initialItems);

        let completedCount = 0;

        // Create a copy of items to update
        const updatedItems = [...initialItems];

        for (let i = 0; i < initialItems.length; i++) {
            const item = initialItems[i];

            // Call API
            const result = await evaluateConversation(item);

            // Update item
            updatedItems[i] = {
                ...item,
                grade: result.grade,
                scores: result.rawScore,
                explanation: result.explanation,
                status: 'completed'
            };

            // Update State & Progress
            completedCount++;
            const currentProgress = (completedCount / initialItems.length) * 100;
            setProgress(currentProgress);
            setItems([...updatedItems]); // spread to trigger re-render
        }

        setIsAnalyzing(false);
    };

    const handleReset = () => {
        setItems([]);
        setIsAnalyzing(false);
        setProgress(0);
        setExpandedLogs(new Set());
        setExpandedConversations(new Set());
    };

    const handleUpload = (files: FileList) => {
        if (files.length === 0) return;

        const file = files[0];
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                let parsedItems: EvaluationItem[] = [];

                if (file.name.endsWith('.json')) {
                    parsedItems = parseJson(content);
                } else if (file.name.endsWith('.csv')) {
                    parsedItems = parseCsv(content);
                } else if (file.name.endsWith('.txt')) {
                    parsedItems = parseTxt(content);
                } else {
                    alert("Unsupported file format. Please upload JSON, CSV, or TXT.");
                    return;
                }

                if (parsedItems.length > 0) {
                    runAnalysis(parsedItems);
                } else {
                    alert("No valid conversation sets found in the file.");
                }

            } catch (error) {
                console.error("File parse error:", error);
                alert("Failed to parse the file. Please check the format.");
            }
        };

        reader.readAsText(file);
    };

    const toggleLog = (id: string) => {
        setExpandedLogs(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const toggleConversation = (id: string) => {
        setExpandedConversations(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const completedItems = items.filter(i => i.status === 'completed');

    // Calculate average score
    const averageScore = completedItems.length > 0
        ? (completedItems.reduce((acc, curr) => acc + (curr.grade || 0), 0) / completedItems.length).toFixed(1)
        : "0.0";

    // Calculate metric averages
    const getMetricAverage = (key: string) => {
        if (!completedItems.length) return 0.0;
        const total = completedItems.reduce((acc, curr) => {
            const score = curr.scores?.[key] || 0;
            return acc + score;
        }, 0);
        return total / completedItems.length;
    };

    const metrics = [
        { name: "맥락 유지", score: getMetricAverage("맥락 유지") },
        { name: "주제 적합성", score: getMetricAverage("주제 적합성") },
        { name: "페르소나 일관성", score: getMetricAverage("페르소나 일관성"), highlight: true },
    ];

    // Prepare chart data
    const chartData = completedItems.map((item, index) => ({
        name: `Log ${index + 1}`,
        "맥락 유지": item.scores?.["맥락 유지"] || 0,
        "주제 적합성": item.scores?.["주제 적합성"] || 0,
        "페르소나 일관성": item.scores?.["페르소나 일관성"] || 0,
    }));

    const conversationSummary = completedItems.map((item, index) => ({
        id: item.id,
        name: `Log ${index + 1}`,
        score: item.grade || 0,
    }));

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* ===== Simulation Evaluation 섹션 ===== */}
                <div className="space-y-6">
                    {/* 헤더 */}
                    <div className="space-y-2">
                        <h1 className="text-3xl md:text-4xl text-gray-800">
                            Simulation Evaluation
                        </h1>
                        <p className="text-gray-600">
                            JSON, CSV, TXT files are supported. Upload your
                            simulation logs to evaluate the coherence,
                            consistency, and role-play quality of your
                            chatbots.
                        </p>
                    </div>

                    {/* 파일 업로드 섹션 */}
                    <UploadSection
                        onUpload={handleUpload}
                        onReset={handleReset}
                        isAnalyzing={isAnalyzing || (progress > 0 && progress < 100)}
                        progress={progress}
                        shouldResetOnFileSelect={progress === 100}
                    />

                    {/* 분석 완료 카드 - progress가 100%일 때만 표시 */}
                    {progress === 100 && completedItems.length > 0 && (
                        <Card className="border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg">
                            <CardContent className="p-6 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <CheckCircle2 className="size-6 text-purple-600" />
                                    <div>
                                        <h3 className="text-lg text-gray-800">
                                            Analysis Complete
                                        </h3>
                                        <p className="text-sm text-gray-500">
                                            All items evaluated successfully
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-purple-300 text-purple-600 hover:bg-purple-50"
                                    onClick={handleReset}
                                >
                                    Upload New File
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {/* 메인 콘텐츠 그리드 - 결과가 있을 때만 표시 */}
                    {completedItems.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* 왼쪽: Average Quality Score */}
                            <Card className="lg:col-span-1 border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="size-5 text-purple-600" />
                                        <CardTitle className="text-gray-800">
                                            Average Quality Score
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* 전체 점수 */}
                                    <div className="text-center py-4">
                                        <div className="text-4xl text-purple-600">
                                            {averageScore} / 5.0
                                        </div>
                                    </div>

                                    {/* 메트릭 리스트 */}
                                    <div className="space-y-3">
                                        {metrics.map((metric, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-purple-50 transition-colors"
                                            >
                                                <span
                                                    className={
                                                        metric.highlight
                                                            ? "text-purple-600"
                                                            : "text-gray-700"
                                                    }
                                                >
                                                    {metric.name}
                                                </span>
                                                <span
                                                    className={
                                                        metric.highlight
                                                            ? "text-purple-600"
                                                            : "text-gray-800"
                                                    }
                                                >
                                                    {metric.score.toFixed(1)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Conversations 섹션 */}
                                    <div className="pt-4 border-t border-purple-100">
                                        <div className="flex items-center gap-2 mb-3 text-gray-600">
                                            <FileText className="size-4" />
                                            <span>Conversations</span>
                                        </div>
                                        <div className="space-y-2">
                                            {conversationSummary.map((conv) => (
                                                <div
                                                    key={conv.id}
                                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-purple-50 transition-colors"
                                                >
                                                    <span className="text-gray-700">
                                                        {conv.name}
                                                    </span>
                                                    <span className="text-gray-800">
                                                        {conv.score.toFixed(1)}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 오른쪽: 차트 */}
                            <Card className="lg:col-span-2 border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="size-5 text-purple-600" />
                                        <div>
                                            <CardTitle className="text-gray-800">
                                                Score Distribution by Metric
                                            </CardTitle>
                                            <CardDescription className="text-gray-600">
                                                Analysis of Context, Topic, and Persona
                                                scores across conversations
                                            </CardDescription>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <ResponsiveContainer width="100%" height={400}>
                                        <BarChart
                                            data={chartData}
                                            margin={{
                                                top: 20,
                                                right: 30,
                                                left: 20,
                                                bottom: 5,
                                            }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#e9d5ff"
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fill: "#6b7280" }}
                                                axisLine={{ stroke: "#c4b5fd" }}
                                            />
                                            <YAxis
                                                tick={{ fill: "#6b7280" }}
                                                axisLine={{ stroke: "#c4b5fd" }}
                                                domain={[0, 5]}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor:
                                                        "rgba(255, 255, 255, 0.95)",
                                                    border: "1px solid #c4b5fd",
                                                    borderRadius: "8px",
                                                    boxShadow:
                                                        "0 4px 6px rgba(0, 0, 0, 0.1)",
                                                }}
                                            />
                                            <Legend
                                                wrapperStyle={{ paddingTop: "20px" }}
                                                iconType="circle"
                                            />
                                            <Bar
                                                dataKey="맥락 유지"
                                                fill="#3b82f6"
                                                radius={[8, 8, 0, 0]}
                                                maxBarSize={60}
                                            />
                                            <Bar
                                                dataKey="주제 적합성"
                                                fill="#f59e0b"
                                                radius={[8, 8, 0, 0]}
                                                maxBarSize={60}
                                            />
                                            <Bar
                                                dataKey="페르소나 일관성"
                                                fill="#a855f7"
                                                radius={[8, 8, 0, 0]}
                                                maxBarSize={60}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>

                {/* ===== Scenario Conversation Log 섹션 ===== */}
                {completedItems.length > 0 && (
                    <div className="space-y-6 pt-8 border-t-4 border-purple-200">
                        {/* 헤더 */}
                        <div className="flex items-center gap-3">
                            <MessageSquare className="size-8 text-purple-600" />
                            <h1 className="text-3xl md:text-4xl text-gray-800">
                                Scenario Conversation Log
                            </h1>
                        </div>

                        {/* 토론 주제 카드 */}
                        {completedItems.length > 0 && (
                            <Card className="border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2">
                                        <span className="text-gray-700">
                                            토론 주제 :
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="bg-purple-100 text-purple-700 hover:bg-purple-200"
                                        >
                                            {completedItems[0].topic}
                                        </Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* 각 로그 분석 결과 */}
                        {completedItems.map((item, index) => {
                            const isLogExpanded = expandedLogs.has(item.id);
                            const isConversationExpanded = expandedConversations.has(item.id);

                            return (
                                <Card key={item.id} className="border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg">
                                    <CardHeader
                                        className="cursor-pointer hover:bg-purple-50/50 transition-colors rounded-t-lg"
                                        onClick={() => toggleLog(item.id)}
                                    >
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-gray-800">
                                                로그 {index + 1} 분석 결과
                                            </CardTitle>
                                            <button className="text-purple-600">
                                                {isLogExpanded ? (
                                                    <ChevronUp className="size-5" />
                                                ) : (
                                                    <ChevronDown className="size-5" />
                                                )}
                                            </button>
                                        </div>
                                    </CardHeader>

                                    {isLogExpanded && (
                                        <CardContent className="space-y-6">
                                            {/* Bot 정보 */}
                                            <div className="space-y-4">
                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-50/50">
                                                    <User className="size-5 text-purple-600 mt-0.5" />
                                                    <div className="flex-1">
                                                        <div className="text-sm text-gray-600 mb-1">
                                                            Bot 1:
                                                        </div>
                                                        <div className="text-gray-800">
                                                            {item.persona1}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50/50">
                                                    <Bot className="size-5 text-blue-600 mt-0.5" />
                                                    <div className="flex-1">
                                                        <div className="text-sm text-gray-600 mb-1">
                                                            Bot 2:
                                                        </div>
                                                        <div className="text-gray-800">
                                                            {item.persona2}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Flow Score */}
                                            <div className="pt-4 border-t border-purple-100 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-lg text-gray-700">
                                                        Flow Score
                                                    </span>
                                                    <span className="text-2xl text-purple-600">
                                                        {item.grade || 0} / 5
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-3">
                                                    {item.scores && Object.entries(item.scores).map(([key, score]) => (
                                                        <Badge
                                                            key={key}
                                                            className={
                                                                key === "맥락 유지"
                                                                    ? "bg-blue-500 hover:bg-blue-600 text-white px-4 py-1.5"
                                                                    : key === "주제 적합성"
                                                                    ? "bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5"
                                                                    : "bg-purple-500 hover:bg-purple-600 text-white px-4 py-1.5"
                                                            }
                                                        >
                                                            {key} {score}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 분석 결과 */}
                                            <div className="pt-4 border-t border-purple-100 space-y-3">
                                                <h4 className="text-gray-800">분석 결과</h4>
                                                <p className="text-gray-700 leading-relaxed">
                                                    {item.explanation}
                                                </p>
                                            </div>

                                            {/* 대화 내용 자세히 보기 토글 */}
                                            <div className="pt-4 border-t border-purple-100">
                                                <button
                                                    onClick={() => toggleConversation(item.id)}
                                                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-purple-50/50 transition-colors"
                                                >
                                                    <span className="text-gray-800">
                                                        대화 내용 자세히 보기
                                                    </span>
                                                    {isConversationExpanded ? (
                                                        <ChevronUp className="size-5 text-purple-600" />
                                                    ) : (
                                                        <ChevronDown className="size-5 text-purple-600" />
                                                    )}
                                                </button>

                                                {isConversationExpanded && (
                                                    <div className="mt-4 space-y-4">
                                                        {item.dialogueLog.map((conv, idx) => (
                                                            <div
                                                                key={idx}
                                                                className={`flex items-start gap-4 p-4 rounded-lg ${
                                                                    conv.speaker.includes('1')
                                                                        ? "bg-purple-50/70"
                                                                        : "bg-blue-50/70"
                                                                }`}
                                                            >
                                                                <div
                                                                    className={`flex-shrink-0 size-8 rounded-full flex items-center justify-center ${
                                                                        conv.speaker.includes('1')
                                                                            ? "bg-purple-500"
                                                                            : "bg-blue-500"
                                                                    }`}
                                                                >
                                                                    {conv.speaker.includes('1') ? (
                                                                        <User className="size-5 text-white" />
                                                                    ) : (
                                                                        <Bot className="size-5 text-white" />
                                                                    )}
                                                                </div>
                                                                <div className="flex-1 space-y-1">
                                                                    <div
                                                                        className={`text-sm ${
                                                                            conv.speaker.includes('1')
                                                                                ? "text-purple-700"
                                                                                : "text-blue-700"
                                                                        }`}
                                                                    >
                                                                        {conv.speaker}:
                                                                    </div>
                                                                    <div className="text-gray-800 leading-relaxed">
                                                                        {conv.text}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
