import React, { useState, useEffect, useRef } from 'react';
import { Subject, Topic } from '../types';
import * as LucideIcons from 'lucide-react';
import MuxPlayer from '@mux/mux-player-react';
import katex from 'katex';
import SocraticChat from './SocraticChat';
import { getCompletedTopics, saveCompletedTopic } from '../services/db';


interface Props {
  subject: Subject;
  topic: Topic;
  userId: string;
  allTopics: Topic[];
  onSelectTopic: (topic: Topic) => void;
  onBack: () => void;
}

// Interface for structured lesson sections
interface LessonSection {
  type: 'theory' | 'reflection' | 'challenge' | 'applet' | 'links';
  title: string;
  emoji: string;
  content: string;
}

// 1. MathText: Inline & Block LaTeX formula renderer using KaTeX
export function MathText({ text }: { text: string }) {
  if (!text) return null;

  // Split by $$ first (block math)
  const blockParts = text.split(/\$\$(.*?)\$\$/gs);
  
  return (
    <span className="font-sans leading-relaxed text-zinc-300">
      {blockParts.map((part, index) => {
        const isBlock = index % 2 === 1;
        if (isBlock) {
          try {
            const html = katex.renderToString(part.trim(), { displayMode: true, throwOnError: false });
            return (
              <span 
                key={index} 
                className="block my-5 overflow-x-auto max-w-full bg-[#0c1424]/40 p-4 rounded-xl border border-[#1e293b]/50 text-white shadow-inner" 
                dangerouslySetInnerHTML={{ __html: html }} 
              />
            );
          } catch (e) {
            return (
              <pre key={index} className="block my-5 bg-red-950/20 text-rose-300 p-3 rounded-xl border border-red-900/30 font-mono text-xs overflow-x-auto">
                {part}
              </pre>
            );
          }
        }

        // Now split by $ (inline math)
        const inlineParts = part.split(/\$(.*?)\$/g);
        return (
          <span key={index}>
            {inlineParts.map((subPart, subIndex) => {
              const isInline = subIndex % 2 === 1;
              if (isInline) {
                try {
                  const html = katex.renderToString(subPart.trim(), { displayMode: false, throwOnError: false });
                  return (
                    <span 
                      key={subIndex} 
                      className="inline-block mx-1.5 px-1 py-0.5 rounded bg-[#1e293b]/25 text-white font-serif" 
                      dangerouslySetInnerHTML={{ __html: html }} 
                    />
                  );
                } catch (e) {
                  return <code key={subIndex} className="bg-red-950/30 text-rose-300 px-1.5 py-0.5 rounded font-mono text-xs">{subPart}</code>;
                }
              }
              
              // Render standard rich text (like bold formatting)
              // Match double asterisks **bold**
              const boldParts = subPart.split(/\*\*(.*?)\*\*/g);
              return (
                <React.Fragment key={subIndex}>
                  {boldParts.map((boldText, boldIdx) => {
                    const isBold = boldIdx % 2 === 1;
                    if (isBold) {
                      return <strong key={boldIdx} className="text-white font-extrabold">{boldText}</strong>;
                    }
                    return boldText;
                  })}
                </React.Fragment>
              );
            })}
          </span>
        );
      })}
    </span>
  );
}

// 2. Interactive SVG Vector Sandbox
function VectorSandbox() {
  const [ux, setUx] = useState(4);
  const [uy, setUy] = useState(3);
  const [vx, setVx] = useState(3);
  const [vy, setVy] = useState(-2);
  const [scalarK, setScalarK] = useState(1.5);
  const [mode, setMode] = useState<'sum' | 'scale'>('sum');
  const [activeHandle, setActiveHandle] = useState<'u' | 'v' | null>(null);
  
  const svgRef = useRef<SVGSVGElement>(null);
  const size = 300;
  const center = size / 2;
  const scale = 13; // pixels per unit

  // Coordinates converters
  const toSvgX = (gridX: number) => center + gridX * scale;
  const toSvgY = (gridY: number) => center - gridY * scale;
  
  const toGridX = (svgX: number) => Math.round((svgX - center) / scale);
  const toGridY = (svgY: number) => Math.round((center - svgY) / scale);

  const handlePointerDown = (handle: 'u' | 'v') => (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setActiveHandle(handle);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Clamp to grid boundaries [-10, 10]
    const gridX = Math.max(-10, Math.min(10, toGridX(x)));
    const gridY = Math.max(-10, Math.min(10, toGridY(y)));

    if (activeHandle === 'u') {
      setUx(gridX);
      setUy(gridY);
    } else if (activeHandle === 'v') {
      setVx(gridX);
      setVy(gridY);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      setActiveHandle(null);
    }
  };

  // Helper lines / math variables
  const sumX = ux + vx;
  const sumY = uy + vy;
  const magU = Math.sqrt(ux * ux + uy * uy).toFixed(2);
  const magV = Math.sqrt(vx * vx + vy * vy).toFixed(2);
  const magSum = Math.sqrt(sumX * sumX + sumY * sumY).toFixed(2);
  
  const scaledX = ux * scalarK;
  const scaledY = uy * scalarK;
  const magScaled = Math.sqrt(scaledX * scaledX + scaledY * scaledY).toFixed(2);

  // Generate grid ticks
  const ticks = Array.from({ length: 21 }, (_, i) => i - 10).filter(t => t !== 0);

  return (
    <div className="bg-[#0c1424] border border-[#1e293b] rounded-2xl overflow-hidden shadow-2xl p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
        <div>
          <h4 className="text-sm font-sans font-extrabold text-white flex items-center gap-2">
            <LucideIcons.Compass className="text-[#98ca3f]" size={18} />
            Laboratorio Vectorial Interactivo
          </h4>
          <p className="text-[11px] text-zinc-400">Arrastra la punta de las flechas y altera los parámetros en tiempo real</p>
        </div>
        <div className="flex gap-1.5 bg-[#05060f] p-1 rounded-lg border border-[#1e293b]">
          <button
            onClick={() => setMode('sum')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase transition-all ${
              mode === 'sum' ? 'bg-[#98ca3f] text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Suma (u + v)
          </button>
          <button
            onClick={() => setMode('scale')}
            className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase transition-all ${
              mode === 'scale' ? 'bg-[#98ca3f] text-black' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Escalar (k · u)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* SVG Grid Workspace */}
        <div className="md:col-span-6 flex justify-center">
          <div className="relative p-1 bg-[#05060f] border-2 border-[#1e293b] rounded-2xl overflow-hidden shadow-inner select-none">
            <svg
              ref={svgRef}
              width={size}
              height={size}
              className="overflow-visible touch-none cursor-crosshair"
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
            >
              {/* Arrow Marker Definitions */}
              <defs>
                <marker id="arrow-u" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#98ca3f" />
                </marker>
                <marker id="arrow-v" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#3b82f6" />
                </marker>
                <marker id="arrow-result" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
                </marker>
                <marker id="arrow-scaled" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#ec4899" />
                </marker>
              </defs>

              {/* Grid Lines */}
              {ticks.map((t) => {
                const pos = toSvgX(t);
                return (
                  <React.Fragment key={t}>
                    {/* Vertical Grid Line */}
                    <line x1={pos} y1={0} x2={pos} y2={size} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1, 4" />
                    {/* Horizontal Grid Line */}
                    <line x1={0} y1={pos} x2={size} y2={pos} stroke="#1e293b" strokeWidth="0.5" strokeDasharray="1, 4" />
                  </React.Fragment>
                );
              })}

              {/* Main Axes */}
              <line x1={0} y1={center} x2={size} y2={center} stroke="#334155" strokeWidth="2" />
              <line x1={center} y1={0} x2={center} y2={size} stroke="#334155" strokeWidth="2" />

              {/* Grid labels */}
              <text x={size - 12} y={center + 12} fill="#64748b" className="text-[9px] font-mono font-bold" textAnchor="middle">x</text>
              <text x={center - 12} y={15} fill="#64748b" className="text-[9px] font-mono font-bold" textAnchor="middle">y</text>

              {/* Mode Specific Drawings */}
              {mode === 'sum' ? (
                <>
                  {/* Dashed guidelines for triangle rule (u + v) */}
                  <line 
                    x1={toSvgX(ux)} y1={toSvgY(uy)} 
                    x2={toSvgX(sumX)} y2={toSvgY(sumY)} 
                    stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3,3" strokeOpacity="0.6" 
                  />
                  <line 
                    x1={toSvgX(vx)} y1={toSvgY(vy)} 
                    x2={toSvgX(sumX)} y2={toSvgY(sumY)} 
                    stroke="#98ca3f" strokeWidth="1.5" strokeDasharray="3,3" strokeOpacity="0.6" 
                  />

                  {/* Resultant vector u + v */}
                  <line
                    x1={center}
                    y1={center}
                    x2={toSvgX(sumX)}
                    y2={toSvgY(sumY)}
                    stroke="#f59e0b"
                    strokeWidth="3.5"
                    markerEnd="url(#arrow-result)"
                  />

                  {/* Vector v starting from origin */}
                  <line
                    x1={center}
                    y1={center}
                    x2={toSvgX(vx)}
                    y2={toSvgY(vy)}
                    stroke="#3b82f6"
                    strokeWidth="2.5"
                    markerEnd="url(#arrow-v)"
                  />
                </>
              ) : (
                <>
                  {/* Scaled vector k · u */}
                  <line
                    x1={center}
                    y1={center}
                    x2={toSvgX(scaledX)}
                    y2={toSvgY(scaledY)}
                    stroke="#ec4899"
                    strokeWidth="3.5"
                    markerEnd="url(#arrow-scaled)"
                  />
                </>
              )}

              {/* Primary vector u */}
              <line
                x1={center}
                y1={center}
                x2={toSvgX(ux)}
                y2={toSvgY(uy)}
                stroke="#98ca3f"
                strokeWidth="2.5"
                markerEnd="url(#arrow-u)"
              />

              {/* Interactive Handle points */}
              {/* Handle for vector u */}
              <circle
                cx={toSvgX(ux)}
                cy={toSvgY(uy)}
                r="7"
                fill="#98ca3f"
                className="cursor-pointer stroke-white stroke-2 active:scale-125 transition-transform"
                onPointerDown={handlePointerDown('u')}
              />

              {/* Handle for vector v (only active in sum mode) */}
              {mode === 'sum' && (
                <circle
                  cx={toSvgX(vx)}
                  cy={toSvgY(vy)}
                  r="7"
                  fill="#3b82f6"
                  className="cursor-pointer stroke-white stroke-2 active:scale-125 transition-transform"
                  onPointerDown={handlePointerDown('v')}
                />
              )}
            </svg>
          </div>
        </div>

        {/* Real-time Math Feedback */}
        <div className="md:col-span-6 space-y-4">
          <div className="bg-[#05060f] border border-[#1e293b] rounded-xl p-4 space-y-3.5">
            <h5 className="text-[10px] font-mono font-bold text-zinc-500 uppercase tracking-widest">
              Valores Matemáticos Actuales
            </h5>
            
            <div className="space-y-2 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-[#1e293b]/50 pb-2">
                <span className="text-[#98ca3f] flex items-center gap-1.5 font-bold">
                  <span className="w-2.5 h-2.5 rounded bg-[#98ca3f] inline-block" />
                  Vector u:
                </span>
                <span className="text-zinc-200">
                  ({ux}, {uy}) <span className="text-[10px] text-zinc-500">||u|| = {magU}</span>
                </span>
              </div>

              {mode === 'sum' ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#1e293b]/50 pb-2">
                    <span className="text-[#3b82f6] flex items-center gap-1.5 font-bold">
                      <span className="w-2.5 h-2.5 rounded bg-[#3b82f6] inline-block" />
                      Vector v:
                    </span>
                    <span className="text-zinc-200">
                      ({vx}, {vy}) <span className="text-[10px] text-zinc-500">||v|| = {magV}</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#f59e0b] flex items-center gap-1.5 font-bold">
                      <span className="w-2.5 h-2.5 rounded bg-[#f59e0b] inline-block" />
                      Suma u + v:
                    </span>
                    <span className="text-[#f59e0b] font-extrabold">
                      ({sumX}, {sumY}) <span className="text-[10px] text-zinc-400 font-normal">||u+v|| = {magSum}</span>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2 border-b border-[#1e293b]/50 pb-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400 font-bold">Escalar k:</span>
                      <span className="text-[#ec4899] font-extrabold font-mono text-sm">{scalarK.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="-2.0"
                      max="3.0"
                      step="0.1"
                      value={scalarK}
                      onChange={(e) => setScalarK(parseFloat(e.target.value))}
                      className="w-full accent-[#ec4899]"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[#ec4899] flex items-center gap-1.5 font-bold">
                      <span className="w-2.5 h-2.5 rounded bg-[#ec4899] inline-block" />
                      Resultado k · u:
                    </span>
                    <span className="text-[#ec4899] font-extrabold">
                      ({scaledX.toFixed(1)}, {scaledY.toFixed(1)}) <span className="text-[10px] text-zinc-400 font-normal">||k·u|| = {magScaled}</span>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-[10.5px] text-zinc-400 leading-relaxed font-sans bg-[#121f3d]/20 border border-[#1e293b]/40 rounded-xl p-3">
            <span className="text-[#98ca3f] font-bold">Concepto clave:</span>{' '}
            {mode === 'sum' 
              ? 'La suma junta las fuerzas. Observa cómo al final de la flecha verde (u) se proyecta la flecha azul (v) para llegar al punto resultante naranja (regla de punta y cola).'
              : 'Multiplicar por un escalar altera la longitud y el sentido. Si k es negativo, el vector resultante apunta exactamente en la dirección opuesta.'
            }
          </div>
        </div>
      </div>
    </div>
  );
}

// 3. Document/Lesson string parser to return elegant UI blocks
export function parseLessonContent(text: string): LessonSection[] {
  if (!text) return [];
  const lines = text.split('\n');
  const sections: LessonSection[] = [];
  let currentSection: LessonSection | null = null;

  const emojiTypes: Record<string, 'theory' | 'reflection' | 'challenge' | 'applet' | 'links'> = {
    '➕': 'theory',
    '📏': 'theory',
    '🔵': 'theory',
    '✖️': 'theory',
    '🌍': 'theory',
    '💬': 'reflection',
    '🎯': 'challenge',
    '🖼️': 'applet',
    '📎': 'links',
  };

  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) {
      if (currentSection) {
        currentSection.content += '\n';
      }
      continue;
    }

    // Detect if the line starts with one of our trigger emojis
    let detectedEmoji = '';
    for (const emoji of Object.keys(emojiTypes)) {
      if (trimmedLine.startsWith(emoji)) {
        detectedEmoji = emoji;
        break;
      }
    }

    // Also detect markdown headers starting with # or ##
    const isMarkdownHeader = trimmedLine.startsWith('#');

    if (detectedEmoji) {
      // Save current section
      if (currentSection) {
        sections.push(currentSection);
      }
      
      // Start new section
      const type = emojiTypes[detectedEmoji];
      const title = trimmedLine.replace(detectedEmoji, '').trim();
      currentSection = {
        type,
        title,
        emoji: detectedEmoji,
        content: ''
      };
    } else if (isMarkdownHeader) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const title = trimmedLine.replace(/^#+\s+/, '').trim();
      currentSection = {
        type: 'theory',
        title,
        emoji: '📖',
        content: ''
      };
    } else {
      if (!currentSection) {
        // Create an initial intro section if text starts without a header
        currentSection = {
          type: 'theory',
          title: 'Guía de Estudio',
          emoji: '✨',
          content: ''
        };
      }
      currentSection.content += line + '\n';
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  // Clean up content trims
  return sections.map(s => ({
    ...s,
    content: s.content.trim()
  }));
}

export function TopicContentView({ 
  subject, 
  topic, 
  userId,
  allTopics, 
  onSelectTopic, 
  onBack, 
}: Props) {
  const [isChatActive, setIsChatActive] = useState(false);
  const [mobileView, setMobileView] = useState<'content' | 'itinerary' | 'chat'>('content');
  const [initialChatPrompt, setInitialChatPrompt] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'summary' | 'material'>('summary');

  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>([]);

  // Load completed topics on mount / userId / subject change
  useEffect(() => {
    async function loadCompleted() {
      const ids = await getCompletedTopics(userId || 'guest', subject.id);
      setCompletedTopicIds(ids);
    }
    loadCompleted();
  }, [userId, subject.id]);

  const markAsComplete = async (topicId: string) => {
    if (!completedTopicIds.includes(topicId)) {
      const updated = [...completedTopicIds, topicId];
      setCompletedTopicIds(updated);
      await saveCompletedTopic(userId || 'guest', subject.id, topicId);
    }
  };

  useEffect(() => {
    setActiveTab('summary');
  }, [topic.id]);

  const currentIndex = allTopics.findIndex(t => t.id === topic.id);
  const hasNext = currentIndex !== -1 && currentIndex < allTopics.length - 1;
  const nextTopic = hasNext ? allTopics[currentIndex + 1] : null;

  const Icon = (LucideIcons as any)[subject.icon || 'BookOpen'] || LucideIcons.BookOpen;

  const renderVideo = () => {
    if (!topic.videoUrl && !topic.videoAsset) return null;
    
    if (topic.videoAsset?.playbackId) {
      return (
        <div className="aspect-video w-full overflow-hidden bg-[#05060f] border-b border-[#1e293b] shadow-inner relative group">
          <MuxPlayer
            playbackId={topic.videoAsset.playbackId}
            metadataVideoTitle={topic.name}
            accentColor="#98ca3f"
            className="w-full h-full object-contain"
          />
        </div>
      );
    }
    
    if (topic.videoUrl) {
      let src = topic.videoUrl;
      const ytMatch = src.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
      if (ytMatch && ytMatch[1]) {
        src = `https://www.youtube.com/embed/${ytMatch[1]}`;
      } else {
        const vimeoMatch = src.match(/vimeo\.com\/(?:video\/)?([0-9]+)/i);
        if (vimeoMatch && vimeoMatch[1]) {
          src = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
        }
      }
      return (
        <div className="aspect-video w-full overflow-hidden bg-[#05060f] border-b border-[#1e293b] shadow-inner">
          <iframe 
            src={src} 
            allowFullScreen 
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }
    
    return null;
  };

  const getPortableTextString = (content: any): string => {
    if (!content) return '';
    if (typeof content === 'string') return content;
    if (Array.isArray(content)) {
      return content.map(block => {
        if (block._type === 'block' && block.children) {
          return block.children.map((c: any) => c.text).join('') + '\n\n';
        }
        return '';
      }).join('');
    }
    return '';
  };

  const textContent = getPortableTextString(topic.content);
  const hasVideo = !!(topic.videoUrl || topic.videoAsset);

  // Parse theoretical content into high fidelity UI modules
  const parsedSections = parseLessonContent(textContent);

  // Quick helper to jump straight into chat with a query
  const handleTriggerChat = (question: string) => {
    setInitialChatPrompt(question);
    setIsChatActive(true);
    setMobileView('chat');
  };

  return (
    <div className="flex w-full h-[calc(100vh-104px)] bg-[#05060f] text-white relative select-none">
      
      {/* Mobile Navigation Bar */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-12 bg-[#0c1424] border-b border-[#1e293b] flex items-center justify-around z-30 px-2 shrink-0">
        <button
          onClick={() => setMobileView('itinerary')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
            mobileView === 'itinerary' ? 'border-[#98ca3f] text-[#98ca3f]' : 'border-transparent text-zinc-400'
          }`}
        >
          Contenido
        </button>
        <button
          onClick={() => setMobileView('content')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
            mobileView === 'content' ? 'border-[#98ca3f] text-[#98ca3f]' : 'border-transparent text-zinc-400'
          }`}
        >
          Lección
        </button>
        <button
          onClick={() => setMobileView('chat')}
          className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider text-center border-b-2 transition-all ${
            mobileView === 'chat' ? 'border-[#98ca3f] text-[#98ca3f]' : 'border-transparent text-zinc-400'
          }`}
        >
          Coach AI
        </button>
      </div>

      {/* 1. Left Sidebar - Itinerary Navigation */}
      <div className={`w-80 shrink-0 border-r border-[#1e293b] flex flex-col bg-[#0c1424] h-full transition-all duration-300 md:flex ${
        mobileView === 'itinerary' ? 'flex absolute inset-0 z-20 md:relative' : 'hidden'
      }`}>
        <div className="p-4 border-b border-[#1e293b] flex items-center justify-between bg-[#121f3d]/30">
          <button 
            onClick={onBack} 
            className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-400 hover:text-white transition-all py-1.5"
          >
            <LucideIcons.ChevronLeft size={16} /> Volver
          </button>
          <span className="text-[10px] font-mono uppercase bg-[#1e293b] px-2.5 py-1 rounded-md text-zinc-400">
            {allTopics.length} Temas
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          <div>
            <h3 className="text-[10px] font-mono font-extrabold text-zinc-500 uppercase tracking-widest px-2 mb-3">
              Ruta del Itinerario
            </h3>
            <div className="space-y-1">
              {allTopics.map((t, idx) => {
                const isActive = t.id === topic.id;
                const isCompleted = completedTopicIds.includes(t.id);
                const tHasVideo = !!(t.videoUrl || t.videoAsset);
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      onSelectTopic(t);
                      setMobileView('content');
                    }}
                    className={`w-full text-left p-3.5 rounded-xl transition-all flex gap-3.5 border items-start ${
                      isActive 
                        ? 'bg-[#121f3d]/90 text-white border-[#98ca3f]/40 shadow-sm' 
                        : isCompleted
                          ? 'text-zinc-300 bg-[#98ca3f]/5 border-[#98ca3f]/20 hover:bg-[#121f3d]/40'
                          : 'text-zinc-400 hover:bg-[#121f3d]/40 border-transparent hover:border-[#1e293b]'
                    }`}
                  >
                    <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                      isActive 
                        ? 'bg-[#98ca3f]/10 text-[#98ca3f]' 
                        : isCompleted
                          ? 'bg-[#98ca3f]/20 text-[#98ca3f]'
                          : 'bg-[#121f3d]/50 text-zinc-500'
                    }`}>
                      {isCompleted ? <LucideIcons.CheckCircle2 size={16} /> : tHasVideo ? <LucideIcons.PlayCircle size={18} /> : <LucideIcons.FileText size={18} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono font-bold text-zinc-500 mb-0.5">
                        TEMA {idx + 1}
                      </div>
                      <div className={`text-xs font-sans font-bold leading-snug line-clamp-2 ${isActive ? 'text-white' : 'text-zinc-300'}`}>
                        {t.name}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Central Area - Main Study Workspace */}
      <div className={`flex-1 flex flex-col h-full bg-[#05060f] transition-all duration-300 md:flex ${
        mobileView === 'content' ? 'flex pt-12 md:pt-0' : 'hidden'
      }`}>
        
        {/* Tab Selection Menu */}
        <div className="flex border-b border-[#1e293b] bg-[#0c1424]/60 backdrop-blur-md sticky top-0 z-10 shrink-0 select-none">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 md:flex-initial py-3.5 px-6 text-xs font-sans font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === 'summary' 
                ? 'border-[#98ca3f] text-[#98ca3f] bg-[#98ca3f]/5' 
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <LucideIcons.Sparkles size={14} className={activeTab === 'summary' ? 'animate-pulse' : ''} />
            <span>Resumen y Video</span>
          </button>
          <button
            onClick={() => setActiveTab('material')}
            className={`flex-1 md:flex-initial py-3.5 px-6 text-xs font-sans font-extrabold uppercase tracking-wider border-b-2 transition-all flex items-center justify-center gap-2 ${
              activeTab === 'material' 
                ? 'border-[#98ca3f] text-[#98ca3f] bg-[#98ca3f]/5' 
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <LucideIcons.BookOpen size={14} />
            <span>Material Didáctico</span>
          </button>
        </div>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10 pb-32">
          <div className="max-w-3xl mx-auto w-full space-y-8">
            
            {activeTab === 'summary' && (
              <>
                {/* Aspect Ratio Video Container - Validated from Sanity */}
                {renderVideo()}

                {/* Header Info when no video is present */}
                {!hasVideo && (
                  <div className="relative rounded-2xl overflow-hidden bg-[#0c1424] border border-[#1e293b] p-8 shadow-xl">
                    {subject.imageUrl && (
                      <div className="absolute inset-0 select-none pointer-events-none">
                        <img src={subject.imageUrl} alt={subject.name} className="w-full h-full object-cover opacity-10" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c1424] via-[#0c1424]/90 to-transparent" />
                      </div>
                    )}
                    <div className="relative z-10 flex flex-col items-start space-y-4">
                      <div className={`w-11 h-11 rounded-xl ${subject.color} flex items-center justify-center text-white border border-white/10 shadow-lg`}>
                        <Icon size={22} />
                      </div>
                      <div>
                        <div className="inline-block px-2.5 py-0.5 bg-[#121f3d] border border-[#1e293b] rounded text-[10px] font-mono font-extrabold text-[#98ca3f] uppercase tracking-wider mb-2">
                          {subject.name} {subject.tier && `• ${subject.tier}`}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-sans font-extrabold text-white tracking-tight leading-snug">
                          {topic.name}
                        </h1>
                      </div>
                    </div>
                  </div>
                )}

                {/* Core metadata details if video is present */}
                {hasVideo && (
                  <div className="border-b border-[#1e293b]/70 pb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-0.5 bg-[#121f3d] border border-[#1e293b] rounded text-[9px] font-mono font-bold text-[#98ca3f] uppercase tracking-wide">
                        Videolección
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500">
                        {subject.name}
                      </span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-sans font-extrabold text-white tracking-tight leading-snug">
                      {topic.name}
                    </h1>
                  </div>
                )}

                {/* Lesson Summary Card */}
                <div className="bg-[#0c1424]/40 border border-[#1e293b]/60 rounded-2xl p-6 md:p-8 shadow-sm space-y-4">
                  <div className="flex items-center gap-2.5 pb-2 border-b border-[#1e293b]/55">
                    <LucideIcons.FileText size={18} className="text-[#98ca3f]" />
                    <h3 className="text-sm md:text-base font-sans font-extrabold text-white tracking-tight">
                      Resumen de la Lección
                    </h3>
                  </div>
                  {topic.description ? (
                    <div className="text-sm md:text-[14.5px] leading-relaxed text-zinc-300 space-y-3 font-sans">
                      <p>{topic.description}</p>
                    </div>
                  ) : (
                    <div className="text-sm text-zinc-500 italic font-sans">
                      No hay una sinopsis o resumen redactado para este tema aún. ¡Inicia el diálogo con tu tutor AI para que te resuma las ideas clave!
                    </div>
                  )}
                </div>

                {/* Socratic Discussion Prompts */}
                <div className="bg-[#121f3d]/20 border border-[#1e293b]/50 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center gap-2 text-[#98ca3f]">
                    <LucideIcons.MessageSquare size={16} />
                    <h4 className="text-xs font-mono font-bold uppercase tracking-wider">Puntos de Partida Socráticos</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-2.5">
                    <button
                      onClick={() => handleTriggerChat(`¡Hola! Me gustaría debatir sobre los fundamentos de "${topic.name}". ¿Qué paradoja o contraejemplo podemos usar para poner a prueba mi comprensión?`)}
                      className="w-full text-left p-3.5 bg-[#05060f] hover:bg-[#121f3d]/40 border border-[#1e293b] hover:border-[#98ca3f]/40 rounded-xl transition-all text-xs font-medium text-zinc-350 hover:text-[#98ca3f] flex items-center justify-between group cursor-pointer"
                    >
                      <span>🔬 Desafiar mi lógica sobre {topic.name}</span>
                      <LucideIcons.ArrowRight size={14} className="text-zinc-600 group-hover:text-[#98ca3f] transition-colors" />
                    </button>
                    <button
                      onClick={() => handleTriggerChat(`¡Hola! ¿Podrías explicarme una analogía del mundo real para comprender mejor el concepto de "${topic.name}"?`)}
                      className="w-full text-left p-3.5 bg-[#05060f] hover:bg-[#121f3d]/40 border border-[#1e293b] hover:border-[#98ca3f]/40 rounded-xl transition-all text-xs font-medium text-zinc-350 hover:text-[#98ca3f] flex items-center justify-between group cursor-pointer"
                    >
                      <span>💡 Solicitar analogía práctica del mundo real</span>
                      <LucideIcons.ArrowRight size={14} className="text-zinc-600 group-hover:text-[#98ca3f] transition-colors" />
                    </button>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'material' && (
              <>
                <div className="border-b border-[#1e293b]/70 pb-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 bg-[#121f3d] border border-[#1e293b] rounded text-[9px] font-mono font-bold text-[#98ca3f] uppercase tracking-wide">
                      Material Didáctico
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500">
                      {subject.name}
                    </span>
                  </div>
                  <h1 className="text-2xl md:text-3xl font-sans font-extrabold text-white tracking-tight leading-snug">
                    {topic.name}
                  </h1>
                </div>

                {parsedSections.length > 0 ? (
                  <div className="space-y-6">
                    {parsedSections.map((sect, sIdx) => {
                      if (sect.type === 'applet') {
                        return (
                          <div key={sIdx} className="pt-2">
                            <VectorSandbox />
                          </div>
                        );
                      }

                      if (sect.type === 'reflection') {
                        const cleanedText = sect.content.trim();
                        return (
                          <div 
                            key={sIdx} 
                            className="bg-[#121f3d]/20 border-l-4 border-[#98ca3f] rounded-r-2xl p-6 space-y-4 shadow-md"
                          >
                            <div className="flex items-center gap-2 text-[#98ca3f]">
                              <LucideIcons.Sparkles size={18} className="animate-pulse" />
                              <h4 className="text-sm font-sans font-extrabold uppercase tracking-wide">Reflexiona con el Tutor</h4>
                            </div>
                            <div className="text-sm leading-relaxed text-zinc-300">
                              <MathText text={cleanedText} />
                            </div>
                            <button
                              onClick={() => handleTriggerChat(`Me gustaría reflexionar sobre esta pregunta del tema ${topic.name}:\n\n"${cleanedText}"`)}
                              className="flex items-center gap-2 px-4.5 py-2.5 bg-[#98ca3f]/10 hover:bg-[#98ca3f]/20 text-[#98ca3f] border border-[#98ca3f]/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
                            >
                              <LucideIcons.MessageSquare size={14} />
                              Discutir con el Tutor AI
                            </button>
                          </div>
                        );
                      }

                      if (sect.type === 'challenge') {
                        const challengeText = sect.content.trim();
                        return (
                          <div 
                            key={sIdx} 
                            className="bg-gradient-to-r from-[#121f3d] to-[#0c1424] border border-[#4f46e5]/30 rounded-2xl p-6 space-y-4 shadow-xl relative overflow-hidden"
                          >
                            <div className="absolute top-0 right-0 p-8 opacity-5 select-none pointer-events-none">
                              <LucideIcons.Trophy size={80} className="text-[#4f46e5]" />
                            </div>
                            <div className="flex items-center gap-2 text-indigo-400">
                              <LucideIcons.Trophy size={18} />
                              <h4 className="text-sm font-sans font-extrabold uppercase tracking-wide">Desafío Rápido</h4>
                            </div>
                            <div className="text-sm leading-relaxed text-zinc-300 relative z-10">
                              <MathText text={challengeText} />
                            </div>
                            <button
                              onClick={() => handleTriggerChat(`¡Hola! Acepto el mini-desafío interactivo sobre ${topic.name}. El enunciado dice:\n\n"${challengeText}"\n\n¿Me podrías guiar paso a paso para resolverlo?`)}
                              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest transition-all relative z-10 shadow-lg shadow-indigo-600/25 cursor-pointer"
                            >
                              <LucideIcons.Compass size={14} />
                              Resolver con la IA
                            </button>
                          </div>
                        );
                      }

                      if (sect.type === 'links') {
                        // Parse links line by line
                        const lines = sect.content.split('\n');
                        return (
                          <div key={sIdx} className="bg-[#0c1424]/40 border border-[#1e293b] rounded-2xl p-6 space-y-4">
                            <div className="flex items-center gap-2 text-zinc-300">
                              <LucideIcons.Link2 size={18} />
                              <h4 className="text-sm font-sans font-extrabold uppercase tracking-wide">Recursos & Enlaces Útiles</h4>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                              {lines.map((line, lIdx) => {
                                const linkMatch = line.match(/\[(.*?)\]\((.*?)\)/);
                                if (linkMatch) {
                                  return (
                                    <a
                                      key={lIdx}
                                      href={linkMatch[2]}
                                      target="_blank"
                                      rel="noreferrer referrer"
                                      className="p-3.5 bg-[#05060f] border border-[#1e293b] hover:border-[#98ca3f]/50 hover:bg-[#121f3d]/30 rounded-xl flex items-center justify-between group transition-all"
                                    >
                                      <span className="text-xs font-bold text-zinc-300 group-hover:text-[#98ca3f] transition-colors">{linkMatch[1]}</span>
                                      <LucideIcons.ExternalLink size={14} className="text-zinc-500 group-hover:text-[#98ca3f] transition-colors" />
                                    </a>
                                  );
                                }
                                return null;
                              })}
                            </div>
                          </div>
                        );
                      }

                      // Default Rich Text/Theory Block
                      return (
                        <div 
                          key={sIdx} 
                          className="bg-[#0c1424]/40 border border-[#1e293b]/60 rounded-2xl p-6 md:p-8 shadow-sm space-y-4"
                        >
                          <div className="flex items-center gap-2.5 pb-2 border-b border-[#1e293b]/55">
                            <span className="text-xl">{sect.emoji}</span>
                            <h3 className="text-sm md:text-base font-sans font-extrabold text-white tracking-tight">
                              {sect.title}
                            </h3>
                          </div>
                          <div className="text-sm md:text-[14.5px] leading-relaxed text-zinc-300 space-y-3 font-sans">
                            {sect.content.split('\n\n').map((para, pIdx) => (
                              <p key={pIdx}>
                                <MathText text={para} />
                              </p>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="bg-[#0c1424]/40 border border-[#1e293b]/50 rounded-2xl p-12 text-center text-zinc-500">
                    <LucideIcons.BookOpen size={40} className="mx-auto mb-3 opacity-20" />
                    <p className="text-sm">Contenido didáctico en construcción por el Tutor AI.</p>
                  </div>
                )}
              </>
            )}

            {/* Progression & Completion Panel */}
            {allTopics && allTopics.length > 1 && (
              <div className="mt-12 pt-8 border-t border-[#1e293b]/70 flex flex-col sm:flex-row items-center justify-between gap-6 bg-[#0c1424]/40 border border-[#1e293b]/60 rounded-2xl p-6 relative overflow-hidden">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    completedTopicIds.includes(topic.id)
                      ? 'bg-[#98ca3f]/25 text-[#98ca3f]'
                      : 'bg-[#121f3d] text-zinc-500'
                  }`}>
                    {completedTopicIds.includes(topic.id) ? (
                      <LucideIcons.CheckCircle2 size={22} className="text-[#98ca3f]" />
                    ) : (
                      <LucideIcons.Circle size={22} />
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-sans font-extrabold text-white">
                      {completedTopicIds.includes(topic.id) ? '¡Tema Completado!' : 'Progreso de la Ruta'}
                    </h4>
                    <p className="text-xs text-zinc-400">
                      Tema {currentIndex + 1} de {allTopics.length} • {Math.round((completedTopicIds.filter(id => allTopics.some(at => at.id === id)).length / allTopics.length) * 100)}% completado
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {nextTopic ? (
                    <button
                      onClick={() => {
                        markAsComplete(topic.id);
                        onSelectTopic(nextTopic);
                      }}
                      className="w-full sm:w-auto px-6 py-3 bg-[#98ca3f] hover:bg-[#aee24d] text-black font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                      id="next-lesson-btn"
                    >
                      <span>Siguiente Lección</span>
                      <LucideIcons.ArrowRight size={14} />
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        markAsComplete(topic.id);
                        alert("🎉 ¡Felicidades! Has completado todos los temas de tu itinerario de estudio.");
                        onBack();
                      }}
                      className="w-full sm:w-auto px-6 py-3 bg-[#4f46e5] hover:bg-indigo-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                      id="finish-itinerary-btn"
                    >
                      <LucideIcons.Trophy size={14} />
                      <span>Finalizar Itinerario</span>
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* 3. Right Sidebar - AI Coach / Tutor Socrático Integration */}
      <div className={`w-[400px] shrink-0 border-l border-[#1e293b] bg-[#0c1424] h-full transition-all duration-300 md:flex flex-col relative ${
        mobileView === 'chat' ? 'flex absolute inset-0 z-20 md:relative' : 'hidden'
      }`}>
        {isChatActive ? (
          <div className="w-full h-full flex flex-col overflow-hidden">
            <SocraticChat 
              userId={userId}
              subject={subject}
              topic={topic}
              initialUserMessage={initialChatPrompt}
              onClearInitialMessage={() => setInitialChatPrompt(undefined)}
              onBack={() => setIsChatActive(false)}
            />
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between p-6 overflow-y-auto">
            <div className="space-y-6">
              {/* Header Badge */}
              <div className="flex items-center gap-3 border-b border-[#1e293b]/80 pb-5">
                <div className="w-10 h-10 rounded-xl bg-[#98ca3f]/10 border border-[#98ca3f]/30 flex items-center justify-center text-[#98ca3f]">
                  <LucideIcons.Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs font-mono font-extrabold text-zinc-400 uppercase tracking-widest">
                    Coach Personal
                  </h4>
                  <h3 className="text-sm font-sans font-extrabold text-white">
                    Tutor AI Socrático
                  </h3>
                </div>
              </div>

              {/* Explanatory text */}
              <div className="space-y-4">
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  Consolida tu aprendizaje en tiempo real. Activa al Tutor Socrático para iniciar una conversación personalizada basada en el contenido o video que estás viendo ahora mismo.
                </p>
                
                <div className="bg-[#121f3d]/40 border border-[#1e293b] rounded-xl p-4.5 space-y-3.5">
                  <h5 className="text-[11px] font-mono font-extrabold text-[#98ca3f] uppercase tracking-wider">
                    ¿Qué lograrás hoy?
                  </h5>
                  <ul className="space-y-2.5 font-sans">
                    <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <LucideIcons.CheckCircle2 size={14} className="text-[#98ca3f] shrink-0 mt-0.5" />
                      <span>Resolver dudas inmediatas del tema en curso.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <LucideIcons.CheckCircle2 size={14} className="text-[#98ca3f] shrink-0 mt-0.5" />
                      <span>Analizar e internalizar conceptos complejos.</span>
                    </li>
                    <li className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <LucideIcons.CheckCircle2 size={14} className="text-[#98ca3f] shrink-0 mt-0.5" />
                      <span>Poner a prueba tu comprensión mediante preguntas socráticas.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Launch button */}
            <div className="mt-8 pt-4 border-t border-[#1e293b]/80">
              <button
                onClick={() => setIsChatActive(true)}
                className="w-full py-4 bg-[#98ca3f] hover:bg-[#aee24d] text-black font-extrabold rounded-xl text-xs uppercase tracking-widest shadow-[0_0_25px_rgba(152,202,63,0.25)] transition-all flex items-center justify-center gap-2 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
              >
                <LucideIcons.MessageSquare size={16} />
                Empezar diálogo socrático
              </button>
            </div>
          </div>
        )}
      </div>
      
    </div>
  );
}
