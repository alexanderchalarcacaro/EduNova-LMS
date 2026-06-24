import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, ArrowLeft, RefreshCw, SendHorizontal, Zap, Sparkles, User } from 'lucide-react';
import { Subject, Topic, ChatMessage } from '../types';
import { manageChatUseCase } from '../core/HexagonalFactory';

interface SocraticChatProps {
  userId: string;
  subject: Subject;
  topic: Topic;
  onBack?: () => void;
  initialUserMessage?: string;
  onClearInitialMessage?: () => void;
}

// Lightweight, 100% bulletproof inline markdown formatter
function FormattedMessage({ text }: { text: string }) {
  const paragraphs = text.split('\n\n');
  return (
    <div className="space-y-3 font-sans text-[13px] leading-relaxed text-zinc-200">
      {paragraphs.map((para, i) => {
        // Special render for bold, lists, and quotes
        let cleanText = para;
        const isHeader = cleanText.startsWith('#');
        const isList = cleanText.startsWith('- ') || cleanText.startsWith('* ') || /^\d+\./.test(cleanText);
        
        if (isHeader) {
          cleanText = cleanText.replace(/^#+\s+/, '');
          return <h4 key={i} className="text-sm font-sans font-extrabold text-white tracking-tight mt-4 first:mt-0">{cleanText}</h4>;
        }

        if (isList) {
          const items = para.split('\n');
          return (
            <ul key={i} className="list-disc pl-5 space-y-1.5 list-inside text-zinc-300">
              {items.map((item, idx) => {
                const formattedItem = item.replace(/^[-*\d.]+\s+/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                return (
                  <li 
                    key={idx} 
                    dangerouslySetInnerHTML={{ __html: formattedItem }} 
                  />
                );
              })}
            </ul>
          );
        }

        // Standard rich parsing for inline double asterisks **bold**
        const richInlineText = cleanText.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>');
        return (
          <p 
            key={i} 
            dangerouslySetInnerHTML={{ __html: richInlineText }} 
            className="text-zinc-200"
          />
        );
      })}
    </div>
  );
}

export default function SocraticChat({ 
  userId, 
  subject, 
  topic, 
  onBack,
  initialUserMessage,
  onClearInitialMessage
}: SocraticChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Helper to persist to the database/localStorage while keeping hidden messages intact
  const saveHistory = async (newVisibleMessages: ChatMessage[]) => {
    const fullHistory = await manageChatUseCase.fetchHistory(userId, subject.id, topic.id);
    const lastCleared = localStorage.getItem(`edunova_chat_cleared_${userId || 'guest'}_${subject.id}_${topic.id}`);
    
    // Hidden messages are those created before or equal to lastCleared
    const hiddenMessages = lastCleared
      ? fullHistory.filter(msg => new Date(msg.timestamp).getTime() <= new Date(lastCleared).getTime())
      : [];
      
    const combined = [...hiddenMessages, ...newVisibleMessages];
    await manageChatUseCase.persistMessage(userId, subject.id, topic.id, topic.name, combined);
  };

  // Load chat session history on mount
  useEffect(() => {
    async function loadHistory() {
      const history = await manageChatUseCase.fetchHistory(userId, subject.id, topic.id);
      const lastCleared = localStorage.getItem(`edunova_chat_cleared_${userId || 'guest'}_${subject.id}_${topic.id}`);
      
      const visible = lastCleared
        ? history.filter(msg => new Date(msg.timestamp).getTime() > new Date(lastCleared).getTime())
        : history;
      
      if (visible.length > 0) {
        setMessages(visible);
      } else {
        // If no prior history or cleared, trigger initial Socratic opening prompt
        const openingMessage: ChatMessage = {
          id: `initial-opening-${Date.now()}`,
          role: 'model',
          content: `¡Hola! Me alegra guiarte en el estudio de **${topic.name}**. 
 
Para comenzar nuestro viaje socrático de hoy de manera activa, cuéntame: con tus propias palabras, ¿cuál dirías que es tu entendimiento o intuición inicial acerca de este concepto en tu vida cotidiana, o qué pregunta te urge resolver de primero?`,
          timestamp: lastCleared ? new Date(new Date(lastCleared).getTime() + 1000).toISOString() : new Date().toISOString()
        };
        setMessages([openingMessage]);
        await saveHistory([openingMessage]);
      }
    }
    loadHistory();
  }, [userId, subject.id, topic.id, topic.name]);

  // Handle trigger message from parent (e.g. reflections or mini-challenges)
  useEffect(() => {
    if (initialUserMessage) {
      const triggerMessage = async () => {
        const userMsg: ChatMessage = {
          id: `msg-${Date.now()}-user-trigger`,
          role: 'user',
          content: initialUserMessage,
          timestamp: new Date().toISOString()
        };
        
        const updatedMessages = [...messages, userMsg];
        setMessages(updatedMessages);
        setIsAiResponding(true);
        if (onClearInitialMessage) onClearInitialMessage();

        // Persist optimistic update
        await saveHistory(updatedMessages);

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicName: topic.name,
              difficulty: topic.difficulty,
              messages: updatedMessages
            })
          });

          if (!response.ok) throw new Error('Fallo al obtener respuesta del servidor');

          const data = await response.json();
          const modelMessage: ChatMessage = {
            id: `msg-${Date.now()}-model`,
            role: 'model',
            content: data.content,
            timestamp: new Date().toISOString()
          };

          const finalMessages = [...updatedMessages, modelMessage];
          setMessages(finalMessages);
          await saveHistory(finalMessages);
        } catch (err) {
          console.error(err);
          const errorMessage: ChatMessage = {
            id: `msg-${Date.now()}-err`,
            role: 'model',
            content: `⚠️ Disculpa, hubo un desfase al conectar con mi núcleo de estudio. ¿Podríamos re-intentar enviar tu última idea de nuevo?`,
            timestamp: new Date().toISOString()
          };
          const errMessages = [...updatedMessages, errorMessage];
          setMessages(errMessages);
          await saveHistory(errMessages);
        } finally {
          setIsAiResponding(false);
        }
      };

      if (messages.length > 0) {
        triggerMessage();
      }
    }
  }, [initialUserMessage, messages, userId, subject.id, topic.id, topic.name, onClearInitialMessage]);

  // Handle messages auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiResponding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isAiResponding) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user',
      content: inputText,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputText('');
    setIsAiResponding(true);

    // Persist optimistic update
    await saveHistory(updatedMessages);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicName: topic.name,
          difficulty: topic.difficulty,
          messages: updatedMessages
        })
      });

      if (!response.ok) {
        throw new Error('Fallo al obtener respuesta del servidor');
      }

      const data = await response.json();
      const modelMessage: ChatMessage = {
        id: `msg-${Date.now()}-model`,
        role: 'model',
        content: data.content,
        timestamp: new Date().toISOString()
      };

      const finalMessages = [...updatedMessages, modelMessage];
      setMessages(finalMessages);
      await saveHistory(finalMessages);
    } catch (err: any) {
      console.error(err);
      const errorMessage: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'model',
        content: `⚠️ Disculpa, hubo un desfase al conectar con mi núcleo de estudio. ¿Podríamos re-intentar enviar tu última idea de nuevo?`,
        timestamp: new Date().toISOString()
      };
      const errMessages = [...updatedMessages, errorMessage];
      setMessages(errMessages);
      await saveHistory(errMessages);
    } finally {
      setIsAiResponding(false);
    }
  };

  const handleConfirmClear = async () => {
    const clearTime = new Date().toISOString();
    localStorage.setItem(`edunova_chat_cleared_${userId || 'guest'}_${subject.id}_${topic.id}`, clearTime);
    
    const openingMessage: ChatMessage = {
      id: `initial-opening-restart-${Date.now()}`,
      role: 'model',
      content: `¡Listo! Volvamos a empezar sobre **${topic.name}**. 

¿Qué es lo primero que se te viene a la mente cuando piensas en este tema, o cuál es tu teoría inicial sobre cómo funciona?`,
      timestamp: new Date(new Date(clearTime).getTime() + 1000).toISOString()
    };
    setMessages([openingMessage]);
    await saveHistory([openingMessage]);
    setShowClearConfirm(false);
  };

  return (
    <div className="flex flex-col h-full bg-[#0c1424] rounded-2xl border border-[#1e293b] overflow-hidden relative">
      {/* Upper bar panels */}
      <div className="px-5 py-3.5 bg-[#121f3d]/60 border-b border-[#1e293b] flex items-center justify-between shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-1.5 text-zinc-400 hover:text-white hover:bg-[#1e293b] rounded-lg transition-all"
            >
              <ArrowLeft size={16} />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${subject.color || 'bg-platzi-blue'} pulsy animate-pulse`} />
              <h3 className="text-xs font-mono font-bold tracking-wider text-zinc-300 uppercase">
                {subject.name}
              </h3>
            </div>
            <h2 className="text-sm font-sans font-bold text-white tracking-tight mt-0.5">
              Tutoría Activa: {topic.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono font-extrabold uppercase bg-platzi-green/10 border border-platzi-green/20 px-2 py-0.5 rounded-full text-platzi-green">
            {topic.difficulty}
          </span>
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-sans font-bold uppercase tracking-wider text-zinc-400 hover:text-rose-450 hover:bg-rose-950/20 border border-transparent hover:border-rose-900/30 rounded-lg transition-all cursor-pointer"
            id="clear-chat-btn"
            title="Limpiar chat con el tutor"
          >
            <RefreshCw size={12} />
            <span>Limpiar Chat</span>
          </button>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg) => {
            const isModel = msg.role === 'model';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className={`flex w-full items-start gap-3.5 ${isModel ? 'justify-start' : 'justify-end'}`}
              >
                {isModel && (
                  <div className="w-8 h-8 rounded-xl bg-[#1e293b] text-platzi-green border border-platzi-green/20 flex items-center justify-center font-bold shrink-0 mt-1">
                    <Sparkles size={14} />
                  </div>
                )}
                <div className={`max-w-[78%] rounded-2xl px-5 py-4 ${
                  isModel 
                    ? 'bg-[#0f172a]/70 border border-[#1e293b] rounded-tl-none shadow-sm' 
                    : 'bg-platzi-green/10 border border-platzi-green/25 rounded-tr-none text-white'
                }`}>
                  <div className="flex items-center gap-1.5 mb-2.5 shrink-0">
                    {isModel ? (
                      <>
                        <span className="text-[10px] font-mono font-black text-platzi-green tracking-wider uppercase">TUTOR SOCRÁTICO</span>
                      </>
                    ) : (
                      <>
                        <span className="text-[10px] font-mono font-black text-[#64748b] tracking-wider uppercase">TU RESPUESTA</span>
                      </>
                    )}
                  </div>
                  <FormattedMessage text={msg.content} />
                </div>
                {!isModel && (
                  <div className="w-8 h-8 rounded-xl bg-[#121f3d] border border-slate-700 flex items-center justify-center text-zinc-350 font-bold shrink-0 mt-1">
                    <User size={14} />
                  </div>
                )}
              </motion.div>
            );
          })}

          {isAiResponding && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-3.5 justify-start"
            >
              <div className="w-8 h-8 rounded-xl bg-[#1e293b] text-platzi-green border border-platzi-green/20 flex items-center justify-center font-bold shrink-0 mt-1 animate-pulse">
                <Sparkles size={14} />
              </div>
              <div className="bg-[#0f172a]/70 border border-[#1e293b] rounded-2xl rounded-tl-none px-5 py-4 max-w-[78%] shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-platzi-green rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-platzi-green rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-platzi-green rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  <span className="text-[10px] font-mono font-black text-platzi-green uppercase tracking-wider pl-1.5">
                    EL TUTOR ESTÁ ANALIZANDO TU RESPUESTA...
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={scrollRef} />
      </div>

      {/* Input zone panel */}
      <form onSubmit={handleSubmit} className="p-4 bg-[#0a0f1d] border-t border-[#1e293b] backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3 bg-[#121f3d]/60 border border-[#1e293b] rounded-2xl px-4.5 py-3 focus-within:border-platzi-green/50 focus-within:ring-2 focus-within:ring-platzi-green/5 transition-all duration-300">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Introduce tu razonamiento, intuición o duda aquí..."
            disabled={isAiResponding}
            className="flex-1 bg-transparent text-[13px] text-zinc-100 placeholder-zinc-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isAiResponding}
            className={`p-2 rounded-xl transition-all duration-300 ${
              inputText.trim() && !isAiResponding
                ? 'bg-platzi-green text-[#0c1424] hover:bg-emerald-400 shadow-md shadow-platzi-green/10 hover:scale-[1.02] active:scale-[0.98]'
                : 'text-zinc-600 bg-transparent cursor-default'
            }`}
          >
            <SendHorizontal size={15} />
          </button>
        </div>
        <p className="text-[10px] font-mono text-zinc-500 mt-2 text-center">
          Consejo: Las respuestas abiertas invitan a un análisis socrático más interesante y profundo.
        </p>
      </form>

      {/* Custom Confirmation Modal overlay */}
      <AnimatePresence>
        {showClearConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-5"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#0f172a] border border-rose-500/25 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-450">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  <RefreshCw size={16} className="text-rose-400" />
                </div>
                <div>
                  <h3 className="text-sm font-sans font-bold text-white">¿Reiniciar conversación?</h3>
                  <p className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">Acción Irreversible</p>
                </div>
              </div>
              
              <p className="text-xs text-zinc-350 leading-relaxed">
                Se limpiará la pantalla de este diálogo socrático actual para comenzar una sesión fresca. El historial de tus interacciones previas seguirá guardado de forma segura en la base de datos de tu perfil.
              </p>
              
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3.5 py-1.5 text-xs font-sans font-bold text-zinc-400 hover:text-white hover:bg-[#1e293b] rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClear}
                  className="px-4 py-1.5 text-xs font-sans font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/20 transition-all cursor-pointer"
                >
                  Sí, reiniciar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
