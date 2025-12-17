
import { EvaluationItem } from './EvaluationRow';

export interface EvaluationResult {
    grade: 1 | 2 | 3 | 4 | 5;
    explanation: string;
    rawScore?: {
        [key: string]: number;
    };
}

export const evaluateConversation = async (item: EvaluationItem): Promise<EvaluationResult> => {
    try {
        const response = await fetch('http://localhost:5000/api/evaluate-conversation', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                topic: item.topic,
                persona1: item.persona1,
                persona2: item.persona2,
                dialogue_log: item.dialogueLog,
            }),
        });

        const data = await response.json();

        if (data.success && data.result) {
            const result = data.result;
            const scores = result.score || {};

            // Calculate average score for the main grade
            const scoreValues = Object.values(scores) as number[];
            const averageScore = scoreValues.length > 0
                ? scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length
                : 3;

            // Round to nearest integer for the 1-5 grade UI
            const grade = Math.round(averageScore) as 1 | 2 | 3 | 4 | 5;

            // Format the explanation
            const explanation = result.reason || "";


            return {
                grade,
                explanation,
                rawScore: scores
            };
        } else {
            console.error('Evaluation failed:', data.error);
            return {
                grade: 1,
                explanation: `평가 실패: ${data.error || '알 수 없는 오류'}`
            };
        }
    } catch (error) {
        console.error('Evaluation network error:', error);
        return {
            grade: 1,
            explanation: `네트워크 오류: ${error instanceof Error ? error.message : '서버에 연결할 수 없습니다.'}`
        };
    }
};
