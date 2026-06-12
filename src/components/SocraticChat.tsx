import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Loader2, RotateCcw, AlertCircle, CircleAlert, Sparkles, User, ShieldAlert, X, Info, Trash2 } from 'lucide-react';
import { Subject, Topic, Message } from '../types';
import { getUserChat, saveUserChat } from '../services/db';
import { EdunovaLogo } from './EdunovaLogo';

interface SocraticChatProps {
  userId: string;
  subject: Subject;
  topic: Topic;
  onSessionComplete?: () => void;
}

export const SocraticChat = ({ userId, subject, topic, onSessionComplete }: SocraticChatProps) => {
  const getDefaultGreeting = () => [
    { 
      role: 'model', 
      text: `¡Hola! Soy tu tutor de EduNova. Hoy vamos a explorar "${topic.name}" dentro de la materia de ${subject.name}.\n\nPara iniciar nuestro camino de razonamiento lógico: ¿Qué es lo primero que te viene a la mente cuando piensas en este tema o qué te gustaría profundizar hoy?` 
    } as Message
  ];

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistorialLoaded, setIsHistorialLoaded] = useState(false);
  const [isCleanModalOpen, setIsCleanModalOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load chat history whenever topic or user changes
  useEffect(() => {
    async function loadChatHistory() {
      if (!userId || !topic?.id) return;
      setIsLoading(true);
      setIsHistorialLoaded(false);
      try {
        const chatData = await getUserChat(userId, topic.id);
        if (chatData && chatData.messages && chatData.messages.length > 0) {
          setMessages(chatData.messages);
          setIsHistorialLoaded(true);
        } else {
          setMessages(getDefaultGreeting());
        }
      } catch (err) {
        console.error('Error cargando historial:', err);
        setMessages(getDefaultGreeting());
      } finally {
        setIsLoading(false);
      }
    }
    loadChatHistory();
  }, [userId, topic?.id, subject?.id]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleConfirmReset = async () => {
    const resetGreeting = getDefaultGreeting();
    setMessages(resetGreeting);
    setIsHistorialLoaded(false);
    setIsCleanModalOpen(false);
    if (userId) {
      try {
        await saveUserChat(userId, subject.id, topic.id, topic.name, resetGreeting);
      } catch (e) {
        console.error('Error guardando reset de chat:', e);
      }
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: 'user', text: input };
    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.name,
          topic,
          history: newHistory
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error de comunicación con el tutor');
      }

      const data = await response.json();
      if (data.text) {
        const updatedMessages: Message[] = [...newHistory, { 
          role: 'model', 
          text: data.text,
          cached: data.cached,
          classification: data.classification
        }];
        setMessages(updatedMessages);

        // Save asynchronously in backend / LocalStorage
        if (userId) {
          saveUserChat(userId, subject.id, topic.id, topic.name, updatedMessages).catch(e => {
            console.error('Error auto-saving converse:', e);
          });
        }
      }
    } catch (error: any) {
      console.error('Chat error:', error);
      const errorHistory: Message[] = [...newHistory, { 
        role: 'model', 
        text: `Lo siento, hubo un problema: ${error.message}. Intenta enviar el mensaje de nuevo o verifica si el límite de solicitudes de la API se reanudará pronto.` 
      }];
      setMessages(errorHistory);
      if (userId) {
        saveUserChat(userId, subject.id, topic.id, topic.name, errorHistory).catch(e => {});
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#131314] text-zinc-100 select-none">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-[#202124] bg-[#0E0E10]/40 backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2.5">
            <h3 className="font-display font-medium text-lg text-white">{topic.name}</h3>
            {isHistorialLoaded && (
              <span className="inline-flex text-[9px] bg-zinc-800 text-zinc-400 border border-[#303134] px-2 py-0.5 rounded-full font-mono font-medium">
                Historial recuperado
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400 font-medium">
            {subject.name} &bull; Tutoría Socrática Activa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCleanModalOpen(true)}
            title="Limpiar conversación (Manteniendo Caché Vectorial)"
            className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all border border-zinc-850/60"
          >
            <RotateCcw size={14} className="text-zinc-400" />
            <span className="text-[10px] font-semibold uppercase tracking-wider hidden sm:block">Limpiar Conversación</span>
          </button>
          
          <div className="flex items-center gap-1.5 px-3 py-1 bg-[#1e1f20] border border-[#2d2e30] rounded-lg">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-[10px] font-mono font-bold text-zinc-300">gemini-3.1-flash-lite</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-10">
          <AnimatePresence initial={false}>
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} items-start gap-4`}
              >
                {/* Assistant icon */}
                {msg.role === 'model' && (
                  <div className="w-9 h-9 rounded-full bg-[#1e1f20] border border-[#2d2e30] flex items-center justify-center shrink-0 shadow-sm">
                    {/* Sparkle emblem matching Edunova mint-green sparkle */}
                    <svg viewBox="0 0 100 100" className="w-5 h-5 fill-emerald-400" xmlns="http://www.w3.org/2000/svg">
                      <path d="M 50 10 C 50 30, 70 50, 90 50 C 70 50, 50 70, 50 90 C 50 70, 30 50, 10 50 C 30 50, 50 30, 50 10 Z" />
                    </svg>
                  </div>
                )}

                {/* Message Body */}
                <div className={`max-w-[85%] ${msg.role === 'user' ? 'w-fit' : 'flex-1 space-y-1'}`}>
                  <div className={`${
                    msg.role === 'user'
                      ? 'bg-[#1e1f20] border border-[#2d2e30] text-zinc-100 px-5 py-3 rounded-2xl rounded-tr-none shadow-sm'
                      : 'text-zinc-200 text-[15px] leading-relaxed whitespace-pre-wrap font-sans'
                  }`}>
                    {msg.text}
                  </div>

                  {/* Metadata Indicators for AI Responses */}
                  {msg.role === 'model' && msg.classification && (
                    <div className="pt-2 flex flex-wrap gap-2 items-center">
                      {msg.cached ? (
                        <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 px-2.5 py-0.5 rounded-full font-bold">
                          ⚡ Caché Semántico (&lt; 100ms &bull; 0 Cuota)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-wider bg-zinc-900 text-zinc-400 border border-zinc-800 px-2.5 py-0.5 rounded-full font-semibold">
                          🧠 Socrático Directo
                        </span>
                      )}
                      
                      <span className="text-[9px] uppercase tracking-wider text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded font-mono font-medium">
                        Modo {msg.classification}
                      </span>
                    </div>
                  )}
                </div>

                {/* User avatar icon */}
                {msg.role === 'user' && (
                  <div className="w-9 h-9 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center shrink-0 shadow-sm text-indigo-300 text-xs font-bold uppercase select-none">
                    Tú
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading status indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-start items-start gap-4"
            >
              <div className="w-9 h-9 rounded-full bg-[#1e1f20] border border-[#2d2e30] flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <svg viewBox="0 0 100 100" className="w-5 h-5 fill-emerald-500" xmlns="http://www.w3.org/2000/svg">
                  <path d="M 50 10 C 50 30, 70 50, 90 50 C 70 50, 50 70, 50 90 C 50 70, 30 50, 10 50 C 30 50, 50 30, 50 10 Z" />
                </svg>
              </div>
              <div className="px-5 py-3 bg-[#1e1f20]/40 border border-[#2d2e30]/50 rounded-2xl rounded-tl-none flex items-center gap-2">
                <div className="flex gap-1.5 py-1">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Floating Pill Input Bar */}
      <div className="p-4 md:p-6 bg-[#131314]">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="relative flex items-center bg-[#1e1f20] border border-[#303134] rounded-full shadow-lg hover:border-[#424447] focus-within:border-zinc-500 focus-within:ring-2 focus-within:ring-zinc-800 transition-all">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={`Pregunta a la Tutoría Socrática de EduNova...`}
              className="w-full bg-transparent border-none text-zinc-100 placeholder-zinc-500 rounded-full py-4 pl-6 pr-16 focus:outline-none focus:ring-0 text-[15px]"
            />
            
            <div className="absolute right-3 top-2 flex items-center gap-2">
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  input.trim() && !isLoading 
                    ? 'bg-emerald-500 text-slate-900 font-bold scale-100 hover:bg-emerald-400' 
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed scale-95'
                }`}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
          
          <p className="text-[9px] uppercase tracking-widest text-center text-zinc-600 font-bold font-mono">
            EduNova es una Inteligencia de Tutoría Socrática y puede cometer errores.
          </p>
        </div>
      </div>

      {/* Modal de Limpieza Inteligente / Caché Semántico vectorizado */}
      <AnimatePresence>
        {isCleanModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
            onClick={() => setIsCleanModalOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.4 }}
              className="bg-[#1e1f20] border border-[#2d2e30] rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-zinc-800/60 flex items-center justify-between bg-zinc-900/40">
                <div className="flex items-center gap-3">
                  <EdunovaLogo size={28} showText={false} />
                  <div>
                    <h3 className="font-display font-semibold text-white text-md">Limpieza de Chat Inteligente</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold font-mono">Modo de Viabilidad Financiera (FinOps)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCleanModalOpen(false)}
                  className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-5 text-xs text-zinc-300 leading-relaxed max-h-[70vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
                <div className="flex items-start gap-3 bg-[#131314]/80 border border-zinc-800 rounded-2xl p-4">
                  <Sparkles size={18} className="text-emerald-400 shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1">
                    <h4 className="font-bold text-zinc-200">Preservar Caché Semántico Vectorial (`pgvector`)</h4>
                    <p className="text-zinc-400 leading-relaxed">
                      Al limpiar esta conversación, reiniciarás tus mensajes a su estado de bienvenida socrática. Sin embargo, 
                      <strong> no se destruirá el caché semántico global</strong> en Supabase.
                    </p>
                  </div>
                </div>

                <p className="text-zinc-400 leading-relaxed font-sans text-[13px]">
                  Para garantizar la viabilidad del proyecto, reducir el consumo y optimizar tu cuota de Gemini, conservamos los siguientes mecanismos:
                </p>

                <div className="space-y-4">
                  {/* Step 1 */}
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-center flex items-center justify-center font-bold shrink-0 text-xs shadow-sm">
                      1
                    </div>
                    <div>
                      <h5 className="font-bold text-zinc-200 text-sm">Vectorización Eficiente (Embeddings)</h5>
                      <p className="text-zinc-400 mt-1">
                        Las intenciones de tus preguntas se convierten a vectores numéricos de 768 dimensiones mediante un modelo de alta eficiencia (como <code>text-embedding-004</code>).
                      </p>
                    </div>
                  </div>

                  {/* Step 2 */}
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-center flex items-center justify-center font-bold shrink-0 text-xs shadow-sm">
                      2
                    </div>
                    <div>
                      <h5 className="font-bold text-zinc-200 text-sm">Búsqueda de Coincidencias de Similitud de Coseno</h5>
                      <p className="text-zinc-400 mt-1">
                        La extensión <code>pgvector</code> compara la semántica de tu duda actual. Si de forma teórica coincide en al menos un <strong>92%</strong> con una duda previamente resuelta, ¡se sirve la misma solución al instante!
                      </p>
                    </div>
                  </div>

                  {/* Step 3 */}
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-center flex items-center justify-center font-bold shrink-0 text-xs shadow-sm">
                      3
                    </div>
                    <div>
                      <h5 className="font-bold text-zinc-200 text-sm">Enrutamiento Socrático Inteligente</h5>
                      <p className="text-zinc-400 mt-1">
                        Las dudas directas o factuales se resuelven en <strong>&lt; 100ms</strong> con costo <strong>$0</strong> de API de Gemini. Solo las dudas procedimentales y personalizadas eluden el caché para mantener la esencia de la tutoría.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-300">
                  <Info size={16} className="shrink-0 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-1 text-zinc-200">¿Qué sucederá ahora?</p>
                    <p className="text-zinc-400">
                      El historial de mensajes en pantalla de este tema volverá a empezar, pero si vuelves a formular preguntas conceptuales comunes ya resueltas, se cargarán de inmediato desde la base de datos sin consumir tu cuota diaria de tutoría.
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/20 flex flex-col sm:flex-row justify-end gap-2.5">
                <button
                  onClick={() => setIsCleanModalOpen(false)}
                  className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/35 text-rose-300 rounded-xl text-xs sm:text-[11px] font-bold uppercase tracking-wider transition-all"
                >
                  Confirmar Limpieza pero Mantener Caché
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
