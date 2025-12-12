import { Button } from "../ui/button";

interface ParsedResponseProps {
    className?: string;
    response: string;
}

export function ParsedResponse({ response, className = "" }: ParsedResponseProps) {
    // Simple parser: looks for [MESSAGE]... and [CONTENT]... markers
    // If markers are missing, treat whole text as message.

    const parts = [];
    let remaining = response;

    const regex = /(\[(?:MESSAGE|CONTENT)\])([\s\S]*?)(?=\[(?:MESSAGE|CONTENT)\]|$)/g;

    let match;
    let lastIndex = 0;

    // check if there are any tags at all
    if (!response.match(/\[(MESSAGE|CONTENT)\]/)) {
        return <p className={`text-sm text-gray-700 whitespace-pre-wrap ${className}`}>{response}</p>;
    }

    while ((match = regex.exec(response)) !== null) {
        const type = match[1]; // [MESSAGE] or [CONTENT]
        const content = match[2].trim();

        parts.push({ type, content });
        lastIndex = match.index + match[0].length;
    }

    return (
        <div className={`space-y-2 ${className}`}>
            {parts.map((part, index) => {
                if (part.type === '[MESSAGE]') {
                    return (
                        <p key={index} className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {part.content}
                        </p>
                    );
                } else if (part.type === '[CONTENT]') {
                    return (
                        <div key={index} className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-md border border-gray-100">
                            <span className="text-xs font-semibold text-gray-500 uppercase w-full mb-1">Interactive Content</span>
                            {/* Heuristic: if content is short, make it a button, else a card-like block */}
                            {part.content.split(',').map((btnText, btnIdx) => (
                                <Button key={btnIdx} variant="secondary" size="sm" className="bg-white hover:bg-gray-100 border text-gray-700 h-8 text-xs font-normal shadow-sm">
                                    {btnText.trim()}
                                </Button>
                            ))}
                        </div>
                    );
                }
                return null;
            })}
        </div>
    );
}
