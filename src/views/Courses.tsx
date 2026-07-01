import React, { useEffect, useState } from 'react';
import { sanityClient } from '../services/sanity';
import MuxPlayer from '@mux/mux-player-react';
import { BookOpen, Video, ChevronRight, GraduationCap } from 'lucide-react';

export default function Courses() {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<any>(null);
  const [topics, setTopics] = useState<any[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<any>(null);

  useEffect(() => {
    sanityClient.fetch(`*[_type == "subject"]{
      _id,
      name,
      description,
      "imageUrl": image.asset->url
    }`).then((data) => setSubjects(data));
  }, []);

  const loadTopics = (subjectId: string) => {
    sanityClient.fetch(`*[_type == "topic" && subject._ref == $subjectId]{
      _id,
      title,
      difficulty,
      "videoAsset": videoFile.asset->
    }`, { subjectId }).then((data) => {
      setTopics(data);
      setSelectedTopic(null);
    });
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900">
      {/* Sidebar: Subjects */}
      <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto hidden md:block">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-8 text-indigo-600">
            <GraduationCap size={32} />
            <h1 className="text-xl font-bold tracking-tight text-gray-900">Edunova</h1>
          </div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-widest mb-4">Mis Cursos</h2>
          <div className="space-y-3">
            {subjects.map(sub => (
              <button 
                key={sub._id}
                onClick={() => {
                  setSelectedSubject(sub);
                  loadTopics(sub._id);
                }}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 flex items-start gap-4 shadow-sm border ${selectedSubject?._id === sub._id ? 'border-indigo-500 bg-indigo-50/50' : 'border-gray-100 bg-white hover:border-gray-300'}`}
              >
                <div className="flex-1">
                  <h3 className={`font-semibold ${selectedSubject?._id === sub._id ? 'text-indigo-700' : 'text-gray-800'}`}>{sub.name}</h3>
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{sub.description}</p>
                </div>
              </button>
            ))}
            {subjects.length === 0 && (
              <p className="text-sm text-gray-500">No hay cursos disponibles.</p>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedSubject ? (
          <div className="flex flex-1 overflow-hidden">
            
            {/* Topic Selection Menu */}
            <div className="w-72 bg-gray-50 border-r border-gray-200 overflow-y-auto">
               <div className="p-6 border-b border-gray-200 bg-white">
                  <h2 className="text-lg font-bold text-gray-900">{selectedSubject.name}</h2>
                  <p className="text-xs text-gray-500 mt-1">Selecciona un tema para comenzar</p>
               </div>
               <div className="p-4 space-y-2">
                 {topics.map(topic => (
                   <button
                    key={topic._id}
                    onClick={() => setSelectedTopic(topic)}
                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-colors ${selectedTopic?._id === topic._id ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-gray-200 text-gray-700'}`}
                   >
                     <div className="flex items-center gap-3">
                       <Video size={16} className={selectedTopic?._id === topic._id ? 'text-indigo-200' : 'text-gray-400'} />
                       <span className="text-sm font-medium">{topic.title}</span>
                     </div>
                     <ChevronRight size={16} className={selectedTopic?._id === topic._id ? 'text-white' : 'text-gray-400'} />
                   </button>
                 ))}
                 {topics.length === 0 && (
                   <p className="text-sm text-gray-500 text-center mt-4">No hay temas en este curso.</p>
                 )}
               </div>
            </div>

            {/* Video Player & Content */}
            <div className="flex-1 overflow-y-auto bg-white">
              {selectedTopic ? (
                <div className="max-w-4xl mx-auto p-8">
                  <h1 className="text-3xl font-bold text-gray-900 mb-6">{selectedTopic.title}</h1>
                  
                  {selectedTopic.videoAsset?.playbackId ? (
                    <div className="bg-black rounded-2xl overflow-hidden shadow-xl aspect-video border border-gray-800">
                      <MuxPlayer
                        playbackId={selectedTopic.videoAsset.playbackId}
                        metadata={{
                          video_id: selectedTopic._id,
                          video_title: selectedTopic.title,
                        }}
                        accentColor="#4f46e5"
                        primaryColor="#ffffff"
                        style={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-100 rounded-2xl aspect-video flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                      <Video size={48} className="mb-4 text-gray-300" />
                      <p className="font-medium text-gray-500">Este tema no tiene video asignado</p>
                    </div>
                  )}

                  <div className="mt-8">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                      Dificultad: {selectedTopic.difficulty || 'Normal'}
                    </span>
                  </div>

                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-gray-400 flex-col">
                  <BookOpen size={64} className="mb-4 text-gray-200" />
                  <p className="text-lg">Selecciona un tema para ver el contenido</p>
                </div>
              )}
            </div>

          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col text-gray-400 bg-white">
            <GraduationCap size={64} className="mb-4 text-gray-200" />
            <h2 className="text-xl font-medium text-gray-900">Bienvenido a Edunova</h2>
            <p className="mt-2 text-gray-500">Selecciona un curso en el panel lateral para empezar tu aprendizaje.</p>
          </div>
        )}
      </div>
    </div>
  );
}
