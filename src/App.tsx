import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Sparkles, 
  Home, 
  CreditCard, 
  AlertTriangle, 
  Database, 
  Check, 
  Copy, 
  X, 
  Plus, 
  Search, 
  MessageSquare, 
  Settings, 
  LogOut, 
  Menu, 
  Trash2, 
  Compass, 
  Library, 
  BookOpen, 
  ArrowRight 
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  UserButton, 
  useUser, 
  useAuth,
  useClerk 
} from '@clerk/clerk-react';
import { SUBJECTS } from './data/subjects';
import { PLANS } from './data/plans';
import { Subject, Topic, Plan } from './types';
import { SubjectCard } from './components/SubjectCard';
import { TopicListItem } from './components/TopicListItem';
import { SocraticChat } from './components/SocraticChat';
import { PricingModal } from './components/PricingModal';
import { LandingPage } from './components/LandingPage';
import { 
  getUserProfile, 
  saveUserPlan, 
  saveUserItinerary, 
  getUserItinerary, 
  getUserAllChats, 
  onTableStatusChange,
  saveUserChat
} from './services/db';
import { EdunovaLogo } from './components/EdunovaLogo';
import supabaseSql from '../supabase-setup.sql?raw';
import { supabase } from './lib/supabase';

type View = 'DASHBOARD' | 'TOPIC_SELECTION' | 'LEARNING' | 'PRICING';

export default function App() {
  const { user } = useUser();
  const { has } = useAuth();
  const { signOut } = useClerk();
  
  const [currentView, setCurrentView] = useState<View>('DASHBOARD');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  const [userPlan, setUserPlan] = useState<Plan | null>(null);
  const [userItinerary, setUserItinerary] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [allChats, setAllChats] = useState<any[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [isSqlModalOpen, setIsSqlModalOpen] = useState(false);
  const [wasCopied, setWasCopied] = useState(false);

  // Monitor database connection table checks
  useEffect(() => {
    return onTableStatusChange((missing) => {
      setMissingTables(missing);
    });
  }, []);

  const handleCopySql = () => {
    navigator.clipboard.writeText(supabaseSql);
    setWasCopied(true);
    setTimeout(() => setWasCopied(false), 2000);
  };

  // Sync state and retrieve user plan tier dynamically
  useEffect(() => {
    async function initUser() {
      if (user) {
        setIsInitializing(true);
        
        if (!user.unsafeMetadata.plan) {
          try {
            await user.update({
              unsafeMetadata: { plan: 'free_user' }
            });
          } catch (e) {
            console.error('Error setting default plan in Clerk', e);
          }
        }

        // Determine plan dynamically based on metadata properties
        let activePlanId = 'free_user';
        let exactName = '';
        
        const anyUser = user as any;
        const findSubscriptionItemsRecursive = (obj: any, depth = 0): any[] => {
          if (!obj || typeof obj !== 'object' || depth > 5) return [];
          const results: any[] = [];
          
          if (Array.isArray(obj.subscription_items)) results.push(...obj.subscription_items);
          if (Array.isArray(obj.subscriptionItems)) results.push(...obj.subscriptionItems);
          if (Array.isArray(obj.entitlements)) results.push(...obj.entitlements);
          
          Object.keys(obj).forEach(key => {
            try {
              const val = obj[key];
              if (val && typeof val === 'object') {
                results.push(...findSubscriptionItemsRecursive(val, depth + 1));
              }
            } catch (e) {}
          });
          return results;
        };

        const allSubItems = findSubscriptionItemsRecursive(anyUser);
        if (allSubItems.length > 0) {
          const activeSub = allSubItems.find(sub => sub.active === true || sub.status === 'active') || allSubItems[0];
          const activeSubStr = JSON.stringify(activeSub).toLowerCase();
          const originalPlanName = activeSub?.plan?.name || activeSub?.name || activeSub?.tier_name || activeSub?.product_name || 'Subscripción Activa';
          
          if (activeSubStr.includes('ultra')) {
            activePlanId = 'ultra';
            exactName = originalPlanName;
          } else if (activeSubStr.includes('pro') || activeSubStr.includes('ai powered')) {
            activePlanId = 'pro';
            exactName = originalPlanName;
          } else {
            activePlanId = 'pro';
            exactName = originalPlanName + ' (Found Sub)'; 
          }
        } 
        
        if (activePlanId === 'free_user') {
          const userStr = JSON.stringify(anyUser).toLowerCase();
          if (userStr.includes('ultra') || (has as any)?.({ entitlement: 'ultra' })) {
            activePlanId = 'ultra';
            exactName = 'Ultra AI Powered';
          } else if ((has as any)?.({ entitlement: 'pro_ai_powered' }) || (has as any)?.({ entitlement: 'pro' }) || userStr.includes('pro ai powered') || userStr.includes('pro_ai')) {
            activePlanId = 'pro';
            exactName = 'Pro AI Powered';
          } else {
            const pmStr = JSON.stringify(anyUser?.publicMetadata || {}).toLowerCase();
            if (pmStr.includes('pro') || pmStr.includes('subscription')) {
              activePlanId = 'pro';
              exactName = 'Pro AI Powered (Metadata)';
            } else if (anyUser?.entitlements && anyUser.entitlements.length > 0) {
              activePlanId = 'pro';
              exactName = anyUser.entitlements[0]?.name || 'Pro AI Powered (Entitlement)';
            }
          }
        }

        const foundPlan = PLANS.find(p => p.id === activePlanId);
        if (foundPlan) {
          setUserPlan({ ...foundPlan, name: exactName || foundPlan.name });
        }

        const [profile, itinerary, chats] = await Promise.all([
          getUserProfile(user.id),
          getUserItinerary(user.id),
          getUserAllChats(user.id)
        ]);
        
        if (itinerary) {
          setUserItinerary(itinerary);
        }
        if (chats) {
          setAllChats(chats);
        }
      }
      setIsInitializing(false);
    }
    initUser();
  }, [user, has]);

  // Load chat items initially or when returning to dashboard
  useEffect(() => {
    async function loadLatestChats() {
      if (user?.id) {
        try {
          const chats = await getUserAllChats(user.id);
          setAllChats(chats);
        } catch (e) {
          console.error('Error cargando lista de chats:', e);
        }
      }
    }
    loadLatestChats();
  }, [user?.id, currentView, activeTopic]);

  const resumeSpecificChat = (subjectId: string, topicId: string) => {
    const subject = SUBJECTS.find(s => s.id === subjectId);
    if (subject) {
      const topic = subject.topics.find(t => t.id === topicId);
      if (topic) {
        setSelectedSubject(subject);
        setSelectedTopics([topic]);
        setActiveTopic(topic);
        setCurrentView('LEARNING');
      }
    } else {
      // In case of customized prompts or generic topics:
      const dummySubject: Subject = {
        id: 'generic',
        name: 'Tutoría Socrática',
        icon: 'Sparkles',
        color: 'bg-emerald-500',
        topics: [{ id: topicId, name: 'Conversación', description: 'Tutoría Socrática', difficulty: 'Intermediate' }]
      };
      setSelectedSubject(dummySubject);
      setSelectedTopics([dummySubject.topics[0]]);
      setActiveTopic(dummySubject.topics[0]);
      setCurrentView('LEARNING');
    }
  };

  const handleSubjectSelect = (subject: Subject) => {
    setSelectedSubject(subject);
    setSelectedTopics([]);
    setCurrentView('TOPIC_SELECTION');
  };

  const resumeLearning = () => {
    if (!userItinerary || !userItinerary.subject_id || !userItinerary.topic_ids) return;
    const subject = SUBJECTS.find(s => s.id === userItinerary.subject_id);
    if (subject) {
      const topics = subject.topics.filter(t => userItinerary.topic_ids.includes(t.id));
      setSelectedSubject(subject);
      setSelectedTopics(topics);
      setCurrentView('TOPIC_SELECTION');
    }
  };

  const toggleTopic = (topic: Topic) => {
    setSelectedTopics(prev => 
      prev.find(t => t.id === topic.id) 
        ? prev.filter(t => t.id !== topic.id)
        : [...prev, topic]
    );
  };

  const startLearning = async () => {
    if (selectedTopics.length > 0 && selectedSubject) {
      if (user) {
        await saveUserItinerary(user.id, selectedSubject.id, selectedTopics.map(t => t.id));
      }
      setActiveTopic(selectedTopics[0]);
      setCurrentView('LEARNING');
    }
  };

  // Starts a new empty conversation instantly (like Gemini)
  const startNewConversation = () => {
    setSelectedSubject(null);
    setSelectedTopics([]);
    setActiveTopic(null);
    setCurrentView('DASHBOARD');
  };

  // Launch pre-configured socratic question from proposal card
  const handleQuickPromptClick = (subjectId: string, topicId: string, topicName: string, promptText: string) => {
    if (!user) return;
    const subject = SUBJECTS.find(s => s.id === subjectId);
    const targetTopic = subject?.topics.find(t => t.id === topicId) || {
      id: topicId,
      name: topicName,
      description: promptText,
      difficulty: 'Intermediate' as const
    };

    const resolvedSubject = subject || {
      id: 'generic',
      name: 'Pensamiento Crítico',
      icon: 'Compass',
      color: 'bg-blue-600',
      topics: [targetTopic]
    };

    setSelectedSubject(resolvedSubject);
    setSelectedTopics([targetTopic]);
    setActiveTopic(targetTopic);
    setCurrentView('LEARNING');

    // Seed initial message list
    const initialMessages = [
      { role: 'user' as const, text: promptText },
      { 
        role: 'model' as const, 
        text: `¡Qué gran propuesta! Vamos a evaluar "${topicName}". Para reflexionar críticamente: ¿Qué sospechas que sea el factor desencadenante o el elemento central de esta cuestión? Comencemos.` 
      }
    ];

    saveUserChat(user.id, resolvedSubject.id, targetTopic.id, targetTopic.name, initialMessages)
      .then(() => {
        // Trigger list sync
        getUserAllChats(user.id).then(chats => setAllChats(chats));
      })
      .catch(err => console.error('Error seeding chat:', err));
  };

  // Simple, polished local trash-cleanup for a chat session
  const handleDeleteChatSession = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    if (!user) return;
    if (window.confirm('¿Quieres eliminar este chat de tu historial?')) {
      try {
        // Remove locally from indices and sessions
        localStorage.removeItem(`edunova_chat_${user.id}_${topicId}`);
        const indexStr = localStorage.getItem(`edunova_chat_index_${user.id}`) || '[]';
        let index = JSON.parse(indexStr);
        index = index.filter((item: any) => item.topic_id !== topicId);
        localStorage.setItem(`edunova_chat_index_${user.id}`, JSON.stringify(index));

        // Attempt Cloud Supabase delete if available
        await supabase
          .from('user_chats')
          .delete()
          .eq('user_id', user.id)
          .eq('topic_id', topicId);

        // Update list
        const updated = await getUserAllChats(user.id);
        setAllChats(updated);
        
        // If the active chat was deleted, send user back to dashboard
        if (activeTopic?.id === topicId) {
          startNewConversation();
        }
      } catch (err) {
        console.error('Error al borrar chat:', err);
      }
    }
  };

  // Filter dynamic list based on chatSearch state input
  const filteredChats = allChats.filter((chat: any) => {
    if (!chatSearch.trim()) return true;
    return chat.topic_name?.toLowerCase().includes(chatSearch.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#131314] text-zinc-100 flex overflow-hidden">
      <SignedOut>
        <LandingPage />
      </SignedOut>

      <SignedIn>
        {/* Toggleable Drawer trigger overlay for mobile screens */}
        {isSidebarOpen && (
          <div 
            onClick={() => setIsSidebarOpen(false)} 
            className="fixed inset-0 bg-black/60 z-30 md:hidden block backdrop-blur-sm"
          />
        )}

        {/* ================= SIDEBAR (GEMINI STYLED) ================= */}
        <aside 
          className={`fixed md:relative top-0 bottom-0 left-0 bg-[#1e1f20] border-r border-[#2d2e30] w-[270px] shrink-0 z-40 flex flex-col justify-between transition-transform duration-300 md:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Top panel section */}
          <div className="flex flex-col p-4 space-y-5 overflow-hidden flex-1">
            {/* Header / Brand Logo */}
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800/40">
              <div onClick={startNewConversation} className="cursor-pointer">
                <EdunovaLogo size={28} showText={true} textColorClass="text-zinc-100 text-lg font-display font-semibold" />
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 px-2.5 bg-zinc-800/50 hover:bg-zinc-800 hover:text-white text-zinc-400 rounded-xl md:hidden text-xs transition-all"
              >
                Ocultar
              </button>
            </div>

            {/* Nueva Conversación Button pill */}
            <button
              onClick={startNewConversation}
              className="w-full flex items-center justify-between gap-2.5 px-4 py-3.5 bg-zinc-800 hover:bg-zinc-700/80 text-zinc-200 border border-[#303134] rounded-full text-xs font-semibold uppercase tracking-wider transition-all shadow-md group active:scale-[0.98]"
            >
              <span className="flex items-center gap-2.5">
                <Plus size={16} className="text-zinc-400 group-hover:text-white" />
                Nueva conversación
              </span>
              <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-md">CMD+K</span>
            </button>

            {/* Buscar conversaciones - Dynamic sidebar search */}
            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-3 text-zinc-500" />
              <input
                type="text"
                placeholder="Buscar conversaciones..."
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-zinc-900/60 border border-[#303134] text-zinc-200 text-xs placeholder-zinc-500 rounded-xl focus:outline-none focus:border-zinc-700 transition-all focus:ring-1 focus:ring-zinc-800"
              />
            </div>

            {/* Quick Section Directory navigations */}
            <div className="space-y-1">
              <button 
                onClick={() => { setCurrentView('DASHBOARD'); setSelectedSubject(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${
                  currentView === 'DASHBOARD' && !activeTopic ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Compass size={15} />
                <span>Explorar Materias</span>
              </button>
              <button 
                onClick={() => setCurrentView('PRICING')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-left transition-all ${
                  currentView === 'PRICING' ? 'bg-zinc-800 text-white animate-pulse' : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <CreditCard size={15} />
                <span>Plan de Suscripción</span>
              </button>
            </div>

            {/* Recent chats title */}
            <div className="space-y-2 flex-1 flex flex-col overflow-hidden">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#9b9c9e] pl-1.5 pt-2 flex items-center justify-between">
                <span>Conversaciones Recientes</span>
                <span className="text-[9px] bg-zinc-900 px-1.5 py-0.5 rounded font-mono border border-zinc-800/40 text-zinc-500">{filteredChats.length}</span>
              </h4>

              {/* Dynamic Scrollable List */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-thin scrollbar-thumb-zinc-800 select-none">
                {filteredChats.length === 0 ? (
                  <p className="text-[10px] text-zinc-600 pl-2.5 py-4 uppercase tracking-wider font-bold">
                    {chatSearch ? 'No se encontraron coincidencias' : 'Sin conversaciones registradas'}
                  </p>
                ) : (
                  filteredChats.map((chat: any) => {
                    const isActive = activeTopic?.id === chat.topic_id;
                    return (
                      <div
                        key={chat.topic_id}
                        onClick={() => resumeSpecificChat(chat.subject_id, chat.topic_id)}
                        className={`group relative flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                          isActive 
                            ? 'bg-[#1a1a1c] border border-zinc-800 text-white font-medium shadow-sm' 
                            : 'text-zinc-400 hover:bg-zinc-900/40 hover:text-zinc-200'
                        }`}
                      >
                        <span className="flex items-center gap-2.5 min-w-0 pr-6">
                          <MessageSquare size={13} className={isActive ? 'text-emerald-400' : 'text-zinc-500 group-hover:text-zinc-400'} />
                          <span className="truncate pr-1 block font-medium" title={chat.topic_name}>
                            {chat.topic_name}
                          </span>
                        </span>
                        
                        {/* Interactive Trash button inside list node */}
                        <button
                          onClick={(e) => handleDeleteChatSession(e, chat.topic_id)}
                          className="absolute right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 transition-all"
                          title="Eliminar este chat"
                        >
                          <Trash2 size={12} />
                        </button>

                        {/* Tiny active emerald indicator */}
                        {isActive && (
                          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full shrink-0 group-hover:hidden absolute right-3" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Bottom user dashboard profile panel (Gemini web style) */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 space-y-2">
            {/* Supabase notification bubble inside panel if missing tables */}
            {missingTables.length > 0 && (
              <button 
                onClick={() => setIsSqlModalOpen(true)}
                className="w-full mb-2 flex items-center justify-between px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/15 rounded-xl transition-all"
              >
                <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                  <AlertTriangle size={12} className="text-amber-500 animate-pulse" />
                  <span>Configurar Nube</span>
                </span>
                <span className="w-4 h-4 bg-amber-500 text-slate-900 text-[8px] font-extrabold rounded-full flex items-center justify-center">
                  {missingTables.length}
                </span>
              </button>
            )}

            {/* Account widget */}
            <div className="relative">
              {isProfileMenuOpen && (
                <div className="absolute bottom-14 left-0 right-0 bg-[#0e0e10] border border-[#2d2e30] rounded-2xl p-2.5 shadow-2xl z-50 space-y-1.5">
                  <div className="px-2.5 py-1 flex flex-col">
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider">Cuenta Conectada</span>
                    <span className="text-zinc-300 text-xs truncate max-w-full font-medium">{user?.primaryEmailAddress?.emailAddress}</span>
                  </div>
                  
                  <hr className="border-zinc-800" />
                  
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); setCurrentView('PRICING'); }}
                    className="w-full text-left px-2.5 py-2 hover:bg-zinc-900 rounded-lg text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2"
                  >
                    <Sparkles size={13} />
                    <span>Mejorar Plan</span>
                  </button>

                  <button
                    onClick={() => { setIsProfileMenuOpen(false); signOut(); }}
                    className="w-full text-left px-2.5 py-2 hover:bg-zinc-900 rounded-lg text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-2"
                  >
                    <LogOut size={13} />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div 
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2.5 cursor-pointer max-w-[80%]"
                >
                  <img 
                    src={user?.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100'} 
                    alt={user?.fullName || 'User'} 
                    className="w-8.5 h-8.5 rounded-full border border-zinc-800 shrink-0 object-cover"
                  />
                  <div className="min-w-0 flex flex-col justify-center leading-tight">
                    <span className="font-semibold text-zinc-200 text-xs truncate">
                      {user?.firstName || 'Estudiante'} {user?.lastName || ''}
                    </span>
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-400 font-mono">
                      {userPlan?.name || 'Gratuito'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => setIsSqlModalOpen(true)}
                    title="Configuración de base de datos"
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all"
                  >
                    <Settings size={14} />
                  </button>
                  <button 
                    onClick={() => signOut()}
                    title="Cerrar sesión"
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-rose-400 transition-all"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ================= MAIN CONTENT WORKSPACE ================= */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#131314] relative h-screen">
          
          {/* Header Bar with Hamburger panel toggle for mobile */}
          <header className="flex md:hidden items-center justify-between p-4 bg-[#131314] border-b border-[#202124] shrink-0">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 bg-zinc-800 rounded-xl text-white"
              >
                <Menu size={18} />
              </button>
              <EdunovaLogo size={24} showText={true} textColorClass="text-white text-md font-semibold" />
            </div>
            
            {userPlan && (
              <span className="text-[9px] font-mono font-bold text-amber-400 uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                {userPlan.name}
              </span>
            )}
          </header>

          <div className="flex-1 overflow-y-auto w-full relative">
            <AnimatePresence mode="wait">
              
              {/* === VIEW 1: PRICING MODAL (PREMIUM VIEW) === */}
              {currentView === 'PRICING' && (
                <motion.div
                  key="pricing"
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="max-w-4xl mx-auto px-6 py-12"
                >
                  <div className="mb-6">
                    <button 
                      onClick={() => setCurrentView('DASHBOARD')}
                      className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-medium text-xs uppercase tracking-wider"
                    >
                      <ChevronLeft size={16} /> Volver al panel de estudio
                    </button>
                  </div>
                  
                  {/* Outer card enclosing Pricing widget */}
                  <div className="bg-[#1e1f20] p-6 rounded-3xl border border-[#2d2e30]">
                    <PricingModal />
                  </div>
                </motion.div>
              )}

              {/* === VIEW 2: TOPIC SELECTION === */}
              {currentView === 'TOPIC_SELECTION' && selectedSubject && (
                <motion.div
                  key="topics"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="max-w-3xl mx-auto px-6 py-12 space-y-8"
                >
                  <button 
                    onClick={() => setCurrentView('DASHBOARD')}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-semibold text-xs uppercase tracking-widest"
                  >
                    <ChevronLeft size={16} /> Volver al panel
                  </button>

                  <section className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-800 border border-[#2d2e30] rounded-full">
                      <div className={`w-3.5 h-3.5 rounded-full ${selectedSubject.color}`} />
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-300">
                        {selectedSubject.name}
                      </span>
                    </div>

                    <h2 className="text-3xl md:text-4xl font-display font-medium text-white tracking-tight">
                      Tu itinerario personalizado de {selectedSubject.name}
                    </h2>
                    <p className="text-zinc-400 text-sm">
                      Tu plan <strong>{userPlan?.name}</strong> está preparado. Selecciona uno o más temas de la lista para iniciar tu sesión de cuestionamiento socrático.
                    </p>
                  </section>

                  {/* Dark Mode Topic List Wrapper */}
                  <div className="space-y-3">
                    {selectedSubject.topics.map((topic) => (
                      <div key={topic.id} className="text-slate-900">
                        <TopicListItem 
                          topic={topic}
                          isSelected={!!selectedTopics.find(t => t.id === topic.id)}
                          onToggle={toggleTopic}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-6 sticky bottom-6 bg-transparent">
                    <button
                      onClick={startLearning}
                      disabled={selectedTopics.length === 0}
                      className={`w-full py-4.5 rounded-full font-bold transition-all shadow-xl flex items-center justify-center gap-2 text-sm uppercase tracking-wider ${
                        selectedTopics.length > 0 
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-900 border border-teal-300 font-extrabold hover:translate-y-0.5 active:scale-95' 
                          : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-[#303134]'
                      }`}
                    >
                      Iniciar Tutoría Socrática Activa
                      <Sparkles size={16} />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* === VIEW 3: LEARNING CHAT STYLED IN DARKNESS === */}
              {currentView === 'LEARNING' && selectedSubject && activeTopic && (
                <motion.div
                  key="learning"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col h-full absolute inset-0"
                >
                  <SocraticChat 
                    userId={user ? user.id : ''}
                    subject={selectedSubject} 
                    topic={activeTopic} 
                  />
                </motion.div>
              )}

              {/* === VIEW 4: DEFAULT DASHBOARD (WELCOMING SCREEN) === */}
              {currentView === 'DASHBOARD' && !activeTopic && (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -15 }}
                  className="max-w-4xl mx-auto px-6 py-12 md:py-16 flex flex-col justify-between h-full space-y-12"
                >
                  {/* Top content wrapper */}
                  <div className="space-y-12">
                    
                    {/* Welcome Greeting panel */}
                    <div className="space-y-3.5">
                      <h1 className="leading-tight">
                        <span className="bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent font-display font-medium text-4xl md:text-5xl block pb-1 tracking-tight">
                          Hola, {user?.firstName || 'estudiante'}
                        </span>
                        <span className="text-zinc-100 font-display font-medium text-3xl md:text-4xl block tracking-tight">
                          ¿Qué te gustaría aprender hoy con tu Tutor Socrático?
                        </span>
                      </h1>
                      <p className="text-zinc-500 text-sm max-w-xl font-medium">
                        Elige uno de nuestros atajos socráticos recomendados para comenzar una tutoría guiada instantánea, o selecciona una materia a continuación para construir tu itinerario.
                      </p>
                    </div>

                    {/* Interactive proposal cards (Gemini Web layout) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 select-none">
                      
                      <div 
                        onClick={() => handleQuickPromptClick('math', 'm1', 'Álgebra Básica', 'Explícame socráticamente cómo resolver una ecuación cuadrática desde cero')}
                        className="bg-[#1e1f20] hover:bg-zinc-800 border border-[#2d2e30] hover:border-zinc-700/80 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-[160px] group shadow-sm active:scale-98"
                      >
                        <p className="text-xs text-zinc-300 line-clamp-4 font-normal group-hover:text-white leading-relaxed">
                          "Ayúdame a comprender socráticamente cómo despejar y resolver una ecuación cuadrática desde sus fundamentos."
                        </p>
                        <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-500 group-hover:text-zinc-400 font-bold uppercase tracking-wider">
                          <span>Álgebra Básica</span>
                          <span className="w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center font-bold">✓</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => handleQuickPromptClick('physics', 'p4', 'Física Cuántica', 'Ayúdame a entender el entrelazamiento cuántico con analogías')}
                        className="bg-[#1e1f20] hover:bg-zinc-800 border border-[#2d2e30] hover:border-zinc-700/80 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-[160px] group shadow-sm active:scale-98"
                      >
                        <p className="text-xs text-zinc-300 line-clamp-4 font-normal group-hover:text-white leading-relaxed">
                          "Deseo comprender el misterio del entrelazamiento cuántico a través de preguntas guiadas y analogías sencillas."
                        </p>
                        <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-500 group-hover:text-zinc-400 font-bold uppercase tracking-wider">
                          <span>Física Cuántica</span>
                          <span className="w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center font-bold">✓</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => handleQuickPromptClick('history', 'h1', 'Revolución Industrial', 'Analicemos las consecuencias socioeconómicas de la Revolución Industrial')}
                        className="bg-[#1e1f20] hover:bg-zinc-800 border border-[#2d2e30] hover:border-zinc-700/80 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-[160px] group shadow-sm active:scale-98"
                      >
                        <p className="text-xs text-zinc-300 line-clamp-4 font-normal group-hover:text-white leading-relaxed">
                          "Exploremos críticamente cuáles fueron las verdaderas consecuencias sociales y económicas en la Revolución Industrial."
                        </p>
                        <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-500 group-hover:text-zinc-400 font-bold uppercase tracking-wider">
                          <span>Revolución Industrial</span>
                          <span className="w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center font-bold">✓</span>
                        </div>
                      </div>

                      <div 
                        onClick={() => handleQuickPromptClick('biology', 'b1', 'Genética', 'Guíame para descifrar las leyes de la herencia genética de Gregor Mendel')}
                        className="bg-[#1e1f20] hover:bg-zinc-800 border border-[#2d2e30] hover:border-zinc-700/80 p-5 rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-[160px] group shadow-sm active:scale-98"
                      >
                        <p className="text-xs text-zinc-300 line-clamp-4 font-normal group-hover:text-white leading-relaxed">
                          "Ayúdame a descifrar las leyes de Mendel y la herencia del ADN sin darme la respuesta de inmediato."
                        </p>
                        <div className="flex items-center justify-between mt-3 text-[10px] text-zinc-500 group-hover:text-zinc-400 font-bold uppercase tracking-wider">
                          <span>Genética Mendel</span>
                          <span className="w-5 h-5 bg-zinc-900 rounded-full flex items-center justify-center font-bold">✓</span>
                        </div>
                      </div>

                    </div>

                    {/* Active itinerary reminder fallback banner */}
                    {userItinerary && userItinerary.subject_id && (
                      <div className="p-5 rounded-2xl bg-zinc-900/60 border border-[#2d2e30]/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 select-none">
                        <div className="space-y-1">
                          <h4 className="font-semibold text-zinc-200 text-sm flex items-center gap-1.5">
                            <Sparkles size={14} className="text-emerald-400" />
                            Tienes una ruta de aprendizaje activa en el panel
                          </h4>
                          <p className="text-zinc-500 text-xs font-medium">Reanuda los temas de estudio que configuraste previamente en tu panel para hoy.</p>
                        </div>
                        <button
                          onClick={resumeLearning}
                          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-bold transition-all active:scale-95"
                        >
                          Retomar Itinerario
                        </button>
                      </div>
                    )}

                    {/* Materias disponibles grid layout inside Dark framework */}
                    <section className="space-y-4">
                      <h3 className="text-lg font-display text-zinc-300 font-medium">
                        Materias de Estudio Disponibles
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {SUBJECTS.map((subject) => {
                          const CustomIcon = (Icons as any)[subject.icon] || Compass;
                          return (
                            <div
                              key={subject.id}
                              onClick={() => handleSubjectSelect(subject)}
                              className="group p-5 bg-[#1e1f20] hover:bg-zinc-800 border border-[#2d2e30] hover:border-zinc-700/80 rounded-2xl cursor-pointer transition-all flex flex-col justify-between h-[130px] shadow-sm select-none"
                            >
                              <div className={`w-10 h-10 rounded-xl ${subject.color} flex items-center justify-center text-white`}>
                                <CustomIcon size={20} />
                              </div>
                              <div className="flex items-center justify-between mt-2">
                                <div>
                                  <h4 className="font-bold text-zinc-200 text-sm group-hover:text-white transition-colors">{subject.name}</h4>
                                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{subject.topics.length} Temas</span>
                                </div>
                                <ArrowRight size={14} className="text-zinc-500 group-hover:translate-x-0.5 group-hover:text-white transition-all" />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </section>

                  </div>

                  {/* bottom note */}
                  <p className="text-[9px] uppercase tracking-widest text-center text-zinc-600 font-bold font-mono py-4">
                    Tutor socrático autónomo &bull; Potenciado por la tecnología de Edunova Inteligente
                  </p>
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </main>

        {/* ================= DB POPULATION MODAL ================= */}
        <AnimatePresence>
          {isSqlModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
              onClick={() => setIsSqlModalOpen(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                className="bg-[#1a1a1c] border border-[#2d2e30] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/40">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 border border-amber-500/25">
                      <Database size={20} />
                    </div>
                    <div>
                      <h3 className="font-display font-semibold text-white text-md">Sincronización de Base de Datos (Cloud)</h3>
                      <p className="text-xs text-zinc-500">Configuración o inicialización de Supabase</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsSqlModalOpen(false)}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto space-y-5 text-xs text-zinc-300 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-800">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-200">
                    <AlertTriangle size={18} className="shrink-0 text-amber-500 mt-0.5 animate-pulse" />
                    <div>
                      <p className="font-bold mb-1">¡Respaldo Local Resiliente Activado!</p>
                      <p>
                        EduNova ha detectado que faltan {missingTables.length || 'algunas'} tablas en tu base de datos Supabase: <strong>[{missingTables.join(', ')}]</strong>. 
                        No te preocupes: para garantizar tu confort, la aplicación ha activado el <strong>respaldo en LocalStorage</strong>. Puedes estudiar normalmente, pues tu progreso, itinerarios y conversaciones socráticas se guardan instantáneamente de forma local en tu navegador.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-zinc-300 uppercase tracking-widest text-[10px]">¿Cómo sincronizar tu Base de Datos en la Nube?</h4>
                    <ol className="list-decimal pl-5 space-y-2 text-zinc-400">
                      <li>Ingresa a tu consola de control en <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-white font-bold underline hover:text-amber-500">Supabase</a> y elige tu proyecto.</li>
                      <li>Localiza el <strong>SQL Editor</strong> en la barra lateral izquierda (ícono de terminal).</li>
                      <li>Presiona <strong>"New Query"</strong>, pega las sentencias SQL de abajo y haz clic en <strong>"Run"</strong> para procesarlo.</li>
                    </ol>
                  </div>

                  <div className="relative mt-4">
                    <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                      <button
                        onClick={handleCopySql}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors font-bold text-[10px] shadow-sm border border-zinc-700"
                      >
                        {wasCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                        <span>{wasCopied ? '¡Copiado!' : 'Copiar Script completo'}</span>
                      </button>
                    </div>
                    <pre className="p-4 bg-black/60 text-zinc-400 rounded-2xl font-mono text-[9px] overflow-auto max-h-48 leading-relaxed border border-zinc-800">
                      {supabaseSql}
                    </pre>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-zinc-800 bg-zinc-900/20 flex justify-end">
                  <button
                    onClick={() => setIsSqlModalOpen(false)}
                    className="px-5 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
                  >
                    Entendido, continuar con LocalStorage
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </SignedIn>
    </div>
  );
}

