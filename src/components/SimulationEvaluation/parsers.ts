import { EvaluationItem } from './EvaluationRow';

// MOCK GRADING GENERATOR (Since LLM API is separate)
const generateMockGrading = (id: string, dialogueLog: any[]) => {
    const mockGrade = Math.floor(Math.random() * 3) + 3; // 3 to 5
    const mockExplanations = [
        "Conversation flows logically. Personas are well maintained throughout the session.",
        "Some minor topic drifts detected, but overall coherence is acceptable.",
        "Excellent debate structure with clear arguments and counter-arguments.",
        "Engagement level is high, though Bot 2 became slightly repetitive near the end.",
        "Interaction feels a bit robotic in the middle, but concludes effectively."
    ];
    return {
        grade: mockGrade as any,
        explanation: mockExplanations[Math.floor(Math.random() * mockExplanations.length)]
    };
};

export const parseJson = (content: string): EvaluationItem[] => {
    const data = JSON.parse(content);
    if (!data.conversationSets || !Array.isArray(data.conversationSets)) {
        throw new Error("Invalid JSON structure");
    }
    return data.conversationSets.map((set: any, index: number) => {
        const id = `json-${Date.now()}-${index}`;
        const dialogueLog = set.messages.map((msg: any) => ({
            speaker: `Bot ${msg.bot}`,
            text: msg.text
        }));
        const grading = generateMockGrading(id, dialogueLog);

        return {
            id,
            topic: data.config?.topic || 'Unknown Topic',
            persona1: data.config?.persona1 || 'Bot 1',
            persona2: data.config?.persona2 || 'Bot 2',
            dialogueLog,
            grade: grading.grade,
            explanation: grading.explanation,
            status: 'pending'
        };
    });
};

export const parseCsv = (content: string): EvaluationItem[] => {
    const lines = content.split('\n');
    // Structure: 세트,챗봇,메시지,시간
    // Skip header and BOM if present
    const rows = lines.slice(1).filter(line => line.trim() !== '');

    const sets: Record<string, any[]> = {};

    rows.forEach(row => {
        // Simple CSV parser handling quotes
        const matches = row.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
        const parts = matches || row.split(',');

        if (parts.length >= 3) {
            const setNum = parts[0].replace(/"/g, '').trim();
            const botRaw = parts[1].replace(/"/g, '').trim();
            const text = parts[2].replace(/"/g, '').replace(/""/g, '"').trim();

            // Normalize Bot Name
            const speaker = botRaw.includes('1') ? 'Bot 1' : botRaw.includes('2') ? 'Bot 2' : botRaw;

            if (!sets[setNum]) sets[setNum] = [];
            sets[setNum].push({ speaker, text });
        }
    });

    return Object.entries(sets).map(([setNum, messages], index) => {
        const id = `csv-${Date.now()}-${index}`;
        const grading = generateMockGrading(id, messages);
        return {
            id,
            topic: 'Imported CSV Conversation',
            persona1: 'Unknown',
            persona2: 'Unknown',
            dialogueLog: messages,
            grade: grading.grade,
            explanation: grading.explanation,
            status: 'pending'
        };
    });
};

export const parseTxt = (content: string): EvaluationItem[] => {
    // Extract Metadata
    const topicMatch = content.match(/주제: (.*)/);
    const persona1Match = content.match(/페르소나1: (.*)/);
    const persona2Match = content.match(/페르소나2: (.*)/);

    const topic = topicMatch ? topicMatch[1].trim() : 'Imported TXT Conversation';
    const persona1 = persona1Match ? persona1Match[1].trim() : 'Bot 1';
    const persona2 = persona2Match ? persona2Match[1].trim() : 'Bot 2';

    // Split by Sets
    const setsRaw = content.split(/\[세트 \d+\]/);
    const setSegments = setsRaw.slice(1);

    return setSegments.map((segment, index) => {
        const messages = segment.trim().split('\n\n').filter(line => line.trim() !== '').map(block => {
            const colonIdx = block.indexOf(':');
            if (colonIdx === -1) return null;

            const speakerRaw = block.substring(0, colonIdx).trim();
            const text = block.substring(colonIdx + 1).trim();
            const speaker = speakerRaw.includes('1') ? 'Bot 1' : speakerRaw.includes('2') ? 'Bot 2' : speakerRaw;

            return { speaker, text };
        }).filter(msg => msg !== null) as { speaker: string, text: string }[];

        if (messages.length === 0) return null;

        const id = `txt-${Date.now()}-${index}`;
        const grading = generateMockGrading(id, messages);

        return {
            id,
            topic,
            persona1,
            persona2,
            dialogueLog: messages,
            grade: grading.grade,
            explanation: grading.explanation,
            status: 'pending'
        };
    }).filter(item => item !== null) as EvaluationItem[];
};
