import { useState } from 'react';
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
  });
  const [conversationSets, setConversationSets] = useState<ConversationSetData[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [modelDialogOpen, setModelDialogOpen] = useState<1 | 2 | null>(null);
  const [addModelDialogOpen, setAddModelDialogOpen] = useState(false);
  const [customModels, setCustomModels] = useState<CustomModel[]>([]);
  const [newModelName, setNewModelName] = useState('');
  const [newModelApiKey, setNewModelApiKey] = useState('');

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

  const handleAddModel = () => {
    if (!newModelName.trim() || !newModelApiKey.trim()) {
      return;
    }

    const newModel: CustomModel = {
      id: `custom-${Date.now()}`,
      name: newModelName.trim(),
      apiKey: newModelApiKey.trim(),
      description: '사용자 정의 모델',
    };

    setCustomModels([...customModels, newModel]);
    setNewModelName('');
    setNewModelApiKey('');
    setAddModelDialogOpen(false);
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

  const generateResponse = (
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
    
    for (let messageIndex = 0; messageIndex < totalMessagesPerSet; messageIndex++) {
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      setConversationSets((prevSets) => {
        return prevSets.map((set) => {
          if (set.messages.length < totalMessagesPerSet) {
            const botNumber = ((set.messages.length % 2) + 1) as 1 | 2;
            const text = generateResponse(botNumber, config.topic, config.persona1, config.persona2, set.messages);
            
            const newMessage: Message = {
              id: `${set.id}-msg-${set.messages.length}`,
              bot: botNumber,
              text,
              timestamp: new Date(),
            };
            
            return {
              ...set,
              messages: [...set.messages, newMessage],
              isComplete: set.messages.length + 1 >= totalMessagesPerSet,
            };
          }
          return set;
        });
      });
    }

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
      conversationSets: conversationSets.map((set, index) => ({
        setNumber: index + 1,
        messages: set.messages.map((msg) => ({
          bot: msg.bot,
          text: msg.text,
          timestamp: msg.timestamp.toISOString(),
        })),
      })),
    };

    downloadFile(JSON.stringify(data, null, 2), 'chatbot-conversation.json', 'application/json');
  };

  const exportAsExcel = () => {
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += '세트,챗봇,메시지,시간\n';

    conversationSets.forEach((set, setIndex) => {
      set.messages.forEach((msg) => {
        const time = msg.timestamp.toLocaleTimeString('ko-KR');
        csv += `${setIndex + 1},챗봇 ${msg.bot},"${msg.text.replace(/"/g, '""')}",${time}\n`;
      });
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
        }
      }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>사용자 정의 모델 추가</DialogTitle>
            <DialogDescription>
              새로운 AI 모델의 이름과 API 키를 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newModelName">모델 이름 (별칭)</Label>
              <Input
                id="newModelName"
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                placeholder="예: My Custom GPT, Claude API"
                className="w-full"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newModelApiKey">API 키</Label>
              <Input
                id="newModelApiKey"
                type="password"
                value={newModelApiKey}
                onChange={(e) => setNewModelApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setAddModelDialogOpen(false);
                setNewModelName('');
                setNewModelApiKey('');
              }}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleAddModel}
              disabled={!newModelName.trim() || !newModelApiKey.trim()}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              추가
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
