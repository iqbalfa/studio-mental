import React, { ChangeEvent, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Image as ImageIcon, Trash2, Sparkles, RefreshCw, X, ZoomIn } from 'lucide-react';
import { ReferenceImage } from '../types';

interface FileUploadProps {
  label: string;
  onFilesChange: (images: ReferenceImage[]) => void;
  currentImages: ReferenceImage[];
  onGenerateImage?: (id: string) => Promise<void>;
  onPromptChange?: (id: string, prompt: string) => void;
  onGeneratePrompt?: (id: string) => Promise<void>;
  onAddCharacter?: () => void;
  globalSourceRefs: string[];
  onGlobalSourceRefsChange: (refs: string[]) => void;
  onRefinePrompt?: (id: string, instruction: string) => Promise<void>;
  t: any;
}

const CharacterRow: React.FC<{
    img: ReferenceImage;
    onRemove: (id: string) => void;
    onNameChange: (id: string, name: string) => void;
    onPromptChange?: (id: string, prompt: string) => void;
    onGeneratePrompt?: (id: string) => void;
    onGenerate?: (id: string) => void;
    onZoom?: (url: string) => void;
    onRefine?: (id: string, instruction: string) => void;
    t: any;
}> = ({ img, onRemove, onNameChange, onPromptChange, onGeneratePrompt, onGenerate, onZoom, onRefine, t }) => {
    const [refineInput, setRefineInput] = useState('');

    return (
        <motion.tr 
            layout
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="border-b border-slate-800/50 hover:bg-slate-900/30 transition-colors group"
        >
            {/* Column 1: Nama Karakter */}
            <td className="p-4 align-top w-48">
                <div className="flex flex-col gap-2">
                    <input 
                        type="text" 
                        value={img.name}
                        onChange={(e) => onNameChange(img.id, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm font-bold text-slate-200 focus:border-blue-500 outline-none transition-all"
                        placeholder={t.charNamePlaceholder}
                    />
                    <button
                        onClick={() => onRemove(img.id)}
                        className="flex items-center gap-2 text-[10px] text-slate-500 hover:text-red-400 transition-colors w-fit px-1"
                    >
                        <Trash2 className="w-3 h-3" />
                        Remove
                    </button>
                </div>
            </td>

            {/* Column 2: Image Prompt & Refine */}
            <td className="p-4 align-top">
                <div className="flex flex-col gap-3">
                    <div className="relative">
                        <textarea 
                            value={img.visualPrompt || ''}
                            onChange={(e) => onPromptChange?.(img.id, e.target.value)}
                            className="w-full min-h-[80px] bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs text-slate-400 focus:border-blue-500 outline-none transition-all resize-none leading-relaxed pr-10"
                            placeholder={t.charPromptPlaceholder}
                        />
                        <button
                            onClick={() => onGeneratePrompt?.(img.id)}
                            disabled={!img.name.trim() || img.isGenerating}
                            className="absolute right-2 top-2 p-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md transition-all disabled:opacity-0"
                            title="Generate Prompt from Name"
                        >
                            <Sparkles className={`w-4 h-4 ${img.isGenerating ? 'animate-pulse' : ''}`} />
                        </button>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <input 
                                type="text"
                                value={refineInput}
                                onChange={(e) => setRefineInput(e.target.value)}
                                placeholder={t.refinePlaceholder}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-10 py-2 text-[11px] text-slate-300 focus:border-blue-500 outline-none transition-all"
                            />
                            <button
                                onClick={() => {
                                    onRefine?.(img.id, refineInput);
                                    setRefineInput('');
                                }}
                                disabled={!refineInput.trim() || img.isGenerating}
                                className="absolute right-1 top-1 bottom-1 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-md transition-all disabled:opacity-0"
                            >
                                <Sparkles className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                onRefine?.(img.id, refineInput);
                                setRefineInput('');
                            }}
                            disabled={!refineInput.trim() || img.isGenerating}
                            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
                        >
                            <RefreshCw className={`w-3 h-3 ${img.isGenerating ? 'animate-spin' : ''}`} />
                            {t.refinePrompt}
                        </button>
                    </div>
                </div>
            </td>

            {/* Column 3: Gambar Karakter */}
            <td className="p-4 align-top w-64">
                <div className="relative aspect-video rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center group/img shadow-inner">
                    {img.data ? (
                        <>
                            <img 
                                src={img.data} 
                                alt={img.name} 
                                className="w-full h-full object-contain transition-transform duration-700 group-hover/img:scale-105 cursor-zoom-in" 
                                onClick={() => onZoom?.(img.data)}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                <button
                                    onClick={() => onZoom?.(img.data)}
                                    className="p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full border border-white/20 transition-all"
                                    title="Zoom"
                                >
                                    <ZoomIn className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => onGenerate?.(img.id)}
                                    disabled={img.isGenerating}
                                    className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold rounded-xl border border-white/20 transition-all flex items-center gap-2"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${img.isGenerating ? 'animate-spin' : ''}`} />
                                    Regenerate
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center gap-3 p-4 text-center">
                            <ImageIcon className="w-8 h-8 text-slate-800" />
                            <button
                                onClick={() => onGenerate?.(img.id)}
                                disabled={img.isGenerating}
                                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {img.isGenerating ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Sparkles className="w-3.5 h-3.5" />
                                )}
                                {img.isGenerating ? '...' : t.generateCharImg}
                            </button>
                        </div>
                    )}
                </div>
            </td>
        </motion.tr>
    );
};

const FileUpload: React.FC<FileUploadProps> = ({ 
  label, 
  onFilesChange, 
  currentImages,
  onGenerateImage,
  onPromptChange,
  onGeneratePrompt,
  onAddCharacter,
  globalSourceRefs,
  onGlobalSourceRefsChange,
  onRefinePrompt,
  t
}) => {
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const handleGlobalSourceRefUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remaining = 2 - globalSourceRefs.length;
    if (remaining <= 0) {
        alert("Maksimal 2 referensi gambar global.");
        return;
    }

    const fileArray: File[] = (Array.from(files) as File[]).slice(0, remaining);
    const promises = fileArray.map((file: File) => {
        return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
        });
    });

    Promise.all(promises).then(newRefs => {
        onGlobalSourceRefsChange([...globalSourceRefs, ...newRefs]);
    });
    e.target.value = '';
  };

  const removeGlobalSourceRef = (index: number) => {
    const newRefs = globalSourceRefs.filter((_, i) => i !== index);
    onGlobalSourceRefsChange(newRefs);
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - currentImages.length;
    
    if (remainingSlots <= 0) {
        alert("Batas maksimum 10 gambar tercapai.");
        e.target.value = '';
        return;
    }

    let fileArray: File[] = Array.from(files);

    if (fileArray.length > remainingSlots) {
        alert(`Hanya ${remainingSlots} gambar yang akan ditambahkan dari ${fileArray.length} gambar yang dipilih.`);
        fileArray = fileArray.slice(0, remainingSlots);
    }

    const filePromises = fileArray.map((file) => {
        return new Promise<ReferenceImage>((resolve) => {
            const fileName = file.name.split('.').slice(0, -1).join('.') || file.name;
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                resolve({
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    name: fileName,
                    data: result,
                    isGenerating: false
                });
            };
            reader.readAsDataURL(file);
        });
    });

    const newImages = await Promise.all(filePromises);
    onFilesChange([...currentImages, ...newImages]);
    e.target.value = '';
  };

  const removeImage = (id: string) => {
    const newImages = currentImages.filter((img) => img.id !== id);
    onFilesChange(newImages);
  };

  const handleNameChange = (id: string, newName: string) => {
      const newImages = currentImages.map(img => 
          img.id === id ? { ...img, name: newName } : img
      );
      onFilesChange(newImages);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
            <thead>
                <tr className="bg-slate-900/50 border-b border-slate-800">
                    <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.charName}</th>
                    <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.charPrompt}</th>
                    <th className="p-4 text-left text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.charImage}</th>
                </tr>
            </thead>
            <tbody>
                <AnimatePresence mode="popLayout">
                    {currentImages.map((img) => (
                        <CharacterRow 
                            key={img.id}
                            img={img}
                            onRemove={removeImage}
                            onNameChange={handleNameChange}
                            onPromptChange={onPromptChange}
                            onGeneratePrompt={onGeneratePrompt}
                            onGenerate={onGenerateImage}
                            onZoom={(url) => setZoomedImage(url)}
                            onRefine={onRefinePrompt}
                            t={t}
                        />
                    ))}
                </AnimatePresence>
                
                {currentImages.length === 0 && (
                    <tr>
                        <td colSpan={3} className="p-20 text-center">
                            <div className="flex flex-col items-center gap-4 opacity-30">
                                <ImageIcon className="w-12 h-12" />
                                <p className="text-sm font-medium">Belum ada karakter yang dideteksi atau diunggah.</p>
                            </div>
                        </td>
                    </tr>
                )}
            </tbody>
        </table>
      </div>

      <div className="p-4 bg-slate-900/30 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all cursor-pointer">
                    <Plus className="w-4 h-4" />
                    {t.uploadBtn}
                    <input 
                        type="file" 
                        accept="image/*"
                        multiple 
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </label>
                <button
                    onClick={onAddCharacter}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl border border-slate-700 transition-all"
                >
                    <Plus className="w-4 h-4" />
                    {t.addCharBtn}
                </button>
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">{currentImages.length}/10 {t.filled}</span>
            </div>

            {/* Global Source Refs */}
            <div className="flex items-center gap-3 border-l border-slate-800 pl-6">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Global Refs (Max 2):</span>
                <div className="flex gap-2">
                    {globalSourceRefs.map((ref, idx) => (
                        <div key={idx} className="relative w-10 h-10 rounded-lg border border-slate-700 overflow-hidden group/ref">
                            <img src={ref} className="w-full h-full object-cover" />
                            <button 
                                onClick={() => removeGlobalSourceRef(idx)}
                                className="absolute inset-0 bg-red-500/80 opacity-0 group-hover/ref:opacity-100 flex items-center justify-center transition-opacity"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                    ))}
                    {globalSourceRefs.length < 2 && (
                        <label className="w-10 h-10 rounded-lg border-2 border-dashed border-slate-700 hover:border-blue-500/50 flex items-center justify-center cursor-pointer transition-colors">
                            <Plus className="w-3.5 h-3.5 text-slate-600" />
                            <input type="file" accept="image/*" multiple className="hidden" onChange={handleGlobalSourceRefUpload} />
                        </label>
                    )}
                </div>
            </div>
        </div>
        <p className="text-[10px] text-slate-500 max-w-md text-right leading-relaxed">
            {t.uploadHint}
        </p>
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img 
                src={zoomedImage} 
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl object-contain border border-white/10" 
                alt="Zoomed Character"
              />
              <button 
                onClick={() => setZoomedImage(null)}
                className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors"
              >
                <X className="w-8 h-8" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default FileUpload;
