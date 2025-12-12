import { useState } from 'react';
import { UploadSection } from './UploadSection';
import { ScoreDashboard } from './ScoreDashboard';
import { EvaluationTable } from './EvaluationTable';
import { EvaluationItem } from './EvaluationRow';
import { parseJson, parseCsv, parseTxt } from './parsers';

export function SimulationEvaluation() {
    const [items, setItems] = useState<EvaluationItem[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [progress, setProgress] = useState(0);

    // Helper to simulate analysis delay for "Real-time" feel
    const simulateAnalysis = (parsedItems: any[]) => {
        setIsAnalyzing(true);
        setProgress(0);
        // Initialize items with 'pending' status
        const initialItems = parsedItems.map(item => ({ ...item, status: 'pending' }));
        setItems(initialItems as EvaluationItem[]);

        let completedCount = 0;
        const interval = setInterval(() => {
            completedCount++;
            const currentProgress = (completedCount / parsedItems.length) * 100;

            setProgress(currentProgress);

            setItems(prev => prev.map((item, idx) => {
                if (idx < completedCount) {
                    // In a real app, here we would merge the API result. 
                    // For now, we reveal the pre-calculated (or mocked) grade.
                    return { ...item, status: 'completed' };
                }
                return item;
            }));

            if (completedCount >= parsedItems.length) {
                clearInterval(interval);
                setIsAnalyzing(false);
            }
        }, 1500); // Slightly slower to feel like "Deep Analysis"
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
                    simulateAnalysis(parsedItems);
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
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">Conversation Flow Evaluation</h1>
                <p className="text-gray-500">
                    Upload simulation logs (JSON, CSV, TXT) to evaluate the coherence, logic, and role-play quality of your chatbots.
                </p>
            </div>

            <UploadSection
                onUpload={handleUpload}
                isAnalyzing={isAnalyzing || (progress > 0 && progress < 100)}
                progress={progress}
            />

            {items.some(i => i.status === 'completed') && (
                <div className="animate-in slide-in-from-bottom-4 duration-700 fade-in">
                    <ScoreDashboard items={items} />
                    <EvaluationTable items={items.filter(i => i.status === 'completed')} />
                </div>
            )}
        </div>
    );
}
