'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, RefreshCw, Bot, User, Sparkles, MessageSquare } from 'lucide-react';
import apiClient from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Quick question chips — bilingual pairs ────────────────────────────────────

const QUICK_QUESTIONS = [
  { en: "What's my occupancy rate?", ar: 'ما نسبة التأجير؟' },
  { en: 'Which tenants are overdue?', ar: 'من المستأجرون المتأخرون؟' },
  { en: 'Analyze maintenance costs', ar: 'حلل تكاليف الصيانة' },
  { en: 'Revenue forecast', ar: 'توقعات الإيرادات' },
  { en: 'How to reduce vacancies?', ar: 'كيف أقلل الشواغر؟' },
  { en: 'Cost optimization tips', ar: 'نصائح لتحسين التكاليف' },
];

// ─── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex items-end gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sheen-gold to-sheen-brown shadow-sm">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="rounded-2xl rounded-bl-none border border-sheen-gold/30 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 animate-bounce rounded-full bg-sheen-gold [animation-delay:0ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-sheen-gold [animation-delay:150ms]" />
          <span className="h-2 w-2 animate-bounce rounded-full bg-sheen-gold [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

// ─── Single chat bubble ────────────────────────────────────────────────────────

function ChatBubble({ message, isAr }: { message: Message; isAr: boolean }) {
  const isUser = message.role === 'user';

  if (isUser) {
    return (
      <div className={`flex items-end gap-3 ${isAr ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sheen-black shadow-sm">
          <User className="h-4 w-4 text-white" />
        </div>
        <div
          className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed text-white shadow-sm ${
            isAr ? 'rounded-bl-none bg-sheen-brown' : 'rounded-br-none bg-sheen-black'
          }`}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-end gap-3 ${isAr ? 'flex-row-reverse' : ''}`}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sheen-gold to-sheen-brown shadow-sm">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div
        className={`max-w-[78%] rounded-2xl border border-sheen-gold/30 bg-white px-4 py-3 text-sm leading-relaxed text-sheen-black shadow-sm ${
          isAr ? 'rounded-br-none' : 'rounded-bl-none'
        }`}
      >
        <div className="mb-1 flex items-center gap-1.5">
          <Sparkles className="h-3 w-3 text-sheen-gold" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-sheen-gold">
            Aqari AI
          </span>
        </div>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function AiChatPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  const isAr = locale === 'ar';
  const lang = isAr ? 'ar' : 'en';

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [autoInsight, setAutoInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll chat to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Load auto-analysis on mount
  useEffect(() => {
    loadAutoInsight();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  async function loadAutoInsight() {
    setInsightLoading(true);
    setAutoInsight(null);
    try {
      const res = await apiClient.post('/ai/analyze', { lang });
      setAutoInsight(res.data?.content ?? null);
    } catch {
      setAutoInsight(
        isAr
          ? 'تعذّر تحميل التحليل التلقائي.'
          : 'Could not load auto-analysis.',
      );
    } finally {
      setInsightLoading(false);
    }
  }

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    const userMessage: Message = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await apiClient.post('/ai/chat', {
        messages: updatedMessages,
        lang,
      });
      const aiMessage: Message = {
        role: 'assistant',
        content: res.data?.content ?? (isAr ? 'لا توجد استجابة.' : 'No response.'),
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch {
      const errMessage: Message = {
        role: 'assistant',
        content: isAr
          ? 'حدث خطأ أثناء الاتصال. يرجى المحاولة مرة أخرى.'
          : 'An error occurred. Please try again.',
      };
      setMessages((prev) => [...prev, errMessage]);
    } finally {
      setIsTyping(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value);
    // Auto-grow
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  }

  const dir = isAr ? 'rtl' : 'ltr';

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col gap-4" dir={dir}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-sheen-gold to-sheen-brown shadow-md">
            <MessageSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-sheen-black">
              {isAr ? 'المساعد الذكي' : 'AI Assistant'}
            </h1>
            <p className="text-sm text-sheen-muted">
              {isAr
                ? 'اسأل عن أداء عقاراتك، المستأجرين، والإيرادات'
                : 'Ask about your properties, tenants, and revenue'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMessages([])}
          className="text-sheen-muted hover:text-sheen-black"
        >
          {isAr ? 'محادثة جديدة' : 'New chat'}
        </Button>
      </div>

      {/* ── Auto-insight panel ─────────────────────────────────────────────── */}
      <Card className="shrink-0 border-sheen-gold/40 bg-gradient-to-br from-sheen-cream/80 to-white shadow-sm">
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-sheen-gold" />
              <span className="text-xs font-semibold uppercase tracking-wider text-sheen-gold">
                {isAr ? 'تحليل ذكي تلقائي' : 'Auto Analysis'}
              </span>
            </div>
            <button
              onClick={loadAutoInsight}
              disabled={insightLoading}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-sheen-muted transition hover:bg-sheen-gold/10 hover:text-sheen-gold disabled:opacity-50"
            >
              <RefreshCw className={`h-3 w-3 ${insightLoading ? 'animate-spin' : ''}`} />
              {isAr ? 'تحديث' : 'Refresh'}
            </button>
          </div>

          {insightLoading ? (
            <div className="flex items-center gap-2 py-1">
              <div className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sheen-gold [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sheen-gold [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-sheen-gold [animation-delay:300ms]" />
              </div>
              <span className="text-xs text-sheen-muted">
                {isAr ? 'جاري التحليل...' : 'Analyzing...'}
              </span>
            </div>
          ) : autoInsight ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-sheen-black">
              {autoInsight}
            </p>
          ) : null}
        </CardContent>
      </Card>

      {/* ── Chat area ─────────────────────────────────────────────────────── */}
      <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-gray-200 bg-gray-50/60 shadow-inner">
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {messages.length === 0 && !isTyping && (
            <div className="flex h-full flex-col items-center justify-center gap-3 py-8 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-sheen-gold/20 to-sheen-brown/10">
                <Bot className="h-8 w-8 text-sheen-gold" />
              </div>
              <p className="text-sm font-medium text-sheen-black">
                {isAr ? 'مرحباً! كيف يمكنني مساعدتك اليوم؟' : 'Hello! How can I help you today?'}
              </p>
              <p className="max-w-xs text-xs text-sheen-muted">
                {isAr
                  ? 'يمكنني تحليل أداء عقاراتك، المستأجرين المتأخرين، تكاليف الصيانة، وتقديم توصيات عملية.'
                  : 'I can analyze property performance, overdue tenants, maintenance costs, and provide actionable recommendations.'}
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <ChatBubble key={i} message={msg} isAr={isAr} />
          ))}

          {isTyping && <TypingIndicator />}

          <div ref={bottomRef} />
        </div>

        {/* ── Quick questions ─────────────────────────────────────────────── */}
        {messages.length === 0 && (
          <div className="border-t border-gray-200 px-4 py-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-sheen-muted">
              {isAr ? 'أسئلة سريعة' : 'Quick questions'}
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(isAr ? q.ar : q.en)}
                  disabled={isTyping}
                  className="rounded-full border border-sheen-gold/40 bg-white px-3 py-1.5 text-xs font-medium text-sheen-brown transition hover:border-sheen-gold hover:bg-sheen-gold/10 hover:text-sheen-black disabled:opacity-50"
                >
                  {isAr ? q.ar : q.en}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Input area ──────────────────────────────────────────────────── */}
        <div className="border-t border-gray-200 bg-white p-3">
          <div className="flex items-end gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 transition focus-within:border-sheen-gold/60 focus-within:bg-white focus-within:shadow-sm">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={isTyping}
              placeholder={
                isAr
                  ? 'اكتب سؤالك هنا... (Enter للإرسال)'
                  : 'Type your question... (Enter to send)'
              }
              className="flex-1 resize-none bg-transparent text-sm text-sheen-black placeholder:text-sheen-muted/60 focus:outline-none disabled:opacity-50"
              style={{ maxHeight: '120px' }}
              dir={dir}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sheen-gold text-white shadow-sm transition hover:bg-sheen-brown disabled:opacity-40 disabled:shadow-none"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px] text-sheen-muted/60">
            {isAr ? 'Shift+Enter لسطر جديد' : 'Shift+Enter for new line'}
          </p>
        </div>
      </div>
    </div>
  );
}
