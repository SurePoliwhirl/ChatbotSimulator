import { useState } from 'react';
import { UploadSection } from './UploadSection';
import { ScoreDashboard } from './ScoreDashboard';
import { EvaluationItem } from './EvaluationRow';
import { EvaluationCards } from './EvaluationCards';
import { parseJson, parseCsv, parseTxt } from './parsers';
import { evaluateConversation } from './evaluationService';

export function SimulationEvaluation() {
    const [items, setItems] = useState<EvaluationItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);



    // Real API integration
    const runAnalysis = async (parsedItems: EvaluationItem[]) => {
        setIsAnalyzing(true);
        setProgress(0);

        // Initialize items with 'pending' status
        const initialItems = parsedItems.map(item => ({ ...item, status: 'pending' as const }));
        setItems(initialItems);

        let completedCount = 0;

        // Process sequentially to be nice to the API rate limits (or parallel if prefer speed)
        // Using Promise.all with map for parallel, but updating state one by one for progress bar

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

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in">
            <div className="mb-8">
                <h1 className="font-semibold text-gray-900 mb-4" style={{ fontSize: '2rem' }}>Simulation Evaluation</h1>
                <p className="text-gray-500">
                    JSON, CSV, TXT files are supported. Upload your simulation logs to evaluate the coherence, consistency, and role-play quality of your chatbots.
                </p>
            </div>

            <UploadSection
                onUpload={handleUpload}
                onReset={handleReset}
                isAnalyzing={isAnalyzing || (progress > 0 && progress < 100)}
                progress={progress}
                shouldResetOnFileSelect={progress === 100}
            />

            {items.some(i => i.status === 'completed') && (
                <div className="animate-in slide-in-from-bottom-4 duration-700 fade-in">
                    <ScoreDashboard items={items} />
                    <EvaluationCards items={items.filter(i => i.status === 'completed')} />
                </div>
            )}
        </div>
    );
}
