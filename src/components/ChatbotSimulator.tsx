import { useState, useEffect, useCallback } from 'react';
import { Bot, Play, Trash2, Settings, Download, Plus, X } from 'lucide-react';
import botLogo from '../assets/bot_logo.png';
import { ConversationSet } from './ConversationSet';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface Message {
  id: string;
  bot: 1 | 2;
  text: string;
  timestamp: Date;
  tokens?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

interface ConversationSetData {
  id: string;
  messages: Message[];
  isComplete: boolean;
}

interface CustomModel {
  id: string;
  name: string;
  apiKey: string;
  description: string;
}

interface SimulationConfig {
  topic: string;
  persona1: string;
  persona2: string;
  llmModel1: string;
  llmModel2: string;
  turnsPerBot: number;
  numberOfSets: number;
  exportFormat: 'text' | 'json' | 'excel';
  temperature: number;
  topP: number;
}

export function ChatbotSimulator() {
  const [config, setConfig] = useState<SimulationConfig>({
    topic: '',
    persona1: '',
    persona2: '',
    llmModel1: 'GPT-4',
    llmModel2: 'GPT-4',
    turnsPerBot: 3,
    numberOfSets: 2,
    exportFormat: 'text',
    temperature: 1.2,
    topP: 0.9,
  });
  const [conversationSets, setConversationSets] = useState<ConversationSetData[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState<1 | 2 | null>(null);
  const [addModelDialogOpen, setAddModelDialogOpen] = useState(false);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [newModelName, setNewModelName] = useState('');
  const [newModelApiKey, setNewModelApiKey] = useState('');
  const [isValidatingKey, setIsValidatingKey] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<{
    total_tokens: number;
    total_prompt_tokens: number;
    total_completion_tokens: number;
    per_set_tokens: number;
  } | null>(null);
  const [isEstimatingTokens, setIsEstimatingTokens] = useState(false);

  const [defaultModels, setDefaultModels] = useState([
    { id: 'GPT-4', name: 'GPT-4', description: '가장 강력한 언어 모델' },
    { id: 'GPT-3.5', name: 'GPT-3.5 Turbo', description: '빠르고 효율적인 모델' },
    { id: 'Claude-3', name: 'Claude 3', description: 'Anthropic의 최신 모델' },
    { id: 'Gemini', name: 'Gemini Pro', description: 'Google의 멀티모달 AI' },
    { id: 'Llama-2', name: 'Llama 2', description: '오픈소스 대형 언어 모델' },
    { id: 'Mistral', name: 'Mistral 7B', description: '효율적인 오픈소스 모델' },
  ]);

  const availableModels = [
    ...defaultModels,
    ...customModels.map(m => ({
      id: m.id,
      name: m.name,
      description: m.description,
    })),
  ];

  // API 키 검증 함수
  const validateApiKey = async (apiKey: string, modelType: string = 'openai'): Promise<{ valid: boolean; error?: string }> => {
    try {
      const response = await fetch('http://localhost:5000/api/validate-key', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          model_type: modelType,
        }),
      });

      const data = await response.json();
      
      if (data.valid) {
        return { valid: true };
      } else {
        return { valid: false, error: data.error || 'API 키 검증에 실패했습니다.' };
      }
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.' 
      };
    }
  };

  const handleAddModel = async () => {
    if (!newModelName.trim() || !newModelApiKey.trim()) {
      setValidationError('모델 이름과 API 키를 모두 입력해주세요.');
      return;
    }

    // 에러 메시지 초기화
    setValidationError(null);
    setIsValidatingKey(true);

    try {
      // API 키 형식에 따라 모델 타입 추정
      let modelType = 'openai';
      if (newModelApiKey.includes('anthropic') || newModelApiKey.startsWith('sk-ant-')) {
        modelType = 'anthropic';
      } else if (newModelApiKey.includes('google') || newModelApiKey.length > 50) {
        modelType = 'google';
      }

      // API 키 검증
      const validationResult = await validateApiKey(newModelApiKey.trim(), modelType);

      if (!validationResult.valid) {
        setValidationError(validationResult.error || 'API 키 검증에 실패했습니다.');
        setIsValidatingKey(false);
        return;
      }

      // 검증 성공 시 모델 추가
      const newModel: CustomModel = {
        id: `custom-${Date.now()}`,
        name: newModelName.trim(),
        apiKey: newModelApiKey.trim(),
        description: '사용자 정의 모델',
      };

      setCustomModels([...customModels, newModel]);
      setNewModelName('');
      setNewModelApiKey('');
      setValidationError(null);
      setAddModelDialogOpen(false);
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsValidatingKey(false);
    }
  };

  const handleDeleteModel = (modelId: string) => {
    // 최소 1개의 모델은 남아있어야 함
    if (availableModels.length <= 1) {
      return;
    }

    // 기본 모델 삭제
    const isDefaultModel = defaultModels.some(m => m.id === modelId);
    if (isDefaultModel) {
      setDefaultModels(defaultModels.filter(m => m.id !== modelId));
    } else {
      // 커스텀 모델 삭제
      setCustomModels(customModels.filter(m => m.id !== modelId));
    }
    
    // 삭제된 모델이 현재 선택된 모델이면 다른 모델로 변경
    const remainingModels = availableModels.filter(m => m.id !== modelId);
    const fallbackModelId = remainingModels.length > 0 ? remainingModels[0].id : 'GPT-4';
    
    if (config.llmModel1 === modelId) {
      setConfig({ ...config, llmModel1: fallbackModelId });
    }
    if (config.llmModel2 === modelId) {
      setConfig({ ...config, llmModel2: fallbackModelId });
    }
  };

  const getModelName = (modelId: string): string => {
    const model = availableModels.find(m => m.id === modelId);
    return model ? model.name : modelId;
  };

  const handleModelSelect = (modelId: string) => {
    if (modelDialogOpen === 1) {
      setConfig({ ...config, llmModel1: modelId });
    } else if (modelDialogOpen === 2) {
      setConfig({ ...config, llmModel2: modelId });
    }
    setModelDialogOpen(null);
  };

  // API 키 가져오기 함수
  const getApiKeyForModel = (modelId: string): string | null => {
    // 커스텀 모델에서 찾기
    const customModel = customModels.find(m => m.id === modelId);
    if (customModel) {
      return customModel.apiKey;
    }
    
    // 기본 모델의 경우 null 반환 (기본 모델은 API 키가 없음)
    // 실제로는 환경 변수나 설정에서 가져와야 할 수도 있음
    return null;
  };

  // 모델 타입 추정 함수
  const getModelType = (modelId: string, apiKey: string | null): string => {
    if (apiKey) {
      if (apiKey.includes('anthropic') || apiKey.startsWith('sk-ant-')) {
        return 'anthropic';
      } else if (apiKey.includes('google') || apiKey.length > 50) {
        return 'google';
      } else if (apiKey.startsWith('sk-')) {
        return 'openai';
      }
    }
    
    // 모델 ID로 추정
    if (modelId.includes('Claude') || modelId.includes('claude')) {
      return 'anthropic';
    } else if (modelId.includes('Gemini') || modelId.includes('gemini')) {
      return 'google';
    } else {
      return 'openai';
    }
  };

  // 템플릿 기반 응답 생성 (API 키가 없는 일반 모델용)
  const generateTemplateResponse = (
    botNumber: 1 | 2,
    topic: string,
    persona1: string,
    persona2: string,
    previousMessages: Message[]
  ): string => {
    const persona = botNumber === 1 ? persona1 : persona2;
    
    const bot1Starters = [
      `${topic}에 대해 생각해봤는데요,`,
      `${topic}에 관해서는 ${persona1}로서 제 생각은`,
      `${topic}에 대해 말씀드리자면,`,
      `${topic}에 대한 제 의견을 공유하고 싶습니다 -`,
      `${persona1}로서 ${topic}은 특히 흥미로운데요, 왜냐하면`,
    ];

    const bot2Starters = [
      `${topic}에 대한 흥미로운 관점이네요. 저는`,
      `좋은 지적입니다만, ${topic}을 ${persona2} 관점에서 보면,`,
      `${topic}에 대한 그 아이디어를 발전시켜보면,`,
      `흥미로운 시각입니다. 하지만 ${topic}에 관해서는,`,
      `${topic}에 대한 그 관점에 공감하지만,`,
    ];

    const continuations = [
      `이것은 사회에서 볼 수 있는 더 넓은 주제와 연결됩니다.`,
      `여기에는 고려해야 할 여러 층위가 있습니다.`,
      `장점과 과제 모두를 생각해봐야 합니다.`,
      `혁신과 전통이 균형을 찾아야 합니다.`,
      `다양한 관점이 더 나은 이해로 이어질 수 있습니다.`,
      `그 의미는 우리가 처음 생각하는 것보다 더 멀리 뻗어 있습니다.`,
      `이러한 논의에서는 맥락이 매우 중요합니다.`,
      `여기에는 다양한 해석의 여지가 있습니다.`,
    ];

    const agreements = [
      `정확히 맞습니다, 그리고 덧붙이자면,`,
      `완전히 동의합니다, 그리고 더 나아가,`,
      `좋은 지적이네요, 이것은 또한`,
      `바로 그겁니다! 이것은 또한`,
    ];

    const starters = botNumber === 1 ? bot1Starters : bot2Starters;
    const starter = starters[Math.floor(Math.random() * starters.length)];
    
    let response = starter;

    if (previousMessages.length > 2 && Math.random() > 0.5) {
      const agreement = agreements[Math.floor(Math.random() * agreements.length)];
      response = agreement;
    }

    const continuation = continuations[Math.floor(Math.random() * continuations.length)];
    response += ' ' + continuation;

    return response;
  };

  // 실제 LLM API를 호출하여 응답 생성 (API 키가 있는 경우)
  const generateResponse = async (
    botNumber: 1 | 2,
    topic: string,
    persona1: string,
    persona2: string,
    previousMessages: Message[]
  ): Promise<string> => {
    const persona = botNumber === 1 ? persona1 : persona2;
    const modelId = botNumber === 1 ? config.llmModel1 : config.llmModel2;
    const apiKey = getApiKeyForModel(modelId);
    
    // API 키가 없으면 템플릿 기반 응답 반환 (시나리오 예시용)
    if (!apiKey) {
      return generateTemplateResponse(botNumber, topic, persona1, persona2, previousMessages);
    }
    
    const modelType = getModelType(modelId, apiKey);
    
    try {
      const response = await fetch('http://localhost:5000/api/generate-response', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: apiKey,
          model_type: modelType,
          topic: topic,
          persona: persona,
          previous_messages: previousMessages.map(msg => ({
            bot: msg.bot,
            text: msg.text,
          })),
          bot_number: botNumber,
          temperature: config.temperature,
          top_p: config.topP,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // 토큰 정보를 반환하기 위해 객체로 반환
        return JSON.stringify({
          text: data.text,
          tokens: data.tokens
        });
      } else {
        return `[오류: ${data.error || '응답 생성에 실패했습니다.'}]`;
      }
    } catch (error) {
      return `[오류: ${error instanceof Error ? error.message : '서버에 연결할 수 없습니다. 백엔드 서버가 실행 중인지 확인해주세요.'}]`;
    }
  };

  // 토큰 예측 함수
  const estimateTokens = useCallback(async () => {
    if (!config.topic || !config.persona1 || !config.persona2) {
      setTokenEstimate(null);
      return;
    }

    setIsEstimatingTokens(true);
    try {
      const modelId1 = config.llmModel1;
      const modelId2 = config.llmModel2;
      const apiKey1 = getApiKeyForModel(modelId1);
      const apiKey2 = getApiKeyForModel(modelId2);
      
      const modelType1 = getModelType(modelId1, apiKey1);
      const modelType2 = getModelType(modelId2, apiKey2);

      const response = await fetch('http://localhost:5000/api/estimate-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model_type1: modelType1,
          model_type2: modelType2,
          topic: config.topic,
          persona1: config.persona1,
          persona2: config.persona2,
          turns_per_bot: config.turnsPerBot,
          number_of_sets: config.numberOfSets,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setTokenEstimate(data.estimate);
      } else {
        setTokenEstimate(null);
      }
    } catch (error) {
      console.error('토큰 예측 실패:', error);
      setTokenEstimate(null);
    } finally {
      setIsEstimatingTokens(false);
    }
  }, [config.topic, config.persona1, config.persona2, config.llmModel1, config.llmModel2, config.turnsPerBot, config.numberOfSets]);

  // 설정이 변경될 때마다 토큰 예측 업데이트
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      estimateTokens();
    }, 500); // 500ms 디바운스

    return () => clearTimeout(timeoutId);
  }, [estimateTokens]);

  const startSimulation = async () => {
    if (!config.topic || !config.persona1 || !config.persona2 || config.turnsPerBot < 1 || config.numberOfSets < 1) {
      return;
    }

    setIsSimulating(true);
    
    // 세트 초기화
    const initialSets: ConversationSetData[] = Array.from({ length: config.numberOfSets }, (_, i) => ({
      id: `set-${Date.now()}-${i}`,
      messages: [],
      isComplete: false,
    }));
    setConversationSets(initialSets);

    // 각 세트에 대해 비동기로 메시지 생성
    const totalMessagesPerSet = config.turnsPerBot * 2;
    
    // 각 세트별로 독립적으로 메시지 생성
    const setPromises = initialSets.map(async (set, setIndex) => {
      // 각 세트의 메시지를 로컬로 추적
      let localMessages: Message[] = [];
      
      for (let messageIndex = 0; messageIndex < totalMessagesPerSet; messageIndex++) {
        const botNumber = ((localMessages.length % 2) + 1) as 1 | 2;
        
        try {
          // LLM API 호출 (현재까지의 로컬 메시지 사용)
          const response = await generateResponse(
            botNumber,
            config.topic,
            config.persona1,
            config.persona2,
            localMessages
          );
          
          // 응답 파싱 (JSON 문자열 또는 일반 텍스트)
          let text: string;
          let tokens: Message['tokens'] | undefined;
          
          try {
            const parsed = JSON.parse(response);
            if (parsed.text) {
              text = parsed.text;
              tokens = parsed.tokens;
            } else {
              text = response; // JSON이 아니면 그대로 사용
            }
          } catch {
            text = response; // 파싱 실패 시 그대로 사용
          }
          
          const newMessage: Message = {
            id: `${set.id}-msg-${localMessages.length}`,
            bot: botNumber,
            text,
            timestamp: new Date(),
            tokens,
          };
          
          // 로컬 메시지 업데이트
          localMessages = [...localMessages, newMessage];
          
          // 상태 업데이트 (함수형 업데이트로 최신 상태 보장)
          setConversationSets((prevSets) => {
            const updatedSets = [...prevSets];
            if (updatedSets[setIndex]) {
              updatedSets[setIndex] = {
                ...updatedSets[setIndex],
                messages: localMessages,
                isComplete: localMessages.length >= totalMessagesPerSet,
              };
            }
            return updatedSets;
          });
        } catch (error) {
          // 에러 발생 시 에러 메시지 추가
          const errorMessage: Message = {
            id: `${set.id}-msg-${localMessages.length}-error`,
            bot: botNumber,
            text: `[오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}]`,
            timestamp: new Date(),
          };
          
          // 로컬 메시지 업데이트
          localMessages = [...localMessages, errorMessage];
          
          // 상태 업데이트
          setConversationSets((prevSets) => {
            const updatedSets = [...prevSets];
            if (updatedSets[setIndex]) {
              updatedSets[setIndex] = {
                ...updatedSets[setIndex],
                messages: localMessages,
                isComplete: localMessages.length >= totalMessagesPerSet,
              };
            }
            return updatedSets;
          });
        }
        
        // 다음 메시지 전에 약간의 지연
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    });
    
    // 모든 세트의 메시지 생성이 완료될 때까지 대기
    await Promise.all(setPromises);

    setIsSimulating(false);
  };

  const clearConversation = () => {
    setConversationSets([]);
  };

  const exportConversations = () => {
    if (conversationSets.length === 0) return;

    if (config.exportFormat === 'text') {
      exportAsText();
    } else if (config.exportFormat === 'json') {
      exportAsJson();
    } else if (config.exportFormat === 'excel') {
      exportAsExcel();
    }
  };

  // 토큰 통계 계산 헬퍼 함수
  const calculateTokenStats = (messages: Message[], estimatedTokensPerSet?: number) => {
    const actualTokens = messages.reduce((acc, msg) => {
      if (msg.tokens) {
        acc.total += msg.tokens.total_tokens || 0;
        acc.prompt += msg.tokens.prompt_tokens || 0;
        acc.completion += msg.tokens.completion_tokens || 0;
      }
      return acc;
    }, { total: 0, prompt: 0, completion: 0 });

    const averageTokens = messages.length > 0 ? Math.round(actualTokens.total / messages.length) : 0;
    
    const errorPercentage = estimatedTokensPerSet && estimatedTokensPerSet > 0
      ? ((actualTokens.total - estimatedTokensPerSet) / estimatedTokensPerSet) * 100
      : null;

    return { actualTokens, averageTokens, errorPercentage };
  };

  const exportAsText = () => {
    let content = `챗봇 대화 기록\n`;
    content += `주제: ${config.topic}\n`;
    content += `페르소나1: ${config.persona1}\n`;
    content += `페르소나2: ${config.persona2}\n`;
    content += `생성일: ${new Date().toLocaleString('ko-KR')}\n\n`;
    content += `${'='.repeat(60)}\n\n`;

    conversationSets.forEach((set, setIndex) => {
      content += `[세트 ${setIndex + 1}]\n\n`;
      set.messages.forEach((msg) => {
        content += `챗봇 ${msg.bot}: ${msg.text}\n\n`;
      });
      
      // 토큰 통계 추가
      const stats = calculateTokenStats(set.messages, tokenEstimate?.per_set_tokens);
      if (stats.actualTokens.total > 0) {
        content += `\n[토큰 통계]\n`;
        content += `총 사용 토큰 수: ${stats.actualTokens.total.toLocaleString()}\n`;
        content += `평균: ${stats.averageTokens.toLocaleString()}\n`;
        if (stats.errorPercentage !== null) {
          content += `오차: ${stats.errorPercentage >= 0 ? '+' : ''}${stats.errorPercentage.toFixed(1)}%\n`;
        }
        content += `\n`;
      }
      
      content += `${'-'.repeat(60)}\n\n`;
    });

    downloadFile(content, 'chatbot-conversation.txt', 'text/plain');
  };

  const exportAsJson = () => {
    const data = {
      config: {
        topic: config.topic,
        persona1: config.persona1,
        persona2: config.persona2,
        turnsPerBot: config.turnsPerBot,
        numberOfSets: config.numberOfSets,
      },
      exportDate: new Date().toISOString(),
      estimatedTokens: tokenEstimate ? {
        total_tokens: tokenEstimate.total_tokens,
        per_set_tokens: tokenEstimate.per_set_tokens,
      } : null,
      conversationSets: conversationSets.map((set, index) => {
        const stats = calculateTokenStats(set.messages, tokenEstimate?.per_set_tokens);
        return {
          setNumber: index + 1,
          messages: set.messages.map((msg) => ({
            bot: msg.bot,
            text: msg.text,
            timestamp: msg.timestamp.toISOString(),
            tokens: msg.tokens,
          })),
          tokenStats: stats.actualTokens.total > 0 ? {
            total_tokens: stats.actualTokens.total,
            prompt_tokens: stats.actualTokens.prompt,
            completion_tokens: stats.actualTokens.completion,
            average_tokens: stats.averageTokens,
            error_percentage: stats.errorPercentage,
          } : null,
        };
      }),
    };

    downloadFile(JSON.stringify(data, null, 2), 'chatbot-conversation.json', 'application/json');
  };

  const exportAsExcel = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += '세트,챗봇,메시지,시간,입력토큰,출력토큰,총토큰\n';

    conversationSets.forEach((set, setIndex) => {
      set.messages.forEach((msg) => {
        const time = msg.timestamp.toLocaleTimeString('ko-KR');
        const promptTokens = msg.tokens?.prompt_tokens || '';
        const completionTokens = msg.tokens?.completion_tokens || '';
        const totalTokens = msg.tokens?.total_tokens || '';
        csv += `${setIndex + 1},챗봇 ${msg.bot},"${msg.text.replace(/"/g, '""')}",${time},${promptTokens},${completionTokens},${totalTokens}\n`;
      });
      
      // 토큰 통계 행 추가
      const stats = calculateTokenStats(set.messages, tokenEstimate?.per_set_tokens);
      if (stats.actualTokens.total > 0) {
        csv += `${setIndex + 1},[토큰 통계],총 사용 토큰 수: ${stats.actualTokens.total.toLocaleString()},평균: ${stats.averageTokens.toLocaleString()},,${stats.errorPercentage !== null ? `오차: ${stats.errorPercentage >= 0 ? '+' : ''}${stats.errorPercentage.toFixed(1)}%` : ''}\n`;
      }
    });

    downloadFile(csv, 'chatbot-conversation.csv', 'text/csv');
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <header className="text-center mb-8">
        <div className="flex items-center justify-center gap-3 mb-3">
          <img src={botLogo} alt="Chatbot Logo" className="w-10 h-10" />
          <h1 className="text-purple-900">챗봇 시뮬레이터</h1>
        </div>
        <p className="text-gray-600">
          두 개의 AI 챗봇을 설정하고 어떤 주제든 토론하는 모습을 지켜보세요
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="md:col-span-1 bg-white rounded-2xl shadow-lg p-6">
          <div className="flex items-center gap-2 mb-6">
            <Settings className="w-5 h-5 text-purple-600" />
            <h2 className="text-gray-900">설정</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="topic" className="block text-gray-700 mb-2">
                토론 주제
              </label>
              <input
                id="topic"
                type="text"
                placeholder="예: 인공지능, 기후변화"
                value={config.topic}
                onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                disabled={isSimulating}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="persona1" className="text-gray-700">
                  챗봇 1 페르소나
                </label>
                <button
                  onClick={() => setModelDialogOpen(1)}
                  disabled={isSimulating}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="모델 설정"
                >
                  <Settings className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <input
                id="persona1"
                type="text"
                placeholder="예: 철학자, 낙관론자"
                value={config.persona1}
                onChange={(e) => setConfig({ ...config, persona1: e.target.value })}
                disabled={isSimulating}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-gray-500 text-xs mt-1">
                모델: {getModelName(config.llmModel1)}
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label htmlFor="persona2" className="text-gray-700">
                  챗봇 2 페르소나
                </label>
                <button
                  onClick={() => setModelDialogOpen(2)}
                  disabled={isSimulating}
                  className="p-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="모델 설정"
                >
                  <Settings className="w-4 h-4 text-gray-600" />
                </button>
              </div>
              <input
                id="persona2"
                type="text"
                placeholder="예: 과학자, 비판론자"
                value={config.persona2}
                onChange={(e) => setConfig({ ...config, persona2: e.target.value })}
                disabled={isSimulating}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <p className="text-gray-500 text-xs mt-1">
                모델: {getModelName(config.llmModel2)}
              </p>
            </div>

            <div>
              <label htmlFor="turns" className="block text-gray-700 mb-2">
                챗봇당 턴 수 ({config.turnsPerBot}턴)
              </label>
              <input
                id="turns"
                type="range"
                min="1"
                max="10"
                value={config.turnsPerBot}
                onChange={(e) => setConfig({ ...config, turnsPerBot: parseInt(e.target.value) })}
                disabled={isSimulating}
                className="w-full disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>1턴</span>
                <span>10턴</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                세트당 총 {config.turnsPerBot * 2}개 메시지
              </p>
            </div>

            <div>
              <label htmlFor="sets" className="block text-gray-700 mb-2">
                대화 세트 수 ({config.numberOfSets}세트)
              </label>
              <input
                id="sets"
                type="range"
                min="1"
                max="6"
                value={config.numberOfSets}
                onChange={(e) => setConfig({ ...config, numberOfSets: parseInt(e.target.value) })}
                disabled={isSimulating}
                className="w-full disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>1세트</span>
                <span>6세트</span>
              </div>
            </div>

            <div>
              <label htmlFor="temperature" className="block text-gray-700 mb-2">
                창의성 (Temperature): {config.temperature.toFixed(1)}
              </label>
              <input
                id="temperature"
                type="range"
                min="0.0"
                max="2.0"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig({ ...config, temperature: parseFloat(e.target.value) })}
                disabled={isSimulating}
                className="w-full disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>일관적 (0.0)</span>
                <span>균형 (1.0)</span>
                <span>창의적 (2.0)</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                값이 높을수록 더 다양하고 창의적인 응답을 생성합니다.
              </p>
            </div>

            <div>
              <label htmlFor="topP" className="block text-gray-700 mb-2">
                다양성 (Top-p): {config.topP.toFixed(1)}
              </label>
              <input
                id="topP"
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={config.topP}
                onChange={(e) => setConfig({ ...config, topP: parseFloat(e.target.value) })}
                disabled={isSimulating}
                className="w-full disabled:cursor-not-allowed"
              />
              <div className="flex justify-between text-gray-500 text-xs mt-1">
                <span>집중적 (0.1)</span>
                <span>균형 (0.5)</span>
                <span>다양함 (1.0)</span>
              </div>
              <p className="text-gray-500 text-xs mt-1">
                값이 높을수록 더 다양한 토큰을 고려합니다. Temperature와 사용하면 더 나은 샘플링을 제공합니다.
              </p>
            </div>

            <div>
              <label htmlFor="exportFormat" className="block text-gray-700 mb-2">
                내보내기 형식
              </label>
              <select
                id="exportFormat"
                value={config.exportFormat}
                onChange={(e) => setConfig({ ...config, exportFormat: e.target.value as 'excel' | 'text' | 'json' })}
                disabled={isSimulating}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="text">텍스트 (.txt)</option>
                <option value="excel">엑셀 (.csv)</option>
                <option value="json">JSON (.json)</option>
              </select>
            </div>

            {/* 토큰 예측 표시 */}
            {tokenEstimate && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">예상 토큰 사용량</h3>
                {isEstimatingTokens ? (
                  <p className="text-xs text-blue-700">계산 중...</p>
                ) : (
                  <div className="space-y-1 text-xs text-blue-800">
                    <div className="flex justify-between">
                      <span>총 토큰:</span>
                      <span className="font-semibold">{tokenEstimate.total_tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>입력 토큰:</span>
                      <span>{tokenEstimate.total_prompt_tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>출력 토큰:</span>
                      <span>{tokenEstimate.total_completion_tokens.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-blue-700">
                      <span>세트당 평균:</span>
                      <span>{tokenEstimate.per_set_tokens.toLocaleString()}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-4">
              <button
                onClick={startSimulation}
                disabled={isSimulating || !config.topic || !config.persona1 || !config.persona2}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" />
                {isSimulating ? '시뮬레이션 중...' : '시뮬레이션 시작'}
              </button>

              {conversationSets.length > 0 && (
                <>
                  <button
                    onClick={exportConversations}
                    disabled={isSimulating}
                    className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    대화 내보내기
                  </button>

                  <button
                    onClick={clearConversation}
                    disabled={isSimulating}
                    className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    대화 지우기
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          {conversationSets.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-lg p-12 h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                <img src={botLogo} alt="Start" className="w-16 h-16 mx-auto mb-4" />
                <h3 className="text-gray-900 mb-2">시작 준비 완료</h3>
                <p className="text-gray-500">
                  설정을 완료하고 "시뮬레이션 시작"을 클릭하여 여러 챗봇 대화를 동시에 관찰하세요
                </p>
              </div>
            </div>
          ) : (
            <div className={`grid gap-4 ${
              config.numberOfSets === 1 ? 'grid-cols-1' : 
              config.numberOfSets === 2 ? 'grid-cols-1 lg:grid-cols-2' :
              config.numberOfSets <= 4 ? 'grid-cols-1 lg:grid-cols-2' :
              'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3'
            }`}>
              {conversationSets.map((set, index) => (
                <ConversationSet
                  key={set.id}
                  setNumber={index + 1}
                  messages={set.messages}
                  isComplete={set.isComplete}
                  isSimulating={isSimulating}
                  topic={config.topic}
                  persona1={config.persona1}
                  persona2={config.persona2}
                  estimatedTokensPerSet={tokenEstimate?.per_set_tokens}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={modelDialogOpen !== null} onOpenChange={() => setModelDialogOpen(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>LLM 모델 선택</DialogTitle>
            <DialogDescription>
              챗봇 {modelDialogOpen}에서 사용할 AI 모델을 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 max-h-[400px] overflow-y-auto">
            {availableModels.map((model) => {
              const isSelected = modelDialogOpen === 1 
                ? config.llmModel1 === model.id 
                : config.llmModel2 === model.id;
              const canDelete = availableModels.length > 1;
              
              return (
                <div
                  key={model.id}
                  className={`w-full px-4 py-3 border-2 rounded-lg transition-all flex items-center justify-between ${
                    isSelected 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200'
                  }`}
                >
                  <button
                    onClick={() => handleModelSelect(model.id)}
                    className="flex-1 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className={`${isSelected ? 'text-purple-700' : 'text-gray-900'}`}>
                          {model.name}
                        </div>
                        <p className="text-gray-500 text-xs mt-1">
                          {model.description}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </div>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteModel(model.id);
                    }}
                    disabled={!canDelete}
                    className="ml-2 p-1.5 rounded-md hover:bg-red-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                    title={canDelete ? "모델 삭제" : "최소 1개의 모델이 필요합니다"}
                  >
                    <X className="w-4 h-4 text-red-600" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t">
            <button
              onClick={() => {
                setAddModelDialogOpen(true);
                setModelDialogOpen(null);
              }}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-400 hover:bg-purple-50 transition-all flex items-center justify-center gap-2 text-gray-700 hover:text-purple-700"
            >
              <Plus className="w-5 h-5" />
              <span>새 모델 추가</span>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={addModelDialogOpen} onOpenChange={(open) => {
        setAddModelDialogOpen(open);
        if (!open) {
          setNewModelName('');
          setNewModelApiKey('');
          setValidationError(null);
          setIsValidatingKey(false);
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>사용자 정의 모델 추가</DialogTitle>
            <DialogDescription>
              새로운 AI 모델의 이름과 API 키를 입력하세요. API 키는 추가 전에 유효성을 검증합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newModelName">모델 이름 (별칭)</Label>
              <Input
                id="newModelName"
                value={newModelName}
                onChange={(e) => {
                  setNewModelName(e.target.value);
                  setValidationError(null);
                }}
                placeholder="예: My Custom GPT, Claude API"
                className="w-full"
                disabled={isValidatingKey}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newModelApiKey">API 키</Label>
              <Input
                id="newModelApiKey"
                type="password"
                value={newModelApiKey}
                onChange={(e) => {
                  setNewModelApiKey(e.target.value);
                  setValidationError(null);
                }}
                placeholder="sk-..."
                className="w-full"
                disabled={isValidatingKey}
              />
            </div>
            {validationError && (
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-sm text-red-600">{validationError}</p>
              </div>
            )}
            {isValidatingKey && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-blue-600">API 키를 검증하는 중...</p>
                </div>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setAddModelDialogOpen(false);
                setNewModelName('');
                setNewModelApiKey('');
                setValidationError(null);
                setIsValidatingKey(false);
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isValidatingKey}
            >
              취소
            </button>
            <button
              onClick={handleAddModel}
              disabled={!newModelName.trim() || !newModelApiKey.trim() || isValidatingKey}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              {isValidatingKey && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              )}
              {isValidatingKey ? '검증 중...' : '추가'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
