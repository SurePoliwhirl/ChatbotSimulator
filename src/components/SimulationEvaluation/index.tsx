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
  Bot,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function SimulationEvaluation() {
    const [items, setItems] = useState<EvaluationItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
    const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
    const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai');
    const [authError, setAuthError] = useState<string | null>(null);

    // Real API integration
    const runAnalysis = async (parsedItems: EvaluationItem[]) => {
        setIsAnalyzing(true);
        setProgress(0);
        setAuthError(null); // Reset auth error

        // Initialize items with 'pending' status
        const initialItems = parsedItems.map(item => ({ ...item, status: 'pending' as const }));
        setItems(initialItems);

        let completedCount = 0;

        // Create a copy of items to update
        const updatedItems = [...initialItems];

        for (let i = 0; i < initialItems.length; i++) {
            const item = initialItems[i];

            // Call API
            const result = await evaluateConversation(item, provider);

            // Check for any error (API error, auth error, network error, etc.)
            if (result.isError || result.isAuthError) {
                setAuthError(result.explanation);
                setIsAnalyzing(false);
                setProgress(0); // Reset progress
                // Clear items to show error message
                setItems([]);
                return; // Stop analysis immediately
            }

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
        setAuthError(null);
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

    // Helper function to truncate to one decimal place (floor at second decimal)
    const truncateToOneDecimal = (num: number): number => {
        return Math.floor(num * 10) / 10;
    };

    // Calculate metric averages
    const getMetricAverage = (key: string) => {
        if (!completedItems.length) return 0.0;
        const total = completedItems.reduce((acc, curr) => {
            const score = curr.scores?.[key] || 0;
            return acc + score;
        }, 0);
        const average = total / completedItems.length;
        return truncateToOneDecimal(average);
    };

    // Calculate overall average score from all metrics (not from grade)
    const calculateOverallAverage = () => {
        if (!completedItems.length) return 0.0;
        
        // Get all metric scores from all items
        let totalScore = 0;
        let totalCount = 0;
        
        completedItems.forEach(item => {
            if (item.scores) {
                const scoreValues = Object.values(item.scores) as number[];
                scoreValues.forEach(score => {
                    totalScore += score;
                    totalCount += 1;
                });
            }
        });
        
        const average = totalCount > 0 ? totalScore / totalCount : 0.0;
        return truncateToOneDecimal(average);
    };

    const averageScore = completedItems.length > 0
        ? calculateOverallAverage().toFixed(1)
        : "0.0";

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

    const conversationSummary = completedItems.map((item, index) => {
        // Calculate average score from metrics for each item
        let itemAverage = 0;
        if (item.scores) {
            const scoreValues = Object.values(item.scores) as number[];
            if (scoreValues.length > 0) {
                const sum = scoreValues.reduce((a, b) => a + b, 0);
                itemAverage = truncateToOneDecimal(sum / scoreValues.length);
            }
        }
        
        return {
            id: item.id,
            name: `Log ${index + 1}`,
            score: itemAverage,
        };
    });

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 p-6 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* ===== Simulation Evaluation 섹션 ===== */}
                <div className="space-y-6">
                    {/* 헤더 */}
                    <div className="space-y-2">
                        <h1 className="text-2xl md:text-2xl font-semibold text-gray-800">
                            시뮬레이터 결과 평가
                        </h1>
                        <p className="text-gray-600">
                            JSON, CSV, TXT files are supported. Upload your
                            simulation logs to evaluate the coherence,
                            consistency, and role-play quality of your
                            chatbots.
                        </p>
                    </div>

                    {/* API 키 오류 알림 */}
                    {authError && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle>API 키 오류</AlertTitle>
                            <AlertDescription>
                                {authError}
                                <br />
                                <span className="text-sm mt-2 block">
                                    .env 파일에 올바른 API 키를 설정했는지 확인해주세요.
                                    {provider === 'openai' ? ' (OPENAI_API_KEY)' : ' (ANTHROPIC_API_KEY)'}
                                </span>
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* 파일 업로드 섹션 */}
                    <UploadSection
                        onUpload={handleUpload}
                        onReset={handleReset}
                        isAnalyzing={isAnalyzing || (progress > 0 && progress < 100)}
                        progress={progress}
                        shouldResetOnFileSelect={progress === 100}
                        provider={provider}
                        onProviderChange={setProvider}
                    />

                    {/* 메인 콘텐츠 그리드 - 결과가 있을 때만 표시 */}
                    {completedItems.length > 0 && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* 왼쪽: Average Quality Score */}
                            <Card className="lg:col-span-1 border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg">
                                <CardHeader>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="size-5 text-purple-600" />
                                        <CardTitle className="text-gray-800 text-xl">
                                            결과 한 눈에 보기
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    {/* 전체 점수 */}
                                    <div className="text-center py-2">
                                        <div className="text-4xl text-purple-600">
                                            {averageScore} / 5.0
                                        </div>
                                    </div>

                                    {/* 메트릭 리스트 */}
                                    <div className="space-y-1">
                                        {metrics.map((metric, index) => (
                                            <div
                                                key={index}
                                                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-purple-50 transition-colors"
                                            >
                                                <span
                                                    className={"text-gray-700"}>
                                                    {metric.name}
                                                </span>
                                                <span
                                                    className={"text-gray-700"}
                                                >
                                                    {truncateToOneDecimal(metric.score).toFixed(1)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Conversations 섹션 */}
                                    <div className="pt-4 border-t border-purple-100">
                                        <div className="flex items-center gap-2 mb-3 text-gray-600">
                                            <FileText className="size-4" />
                                            <span>대화별 점수</span>
                                        </div>
                                        <div className="space-y-1">
                                            {conversationSummary.map((conv) => (
                                                <div
                                                    key={conv.id}
                                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-purple-50 transition-colors"
                                                >
                                                    <span className="text-gray-700">
                                                        {conv.name}
                                                    </span>
                                                    <span className="text-gray-800">
                                                        {truncateToOneDecimal(conv.score).toFixed(1)}
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
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2">
                                            <BarChart3 className="size-5 text-purple-600" />
                                            <CardTitle className="text-gray-800 text-xl">
                                                평가 지표에 따른 점수 분포도
                                            </CardTitle>
                                        </div>
                                        <CardDescription className="text-gray-600">
                                            각 대화의 Context, Topic, Persona를 평가 지표로 분석합니다.
                                        </CardDescription>
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
                    <div className="space-y-6 pt-8 border-t-2 border-purple-200">
                        {/* 헤더 */}
                        <div className="flex items-center gap-3">
                            <MessageSquare className="size-8 text-purple-600" />
                            <h1 className="text-3xl md:text-2xl text-gray-800">
                                대화별 상세 분석 결과
                            </h1>
                        </div>

                        {/* 토론 주제와 각 로그 분석 결과를 하나의 Card로 묶기 */}
                        <Card className="border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg">
                            <CardContent className="p-6 space-y-6">
                                {/* 토론 주제 */}
                                {completedItems.length > 0 && (
                                    <div className="ml-2 flex items-center gap-2 pb-4 border-b border-purple-100">
                                        <span className="text-gray-700 font-semibold text-lg">
                                            토론 주제 :
                                        </span>
                                        <Badge
                                            variant="secondary"
                                            className="text-sm bg-purple-100 text-purple-700 hover:bg-purple-200"
                                        >
                                            {completedItems[0].topic}
                                        </Badge>
                                    </div>
                                )}

                                {/* 각 로그 분석 결과 */}
                                <div className="space-y-4">
                                    {completedItems.map((item, index) => {
                                        const isLogExpanded = expandedLogs.has(item.id);
                                        const isConversationExpanded = expandedConversations.has(item.id);

                                        return (
                                            <div key={item.id} className="border border-purple-100 rounded-lg overflow-hidden">
                                                <div
                                                    className="cursor-pointer hover:bg-purple-50/50 transition-colors p-4 flex items-center justify-between"
                                                    onClick={() => toggleLog(item.id)}
                                                >
                                                    <h3 className="text-lg font-semibold text-gray-800">
                                                        로그 {index + 1} 분석 결과
                                                    </h3>
                                                    <button className="text-purple-600">
                                                        {isLogExpanded ? (
                                                            <ChevronUp className="size-5" />
                                                        ) : (
                                                            <ChevronDown className="size-5" />
                                                        )}
                                                    </button>
                                                </div>

                                                {isLogExpanded && (
                                                    <div className="p-4 pt-0 space-y-6">
                                            {/* Bot 정보 */}
                                            <div className="space-y-4">
                                                <div className="p-3 rounded-lg bg-purple-50/50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Bot className="size-5 text-purple-600" />
                                                        <div className="text-sm text-gray-600">
                                                            Bot 1:
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-800">
                                                        {item.persona1}
                                                    </div>
                                                </div>
                                                <div className="p-3 rounded-lg bg-blue-50/50">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Bot className="size-5 text-blue-600" />
                                                        <div className="text-sm text-gray-600">
                                                            Bot 2:
                                                        </div>
                                                    </div>
                                                    <div className="text-gray-800">
                                                        {item.persona2}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Flow Score */}
                                            <div className="pt-4 border-t border-purple-100 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-base font-semibold text-gray-700">
                                                        Flow Score
                                                    </span>
                                                    <span className="text-lg font-semibold text-purple-600">
                                                        {(() => {
                                                            // Calculate average from metrics
                                                            if (item.scores) {
                                                                const scoreValues = Object.values(item.scores) as number[];
                                                                if (scoreValues.length > 0) {
                                                                    const sum = scoreValues.reduce((a, b) => a + b, 0);
                                                                    const avg = truncateToOneDecimal(sum / scoreValues.length);
                                                                    return `${avg.toFixed(1)} / 5`;
                                                                }
                                                            }
                                                            return "0.0 / 5";
                                                        })()}
                                                    </span>
                                                </div>
                                                <div className="flex flex-wrap gap-3">
                                                    {item.scores && Object.entries(item.scores).map(([key, score]) => (
                                                        <Badge
                                                            key={key}
                                                            className={
                                                                key === "맥락 유지"
                                                                    ? "bg-blue-500 hover:bg-blue-600 text-white px-3.5 py-1.5"
                                                                    : key === "주제 적합성"
                                                                    ? "bg-orange-500 hover:bg-orange-600 text-white px-3.5 py-1.5"
                                                                    : "bg-purple-500 hover:bg-purple-600 text-white px-3.5 py-1.5"
                                                            }
                                                        >
                                                            {key} {score}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* 분석 결과 */}
                                            <div className="pt-4 border-t border-purple-100 space-y-3">
                                                <h4 className="text-gray-800 text-base font-semibold">분석 결과</h4>
                                                <p className="text-gray-700 leading-relaxed">
                                                    {item.explanation}
                                                </p>
                                            </div>

                                            {/* 대화 내용 자세히 보기 토글 */}
                                            <div className="pt-4">
                                                <button
                                                    onClick={() => toggleConversation(item.id)}
                                                    className="w-full flex items-center justify-between pl-0 pr-3 py-3 rounded-lg hover:bg-purple-50/50 transition-colors"
                                                >
                                                    <span className="text-gray-800 text-base font-semibold">
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
                                                        {item.dialogueLog.map((conv, idx) => {
                                                            // Check if this is a token statistics message
                                                            const isTokenStats = conv.text.includes('[토큰 통계]') || conv.text.includes('총 사용 토큰 수');
                                                            
                                                            if (isTokenStats) {
                                                                return (
                                                                    <div
                                                                        key={idx}
                                                                        className="flex items-start gap-4 p-4 rounded-lg bg-amber-50/80 border-2 border-amber-200"
                                                                    >
                                                                        <div className="flex-shrink-0 size-8 rounded-full flex items-center justify-center bg-amber-500">
                                                                            <span className="text-white text-lg">📊</span>
                                                                        </div>
                                                                        <div className="flex-1 space-y-1">
                                                                            <div className="text-sm font-semibold text-amber-800">
                                                                                토큰 통계
                                                                            </div>
                                                                            <div className="text-amber-900 leading-relaxed font-mono text-sm">
                                                                                {conv.text.replace('[토큰 통계]', '').trim()}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            }
                                                            
                                                            return (
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
                                                                            <Bot className="size-5 text-white" />
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
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
