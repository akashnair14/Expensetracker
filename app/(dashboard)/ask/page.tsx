'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, ArrowRight, Bot } from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'ai'
  content: string
  data?: TransactionData[]
  isTyping?: boolean
}

export interface TransactionData {
  id: string
  merchant?: string
  description?: string
  date: string
  is_debit: boolean
  amount: number
}

const SUGGESTIONS = [
  "How much did I spend this month?",
  "What's my biggest expense category?",
  "How does this month compare to last?",
  "How much on food delivery this month?",
  "What subscriptions am I paying for?",
  "Am I on track with my budget?"
]

export default function AskAIPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length <= 200) {
      setInput(value)
      // Auto-resize
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
      }
    }
  }

  const submitQuery = async (query: string) => {
    if (!query.trim() || isLoading) return

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: query.trim() }
    const typingMsg: Message = { id: 'typing', role: 'ai', content: '', isTyping: true }
    
    setMessages(prev => [...prev, userMsg, typingMsg])
    setInput('')
    setIsLoading(true)
    
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: query.trim() })
      })
      
      const data = await res.json()
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to get answer')
      }

      setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
        id: Date.now().toString(),
        role: 'ai',
        content: data.answer,
        data: data.data
      }))
    } catch (error: unknown) {
      setMessages(prev => prev.filter(m => m.id !== 'typing').concat({
        id: Date.now().toString(),
        role: 'ai',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submitQuery(input)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] lg:h-full relative overflow-hidden bg-[#0D0F14]">
      {/* Header */}
      <header className="shrink-0 p-6 border-b border-border bg-[#0D0F14]/90 backdrop-blur-md z-10 sticky top-0 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-green/10 flex items-center justify-center border border-brand-green/20">
          <Sparkles className="w-5 h-5 text-brand-green" />
        </div>
        <div>
          <h1 className="text-xl font-display text-white">Ask about your money</h1>
          <p className="text-xs font-mono text-text-muted">Powered by Gemini 2.0 Flash</p>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
            <div className="w-20 h-20 bg-surface border border-border rounded-2xl flex items-center justify-center mb-8 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-brand-green/5 animate-pulse" />
              <Bot className="w-10 h-10 text-brand-green relative z-10" />
            </div>
            <h2 className="text-2xl font-ui text-white mb-2 text-center">Hello! I&apos;m your AI financial assistant.</h2>
            <p className="text-sm font-mono text-text-muted mb-12 text-center">Ask me anything about your spending, trends, or specific transactions.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {SUGGESTIONS.map((sug, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => submitQuery(sug)}
                  className="bg-surface border border-border hover:border-brand-green/30 hover:bg-[#1C2030] p-4 rounded-xl text-left transition-colors group flex items-start gap-3"
                >
                  <Sparkles className="w-4 h-4 text-text-muted group-hover:text-brand-green mt-0.5 shrink-0 transition-colors" />
                  <span className="text-sm font-ui text-white/90 group-hover:text-white">{sug}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto w-full flex flex-col gap-6 pb-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    
                    {msg.role === 'ai' && (
                      <div className="w-8 h-8 rounded-full bg-[#1C2030] border border-border flex items-center justify-center shrink-0 mt-1">
                        <Sparkles className="w-4 h-4 text-brand-green" />
                      </div>
                    )}
                    
                    <div className="flex flex-col gap-2">
                      <div className={`px-5 py-3.5 text-[15px] font-ui leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-brand-green/10 border border-brand-green/20 text-brand-green rounded-2xl rounded-tr-sm' 
                          : 'bg-[#141720] border border-[#252A3A] text-white/90 rounded-2xl rounded-tl-sm shadow-sm'
                      }`}>
                        {msg.isTyping ? (
                          <div className="flex gap-1.5 items-center h-6 px-1">
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} className="w-1.5 h-1.5 bg-brand-green rounded-full" />
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1.5 h-1.5 bg-brand-green rounded-full" />
                            <motion.div animate={{ y: [0, -5, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} className="w-1.5 h-1.5 bg-brand-green rounded-full" />
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>
                      
                      {msg.role === 'ai' && msg.data && msg.data.length > 0 && (
                        <div className="bg-surface border border-border rounded-xl p-4 overflow-hidden mt-1 shadow-md">
                          <h4 className="text-xs font-mono text-text-muted mb-3 uppercase tracking-wider">Relevant Transactions ({msg.data.length})</h4>
                          <div className="flex flex-col gap-2">
                            {msg.data.slice(0, 3).map((tx: TransactionData) => (
                              <div key={tx.id} className="flex justify-between items-center bg-[#1C2030] p-2.5 rounded-lg border border-border/50">
                                <div className="flex flex-col">
                                  <span className="text-sm font-ui text-white truncate max-w-[200px]">{tx.merchant || tx.description}</span>
                                  <span className="text-[11px] font-mono text-text-muted">{tx.date}</span>
                                </div>
                                <span className={`text-sm font-mono ${tx.is_debit ? 'text-red-400' : 'text-green-400'}`}>
                                  {tx.is_debit ? '−' : '+'}₹{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              </div>
                            ))}
                            {msg.data.length > 3 && (
                              <p className="text-xs font-mono text-text-muted text-center mt-2">+ {msg.data.length - 3} more transactions</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Sticky Input */}
      <div className="shrink-0 p-4 md:p-6 bg-gradient-to-t from-[#0D0F14] to-[#0D0F14]/0 pt-10">
        <div className="max-w-3xl mx-auto relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-brand-green/20 to-brand-blue/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition duration-500" />
          <div className="relative bg-surface border border-border rounded-2xl flex items-end p-2 shadow-2xl">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything..."
              className="w-full bg-transparent text-white font-ui text-base p-3 outline-none resize-none min-h-[44px] max-h-[120px] placeholder:text-text-muted"
              rows={1}
            />
            <div className="flex flex-col gap-2 items-center px-2 pb-2 shrink-0">
              {input.length > 150 && (
                <span className={`text-[10px] font-mono ${input.length >= 200 ? 'text-red-400' : 'text-text-muted'}`}>
                  {input.length}/200
                </span>
              )}
              <button
                onClick={() => submitQuery(input)}
                disabled={!input.trim() || isLoading}
                className="w-10 h-10 rounded-xl bg-brand-green text-[#0D0F14] flex items-center justify-center disabled:opacity-50 disabled:bg-surface2 disabled:text-text-muted disabled:border-border transition-colors shadow-[0_0_15px_rgba(0,229,160,0.15)] disabled:shadow-none"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3 opacity-50">
            <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
              <span className="border border-border/50 px-1 rounded bg-surface2">Enter</span> to send
            </span>
            <span className="text-[10px] font-mono text-text-muted flex items-center gap-1">
              <span className="border border-border/50 px-1 rounded bg-surface2">Shift</span> + <span className="border border-border/50 px-1 rounded bg-surface2">Enter</span> for newline
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
