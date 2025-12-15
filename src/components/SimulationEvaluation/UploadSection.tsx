import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { useCallback, useState, useRef } from 'react';
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";

interface UploadSectionProps {
    onUpload: (files: FileList) => void;
    isAnalyzing: boolean;
    progress: number;
}

export function UploadSection({ onUpload, isAnalyzing, progress }: UploadSectionProps) {
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(e.dataTransfer.files);
        }
    }, [onUpload]);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onUpload(e.target.files);
        }
    }, [onUpload]);

    const handleLabelClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        fileInputRef.current?.click();
    }, []);

    return (
        <div className="mb-8 flex justify-center">
            {!isAnalyzing && progress === 0 ? (
                <>
                    <input 
                        ref={fileInputRef}
                        type="file" 
                        className="sr-only" 
                        onChange={handleFileChange} 
                        accept=".csv,.json,.txt" 
                        tabIndex={-1}
                        aria-hidden="true"
                    />
                    <div
                        onClick={handleLabelClick}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`
                            relative flex flex-col items-center justify-center w-full max-w-2xl min-h-[200px] py-16 px-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer
                            ${isDragOver
                                ? 'border-purple-500 bg-purple-50'
                                : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-gray-50'
                            }
                        `}
                    >
                        <div className="flex flex-col items-center justify-center pt-2">
                            <div className={`p-4 rounded-full transition-colors ${isDragOver ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                                <Upload className="w-8 h-8" />
                            </div>
                            <p className="text-sm font-semibold text-gray-900 text-center mb-1">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-gray-500 text-center mb-6">
                                JSON, CSV, or TXT file (Max 10MB)
                            </p>
                        </div>
                    </div>
                </>
            ) : (
                <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-full">
                                {progress === 100 ? (
                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                ) : (
                                    <FileText className="w-5 h-5 text-green-600 animate-pulse" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-gray-900">
                                    {progress === 100 ? 'Analysis Complete' : 'Analyzing Conversation Logs...'}
                                </h3>
                                <p className="text-xs text-gray-500">
                                    {progress === 100 ? 'All items evaluated successfully ' : `Processing items (${Math.floor(progress)}%)`}
                                </p>
                            </div>
                        </div>
                        {progress === 100 && (
                            <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="text-xs">
                                Upload New File
                            </Button>
                        )}
                    </div>
                    <Progress value={progress} className="h-2" />
                </div>
            )}
        </div>
    );
}
