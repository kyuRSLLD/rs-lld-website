import { useState, useEffect, useRef } from 'react'
import { X, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '../contexts/LanguageContext'
import pandaIcon from '../assets/panda-icon.jpg'

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)
  const { currentLanguage } = useLanguage()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Reset and show welcome message whenever chat opens or language changes
  useEffect(() => {
    if (isOpen) {
      const welcomeMessages = {
        en: "Hello! I'm your RS LLD assistant 🐼 How can I help you with your restaurant supply needs today?",
        zh: "您好！我是 RS LLD 助手 🐼 今天我能为您的餐厅供应需求提供什么帮助？",
        ko: "안녕하세요! RS LLD 어시스턴트입니다 🐼 오늘 레스토랑 공급 요구사항에 대해 어떻게 도와드릴까요?"
      }
      setMessages([{
        role: 'assistant',
        content: welcomeMessages[currentLanguage] || welcomeMessages.en,
        timestamp: Date.now()
      }])
    }
  }, [isOpen, currentLanguage])

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: Date.now()
    }

    const currentHistory = [...messages]
    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: inputMessage,
          language: currentLanguage,
          history: currentHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.message,
          timestamp: Date.now()
        }])
      } else {
        throw new Error(data.error || 'Failed to get response')
      }
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessages = {
        en: "I'm sorry, I'm having trouble connecting right now. Please try again.",
        zh: "抱歉，我现在连接有问题。请稍后再试。",
        ko: "죄송합니다. 지금 연결에 문제가 있습니다. 다시 시도해 주세요."
      }
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: errorMessages[currentLanguage] || errorMessages.en,
        timestamp: Date.now()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const chatLabels = {
    en: { title: 'RS LLD Assistant', subtitle: 'Online', placeholder: 'Type your message...', close: 'Close chat' },
    zh: { title: 'RS LLD 助手', subtitle: '在线', placeholder: '输入您的消息...', close: '关闭聊天' },
    ko: { title: 'RS LLD 어시스턴트', subtitle: '온라인', placeholder: '메시지를 입력하세요...', close: '채팅 닫기' }
  }

  const labels = chatLabels[currentLanguage] || chatLabels.en

  return (
    <>
      {/* Floating Chat Button - always bottom-right */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-16 h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 z-50 border-2 border-white"
          aria-label="Open chat assistant"
        >
          <img
            src={pandaIcon}
            alt="Chat Assistant"
            className="w-12 h-12 rounded-full object-cover"
          />
        </button>
      )}

      {/* Chat Window - consistent design across all languages */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 w-96 h-[580px] bg-white rounded-2xl shadow-2xl flex flex-col z-50 border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white p-4 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-3">
              <img
                src={pandaIcon}
                alt="Panda Assistant"
                className="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
              />
              <div>
                <h3 className="font-semibold text-base">{labels.title}</h3>
                <p className="text-xs text-blue-100 flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-400 rounded-full inline-block"></span>
                  {labels.subtitle}
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-blue-800 rounded-full p-1.5 transition-colors"
              aria-label={labels.close}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'assistant' && (
                  <img
                    src={pandaIcon}
                    alt="Assistant"
                    className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end"
                  />
                )}
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white rounded-br-sm'
                      : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <img
                  src={pandaIcon}
                  alt="Assistant"
                  className="w-7 h-7 rounded-full object-cover mr-2 flex-shrink-0 self-end"
                />
                <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                  <div className="flex space-x-1.5">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3 border-t border-gray-200 bg-white flex-shrink-0">
            <div className="flex space-x-2 items-center">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={labels.placeholder}
                className="flex-1 border border-gray-300 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default ChatBot
