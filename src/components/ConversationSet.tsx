import { Bot, CheckCircle2 } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface Message {
  id: string;
  bot: 1 | 2;
  text: string;
  timestamp: Date;
}

interface ConversationSetProps {
  setNumber: number;
  messages: Message[];
  isComplete: boolean;
  isSimulating: boolean;
  topic: string;
  persona1: string;
  persona2: string;
}

export function ConversationSet({
  setNumber,
  messages,
  isComplete,
  isSimulating,
  topic,
  persona1,
  persona2,
}: ConversationSetProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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

          .message-enter {
            animation: slideIn 0.3s ease-out;
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
        {messages.map((message, index) => (
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

            <div
              className={`max-w-[80%] rounded-2xl px-3 py-2 shadow-sm ${
                message.bot === 1
                  ? 'bg-white border border-gray-200 text-gray-900'
                  : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
              }`}
            >
              <p className="text-xs leading-relaxed">{message.text}</p>
            </div>

            {message.bot === 2 && (
              <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-purple-400 to-purple-500 flex items-center justify-center shadow-md">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

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