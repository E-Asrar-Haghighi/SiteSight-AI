/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  LayoutDashboard, 
  Upload, 
  Image as ImageIcon, 
  Filter, 
  CheckCircle2, 
  Clock, 
  HardHat,
  ChevronRight,
  Loader2,
  X,
  HelpCircle,
  BookOpen,
  Zap,
  Database,
  ShieldCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ConstructionPhoto, ConstructionStage, STAGES } from './types';
import { analyzeConstructionImage } from './services/geminiService';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const [photos, setPhotos] = useState<ConstructionPhoto[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<ConstructionStage | 'All'>('All');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'gallery' | 'timeline' | 'guide'>('dashboard');

  useEffect(() => {
    fetchPhotos();
  }, []);

  const fetchPhotos = async () => {
    try {
      const response = await fetch('/api/photos');
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      }
    } catch (error) {
      console.error("Failed to fetch photos:", error);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsAnalyzing(true);
    
    for (const file of acceptedFiles) {
      const reader = new FileReader();
      
      const promise = new Promise<void>((resolve) => {
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const mimeType = file.type;
          
          const analysis = await analyzeConstructionImage(base64, mimeType);
          
          const newPhoto = {
            id: Math.random().toString(36).substr(2, 9),
            imageData: base64,
            mimeType: mimeType,
            stage: analysis.stage,
            insight: analysis.insight,
            timestamp: Date.now(),
            fileName: file.name,
          };

          try {
            const response = await fetch('/api/photos', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newPhoto),
            });
            
            if (response.ok) {
              await fetchPhotos(); // Refresh list
            }
          } catch (error) {
            console.error("Failed to save photo:", error);
          }
          resolve();
        };
      });
      
      reader.readAsDataURL(file);
      await promise;
    }

    setIsAnalyzing(false);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': [] },
    disabled: isAnalyzing
  });

  const filteredPhotos = useMemo(() => {
    if (activeFilter === 'All') return photos;
    return photos.filter(p => p.stage === activeFilter);
  }, [photos, activeFilter]);

  const stats = useMemo(() => {
    return STAGES.reduce((acc, stage) => {
      acc[stage] = photos.filter(p => p.stage === stage).length;
      return acc;
    }, {} as Record<string, number>);
  }, [photos]);

  const removePhoto = async (id: string) => {
    try {
      const response = await fetch(`/api/photos/${id}`, {
        method: 'DELETE',
      });
      if (response.ok) {
        setPhotos(prev => prev.filter(p => p.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete photo:", error);
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0A0A] overflow-hidden">
      {/* Sidebar */}
      <motion.aside 
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="border-r border-zinc-800 bg-zinc-900/50 flex flex-col"
      >
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <HardHat className="text-black w-6 h-6" />
          </div>
          {sidebarOpen && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-xl tracking-tight"
            >
              BuildTrack<span className="text-emerald-500">AI</span>
            </motion.span>
          )}
        </div>

        <nav className="flex-1 px-4 space-y-2">
          <SidebarItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            active={currentView === 'dashboard'} 
            collapsed={!sidebarOpen} 
            onClick={() => setCurrentView('dashboard')}
          />
          <SidebarItem 
            icon={<ImageIcon size={20} />} 
            label="Gallery" 
            active={currentView === 'gallery'} 
            collapsed={!sidebarOpen} 
            onClick={() => setCurrentView('gallery')}
          />
          <SidebarItem 
            icon={<Clock size={20} />} 
            label="Timeline" 
            active={currentView === 'timeline'} 
            collapsed={!sidebarOpen} 
            onClick={() => setCurrentView('timeline')}
          />
          <SidebarItem 
            icon={<HelpCircle size={20} />} 
            label="User Guide" 
            active={currentView === 'guide'} 
            collapsed={!sidebarOpen} 
            onClick={() => setCurrentView('guide')}
          />
        </nav>

        <div className="p-4 border-t border-zinc-800">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-full flex items-center justify-center p-2 rounded-lg hover:bg-zinc-800 transition-colors text-zinc-400"
          >
            <ChevronRight className={cn("transition-transform", sidebarOpen && "rotate-180")} />
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-bottom border-zinc-800 flex items-center justify-between px-8 bg-zinc-900/30 backdrop-blur-md z-10">
          <h2 className="text-lg font-medium text-zinc-300">Construction Progress</h2>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-medium text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Monitoring
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {currentView === 'dashboard' && (
              <>
                {/* Upload Zone */}
                <div 
                  {...getRootProps()} 
                  className={cn(
                    "relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-300 p-12 flex flex-col items-center justify-center gap-4",
                    isDragActive ? "border-emerald-500 bg-emerald-500/5" : "border-zinc-800 hover:border-zinc-700 bg-zinc-900/40",
                    isAnalyzing && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                    {isAnalyzing ? (
                      <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
                    ) : (
                      <Upload className="w-8 h-8 text-zinc-400" />
                    )}
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-medium">
                      {isAnalyzing ? "Analyzing construction site..." : "Upload site photos"}
                    </p>
                    <p className="text-zinc-500 text-sm mt-1">
                      Drag and drop multiple images, or click to browse
                    </p>
                  </div>
                </div>

                {/* Filters & Stats */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex flex-wrap gap-2">
                    <FilterButton 
                      label="Show All" 
                      active={activeFilter === 'All'} 
                      onClick={() => setActiveFilter('All')} 
                      count={photos.length}
                    />
                    {STAGES.map(stage => (
                      <FilterButton 
                        key={stage}
                        label={stage} 
                        active={activeFilter === stage} 
                        onClick={() => setActiveFilter(stage)} 
                        count={stats[stage]}
                      />
                    ))}
                  </div>
                </div>

                {/* Photo Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence mode="popLayout">
                    {filteredPhotos.map((photo) => (
                      <PhotoCard key={photo.id} photo={photo} onRemove={removePhoto} />
                    ))}
                  </AnimatePresence>
                </div>
              </>
            )}

            {currentView === 'gallery' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">Photo Gallery</h3>
                  <div className="flex gap-2">
                    <FilterButton 
                      label="All" 
                      active={activeFilter === 'All'} 
                      onClick={() => setActiveFilter('All')} 
                      count={photos.length}
                    />
                    {STAGES.map(stage => (
                      <FilterButton 
                        key={stage}
                        label={stage} 
                        active={activeFilter === stage} 
                        onClick={() => setActiveFilter(stage)} 
                        count={stats[stage]}
                      />
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredPhotos.map((photo) => (
                    <div key={photo.id} className="aspect-square rounded-xl overflow-hidden border border-zinc-800 group relative">
                      <img src={photo.url} alt={photo.fileName} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                        <p className="text-[10px] font-bold text-emerald-500 uppercase">{photo.stage}</p>
                        <p className="text-xs text-white line-clamp-2">{photo.insight}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === 'timeline' && (
              <div className="space-y-12 max-w-3xl mx-auto py-8">
                <h3 className="text-2xl font-bold">Project Timeline</h3>
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-zinc-800 before:to-transparent">
                  {photos.sort((a, b) => b.timestamp - a.timestamp).map((photo, index) => (
                    <div key={photo.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      {/* Icon */}
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border border-zinc-800 bg-zinc-900 text-zinc-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                        <div className={cn("w-3 h-3 rounded-full", getStageColor(photo.stage).split(' ')[0].replace('/20', ''))} />
                      </div>
                      {/* Content */}
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-zinc-900 p-4 rounded-2xl border border-zinc-800 shadow-xl">
                        <div className="flex items-center justify-between space-x-2 mb-1">
                          <div className="font-bold text-zinc-100">{photo.stage}</div>
                          <time className="font-mono text-xs text-emerald-500">{new Date(photo.timestamp).toLocaleDateString()}</time>
                        </div>
                        <div className="text-zinc-400 text-sm mb-3 italic">"{photo.insight}"</div>
                        <div className="aspect-video rounded-lg overflow-hidden border border-zinc-800">
                          <img src={photo.url} alt={photo.fileName} className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {currentView === 'guide' && (
              <div className="max-w-4xl mx-auto py-8 space-y-12">
                <div className="space-y-4">
                  <h3 className="text-4xl font-bold tracking-tight">User Guide</h3>
                  <p className="text-zinc-400 text-lg">
                    BuildTrack AI uses advanced computer vision to help project managers and stakeholders track construction progress automatically.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GuideCard 
                    icon={<Zap className="text-amber-500" />}
                    title="AI Classification"
                    description="Every photo you upload is analyzed by Gemini AI to determine the current stage of construction with high precision."
                  />
                  <GuideCard 
                    icon={<Database className="text-blue-500" />}
                    title="Persistent Memory"
                    description="All site data and classifications are stored in a secure SQLite database, ensuring your project history is never lost."
                  />
                  <GuideCard 
                    icon={<ImageIcon className="text-purple-500" />}
                    title="Visual Insights"
                    description="The AI doesn't just categorize; it provides specific insights into what it sees, like 'Reinforced steel visible' or 'Drywall started'."
                  />
                  <GuideCard 
                    icon={<ShieldCheck className="text-emerald-500" />}
                    title="Stage Tracking"
                    description="Automatically track progress through Excavation, Framing, Enclosure, and Interior Finishing stages."
                  />
                </div>

                <div className="prose prose-invert max-w-none bg-zinc-900/50 p-8 rounded-2xl border border-zinc-800">
                  <Markdown>{`
### How to use BuildTrack AI

1. **Upload Photos**: Go to the **Dashboard** and drag your site photos into the upload zone. You can upload multiple images at once.
2. **AI Analysis**: Wait a few seconds while the AI analyzes each image. It will determine the construction stage and generate a brief insight.
3. **Filter & Review**: Use the filter buttons to quickly see photos from specific stages (e.g., just "Framing").
4. **Explore Views**:
   - **Gallery**: A clean grid view for quick visual inspection of all project assets.
   - **Timeline**: A chronological feed showing how the project has evolved from day one.
5. **Manage Data**: You can remove any photo by clicking the 'X' button on the card in the Dashboard view.

### Capabilities
- **Multi-Image Processing**: Upload batches of photos for efficient site documentation.
- **Automatic Categorization**: No manual tagging required; the AI handles the heavy lifting.
- **Real-time Insights**: Get immediate feedback on site conditions detected in photos.
- **Historical Archive**: Build a complete visual record of your construction project from foundation to finish.
                  `}</Markdown>
                </div>
              </div>
            )}

            {photos.length === 0 && !isAnalyzing && currentView !== 'guide' && (
              <div className="py-20 text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto">
                  <ImageIcon className="text-zinc-700 w-10 h-10" />
                </div>
                <div>
                  <h3 className="text-zinc-400 font-medium">No photos uploaded yet</h3>
                  <p className="text-zinc-600 text-sm">Upload images to start tracking progress</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function GuideCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 bg-zinc-900/50 rounded-2xl border border-zinc-800 hover:border-zinc-700 transition-colors space-y-4">
      <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center">
        {icon}
      </div>
      <div className="space-y-2">
        <h4 className="font-bold text-zinc-100">{title}</h4>
        <p className="text-zinc-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active, collapsed, onClick }: { icon: React.ReactNode, label: string, active: boolean, collapsed: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer",
        active ? "bg-emerald-500/10 text-emerald-500" : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300"
      )}
    >
      {icon}
      {!collapsed && <span className="font-medium">{label}</span>}
    </div>
  );
}

function PhotoCard({ photo, onRemove }: { photo: ConstructionPhoto, onRemove: (id: string) => void }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="group relative bg-zinc-900 rounded-2xl overflow-hidden border border-zinc-800 hover:border-zinc-700 transition-all shadow-xl"
    >
      <div className="aspect-[4/3] overflow-hidden relative">
        <img 
          src={photo.url} 
          alt={photo.fileName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <button 
          onClick={() => onRemove(photo.id)}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
        >
          <X size={16} />
        </button>

        <div className="absolute bottom-3 left-3 flex gap-2">
          <span className={cn(
            "px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider",
            getStageColor(photo.stage)
          )}>
            {photo.stage}
          </span>
        </div>
      </div>
      
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs font-mono text-zinc-500 truncate flex-1">
            {photo.fileName}
          </p>
          <span className="text-[10px] text-zinc-600 whitespace-nowrap">
            {new Date(photo.timestamp).toLocaleDateString()}
          </span>
        </div>
        <div className="flex gap-2">
          <div className="mt-1">
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <p className="text-sm text-zinc-300 leading-relaxed italic">
            "{photo.insight}"
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function FilterButton({ label, active, onClick, count }: { label: string, active: boolean, onClick: () => void, count: number }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
        active 
          ? "bg-emerald-500 text-black shadow-lg shadow-emerald-500/20" 
          : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700"
      )}
    >
      {label}
      <span className={cn(
        "px-1.5 py-0.5 rounded-md text-[10px]",
        active ? "bg-black/20" : "bg-zinc-800"
      )}>
        {count}
      </span>
    </button>
  );
}

function getStageColor(stage: ConstructionStage) {
  switch (stage) {
    case 'Excavation/Foundation': return 'bg-amber-500/20 text-amber-500 border border-amber-500/30';
    case 'Framing/Structural': return 'bg-blue-500/20 text-blue-500 border border-blue-500/30';
    case 'Enclosure/Roofing': return 'bg-purple-500/20 text-purple-500 border border-purple-500/30';
    case 'Interior/Finishing': return 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30';
    default: return 'bg-zinc-500/20 text-zinc-500 border border-zinc-500/30';
  }
}
