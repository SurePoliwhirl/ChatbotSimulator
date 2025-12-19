import { Upload, FileText, CheckCircle2 } from 'lucide-react';
import { useCallback, useState, useRef } from 'react';
import { Button } from "../ui/button";
import { Progress } from "../ui/progress";
import { Card, CardContent } from "../ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";

interface UploadSectionProps {
    onUpload: (files: FileList) => void;
    onReset: () => void;
    isAnalyzing: boolean;
    progress: number;
    shouldResetOnFileSelect?: boolean;
    provider: 'openai' | 'anthropic';
    onProviderChange: (provider: 'openai' | 'anthropic') => void;
}

export function UploadSection({ onUpload, onReset, isAnalyzing, progress, shouldResetOnFileSelect = false, provider, onProviderChange }: UploadSectionProps) {
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
            // 파일이 선택되면 상태를 리셋하고 파일 업로드
            if (shouldResetOnFileSelect) {
                onReset();
            }
            onUpload(e.target.files);
            // 파일 처리 후 입력 값 리셋 (같은 파일을 다시 선택할 수 있도록)
            e.target.value = '';
        }
    }, [onUpload, onReset, shouldResetOnFileSelect]);

    const handleLabelClick = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        fileInputRef.current?.click();
    }, []);

    const handleUploadNewFile = useCallback(() => {
        // 파일 입력 값 리셋 (같은 파일을 다시 선택할 수 있도록)
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
        // 파일 입력을 먼저 열고, 파일이 선택되면 handleFileChange에서 상태를 리셋
        fileInputRef.current?.click();
    }, []);

    return (
        <>
            {/* Provider Selection */}
            <div className="mb-4 space-y-2">
                <Label htmlFor="provider-select" className="text-base font-semibold text-gray-700">
                    평가용 AI 선택
                </Label>
                <Select
                    value={provider}
                    onValueChange={(value) => onProviderChange(value as 'openai' | 'anthropic')}
                    disabled={isAnalyzing || (progress > 0 && progress < 100)}
                >
                    <SelectTrigger id="provider-select" className="w-full max-w-xs">
                        <SelectValue placeholder="평가용 AI 선택" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="openai">OpenAI (GPT-4o)</SelectItem>
                        <SelectItem value="anthropic">Anthropic (Claude Sonnet 4.5)</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* File input is always rendered but hidden */}
            <input 
                ref={fileInputRef}
                type="file" 
                className="sr-only" 
                onChange={handleFileChange} 
                accept=".csv,.json,.txt" 
                tabIndex={-1}
                aria-hidden="true"
            />
            
            {!isAnalyzing && progress === 0 ? (
                <Card 
                    className="border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg cursor-pointer"
                    onClick={handleLabelClick}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <CardContent className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                        <div className={`p-4 rounded-full transition-colors ${isDragOver ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-500'}`}>
                            <Upload className="w-8 h-8" />
                        </div>
                        <p className="text-sm font-semibold text-gray-900 text-center mt-4 mb-1">
                            Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-500 text-center">
                            JSON, CSV, or TXT file (Max 10MB)
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-purple-200 bg-white/80 backdrop-blur-sm shadow-lg">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {progress === 100 ? (
                                <CheckCircle2 className="size-6 text-purple-600" />
                            ) : (
                                <FileText className="size-6 text-purple-600 animate-pulse" />
                            )}
                            <div>
                                <h3 className="text-lg text-gray-800">
                                    {progress === 100 ? '분석 완료 !' : '대화 내역 분석 중...'}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {progress === 100 ? '모든 대화 내역에 대한 검증이 완료되었습니다.' : `(${Math.floor(progress)}%) 완료`}
                                </p>
                            </div>
                        </div>
                        {progress === 100 && (
                            <Button
                                variant="outline"
                                className="border-purple-300 text-purple-600 hover:bg-purple-50"
                                onClick={handleUploadNewFile}
                            >
                                Upload New File
                            </Button>
                        )}
                    </CardContent>
                    {progress > 0 && progress < 100 && (
                        <div className="px-6 pb-6">
                            <Progress value={progress} className="h-2" />
                        </div>
                    )}
                </Card>
            )}
        </>
    );
}
