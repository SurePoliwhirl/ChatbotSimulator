import { Bot, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

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
  buttons?: Array<{
    type: string;
    displayText: string;
    postback?: string;
    link?: {
      web?: string;
      mobile?: string;
    };
    intentId?: string;
  }>;
  chipList?: Array<{
    type: string;
    displayText: string;
    postback?: string;
    intentId?: string;
  }>;
}

interface ConversationSetProps {
  setNumber: number;
  messages: Message[];
  isComplete: boolean;
  isSimulating: boolean;
  topic: string;
  persona1: string;
  persona2: string;
  estimatedTokensPerSet?: number;
}

export function ConversationSet({
  setNumber,
  messages,
  isComplete,
  isSimulating,
  topic,
  persona1,
  persona2,
  estimatedTokensPerSet,
}: ConversationSetProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [expandedTokens, setExpandedTokens] = useState<Set<string>>(new Set());

  // 실제 토큰 통계 계산
  const actualTokens = messages.reduce((acc, msg) => {
    if (msg.tokens) {
      acc.total += msg.tokens.total_tokens || 0;
      acc.prompt += msg.tokens.prompt_tokens || 0;
      acc.completion += msg.tokens.completion_tokens || 0;
    }
    return acc;
  }, { total: 0, prompt: 0, completion: 0 });

  const averageTokens = messages.length > 0 ? Math.round(actualTokens.total / messages.length) : 0;
  
  // 오차 계산 (한 세트당 예상 토큰 수와 비교)
  const errorPercentage = estimatedTokensPerSet && estimatedTokensPerSet > 0
    ? ((actualTokens.total - estimatedTokensPerSet) / estimatedTokensPerSet) * 100
    : null;

  useEffect(() => {
    // 컨테이너 내에서만 스크롤되도록 수정 (페이지 전체 스크롤 방지)
    if (messagesEndRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const element = messagesEndRef.current;
      
      // 컨테이너의 스크롤 위치 계산 (컨테이너 내에서만 스크롤)
      const elementTop = element.offsetTop;
      const containerHeight = container.clientHeight;
      const containerScrollTop = container.scrollTop;
      
      // 새 메시지가 컨테이너 하단에 보이도록 스크롤
      const targetScrollTop = elementTop - containerHeight + element.offsetHeight + 20; // 20px 여유
      
      // 스크롤이 필요한 경우에만 스크롤 (페이지 전체 스크롤 방지)
      if (targetScrollTop > containerScrollTop) {
        container.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        });
      }
    }
  }, [messages]);

  return (
    <div 
      className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-purple-100 transition-all duration-300 hover:shadow-xl hover:border-purple-300"
      style={{
        animation: 'fadeInScale 0.5s ease-out',
        animationDelay: `${(setNumber - 1) * 0.1}s`,
        animationFillMode: 'backwards',
      }}
    >
      <style>
        {`
          @keyframes fadeInScale {
            from {
              opacity: 0;
              transform: scale(0.95) translateY(10px);
            }
            to {
              opacity: 1;
              transform: scale(1) translateY(0);
            }
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }

          @keyframes fadeInSlideDown {
            from {
              opacity: 0;
              transform: translateY(-8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .message-enter {
            animation: slideIn 0.3s ease-out;
          }

          .animate-fadeInSlideDown {
            animation: fadeInSlideDown 0.3s ease-out forwards;
          }
        `}
      </style>

      {/* 헤더 */}
      <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <span className="text-white font-medium text-sm">{setNumber}</span>
            </div>
            <div>
              <h3 className="text-white text-sm">세트 {setNumber}</h3>
              <p className="text-white/80 text-xs">{messages.length}개 메시지</p>
              {isComplete && actualTokens.total > 0 && (
                <div className="text-white/90 text-xs mt-0.5 space-y-0.5">
                  <p>
                    총 사용 토큰 수: <span className="font-medium">{actualTokens.total.toLocaleString()}</span>
                  </p>
                  <p>
                    평균: <span className="font-medium">{averageTokens.toLocaleString()}</span>
                  </p>
                  {errorPercentage !== null && (
                    <p>
                      오차: <span className={`font-medium ${errorPercentage >= 0 ? 'text-green-300' : 'text-yellow-200'}`}>
                        {errorPercentage >= 0 ? '+' : ''}{errorPercentage.toFixed(1)}%
                      </span>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          {isComplete && (
            <CheckCircle2 className="w-5 h-5 text-white" />
          )}
        </div>
        {topic && (
          <div className="mt-2 pt-2 border-t border-white/20">
            <p className="text-white/90 text-xs">
              주제: <span className="font-medium">{topic}</span>
            </p>
            <div className="flex gap-3 mt-1">
              <p className="text-white/80 text-xs">
                🤖1: {persona1}
              </p>
              <p className="text-white/80 text-xs">
                🤖2: {persona2}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 대화 영역 */}
      <div 
        ref={scrollContainerRef}
        className="h-[400px] overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-50/50 to-white"
      >
        {messages.map((message, index) => {
          const isExpanded = expandedTokens.has(message.id);
          const hasTokens = message.tokens && message.tokens.total_tokens;
          
          const toggleTokens = () => {
            if (!hasTokens) return;
            setExpandedTokens(prev => {
              const newSet = new Set(prev);
              if (newSet.has(message.id)) {
                newSet.delete(message.id);
              } else {
                newSet.add(message.id);
              }
              return newSet;
            });
          };

          return (
            <div
              key={message.id}
              className={`flex gap-2 message-enter ${
                message.bot === 1 ? 'justify-start' : 'justify-end'
              }`}
              style={{
                animationDelay: `${index * 0.05}s`,
              }}
            >
              {message.bot === 1 && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}

              <div className="flex flex-col max-w-[80%]">
                <div
                  className={`rounded-2xl px-3 py-2 shadow-sm transition-all duration-200 ${
                    message.bot === 1
                      ? 'bg-white border border-gray-200 text-gray-900'
                      : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
                  } ${
                    hasTokens ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''
                  }`}
                  onClick={toggleTokens}
                >
                  <p className="text-xs leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>
                  
                  {/* KT Chatbot 버튼 표시 */}
                  {message.buttons && message.buttons.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-opacity-20 flex flex-wrap gap-1.5">
                      {message.buttons.map((button, btnIndex) => (
                        <button
                          key={btnIndex}
                          className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium shadow-sm hover:shadow-md ${
                            message.bot === 1
                              ? 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300 hover:border-gray-400'
                              : 'bg-white/25 hover:bg-white/35 text-white border border-white/40 hover:border-white/60'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (button.link?.web || button.link?.mobile) {
                              window.open(button.link.web || button.link.mobile, '_blank');
                            }
                          }}
                        >
                          {button.displayText}
                        </button>
                      ))}
                    </div>
                  )}
                  
                  {/* KT Chatbot 칩 목록 (추천 질문) 표시 */}
                  {message.chipList && message.chipList.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {message.chipList.map((chip, chipIndex) => (
                        <span
                          key={chipIndex}
                          className={`text-xs px-2.5 py-1 rounded-full ${
                            message.bot === 1
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-purple-200/30 text-purple-100 border border-purple-300/30'
                          }`}
                        >
                          {chip.displayText}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {isExpanded && hasTokens && (
                  <div className={`mt-0.5 rounded-b-2xl px-3 py-1.5 text-xs leading-relaxed opacity-0 animate-fadeInSlideDown ${
                    message.bot === 1
                      ? 'bg-gray-50 text-gray-900'
                      : 'bg-purple-400/20 text-gray-900'
                  }`}>
                    <p>
                      총 토큰: <span className="font-medium">{message.tokens.total_tokens}</span>
                      {message.tokens.prompt_tokens && message.tokens.completion_tokens && (
                        <span className="ml-2">
                          입력: <span className="font-medium">{message.tokens.prompt_tokens}</span> | 출력: <span className="font-medium">{message.tokens.completion_tokens}</span>
                        </span>
                      )}
                    </p>
                  </div>
                )}
              </div>

              {message.bot === 2 && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-md">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          );
        })}

        {isSimulating && !isComplete && (
          <div className="flex gap-2 justify-start message-enter">
            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-md">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl px-3 py-2">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}