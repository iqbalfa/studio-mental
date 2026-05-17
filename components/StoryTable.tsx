import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Edit3, 
  Trash2, 
  Plus, 
  Settings2, 
  Sparkles, 
  RefreshCw, 
  Download, 
  Maximize2, 
  X, 
  CheckCircle2, 
  Clock, 
  Lock,
  ChevronRight,
  Type,
  Zap,
  Square,
  Play
} from 'lucide-react';
import { StoryScene, ReferenceImage, SceneType, SceneMode, SCENE_TYPE_LABELS, SCENE_MODE_LABELS, SCENE_TYPE_FUNCTIONS, SCENE_TYPE_MODES } from '../types';

interface StoryTableProps {
  scenes: StoryScene[];
  refImages: ReferenceImage[];
  onGenerateImage: (sceneId: string, frameId: string) => void;
  onGenerateSequence: (sceneId: string) => void;
  onUpdatePrompt: (sceneId: string, frameId: string, newPrompt: string) => void;
  onRefinePrompt: (sceneId: string, frameId: string, instruction: string) => Promise<void>; // Updated to Promise
  onFormatChange: (sceneId: string, format: "Single Panel" | "Multi Panel" | "Sequence", count: number) => void;
  onSaveNarrative: (sceneId: string, newText: string) => void;
  onAddScene: (index?: number) => void;
  onDeleteScene: (sceneId: string) => void;
  onUpdateSplitText: (sceneId: string, frameId: string, newSplitText: string[]) => void;
  onUpdateSceneType: (sceneId: string, frameId: string, newSceneType: SceneType) => void;
  onGeneratePrompts: (sceneId: string) => void;
  onGenerateAllImages?: () => void;
  isGeneratingAll?: boolean;
  generateAllProgress?: string;
  onCancelGenerateAll?: () => void;
  language: 'id' | 'en';
}

const TRANSLATIONS = {
  id: {
    changeFormat: "Ubah Format",
    count: "Jumlah:",
    cancel: "Batal",
    apply: "Terapkan",
    noStoryboard: "Belum ada storyboard. Masukkan paragraf target dan klik 'Buat Storyboard' atau tambah manual.",
    addManual: "+ Tambah Baris Manual",
    col1: "1. Text dan Format",
    col2: "2. Pembagian Kata",
    col3: "3. Text-to-Image Prompt",
    col4: "4. REF",
    col5: "5. Visual Result",
    save: "Simpan",
    editPrompt: "Instruksi revisi (Enter)",
    refine: "Refine",
    generating: "Membuat...",
    generatePrompts: "Generate Prompts",
    generateAll: "Generate All Images (10 RPM)",
    stopGenerateAll: "Stop",
    readyToGenerate: "Ready to Generate",
    waitFor: "Wait for #",
    regenerate: "Regenerate",
    generate: "Generate",
    generateSequence: "Generate Sequence",
    generatingSequence: "Generating Sequence...",
    addNewRow: "+ Tambah Baris Baru",
    close: "Close",
    singlePanel: "Single Panel",
    multiPanel: "Multi Panel",
    sequence: "Sequence",
    locked: "Locked",
    ready: "Ready"
  },
  en: {
    changeFormat: "Change Format",
    count: "Count:",
    cancel: "Cancel",
    apply: "Apply",
    noStoryboard: "No storyboard yet. Enter target paragraph and click 'Generate Storyboard' or add manually.",
    addManual: "+ Add Row Manually",
    col1: "1. Text and Format",
    col2: "2. Text Breakdown",
    col3: "3. Text-to-Image Prompt",
    col4: "4. REF",
    col5: "5. Visual Result",
    save: "Save",
    editPrompt: "Revision instruction (Enter)",
    refine: "Refine",
    generating: "Generating...",
    generatePrompts: "Generate Prompts",
    generateAll: "Generate All Images (10 RPM)",
    stopGenerateAll: "Stop",
    readyToGenerate: "Ready to Generate",
    waitFor: "Wait for #",
    regenerate: "Regenerate",
    generate: "Generate",
    generateSequence: "Generate Sequence",
    generatingSequence: "Generating Sequence...",
    addNewRow: "+ Add New Row",
    close: "Close",
    singlePanel: "Single Panel",
    multiPanel: "Multi Panel",
    sequence: "Sequence",
    locked: "Locked",
    ready: "Ready"
  }
};

const FormatEditor: React.FC<{ 
    sceneId: string; 
    onClose: () => void; 
    onApply: (format: "Single Panel" | "Multi Panel" | "Sequence", count: number) => void; 
    language?: 'id' | 'en';
}> = ({ sceneId, onClose, onApply, language = 'id' }) => {
    const t = TRANSLATIONS[language] || TRANSLATIONS['id'];
    const [format, setFormat] = useState<"Single Panel" | "Multi Panel" | "Sequence">("Single Panel");
    const [count, setCount] = useState<number>(2);

    return (
        <div className="absolute left-0 bottom-full mb-2 bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-3 w-64 z-50">
            <h4 className="text-xs font-semibold text-white mb-2">{t.changeFormat}</h4>
            <div className="flex flex-col gap-2">
                <select 
                    value={format} 
                    onChange={(e) => setFormat(e.target.value as any)}
                    className="bg-slate-900 border border-slate-600 text-xs rounded p-1 text-slate-200"
                >
                    <option value="Single Panel">{t.singlePanel}</option>
                    <option value="Multi Panel">{t.multiPanel}</option>
                    <option value="Sequence">{t.sequence}</option>
                </select>

                {format !== "Single Panel" && (
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{t.count}</span>
                        <input 
                            type="number" 
                            min={2} 
                            max={5} 
                            value={count} 
                            onChange={(e) => setCount(parseInt(e.target.value))}
                            className="w-16 bg-slate-900 border border-slate-600 text-xs rounded p-1 text-slate-200"
                        />
                     </div>
                )}

                <div className="flex justify-end gap-2 mt-2">
                    <button onClick={onClose} className="text-[10px] text-slate-400 hover:text-white">{t.cancel}</button>
                    <button 
                        onClick={() => onApply(format, count)}
                        className="text-[10px] bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded"
                    >
                        {t.apply}
                    </button>
                </div>
            </div>
            <div className="absolute bottom-[-5px] left-4 w-2 h-2 bg-slate-800 border-b border-r border-slate-600 rotate-45"></div>
        </div>
    );
};

const StoryTable: React.FC<StoryTableProps> = ({ 
  scenes, 
  refImages, 
  onGenerateImage,
  onGenerateSequence,
  onUpdatePrompt,
  onRefinePrompt,
  onFormatChange,
  onSaveNarrative,
  onAddScene,
  onDeleteScene,
  onUpdateSplitText,
  onUpdateSceneType,
  onGeneratePrompts,
  onGenerateAllImages,
  isGeneratingAll,
  generateAllProgress,
  onCancelGenerateAll,
  language = 'id'
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS['id'];
  const [instructions, setInstructions] = useState<{[key: string]: string}>({});
  const [editingFormatId, setEditingFormatId] = useState<string | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [tempNarrativeText, setTempNarrativeText] = useState<string>("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const handleInstructionChange = (id: string, value: string) => {
    setInstructions(prev => ({ ...prev, [id]: value }));
  };

  const handleRefineClick = async (sceneId: string, frameId: string) => {
      const instruction = instructions[frameId];
      if (!instruction) return;
      
      await onRefinePrompt(sceneId, frameId, instruction);
      setInstructions(prev => ({ ...prev, [frameId]: '' }));
  };

  const handleKeyDownRefine = (e: React.KeyboardEvent<HTMLInputElement>, sceneId: string, frameId: string) => {
      if (e.key === 'Enter') {
          handleRefineClick(sceneId, frameId);
      }
  };

  const startEditing = (sceneId: string, text: string) => {
      setEditingSceneId(sceneId);
      setTempNarrativeText(text);
  };

  const cancelEditing = () => {
      setEditingSceneId(null);
      setTempNarrativeText("");
  };

  const saveEditing = (sceneId: string) => {
      onSaveNarrative(sceneId, tempNarrativeText);
      setEditingSceneId(null);
      setTempNarrativeText("");
  };

  const handleSplitTextChange = (sceneId: string, frameId: string, index: number, newValue: string, currentArray: string[]) => {
      const newArray = [...currentArray];
      newArray[index] = newValue;
      onUpdateSplitText(sceneId, frameId, newArray);
  };

  const handleDownload = (imageUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper to determine Scene Format Label for Column 1
  const getSceneFormatLabel = (scene: StoryScene) => {
      // 1. Multiple frame objects always mean sequence
      if (scene.frames.length > 1) {
          return `Sequence (${scene.frames.length} Frame)`;
      }

      // 2. Single frame object analysis
      const frame = scene.frames[0];
      if (!frame) return "Single Panel";
      
      const fmt = frame.format || "";
      const splitTextCount = frame.splitText?.length || 0;

      // 3. IF split text is > 1, it CANNOT be Single Panel.
      // If the stored format is incorrect (still "Single Panel"), we force a label.
      if (splitTextCount > 1) {
           const fmtLower = fmt.toLowerCase();
           if (!fmtLower.includes("multi") && !fmtLower.includes("sequence")) {
               // Fallback: Use Sequence as default for multiple texts if unlabeled
               return `Sequence (${splitTextCount} Frames)`; 
           }
      }

      return fmt || "Single Panel";
  };

  const getFormatBadgeStyle = (label: string) => {
      if (label.toLowerCase().includes("sequence")) return "bg-orange-900/50 text-orange-300 border-orange-800/50";
      if (label.toLowerCase().includes("multi")) return "bg-purple-900/50 text-purple-300 border-purple-800/50";
      return "bg-slate-800 text-slate-400 border-slate-600";
  };

  // Helper to render text with newlines after periods
  const renderSplitText = (text: string) => {
      // Just replace dots with dot+newline for visual separation
      return text.replace(/\. /g, '.\n\n').replace(/\./g, '.');
  };

  return (
    <div className="flex flex-col gap-4 relative">
        {/* Lightbox Modal */}
        {selectedImage && (
            <div 
                className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-200"
                onClick={() => setSelectedImage(null)}
            >
                <div className="relative max-w-full max-h-full">
                    <img 
                        src={selectedImage} 
                        alt="Enlarged view" 
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl border border-slate-700"
                        onClick={(e) => e.stopPropagation()} 
                    />
                    <button 
                        onClick={() => setSelectedImage(null)}
                        className="absolute -top-12 right-0 text-white hover:text-slate-300 flex items-center gap-2 bg-slate-800/50 px-3 py-1 rounded-full border border-slate-600"
                    >
                        <span>{t.close}</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>
        )}

        {scenes.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/50 rounded-xl border border-dashed border-slate-700">
            <p className="text-slate-400 mb-4">{t.noStoryboard}</p>
            <button 
                onClick={() => onAddScene()}
                className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs px-3 py-2 rounded border border-blue-500/30 transition-colors"
            >
                {t.addManual}
            </button>
        </div>
        ) : (
        <div className="flex flex-col gap-4">
            {onGenerateAllImages && (
                <div className="flex justify-end">
                    {isGeneratingAll ? (
                        <button
                            onClick={onCancelGenerateAll}
                            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/50 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                            <Square className="w-4 h-4" />
                            {t.stopGenerateAll} ({generateAllProgress})
                        </button>
                    ) : (
                        <button
                            onClick={onGenerateAllImages}
                            className="flex items-center gap-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/50 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors"
                        >
                            <Play className="w-4 h-4" />
                            {t.generateAll}
                        </button>
                    )}
                </div>
            )}
            <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-900/50 shadow-2xl pb-32">
            <table className="w-full text-left text-sm border-collapse table-fixed">
            <thead className="bg-slate-800 text-slate-200 uppercase tracking-wider font-semibold text-xs">
            <tr>
                <th className="p-4 w-[15%] border-r border-slate-700">{t.col1}</th>
                <th className="p-4 w-[15%] border-r border-slate-700">{t.col2}</th>
                <th className="p-4 w-[25%] border-r border-slate-700">{t.col3}</th>
                <th className="p-4 w-[10%] text-center border-r border-slate-700">{t.col4}</th>
                <th className="p-4 w-[35%] text-center">{t.col5}</th>
            </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
            {scenes.map((scene, sceneIndex) => (
                <React.Fragment key={scene.id}>
                    {scene.frames.map((frame, frameIndex) => {
                        const isFirstFrame = frameIndex === 0;
                        const isLastFrame = frameIndex === scene.frames.length - 1;
                        const previousFrame = frameIndex > 0 ? scene.frames[frameIndex - 1] : null;
                        const isSequence = frameIndex > 0;
                        const canGenerate = !isSequence || (previousFrame && !!previousFrame.imageUrl);
                        
                        // Determine relevant references (Filtering Logic for Display)
                        const promptLower = frame.visualPrompt.toLowerCase();
                        let displayedRefs = refImages.filter(img => promptLower.includes(img.name.toLowerCase()));

                        // FALLBACK UI LOGIC v2.6: If no explicit ref, show "Ilmu Lidi" if it exists
                        if (displayedRefs.length === 0) {
                             const ilmuLidiRef = refImages.find(img => img.name.toLowerCase().trim() === "ilmu lidi");
                             if (ilmuLidiRef) {
                                 displayedRefs = [ilmuLidiRef];
                             }
                        }

                        // Calculate Format Label once
                        const sceneFormatLabel = getSceneFormatLabel(scene);

                        return (
                            <tr key={frame.id} className="hover:bg-slate-800/30 transition-colors">
                                {/* 1. Text dan Format Column (Spans Row) */}
                                {isFirstFrame && (
                                    <td 
                                        className="p-4 align-top text-slate-300 border-r border-slate-700 bg-slate-900/30 relative"
                                        rowSpan={scene.frames.length}
                                    >
                                        <div className="flex flex-col h-full min-h-[150px]">
                                            {editingSceneId === scene.id ? (
                                                <div className="flex flex-col gap-2 h-full">
                                                    <textarea
                                                        className="w-full h-32 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white outline-none resize-none"
                                                        value={tempNarrativeText}
                                                        onChange={(e) => setTempNarrativeText(e.target.value)}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => saveEditing(scene.id)} className="text-[10px] bg-green-600 text-white px-2 py-1 rounded">{t.save}</button>
                                                        <button onClick={cancelEditing} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-1 rounded">{t.cancel}</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    {/* Action Buttons Centered */}
                                                    <div className="flex justify-center gap-2 mb-3 w-full border-b border-slate-800/50 pb-3 relative z-20">
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); startEditing(scene.id, scene.narrativeText); }} 
                                                            className="p-2 rounded-lg bg-slate-800 hover:bg-blue-600/20 text-slate-400 hover:text-blue-400 border border-slate-700 transition-all shadow-sm"
                                                            title="Edit Teks"
                                                        >
                                                            <Edit3 className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); onDeleteScene(scene.id); }} 
                                                            className="p-2 rounded-lg bg-slate-800 hover:bg-red-600/20 text-slate-400 hover:text-red-400 border border-slate-700 transition-all shadow-sm"
                                                            title="Hapus Baris"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                        <button 
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); onAddScene(sceneIndex); }} 
                                                            className="p-2 rounded-lg bg-slate-800 hover:bg-emerald-600/20 text-slate-400 hover:text-emerald-400 border border-slate-700 transition-all shadow-sm"
                                                            title="Tambah Baris Dibawah"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>

                                                    <div className="mb-4 flex flex-col gap-2 flex-grow">
                                                        {/* UNIFIED CONTAINER FOR TEXT SPLITS (One Textbox Logic) */}
                                                        <div className="bg-slate-950/40 rounded border border-slate-700 p-3 shadow-sm min-h-[80px] whitespace-pre-line leading-relaxed font-light text-xs text-slate-300">
                                                            {renderSplitText(scene.narrativeText)}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className="mt-auto pt-2">
                                                        {/* Scene Type Dropdown */}
                                                        {isFirstFrame && (() => {
                                                            const currentSceneType = scene.frames[0]?.sceneType || 'host-direct';
                                                            const currentSceneMode = scene.frames[0]?.sceneMode;
                                                            return (
                                                                <div className="flex flex-col gap-1.5">
                                                                    <select
                                                                        className="w-full text-[10px] font-bold font-mono px-2 py-1.5 rounded border text-center bg-slate-800 text-slate-300 border-slate-600 cursor-pointer outline-none hover:border-slate-500 focus:border-blue-500"
                                                                        value={currentSceneType}
                                                                        onChange={(e) => onUpdateSceneType(scene.id, scene.frames[0].id, e.target.value as SceneType)}
                                                                    >
                                                                        {(Object.keys(SCENE_TYPE_LABELS) as SceneType[]).map((st) => (
                                                                            <option key={st} value={st}>
                                                                                {SCENE_TYPE_LABELS[st]}
                                                                            </option>
                                                                        ))}
                                                                    </select>
                                                                    <span className="text-[8px] text-slate-500 italic truncate leading-tight">
                                                                        {currentSceneMode
                                                                            ? (SCENE_MODE_LABELS[currentSceneMode as SceneMode] || currentSceneMode)
                                                                            : SCENE_TYPE_FUNCTIONS[currentSceneType]}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })()}

                                                        {scene.isRestructuring ? (
                                                            <span className="text-xs text-blue-400 animate-pulse block text-center mt-2">Regenerating...</span>
                                                        ) : null}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                )}

                                {/* 2. Split Text Column */}
                                <td className="p-4 align-top border-r border-slate-700 h-full">
                                    <div className="flex flex-col h-full">
                                        <div className="flex flex-col gap-2 mb-4 flex-1">
                                            {(frame.splitText || []).map((textSeg, segIdx) => (
                                                <div key={segIdx} className="relative group flex-1 flex flex-col">
                                                    <textarea
                                                        className="w-full h-full min-h-[100px] bg-slate-950 border border-slate-700 rounded p-2 text-xs text-slate-300 resize-none focus:border-blue-500 outline-none"
                                                        value={textSeg}
                                                        onChange={(e) => handleSplitTextChange(scene.id, frame.id, segIdx, e.target.value, frame.splitText)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Render Button in the last frame of the scene */}
                                        {isLastFrame && (
                                            <div className="mt-auto pt-2 border-t border-slate-800">
                                                <button 
                                                    onClick={() => onGeneratePrompts(scene.id)}
                                                    disabled={scene.isGeneratingPrompts}
                                                    className={`w-full py-3 px-2 text-[10px] font-bold uppercase tracking-widest rounded-lg border transition-all shadow-lg flex items-center justify-center gap-2 ${
                                                        scene.isGeneratingPrompts 
                                                        ? 'bg-slate-800 border-slate-700 text-slate-500 cursor-wait' 
                                                        : 'bg-indigo-600/20 border-indigo-500/50 text-indigo-300 hover:bg-indigo-600/30 hover:border-indigo-400'
                                                    }`}
                                                >
                                                    {scene.isGeneratingPrompts ? (
                                                        <>
                                                            <RefreshCw className="w-3 h-3 animate-spin" />
                                                            {t.generating}
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="w-3 h-3" />
                                                            {t.generatePrompts}
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </td>

                                {/* 3. Prompt Column */}
                                <td className="p-4 align-top border-r border-slate-700">
                                    <div className="flex flex-col gap-2">
                                        <div className="flex items-center justify-end">
                                            <span className="text-[10px] text-slate-600 font-mono">#{frameIndex + 1}</span>
                                        </div>
                                        <textarea 
                                            className="w-full h-32 bg-slate-950/50 border border-slate-700 rounded p-2 text-[11px] text-slate-300 font-mono focus:ring-1 focus:ring-blue-500 outline-none resize-y"
                                            value={frame.visualPrompt}
                                            onChange={(e) => onUpdatePrompt(scene.id, frame.id, e.target.value)}
                                            placeholder={language === 'en' ? "English Prompt..." : "Prompt Bahasa Indonesia..."}
                                        />
                                        <div className="flex gap-1">
                                            <input 
                                                type="text"
                                                placeholder={t.editPrompt}
                                                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-[10px] text-slate-200"
                                                value={instructions[frame.id] || ''}
                                                onChange={(e) => handleInstructionChange(frame.id, e.target.value)}
                                                onKeyDown={(e) => handleKeyDownRefine(e, scene.id, frame.id)}
                                                disabled={frame.isRefining}
                                            />
                                            <button
                                                onClick={() => handleRefineClick(scene.id, frame.id)}
                                                disabled={frame.isRefining || !instructions[frame.id]}
                                                className={`text-[10px] px-2 border rounded flex items-center gap-1 ${
                                                    frame.isRefining 
                                                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-wait' 
                                                    : 'bg-slate-700 hover:bg-slate-600 border-slate-500 text-white'
                                                }`}
                                            >
                                                {frame.isRefining ? (
                                                    <>
                                                        <span className="w-2 h-2 rounded-full border border-slate-400 border-t-transparent animate-spin"></span>
                                                        Refining...
                                                    </>
                                                ) : t.refine}
                                            </button>
                                        </div>
                                    </div>
                                </td>

                                {/* 4. REF Column (Filtered Display) */}
                                <td className="p-4 align-top border-r border-slate-700 bg-slate-900/20">
                                    <div className="flex flex-col items-center gap-2">
                                        {displayedRefs.length > 0 ? (
                                            <div className="flex flex-wrap justify-center gap-2">
                                                {displayedRefs.map((img) => (
                                                    <div key={img.id} className="group relative">
                                                        <img 
                                                            src={img.data} 
                                                            className="h-8 w-8 rounded-full ring-2 ring-blue-500/50 object-cover" 
                                                            alt={img.name}
                                                            title={img.name}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-600 italic">No Ref</span>
                                        )}
                                        {isSequence && (
                                            <div className={`text-[9px] text-center px-1 rounded border mt-1 w-full
                                                ${canGenerate ? 'text-green-400 bg-green-950/30 border-green-900/50' : 'text-red-400 bg-red-950/30 border-red-900/50'}`}>
                                                {canGenerate ? t.ready : t.locked}
                                            </div>
                                        )}
                                    </div>
                                </td>

                                {/* 5. Result Column */}
                                <td className="p-4 align-top">
                                    <div className="flex flex-col gap-2">
                                        <div className="relative w-full aspect-video bg-slate-950 rounded-lg overflow-hidden border border-slate-700 flex items-center justify-center group/image">
                                            {frame.isGenerating ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                                                    <span className="text-[10px] text-blue-400">Generating...</span>
                                                </div>
                                            ) : frame.imageUrl ? (
                                                <>
                                                    <img 
                                                        src={frame.imageUrl} 
                                                        alt="Result" 
                                                        className="w-full h-full object-contain cursor-zoom-in hover:scale-105 transition-transform duration-300"
                                                        onClick={() => setSelectedImage(frame.imageUrl!)}
                                                    />
                                                    <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors pointer-events-none" />
                                                </>
                                            ) : (
                                                <span className="text-[10px] text-slate-600">
                                                    {canGenerate ? t.readyToGenerate : `${t.waitFor}${frameIndex}`}
                                                </span>
                                            )}
                                        </div>
                                        
                                        {/* Render Button Group */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => onGenerateImage(scene.id, frame.id)}
                                                disabled={frame.isGenerating || !canGenerate || scene.isGeneratingSequence}
                                                className={`flex-1 py-2.5 px-4 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2
                                                    ${!canGenerate || scene.isGeneratingSequence
                                                        ? 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50 border border-slate-700' 
                                                        : 'bg-blue-600 hover:bg-blue-500 text-white border border-white/10'
                                                    }`}
                                            >
                                                {frame.isGenerating ? (
                                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                                ) : (
                                                    <Sparkles className="w-3 h-3" />
                                                )}
                                                {frame.imageUrl ? 'Regenerate' : 'Generate'}
                                            </button>

                                            {frame.imageUrl && (
                                                <button
                                                    onClick={() => handleDownload(frame.imageUrl!, `scene-${sceneIndex}-frame-${frameIndex}.png`)}
                                                    className="py-2.5 px-3 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all shadow-sm"
                                                    title="Download Image"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Sequence: Generate All Button (Only on First Frame) */}
                                        {isFirstFrame && scene.frames.length > 1 && (
                                             <button
                                                onClick={() => onGenerateSequence(scene.id)}
                                                disabled={scene.isGeneratingSequence || scene.frames.some(f => f.isGenerating)}
                                                className={`w-full mt-1 py-1 px-3 rounded text-[10px] uppercase font-bold tracking-wider border transition-all
                                                    ${scene.isGeneratingSequence
                                                        ? 'bg-orange-900/30 text-orange-400 border-orange-800 animate-pulse'
                                                        : 'bg-orange-900/40 text-orange-300 border-orange-800 hover:bg-orange-800'
                                                    }`}
                                             >
                                                {scene.isGeneratingSequence ? (
                                                     <RefreshCw className="w-3 h-3 animate-spin" />
                                                 ) : (
                                                     <Zap className="w-3 h-3" />
                                                 )}
                                                 {scene.isGeneratingSequence ? t.generatingSequence : t.generateSequence}
                                             </button>
                                        )}
                                        
                                        {frame.error && (
                                            <p className="text-red-400 text-[9px] text-center bg-red-950/30 p-1 rounded">
                                                {frame.error}
                                            </p>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </React.Fragment>
            ))}
            </tbody>
        </table>
        </div>
        </div>
        )}
        
        <div className="flex justify-center">
             <button 
                onClick={() => onAddScene()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-4 py-2 rounded-full border border-slate-600 text-sm"
            >
                <Plus className="w-4 h-4" />
                {t.addNewRow}
            </button>
        </div>
    </div>
  );
};

export default StoryTable;