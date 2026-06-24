import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useLocation, useNavigate } from 'react-router-dom';

import * as LucideIcons from 'lucide-react';

import { Subject, Topic, Plan } from './types';
import { useSanitySubjects } from './sanity/useSanitySubjects';
import { getUserAllChats, deleteChatMessage } from './lib/supabase';
import SocraticChat from './components/SocraticChat';
import { TopicContentView } from './components/TopicContentView';
import PricingModal, { PLANS } from './components/PricingModal';
const SanityStudio = React.lazy(() => import('./studio'));
import { EdunovaLogo } from './components/EdunovaLogo';
import { AntigravityObjects } from './components/AntigravityObjects';
import { LandingPage } from './components/LandingPage';
import { SettingsModal } from './components/SettingsModal';
import { onTableStatusChange, deleteUserChat, saveLastStudiedTopic, getCompletedTopics } from './services/db';
import { SUPABASE_SETUP_SQL } from './data/supabaseSql';

interface AppProps {
  guestMode?: boolean;
  clerkUser?: any;
  clerkSignOut?: () => void;
  clerkLoaded?: boolean;
}

const getSubjectTopics = (subject: Subject): Topic[] => {
  if (subject.topics && subject.topics.length > 0) {
    return subject.topics;
  }
  const name = subject.name || 'Materia';
  return [
    {
      id: `${subject.id}-gen-1`,
      name: `Introducción a ${name}`,
      description: `Conceptos iniciales, terminología clave y fundamentos esenciales para dominar ${name}.`,
      difficulty: 'Beginner' as const
    },
    {
      id: `${subject.id}-gen-2`,
      name: `Metodologías y Conceptos Clave de ${name}`,
      description: `Exploración intermedia de teorías, de frameworks lógicos y resolución de problemas prácticos en ${name}.`,
      difficulty: 'Intermediate' as const
    },
    {
      id: `${subject.id}-gen-3`,
      name: `Aplicaciones Avanzadas y Casos Reales en ${name}`,
      description: `Discusión crítica profunda, análisis de escenarios complejos y debate constructivo guiado de nivel superior en ${name}.`,
      difficulty: 'Advanced' as const
    }
  ];
};

export default function App({ 
  guestMode = false, 
  clerkUser = null, 
  clerkSignOut = () => {}, 
  clerkLoaded = true 
}: AppProps) {
  // Dedicated state for guest authentication when Clerk isn't active
  const [mockUser, setMockUser] = useState<any>(() => {
    const stored = localStorage.getItem('edunova_mock_user');
    return stored ? JSON.parse(stored) : null;
  });

  // Clerk authentication handles, falling back to mock handles if guest mode is triggered
  let user: any = null;
  let signOut: any = () => {};
  let isClerkLoaded = true;
  
  if (!guestMode) {
    user = clerkUser;
    signOut = clerkSignOut;
    isClerkLoaded = clerkLoaded;
  }

  if (guestMode) {
    user = mockUser;
    signOut = () => {
      setMockUser(null);
      localStorage.removeItem('edunova_mock_user');
    };
  }

  const location = useLocation();
  const navigate = useNavigate();
  
  // Custom router state tracking
  const currentView = location.pathname.startsWith('/studio') ? 'STUDIO'
    : location.pathname.startsWith('/materia') ? 'TOPIC_SELECTION' 
    : location.pathname.startsWith('/itinerary') ? 'ITINERARY'
    : location.pathname.startsWith('/lesson') ? 'LESSON_CONTENT'
    : location.pathname.startsWith('/learning') ? 'LEARNING' 
    : location.pathname === '/pricing' ? 'PRICING' 
    : 'DASHBOARD';

  // State
  const { subjects: SUBJECTS, loading: subjectsLoading, activeSubjectIds, registerItineraryInSanity } = useSanitySubjects(user?.id || 'guest');
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<Topic[]>([]);
  const [activeTopic, setActiveTopic] = useState<Topic | null>(null);
  
  const [userPlan, setUserPlan] = useState<Plan>(PLANS[0]);
  const [allChats, setAllChats] = useState<any[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [lastStudied, setLastStudied] = useState<any>(null);
  const [completedTopicIds, setCompletedTopicIds] = useState<string[]>([]);
  const [deleteConfirmChat, setDeleteConfirmChat] = useState<{ subjectId: string; topicId: string; topicName: string } | null>(null);

  // Load last studied lesson
  useEffect(() => {
    const activeUserId = user?.id || 'guest';
    const saved = localStorage.getItem(`edunova_last_studied_global_${activeUserId}`);
    if (saved) {
      try {
        setLastStudied(JSON.parse(saved));
      } catch (e) {
        console.error("Error parsing last studied info:", e);
      }
    } else {
      setLastStudied(null);
    }
  }, [user?.id, currentView]);

  // Load completed topics dynamically from Supabase
  useEffect(() => {
    async function loadProgress() {
      const activeUserId = user?.id || 'guest';
      const completed = await getCompletedTopics(activeUserId);
      setCompletedTopicIds(completed);
    }
    loadProgress();
  }, [user?.id, currentView]);

  // Save last studied lesson
  useEffect(() => {
    if ((currentView === 'LESSON_CONTENT' || currentView === 'LEARNING') && selectedSubject && activeTopic) {
      const activeUserId = user?.id || 'guest';
      const payload = {
        subjectId: selectedSubject.id,
        topicId: activeTopic.id,
        topicName: activeTopic.name,
        subjectName: selectedSubject.name,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`edunova_last_studied_global_${activeUserId}`, JSON.stringify(payload));
      localStorage.setItem(`edunova_last_studied_sub_${activeUserId}_${selectedSubject.id}`, activeTopic.id);
      setLastStudied(payload);

      // Save course progress to Supabase (or fallback locally inside helper)
      saveLastStudiedTopic(
        activeUserId,
        selectedSubject.id,
        activeTopic.id,
        activeTopic.name,
        selectedSubject.name
      ).catch(e => console.error("Error saving last studied to Supabase:", e));
    }
  }, [currentView, selectedSubject, activeTopic, user?.id]);
  const [missingTables, setMissingTables] = useState<string[]>([]);

  // Listen to Supabase table connection issues
  useEffect(() => {
    return onTableStatusChange((missing) => {
      setMissingTables(missing);
    });
  }, []);

  // Initialize and load user active plan from localStorage
  useEffect(() => {
    const savedPlanId = localStorage.getItem('edunova_active_plan');
    if (savedPlanId) {
      const planObj = PLANS.find(p => p.id === savedPlanId);
      if (planObj) setUserPlan(planObj);
    }
  }, []);

  // Sync user previous chats meta summaries on changes
  useEffect(() => {
    async function loadLatestChats() {
      const activeUserId = user?.id || 'guest';
      const chats = await getUserAllChats(activeUserId);
      setAllChats(chats);
    }
    loadLatestChats();
  }, [user?.id, currentView, activeTopic]);

  // Handle manual path syncing / direct URL routing
  useEffect(() => {
    if (subjectsLoading || !SUBJECTS.length) return;

    if (currentView === 'TOPIC_SELECTION' || currentView === 'ITINERARY') {
      const id = location.pathname.split('/')[2];
      if (id) {
        const subject = SUBJECTS.find(s => s.id === id);
        if (subject) {
          setSelectedSubject(subject);
          if (currentView === 'TOPIC_SELECTION') {
            setSelectedTopics([]); // reset selection on entering topic selection
          } else {
            // For itinerary, ensure selectedTopics is populated or default to all if empty?
            // Actually, we'll keep whatever is in selectedTopics, but if someone lands strictly here, we'd need them!
            if (!selectedTopics.length) setSelectedTopics(getSubjectTopics(subject));
          }
        }
      }
    } 
    else if (currentView === 'LESSON_CONTENT' || currentView === 'LEARNING') {
      const parts = location.pathname.split('/');
      const subId = parts[2];
      const topId = parts[3];
      if (subId && topId) {
        const subject = SUBJECTS.find(s => s.id === subId);
        if (subject) {
          setSelectedSubject(subject);
          if (!selectedTopics.length) setSelectedTopics(getSubjectTopics(subject));
          const resolvedSubjectTopics = getSubjectTopics(subject);
          const topic = resolvedSubjectTopics.find(t => t.id === topId);
          if (topic) {
            setActiveTopic(topic);
          } else if (topId.startsWith('itinerary-')) {
            const idsList = topId.replace('itinerary-', '').split(',');
            const resolvedTopics = resolvedSubjectTopics.filter(t => idsList.includes(t.id));
            if (resolvedTopics.length > 0) {
              const compositeTopic: Topic = {
                id: topId,
                name: `Temas: ${resolvedTopics.map(t => t.name).join(' y ')}`,
                difficulty: 'Intermediate',
                description: `Sesión de estudio personalizada que abarca los siguientes temas: \n${resolvedTopics.map((t, idx) => `${idx + 1}. ${t.name}: ${t.description || ''}`).join('\n')}`
              };
              setActiveTopic(compositeTopic);

            } else {
              const syntheticTopic: Topic = {
                id: topId,
                name: 'Itinerario Socrático Personalizado',
                difficulty: 'Intermediate',
                description: 'Estudio guiado de múltiples subtemas.'
              };
              setActiveTopic(syntheticTopic);

            }
          } else {
            // Synthetic topic if not found in db yet
            const syntheticTopic: Topic = {
              id: topId,
              name: 'Guía de Aprendizaje',
              difficulty: 'Intermediate',
              description: 'Examen socrático guiado.'
            };
            setActiveTopic(syntheticTopic);

          }
        }
      }
    }
  }, [location.pathname, currentView, SUBJECTS, subjectsLoading]);

  // Real Clerk Billing and Subscription sync with backend verification
  useEffect(() => {
    if (!guestMode && user?.id) {
      const fetchBillingStatus = async () => {
        try {
          const res = await fetch(`/api/clerk-billing/status?userId=${user.id}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              // Set the active plan checking Clerk Billing details first, then falling back to planId
              const activePlanId = data.planId || "free";
              const planObj = PLANS.find(p => p.id === activePlanId);
              if (planObj) {
                setUserPlan(planObj);
                localStorage.setItem('edunova_active_plan', activePlanId);
              }
            }
          }
        } catch (error) {
          console.error("Failed to query Real Clerk Billing Status:", error);
        }
      };

      fetchBillingStatus();
    } else if (user) {
      const clerkPlanId = user.unsafeMetadata?.planId as string;
      if (clerkPlanId) {
        const planObj = PLANS.find(p => p.id === clerkPlanId);
        if (planObj) {
          setUserPlan(planObj);
          localStorage.setItem('edunova_active_plan', clerkPlanId);
        }
      } else {
        // Safe set initial backup
        const savedPlanId = localStorage.getItem('edunova_active_plan') || 'free';
        if (typeof user.update === 'function') {
          user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              planId: savedPlanId
            }
          }).catch((err: any) => console.error("Error setting initial subscription:", err));
        }
      }
    }
  }, [user, guestMode]);

  // Upgrade Plan handler using Real Clerk Billing integration
  const handleUpgradePlan = async (planId: string) => {
    if (guestMode) {
      // Simulate instantly for Guest Mode
      const planObj = PLANS.find(p => p.id === planId);
      if (planObj) {
        setUserPlan(planObj);
        localStorage.setItem('edunova_active_plan', planId);
        alert(`✨ ¡Plan '${planObj.name}' activado con éxito en Sesión de Invitado!`);
      }
      return;
    }

    if (!user) return;

    try {
      console.log(`Initiating Clerk Billing Upgrade: Requesting checkout for plan ${planId}...`);
      const response = await fetch('/api/clerk-billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: user.id,
          planId: planId,
          redirectUrl: window.location.origin + '/'
        })
      });

      if (!response.ok) {
        throw new Error("HTTP billing request failed");
      }

      const data = await response.json();
      if (data.success && data.checkoutUrl) {
        console.log(`Clerk Billing session created successfully. Redirecting to: ${data.checkoutUrl}`);
        
        // If it's a simulated URL or directly handles window routing:
        if (data.isSimulated) {
          // Instantly activate the plan in user's UI for live feedback
          const planObj = PLANS.find(p => p.id === planId);
          if (planObj) {
            setUserPlan(planObj);
            localStorage.setItem('edunova_active_plan', planId);
          }
          alert(`✨ ¡Plan '${planObj?.name}' activado con éxito! Clerk Billing ha registrado la suscripción.`);
        } else {
          // If a real external checkout link (from Stripe/Clerk portal) is returned, follow it
          window.location.href = data.checkoutUrl;
        }
      } else {
        throw new Error(data.error || "Unknown billing error");
      }
    } catch (err: any) {
      console.error("Clerk Billing Upgrade initiation failed:", err);
      // Perfect safe fallback to classic metadata update
      const planObj = PLANS.find(p => p.id === planId);
      if (planObj && typeof user.update === 'function') {
        try {
          await user.update({
            unsafeMetadata: {
              ...user.unsafeMetadata,
              planId: planId
            }
          });
          setUserPlan(planObj);
          localStorage.setItem('edunova_active_plan', planId);
          alert(`Plan '${planObj.name}' sincronizado exitosamente con Clerk.`);
        } catch (syncErr) {
          console.error("Classic sync fallback failed:", syncErr);
        }
      }
    }
  };

  // Handle Clerk session initialization
  if (!guestMode && !isClerkLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0a0f1d] text-zinc-300">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <EdunovaLogo size={64} showText={false} />
          <p className="text-xs font-mono tracking-widest text-[#98ca3f] font-black uppercase">
            Cargando Sesión Socrática...
          </p>
        </div>
      </div>
    );
  }

  // Handle Landing redirection if not authenticated
  if (!user) {
    return (
      <LandingPage 
        guestMode={guestMode} 
        onMockLogin={(simulatedUser: any) => {
          setMockUser(simulatedUser);
          localStorage.setItem('edunova_mock_user', JSON.stringify(simulatedUser));
        }} 
      />
    );
  }

  // Nav actions
  const selectSubjectAction = (subject: Subject) => {
    setSelectedSubject(subject);

    registerItineraryInSanity(subject.id);
    navigate(`/materia/${subject.id}`);
  };

  const handleResumeSubject = async (subject: Subject) => {
    const activeUserId = user?.id || 'guest';
    const subjectTopics = getSubjectTopics(subject);
    
    // Fetch latest completed topics from Supabase / localStorage fallback
    const completed = await getCompletedTopics(activeUserId, subject.id);
    const nextIncompleteTopic = subjectTopics.find(t => !completed.includes(t.id));
    
    setSelectedSubject(subject);
    setSelectedTopics(subjectTopics);
    
    if (nextIncompleteTopic) {
      setActiveTopic(nextIncompleteTopic);
      navigate(`/lesson/${subject.id}/${nextIncompleteTopic.id}`);
    } else {
      // If everything is completed, fallback to the first topic
      const fallbackTopic = subjectTopics[0] || null;
      if (fallbackTopic) {
        setActiveTopic(fallbackTopic);
        navigate(`/lesson/${subject.id}/${fallbackTopic.id}`);
      } else {
        registerItineraryInSanity(subject.id);
        navigate(`/materia/${subject.id}`);
      }
    }
  };

  const toggleTopicSelection = (topic: Topic) => {
    setSelectedTopics(prev => 
      prev.find(t => t.id === topic.id) 
        ? prev.filter(t => t.id !== topic.id) 
        : [...prev, topic]
    );
  };

  const generateItinerary = () => {
    if (!selectedSubject || !selectedTopics.length) return;
    navigate(`/itinerary/${selectedSubject.id}`);
  };

  const viewLessonContent = (topic: Topic) => {
    if (!selectedSubject) return;
    setActiveTopic(topic);
    navigate(`/lesson/${selectedSubject.id}/${topic.id}`);
  };

  const startTutorDialogue = (topic: Topic) => {
    if (!selectedSubject) return;
    setActiveTopic(topic);
    navigate(`/learning/${selectedSubject.id}/${topic.id}`);
  };



  const resumeHistoryChat = (subId: string, topId: string) => {
    const subject = SUBJECTS.find(s => s.id === subId);
    if (subject) {
      setSelectedSubject(subject);
      const topic = getSubjectTopics(subject).find(t => t.id === topId) || {
        id: topId,
        name: 'Historial',
        difficulty: 'Intermediate' as const
      };
      setActiveTopic(topic);
      navigate(`/learning/${subId}/${topId}`);
    }
  };

  const handleDeleteChat = (subjectId: string, topicId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const chat = allChats.find(c => c.subject_id === subjectId && c.topic_id === topicId);
    const topicName = chat?.topic_name || 'esta clase';
    setDeleteConfirmChat({ subjectId, topicId, topicName });
  };

  const confirmDeleteChat = async () => {
    if (!deleteConfirmChat) return;
    const { subjectId, topicId } = deleteConfirmChat;
    const activeUserId = user?.id || 'guest';
    
    // Delete from local storage
    await deleteChatMessage(activeUserId, subjectId, topicId);
    
    // Delete from Supabase cloud database
    try {
      await deleteUserChat(activeUserId, topicId);
    } catch (err) {
      console.error("Fallo al eliminar chat en SupabaseCloud:", err);
    }
    
    // Refresh chats state
    const chats = await getUserAllChats(activeUserId);
    setAllChats(chats);
    
    // Reset active state if needed
    if (activeTopic?.id === topicId) {
      setActiveTopic(null);
      navigate('/');
    }
    
    setDeleteConfirmChat(null);
  };

  // Dynamic Lucide resolver
  const renderLucide = (iconName: string, size = 16, className = '') => {
    const IconComp = (LucideIcons as any)[iconName] || LucideIcons.BookOpen;
    return <IconComp size={size} className={className} />;
  };

  // Filter local chats List by search input
  const filteredChats = allChats.filter(chat => 
    chat.topic_name.toLowerCase().includes(chatSearch.toLowerCase()) ||
    chat.last_message.toLowerCase().includes(chatSearch.toLowerCase())
  );

  if (currentView === 'STUDIO') {
    return (
      <div className="h-screen w-screen relative bg-[#05060f] text-white overflow-hidden">
        <div className="fixed bottom-6 right-6 z-[999999]">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 px-5 py-3 bg-[#0c101d] hover:bg-[#12182c] text-[#98ca3f] border border-[#98ca3f]/30 font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 shadow-2xl shadow-black cursor-pointer"
          >
            {renderLucide('Home', 15)} Volver al Campus
          </button>
        </div>
        <React.Suspense fallback={
          <div className="h-full w-full flex flex-col items-center justify-center bg-[#05060f] text-[#98ca3f] gap-3">
            <div className="w-10 h-10 border-4 border-[#98ca3f]/20 border-t-[#98ca3f] rounded-full animate-spin" />
            <p className="text-sm font-medium">Cargando Sanity Studio...</p>
          </div>
        }>
          <SanityStudio />
        </React.Suspense>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0a0f1d] overflow-hidden font-sans text-[#cbd5e1] relative">
      <AntigravityObjects />

      {/* TOP NAVIGATION BAR - PLATZI STYLE */}
      <header className="h-16 border-b border-[#1e293b] px-6 flex items-center justify-between shrink-0 bg-[#0c1424] z-30 relative select-none">
        <div className="flex items-center gap-6">
          {/* Logo brand */}
          <div 
            onClick={() => { navigate('/'); setSelectedSubject(null); setActiveTopic(null); }} 
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition-opacity"
            id="brand-logo"
          >
            <EdunovaLogo size={32} showText={false} />
            <div className="flex flex-col select-none">
              <h1 className="text-sm font-sans font-black tracking-widest text-white uppercase leading-none">
                EDUNOVA
              </h1>
              <p className="text-[9px] font-mono tracking-widest text-[#98ca3f] font-bold uppercase mt-0.5 leading-none">
                Socratic Tutors
              </p>
            </div>
          </div>

          {/* Top Search bar: Platzi style (visible on md+) */}
          <div className="hidden md:flex items-center relative w-72">
            <span className="absolute left-3 text-zinc-500">
              {renderLucide('Search', 14)}
            </span>
            <input
              type="text"
              value={chatSearch}
              onChange={(e) => setChatSearch(e.target.value)}
              placeholder="¿Qué quieres aprender hoy?"
              className="w-full pl-9 pr-4 py-1.5 bg-[#121f3d]/60 border border-[#1e293b] text-zinc-200 text-xs placeholder-zinc-500 rounded-full focus:outline-none focus:border-[#98ca3f]/60 transition-all font-sans"
            />
          </div>
        </div>

        {/* Navigation links & actions */}
        <div className="flex items-center gap-5">
          <nav className="flex items-center gap-1 sm:gap-3 text-xs font-bold uppercase tracking-wider">
            <button 
              onClick={() => { navigate('/'); setSelectedSubject(null); setActiveTopic(null); }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currentView === 'DASHBOARD' || currentView === 'TOPIC_SELECTION' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Materias
            </button>
            <button 
              onClick={() => navigate('/pricing')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                currentView === 'PRICING' ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Precios
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                isSidebarOpen ? 'text-[#98ca3f]' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {renderLucide('History', 14)}
              <span className="hidden sm:inline">Historial</span>
            </button>
          </nav>

          <div className="h-4 w-[1px] bg-[#1e293b] hidden sm:block" />

          {/* User profile dropdown button */}
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 text-left hover:opacity-95 transition-opacity p-1 bg-[#121f3d]/65 border border-[#1e293b] rounded-full px-3 py-1 text-xs"
            >
              <div className="w-5 h-5 rounded-full bg-[#121f3d] flex items-center justify-center text-xs text-[#98ca3f] font-bold overflow-hidden shrink-0">
                {user?.imageUrl ? (
                  <img src={user.imageUrl} alt="Avatar" className="w-full h-full object-cover referrerpolicy" referrerPolicy="no-referrer" />
                ) : (
                  'E'
                )}
              </div>
              <span className="text-zinc-300 font-medium hidden sm:inline max-w-[85px] truncate">
                {user ? user.fullName || user.username : 'Estudiante'}
              </span>
              {renderLucide('ChevronDown', 12, 'text-zinc-500')}
            </button>

            {/* Profile Dropdown */}
            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-48 bg-[#121f3d] border border-[#1e293b] rounded-2xl p-2 shadow-2xl z-40"
                >
                  <div className="px-3.5 py-2 mb-1.5 border-b border-[#1e293b]/55">
                    <p className="text-xs font-sans font-bold text-white truncate">
                      {user ? user.fullName || user.username : 'Estudiante EduNova'}
                    </p>
                    <p className="text-[9px] font-mono text-[#98ca3f] mt-0.5 uppercase tracking-wider">
                      Plan {userPlan.name}
                    </p>
                  </div>
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); navigate('/pricing'); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#0c1424] rounded-xl text-xs font-bold uppercase tracking-wider text-[#98ca3f] flex items-center gap-2"
                  >
                    {renderLucide('Sparkles', 13)} Mejorar Plan
                  </button>
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); setIsSettingsOpen(true); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#0c1424] rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-200 flex items-center gap-2"
                  >
                    {renderLucide('Settings', 13, 'text-red-400')} Configuración / CMS
                  </button>
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); navigate('/'); setSelectedSubject(null); setActiveTopic(null); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#0c1424] rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2 sm:hidden"
                  >
                    {renderLucide('Compass', 13)} Materias
                  </button>
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); setIsSidebarOpen(true); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#0c1424] rounded-xl text-xs font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-2 sm:hidden"
                  >
                    {renderLucide('History', 13)} Historial
                  </button>
                  <button
                    onClick={() => { setIsProfileMenuOpen(false); signOut(); }}
                    className="w-full text-left px-3.5 py-2 hover:bg-[#0c1424] hover:text-rose-450 rounded-xl text-xs font-semibold uppercase tracking-wider flex items-center gap-2 mt-1"
                  >
                    {renderLucide('LogOut', 13)} Cerrar Sesión
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* CORE CONTENT LAYOUT */}
      <div className="flex flex-1 overflow-hidden relative w-full h-full">

        {/* CORE WORKSPACE PANEL */}
        <div className="flex-1 h-full flex flex-col min-w-0 relative bg-[#0a0f1d] overflow-hidden">
          
          {/* Breadcrumb row & Level Info overlay */}
          {(selectedSubject || (activeTopic && currentView === 'LEARNING')) && (
            <div className="h-10 border-b border-[#1e293b]/70 px-6 flex items-center justify-between shrink-0 bg-[#0c1424]/40 z-10 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 cursor-pointer hover:text-zinc-300" onClick={() => { navigate('/'); setSelectedSubject(null); setActiveTopic(null); }}>
                  EduNova
                </span>
                {selectedSubject && (
                  <>
                    <span className="text-zinc-600">/</span>
                    <span className="text-zinc-300 truncate max-w-[150px]">
                      {selectedSubject.name}
                    </span>
                  </>
                )}
                {activeTopic && currentView === 'LEARNING' && (
                  <>
                    <span className="text-zinc-600">/</span>
                    <span className="text-[#98ca3f] font-bold truncate max-w-[150px]">
                      {activeTopic.name}
                    </span>
                  </>
                )}
              </div>
              {userPlan && (
                <span className="text-[9px] font-mono font-black text-[#98ca3f] uppercase bg-[#98ca3f]/10 border border-[#98ca3f]/15 px-2 py-0.5 rounded-full select-none">
                  Nivel: {userPlan.name}
                </span>
              )}
            </div>
          )}

        {/* VIEW MAIN ROUTING BLOCK */}
        <main className="flex-1 overflow-y-auto w-full relative p-6 md:p-8">
          <AnimatePresence mode="wait">
                    {/* 1. DASHBOARD VIEW: TOPICS GRID */}
            {currentView === 'DASHBOARD' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-5xl mx-auto space-y-12 pb-12"
              >
                {/* Platzi-Style Hero Section */}
                <div className="text-center py-8 md:py-14 max-w-4xl mx-auto space-y-6">
                  <h1 className="text-3xl md:text-6xl font-sans font-black tracking-tight text-white select-none leading-none">
                    La escuela de tutores socráticos
                    <span className="text-[#98ca3f] block mt-2 text-2xl md:text-3xl lg:text-4xl font-extrabold">
                      para mentes autónomas.
                    </span>
                  </h1>
                  <p className="text-zinc-400 text-xs md:text-sm max-w-xl mx-auto font-sans leading-relaxed">
                    Aprende de manera activa mediante diálogos críticos e inductivos guiados por IA expertas. Elige una especialidad abajo para iniciar tu diálogo formativo.
                  </p>

                  {/* Desktop & Mobile Main Slogan Search Input */}
                  <div className="max-w-xl mx-auto pt-3 relative px-4">
                    <div className="relative flex items-center">
                      <span className="absolute left-4 text-zinc-500">
                        {renderLucide('Search', 18)}
                      </span>
                      <input
                        type="text"
                        value={chatSearch}
                        onChange={(e) => setChatSearch(e.target.value)}
                        placeholder="¿Qué quieres aprender hoy? Ej. Física, Biología..."
                        className="w-full pl-12 pr-6 py-3 bg-[#121f3d]/80 border border-[#1e293b] text-white text-xs placeholder-zinc-500 rounded-full focus:outline-none focus:ring-1 focus:ring-[#98ca3f]/40 focus:border-[#98ca3f]/60 transition-all font-sans shadow-lg shadow-black/20"
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-sans mt-2">
                      Accede gratis a materias básicas, o mejora tu plan para interactuar con tutores avanzados.
                    </p>
                  </div>
                </div>

                {/* Last Studied Lesson Card */}
                {lastStudied && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-gradient-to-r from-[#121f3d] to-[#0c1424] border border-[#98ca3f]/30 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-lg shadow-[#98ca3f]/5"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#98ca3f]/2 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-[#98ca3f]/10 border border-[#98ca3f]/20 flex items-center justify-center text-[#98ca3f]">
                        {renderLucide('BookOpen', 22)}
                      </div>
                      <div>
                        <span className="text-[9px] font-mono tracking-widest text-[#98ca3f] font-bold uppercase">
                          CONTINUAR DONDE LO DEJASTE
                        </span>
                        <h3 className="text-base font-sans font-bold text-white mt-1">
                          {lastStudied.topicName}
                        </h3>
                        <p className="text-xs text-zinc-400 font-sans mt-0.5">
                          Materia: {lastStudied.subjectName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto shrink-0">
                      <button
                        onClick={() => {
                          const subject = SUBJECTS.find(s => s.id === lastStudied.subjectId);
                          if (subject) {
                            setSelectedSubject(subject);
                            const resolvedTopics = getSubjectTopics(subject);
                            setSelectedTopics(resolvedTopics);
                            const topic = resolvedTopics.find(t => t.id === lastStudied.topicId) || resolvedTopics[0];
                            setActiveTopic(topic);
                            navigate(`/lesson/${lastStudied.subjectId}/${topic.id}`);
                          }
                        }}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-[#98ca3f] hover:bg-[#aee24d] text-black font-extrabold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        id="resume-last-lesson-btn"
                      >
                        {renderLucide('Play', 12)}
                        <span>Ver Lección</span>
                      </button>
                      <button
                        onClick={() => {
                          const subject = SUBJECTS.find(s => s.id === lastStudied.subjectId);
                          if (subject) {
                            setSelectedSubject(subject);
                            const resolvedTopics = getSubjectTopics(subject);
                            setSelectedTopics(resolvedTopics);
                            const topic = resolvedTopics.find(t => t.id === lastStudied.topicId) || resolvedTopics[0];
                            setActiveTopic(topic);
                            navigate(`/learning/${lastStudied.subjectId}/${topic.id}`);
                          }
                        }}
                        className="flex-1 sm:flex-none px-5 py-2.5 bg-[#121f3d] hover:bg-[#1e293b] text-[#98ca3f] border border-[#98ca3f]/30 font-bold rounded-xl text-xs uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 flex items-center justify-center gap-1.5 cursor-pointer"
                        id="resume-last-chat-btn"
                      >
                        {renderLucide('MessageSquare', 12)}
                        <span>Tutoría AI</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Socratic Chat History & Resume Classes widget */}
                {allChats.length > 0 && (() => {
                  // Grouping chats by subject
                  const chatsBySubject: { [subjectId: string]: { subject: Subject; chats: any[] } } = {};

                  allChats.forEach(chat => {
                    const subject = SUBJECTS.find(s => s.id === chat.subject_id);
                    if (subject) {
                      if (!chatsBySubject[subject.id]) {
                        chatsBySubject[subject.id] = { subject, chats: [] };
                      }
                      chatsBySubject[subject.id].chats.push(chat);
                    } else {
                      const fallbackSubject: Subject = {
                        id: chat.subject_id,
                        name: 'Personalizado / Mixto',
                        icon: 'Sparkles',
                        color: 'bg-emerald-600',
                        topics: []
                      };
                      if (!chatsBySubject[fallbackSubject.id]) {
                        chatsBySubject[fallbackSubject.id] = { subject: fallbackSubject, chats: [] };
                      }
                      chatsBySubject[fallbackSubject.id].chats.push(chat);
                    }
                  });

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-6 bg-[#0c1424]/40 border border-[#1e293b] rounded-3xl p-6 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[#98ca3f]/2 rounded-full blur-2xl pointer-events-none" />
                      
                      <div className="flex items-center justify-between border-b border-[#1e293b]/70 pb-4">
                        <div className="flex items-center gap-3">
                          <div className="text-[#98ca3f] p-2 bg-[#98ca3f]/10 rounded-xl">
                            {renderLucide('History', 18)}
                          </div>
                          <div>
                            <h2 className="text-sm font-sans font-black text-white uppercase tracking-widest leading-none">
                              Retomar Clases Activas con Tutor AI
                            </h2>
                            <p className="text-[10px] text-zinc-500 font-sans mt-1">
                              Sigue o retoma tus itinerarios y diálogos inductivos organizados por materia.
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-mono select-none font-bold uppercase text-[#98ca3f] bg-[#98ca3f]/10 px-3 py-1 rounded-full border border-[#98ca3f]/20">
                          {allChats.length} clase{allChats.length > 1 ? 's' : ''} activa{allChats.length > 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="space-y-6">
                        {Object.values(chatsBySubject).map(({ subject, chats }) => (
                          <div key={subject.id} className="space-y-3">
                            {/* Subject header badge */}
                            <div className="flex items-center gap-2 px-1">
                              <div className={`w-6 h-6 rounded-lg ${subject.color || 'bg-[#121f3d]'} flex items-center justify-center text-white p-1`}>
                                {renderLucide(subject.icon, 12)}
                              </div>
                              <h3 className="text-xs font-sans font-extrabold text-white tracking-widest uppercase">
                                {subject.name}
                              </h3>
                            </div>

                            {/* Chats list of this subject */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {chats.map((chat) => (
                                <div 
                                  key={`${chat.subject_id}-${chat.topic_id}`}
                                  onClick={() => resumeHistoryChat(chat.subject_id, chat.topic_id)}
                                  className="bg-[#0c1424] border border-[#1e293b] p-4 rounded-2xl flex flex-col justify-between hover:border-[#98ca3f]/50 hover:bg-[#121f3d]/50 transition-all duration-300 relative group/card cursor-pointer shadow-md"
                                >
                                  <div className="space-y-1.5 mb-3.5">
                                    <div className="flex items-start justify-between gap-3">
                                      <span className="text-xs font-sans font-bold text-white group-hover/card:text-[#98ca3f] transition-all line-clamp-1">
                                        {chat.topic_name}
                                      </span>
                                      <span className="text-[8px] font-mono text-zinc-500 shrink-0 mt-0.5">
                                        {new Date(chat.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed h-8 font-sans pl-0.5">
                                      {chat.last_message || 'Diálogo socrático activo...'}
                                    </p>
                                  </div>

                                  <div className="flex items-center justify-between gap-3 border-t border-[#1e293b]/40 pt-2.5">
                                    <button
                                      onClick={() => resumeHistoryChat(chat.subject_id, chat.topic_id)}
                                      className="flex items-center gap-1 text-[10px] font-bold text-[#98ca3f] group-hover/card:text-[#bae65a] transition-colors uppercase tracking-wider"
                                    >
                                      <span>Seguir aprendiendo</span>
                                      {renderLucide('ArrowRight', 10)}
                                    </button>

                                    <button
                                      onClick={(e) => handleDeleteChat(chat.subject_id, chat.topic_id, e)}
                                      title="Borrar clase"
                                      className="p-1 px-1.5 text-[#64748b] hover:text-rose-450 hover:bg-[#1e293b] bg-transparent rounded-lg border border-transparent hover:border-[#1e293b] transition-all cursor-pointer z-10"
                                    >
                                      {renderLucide('Trash2', 12)}
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  );
                })()}

                {/* Dynamic Sanity-tracked Courses in Progress */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#1e293b] pb-4">
                    <h2 className="text-xs font-mono font-bold tracking-widest text-[#98ca3f] uppercase flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#98ca3f] animate-pulse" />
                      Tus Rutas en Curso (Sincronizado con Sanity)
                    </h2>
                    <span className="text-[10px] font-mono text-[#98ca3f] font-semibold bg-[#98ca3f]/10 px-2.5 py-1 rounded-full border border-[#98ca3f]/20">
                      {activeSubjectIds.length} Activas
                    </span>
                  </div>

                  {activeSubjectIds.length === 0 ? (
                    <div className="p-8 border border-dashed border-[#1e293b]/45 rounded-3xl bg-[#0c1424]/30 text-center space-y-2">
                      <p className="text-zinc-400 text-xs font-semibold">Aún no has iniciado ninguna materia en el Campus.</p>
                      <p className="text-[10px] text-zinc-500 font-sans">Haz clic en cualquiera de las rutas disponibles a continuación para agregarla a tu itinerario general.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {SUBJECTS.filter(s => activeSubjectIds.includes(s.id)).map((subject, index) => {
                        const subjectTopics = getSubjectTopics(subject);
                        const completedCount = subjectTopics.filter(t => completedTopicIds.includes(t.id)).length;
                        const percent = Math.round((completedCount / subjectTopics.length) * 100);
                        const firstIncomplete = subjectTopics.find(t => !completedTopicIds.includes(t.id));
                        
                        return (
                          <motion.div
                            key={`active-${subject.id}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.05 }}
                            whileHover={{ scale: 1.02, y: -2 }}
                            onClick={() => handleResumeSubject(subject)}
                            className="bg-[#0b1220] border border-[#98ca3f]/60 rounded-3xl p-6 cursor-pointer hover:border-[#98ca3f] hover:bg-[#121f3d]/70 transition-all duration-300 group flex flex-col justify-between h-auto min-h-[250px] relative overflow-hidden shadow-lg shadow-[#98ca3f]/5"
                          >
                            <span className="absolute top-4 right-4 bg-[#98ca3f] text-black text-[9px] font-black tracking-widest px-2 py-0.5 rounded uppercase animate-pulse">
                              {percent === 100 ? 'Completado' : 'En curso'}
                            </span>
                            
                            <div className="space-y-4">
                              <div className={`w-10 h-10 rounded-2xl ${subject.color || 'bg-blue-600'} flex items-center justify-center text-white font-bold`}>
                                {renderLucide(subject.icon, 20)}
                              </div>
                              <div>
                                <h3 className="text-base font-sans font-bold text-white group-hover:text-[#98ca3f] transition-colors leading-snug">
                                  {subject.name}
                                </h3>
                                <p className="text-[11px] text-zinc-400 font-sans mt-1">
                                  {subjectTopics.length} temas interactivos • Diálogo socrático
                                </p>
                              </div>

                              {/* Progress bar inside the active subject card */}
                              <div className="space-y-1.5 pt-1">
                                <div className="flex justify-between items-center text-[10px] text-zinc-400 font-sans">
                                  <span>Progreso: {percent}%</span>
                                  <span>{completedCount}/{subjectTopics.length} Completados</span>
                                </div>
                                <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-[#98ca3f] rounded-full transition-all duration-500" 
                                    style={{ width: `${percent}%` }}
                                  />
                                </div>
                              </div>

                              {firstIncomplete ? (
                                <p className="text-[10px] text-[#98ca3f] font-mono mt-1.5 bg-[#98ca3f]/10 px-2 py-0.5 rounded border border-[#98ca3f]/15 w-fit line-clamp-1">
                                  Siguiente: {firstIncomplete.name}
                                </p>
                              ) : (
                                <p className="text-[10px] text-emerald-400 font-mono mt-1.5 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15 w-fit">
                                  ¡Todo completado!
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-[#98ca3f] font-bold uppercase tracking-wider group-hover:translate-x-1 transition-all duration-200 mt-4">
                              <span>Reanudar materia</span>
                              {renderLucide('ArrowRight', 14)}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Subjects Grid Intro Header */}
                <div className="flex items-center justify-between border-b border-[#1e293b] pb-4 shrink-0">
                  <h2 className="text-xs font-mono font-bold tracking-widest text-zinc-400 uppercase">
                    {chatSearch ? 'MATERIAS FILTRADAS' : 'COLECCIÓN COMPLETA DE MATERIAS DISPONIBLES'}
                  </h2>
                  <span className="text-[10px] font-mono text-[#98ca3f] font-semibold uppercase">
                    {subjectsLoading ? 'Cargando...' : `${SUBJECTS.filter(s => 
                      s.name.toLowerCase().includes(chatSearch.toLowerCase()) ||
                      getSubjectTopics(s).some(t => t.name.toLowerCase().includes(chatSearch.toLowerCase()))
                    ).length} Materias`}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {subjectsLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="h-44 rounded-3xl bg-[#121f3d]/30 border border-[#1e293b]/50 animate-pulse" />
                    ))
                  ) : (
                    SUBJECTS.filter(subject => 
                      subject.name.toLowerCase().includes(chatSearch.toLowerCase()) ||
                      getSubjectTopics(subject).some(topic => topic.name.toLowerCase().includes(chatSearch.toLowerCase()))
                    ).map((subject, index) => {
                      const isActive = activeSubjectIds.includes(subject.id);
                      return (
                        <motion.div
                          key={subject.id}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
                          whileHover={{ scale: 1.025, y: -3 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => selectSubjectAction(subject)}
                          className={`bg-[#0c1424] border rounded-3xl p-6 cursor-pointer hover:bg-[#121f3d]/70 transition-all duration-300 group flex flex-col justify-between h-48 select-none relative overflow-hidden shadow-sm hover:shadow-[0_12px_35px_-12px_rgba(152,202,63,0.1)] ${
                            isActive ? 'border-[#98ca3f]/40 ring-1 ring-[#98ca3f]/10' : 'border-[#1e293b] hover:border-[#98ca3f]/40'
                          }`}
                        >
                          <div className="absolute top-0 right-0 w-28 h-28 bg-[#98ca3f]/4 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-550" />
                          
                          <div className="space-y-4">
                            <div className="flex items-start justify-between">
                              <div className={`w-10 h-10 rounded-2xl ${subject.color || 'bg-blue-600'} flex items-center justify-center text-white font-bold pulsy`}>
                                {renderLucide(subject.icon, 20)}
                              </div>
                              {isActive && (
                                <span className="text-[9px] font-bold text-[#98ca3f] uppercase bg-[#98ca3f]/10 px-2.5 py-0.5 rounded border border-[#98ca3f]/20">
                                  En curso
                                </span>
                              )}
                            </div>
                            <div>
                              <h3 className="text-base font-sans font-bold text-white group-hover:text-[#98ca3f] transition-colors leading-snug">
                                {subject.name}
                              </h3>
                              <p className="text-[11px] text-zinc-500 font-sans mt-1">
                                {getSubjectTopics(subject).length} temas interactivos • Diálogo guiado
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-[#98ca3f] font-bold uppercase tracking-wider group-hover:translate-x-1.5 transition-all duration-300">
                            <span>Comenzar ruta</span>
                            {renderLucide('ArrowRight', 14)}
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>

                {/* CMS / Sanity Studio dynamic management banner */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                  className="bg-gradient-to-r from-red-500/10 via-red-900/10 to-transparent border border-[#1e293b] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 overflow-hidden relative"
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
                  <div className="space-y-2 relative z-10">
                    <span className="text-[10px] font-mono tracking-widest text-[#98ca3f] font-bold uppercase block">
                      Gestor de Rutas de Aprendizaje • Sanity.io
                    </span>
                    <h3 className="text-xl font-display font-bold text-white">
                      ¿Quieres personalizar las materias y temas socráticos?
                    </h3>
                    <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                      EduNova está conectado a Sanity Headless CMS con tu API Key. Puedes abrir la consola de administración en tiempo real para crear nuevas materias, añadir temas, configurar niveles de dificultad o ajustar la iconografía Lucide de forma dinámica.
                    </p>
                  </div>
                  <button
                    onClick={() => setIsSettingsOpen(true)}
                    className="shrink-0 flex items-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-all duration-200 hover:-translate-y-0.5 shadow-lg shadow-red-500/15 relative z-10"
                  >
                    {renderLucide('Settings', 15)} Configurar Sanity
                  </button>
                </motion.div>
              </motion.div>
            )}

            {/* 2. TOPIC SELECTION / CHECKLIST VIEW */}
            {currentView === 'TOPIC_SELECTION' && selectedSubject && (
              <motion.div
                key="topics"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                <button
                  onClick={() => navigate('/')}
                  className="flex items-center gap-2 text-[#64748b] hover:text-white transition-colors font-bold text-xs uppercase tracking-wider"
                >
                  {renderLucide('ChevronLeft', 16)} Volver al panel de materias
                </button>

                <div className="p-6 border border-[#1e293b] rounded-3xl bg-[#0c1424] flex items-center gap-5 relative overflow-hidden">
                  <div className={`w-12 h-12 rounded-2xl ${selectedSubject.color} flex items-center justify-center text-white pulsy shrink-0`}>
                    {renderLucide(selectedSubject.icon, 22)}
                  </div>
                  <div>
                    <h2 className="text-xl font-sans font-extrabold text-white leading-tight">
                      {selectedSubject.name}
                    </h2>
                    <p className="text-xs text-zinc-400 font-sans mt-1">
                      Elige los temas que planeas incorporar en tu itinerario interactivo de hoy.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {getSubjectTopics(selectedSubject).map((topic) => {
                    const isSelected = selectedTopics.some(t => t.id === topic.id);
                    return (
                      <div 
                        key={topic.id}
                        onClick={() => toggleTopicSelection(topic)}
                        className={`p-5 rounded-2xl cursor-pointer transition-all duration-200 border flex gap-4 ${
                          isSelected 
                            ? 'bg-[#98ca3f]/10 border-[#98ca3f]' 
                            : 'bg-[#0c1424] border-[#1e293b] hover:border-zinc-700'
                        }`}
                      >
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                          isSelected ? 'bg-[#98ca3f] border-[#98ca3f] text-black' : 'bg-transparent border-zinc-600'
                        }`}>
                          {isSelected && renderLucide('Check', 14)}
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-[14px] font-sans font-bold leading-snug ${isSelected ? 'text-white' : 'text-zinc-300'}`}>
                            {topic.name}
                          </h4>
                          {topic.description && (
                            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                              {topic.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {selectedTopics.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="fixed bottom-8 left-0 right-0 flex justify-center z-50"
                  >
                    <button
                      onClick={generateItinerary}
                      className="px-8 py-4 bg-[#98ca3f] hover:bg-[#aee24d] text-black font-extrabold rounded-full text-sm uppercase tracking-widest shadow-[0_0_30px_rgba(152,202,63,0.3)] transition-all flex items-center gap-3"
                    >
                      Generar Itinerario ({selectedTopics.length}) {renderLucide('ArrowRight', 18)}
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* 3. ITINERARY VIEW */}
            {currentView === 'ITINERARY' && selectedSubject && (
              <motion.div
                key="itinerary"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="max-w-3xl mx-auto space-y-8"
              >
                <button
                  onClick={() => navigate(`/materia/${selectedSubject.id}`)}
                  className="flex items-center gap-2 text-[#64748b] hover:text-white transition-colors font-bold text-xs uppercase tracking-wider"
                >
                  {renderLucide('ChevronLeft', 16)} Volver a la selección
                </button>

                <div className="mt-8 bg-[#0c1424] border border-[#1e293b] rounded-xl shadow-lg overflow-hidden">
                  {/* Module Header */}
                  <div className="bg-[#121f3d]/80 px-6 py-4 flex items-center justify-between border-b border-[#1e293b]">
                    <div className="flex items-center gap-3 select-none text-white">
                      <div className="text-[#98ca3f]">
                        {renderLucide('ChevronDown', 18)}
                      </div>
                      <h3 className="text-sm font-sans font-bold text-white tracking-wide">
                        Módulo 1: {selectedSubject.name}
                      </h3>
                    </div>
                  </div>

                  {/* Module Content */}
                  <div className="flex flex-col relative px-6 py-2">
                    {/* The tracking line on the left */}
                    <div className="absolute left-[38px] top-0 bottom-0 w-0.5 bg-[#98ca3f]/20" />

                    {selectedTopics.map((topic) => (
                      <div key={topic.id} className="relative flex items-start py-4 border-b border-[#1e293b] last:border-0 group">
                        {/* Left icon over the line */}
                        <div className="absolute left-7 pl-[3px] top-5 bg-[#0c1424] py-1 z-10 text-[#98ca3f]">
                          {renderLucide('FileText', 16)}
                        </div>
                        
                        {/* Content */}
                        <div className="ml-14 flex flex-col pt-0.5 flex-1 pr-4">
                          <h4 className="text-[14px] font-sans font-bold text-[#98ca3f] leading-snug cursor-pointer group-hover:text-[#aee24d] transition-colors">
                            {topic.name}
                          </h4>
                          {topic.description && (
                            <p className="text-xs text-zinc-400 mt-1 line-clamp-2">
                              {topic.description}
                            </p>
                          )}
                          <button
                            onClick={() => viewLessonContent(topic)}
                            className="text-[11px] font-sans font-bold text-zinc-500 hover:text-white transition-colors mt-2.5 text-left w-fit flex items-center gap-1.5 uppercase tracking-widest border border-zinc-700/50 hover:border-[#98ca3f]/50 px-3 py-1.5 rounded-md"
                          >
                            <span>Ver contenido</span>
                            {renderLucide('ArrowRight', 12)}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* 3.1. LESSON CONTENT VIEW */}
            {currentView === 'LESSON_CONTENT' && selectedSubject && activeTopic && (
              <motion.div
                key="lesson-content"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex overflow-hidden z-20 bg-[#05060f]"
              >
                <TopicContentView 
                  subject={selectedSubject} 
                  topic={activeTopic} 
                  userId={user?.id || 'guest'}
                  allTopics={selectedTopics}
                  onSelectTopic={viewLessonContent}
                  onBack={() => navigate(`/itinerary/${selectedSubject.id}`)}
                  onStartChat={() => startTutorDialogue(activeTopic)}
                />
              </motion.div>
            )}

            {/* 4. ACTIVE SOCRATIC TUTORIAL CHAT VIEW */}
            {currentView === 'LEARNING' && selectedSubject && activeTopic && (
              <motion.div
                key="learning"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col h-full absolute inset-0 p-6"
              >
                <SocraticChat
                  userId={user?.id || 'guest'}
                  subject={selectedSubject}
                  topic={activeTopic}
                  onBack={() => navigate(`/materia/${selectedSubject.id}`)}
                />
              </motion.div>
            )}

            {/* 4. PRICING VIEW */}
            {currentView === 'PRICING' && (
              <motion.div
                key="pricing"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-4xl mx-auto py-4"
              >
                <div className="mb-6">
                  <button
                    onClick={() => navigate('/')}
                    className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors font-bold text-xs uppercase tracking-wider"
                  >
                    {renderLucide('ChevronLeft', 16)} Volver al panel de estudio
                  </button>
                </div>

                <PricingModal
                  currentPlan={userPlan?.id || 'free'}
                  onUpgrade={handleUpgradePlan}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </main>
      </div>

      {/* RIGHT SIDEBAR/DRAWER FOR HISTORIAL SOCRÁTICO */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: 320, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 320, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="h-full w-[310px] bg-[#0c1424]/95 border-l border-[#1e293b] flex flex-col shrink-0 overflow-hidden relative z-20 backdrop-blur-md shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="p-5 border-b border-[#1e293b] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                {renderLucide('History', 16, 'text-[#98ca3f]')}
                <h3 className="text-xs font-sans font-black tracking-widest text-white uppercase">
                  Historial Socrático
                </h3>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-[#121f3d] transition-all"
              >
                {renderLucide('X', 16)}
              </button>
            </div>

            {/* Quick search filter inside drawer */}
            <div className="p-4 border-b border-[#1e293b]/40 shrink-0">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-zinc-500">
                  {renderLucide('Search', 13)}
                </span>
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Filtrar por tema..."
                  className="w-full pl-9 pr-4 py-1.5 bg-[#121f3d]/60 border border-[#1e293b] text-zinc-200 text-xs placeholder-zinc-500 rounded-xl focus:outline-none focus:border-[#98ca3f]/50 transition-all font-sans"
                />
              </div>
            </div>

            {/* History Sessions List */}
            <div className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
              {filteredChats.length === 0 ? (
                <div className="px-4 py-8 text-center text-xs text-zinc-500 italic">
                  {chatSearch ? 'No se encontraron materias.' : 'Sin tutorías previas. ¡Empieza una seleccionando materia!'}
                </div>
              ) : (
                filteredChats.map((chat) => {
                  const isActive = activeTopic?.id === chat.topic_id && currentView === 'LEARNING';
                  return (
                    <div
                      key={`${chat.subject_id}-${chat.topic_id}`}
                      className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl text-left transition-all group/item ${
                        isActive
                          ? 'bg-[#121f3d] text-white border-l-2 border-[#98ca3f]'
                          : 'hover:bg-[#121f3d]/45 text-[#cbd5e1]'
                      }`}
                    >
                      <div
                        onClick={() => {
                          resumeHistoryChat(chat.subject_id, chat.topic_id);
                          if (window.innerWidth < 768) {
                            setIsSidebarOpen(false);
                          }
                        }}
                        className="flex-1 cursor-pointer min-w-0"
                      >
                        <div className="flex items-center justify-between w-full gap-1">
                          <span className="text-[11px] font-sans font-bold text-white truncate max-w-[150px]">
                            {chat.topic_name}
                          </span>
                          <span className="text-[8px] font-mono text-zinc-500 shrink-0">
                            {new Date(chat.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-400 truncate w-full pl-0.5 leading-normal">
                          {chat.last_message || 'Diálogo socrático activo...'}
                        </p>
                      </div>
                      
                      <button
                        onClick={(e) => handleDeleteChat(chat.subject_id, chat.topic_id, e)}
                        title="Borrar chat"
                        className="p-1 text-zinc-500 hover:text-rose-450 hover:bg-[#121f3d] rounded-lg border border-transparent hover:border-zinc-700 transition-all cursor-pointer opacity-80 md:opacity-0 md:group-hover/item:opacity-100 shrink-0"
                      >
                        {renderLucide('Trash2', 11)}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Drawer subscription level summary */}
            {userPlan && (
              <div className="p-4 border-t border-[#1e293b]/70 bg-[#0c1424] flex items-center justify-between text-xs shrink-0 select-none">
                <span className="text-zinc-400 font-medium">Suscripción actual</span>
                <span className="text-[9px] font-mono font-black text-[#98ca3f] uppercase bg-[#98ca3f]/10 border border-[#98ca3f]/25 px-2.5 py-0.5 rounded-full">
                  {userPlan.name}
                </span>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        userPlan={userPlan}
        setCurrentView={(view) => {
          setIsSettingsOpen(false);
          if (view === 'DASHBOARD') {
            navigate('/');
            setSelectedSubject(null);
            setActiveTopic(null);
          } else if (view === 'PRICING') {
            navigate('/pricing');
          }
        }}
        missingTables={missingTables}
        supabaseSql={SUPABASE_SETUP_SQL}
      />

      <AnimatePresence>
        {deleteConfirmChat && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-[#070b13]/85 backdrop-blur-sm flex items-center justify-center p-5"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#0f172a] border border-rose-500/25 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-rose-450">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
                  {renderLucide('Trash2', 16, 'text-rose-400')}
                </div>
                <div>
                  <h3 className="text-sm font-sans font-bold text-white">¿Eliminar clase activa?</h3>
                  <p className="text-[10px] font-mono text-rose-400 uppercase tracking-wider">Acción Irreversible</p>
                </div>
              </div>
              
              <p className="text-xs text-zinc-350 leading-relaxed font-sans">
                Estás a punto de eliminar permanentemente el diálogo socrático de <strong className="text-white">"{deleteConfirmChat.topicName}"</strong>. Se perderá de tu historial y no podrás recuperarlo.
              </p>
              
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmChat(null)}
                  className="px-3.5 py-1.5 text-xs font-sans font-bold text-zinc-400 hover:text-white hover:bg-[#1e293b] rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteChat}
                  className="px-4 py-1.5 text-xs font-sans font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-950/20 transition-all cursor-pointer"
                >
                  Sí, eliminar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  </div>
  );
}
