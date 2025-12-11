import { Bot, Sparkles } from 'lucide-react';
import botLogo from '../assets/bot_logo.png';
import { useEffect, useRef } from 'react';

interface Message {
  id: string;
  bot: 1 | 2;
  text: string;
  timestamp: Date;
}

interface ConversationDisplayProps {
  messages: Message[];
  isSimulating: boolean;
  persona: string;
  topic: string;
}

export function ConversationDisplay({
  messages,
  isSimulating,
  persona,
  topic,
}: ConversationDisplayProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0 && !isSimulating) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-12 h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <Sparkles className="w-16 h-16 text-purple-300 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">시작 준비 완료</h3>
          <p className="text-gray-500">
            챗봇을 설정하고 "시뮬레이션 시작"을 클릭하여 대화를 관찰하세요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 h-[600px] flex flex-col">
      <div className="mb-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-2">
          <img src={botLogo} alt="Chatbot" className="w-5 h-5" />
          <h2 className="text-gray-900">실시간 대화</h2>
        </div>
        {topic && (
          <p className="text-gray-600 text-sm">
            토론 주제: <span className="font-medium">{topic}</span>
            {persona && (
              <span>
                {' '}
                · 페르소나: <span className="font-medium">{persona}</span>
              </span>
            )}
          </p>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.bot === 1 ? 'justify-start' : 'justify-end'
            }`}
          >
            {message.bot === 1 && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                <img src={botLogo} alt="Bot 1" className="w-4 h-4" />
              </div>
            )}

            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                message.bot === 1
                  ? 'bg-gray-100 text-gray-900'
                  : 'bg-gradient-to-br from-purple-500 to-purple-600 text-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs opacity-75">
                  {message.bot === 1 ? '챗봇 1' : '챗봇 2'}
                </span>
              </div>
              <p className="text-sm">{message.text}</p>
            </div>

            {message.bot === 2 && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                <img src={botLogo} alt="Bot 2" className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isSimulating && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <img src={botLogo} alt="Typing..." className="w-4 h-4" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
