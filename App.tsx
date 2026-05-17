import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Save, 
  Upload, 
  Sparkles, 
  AlertCircle, 
  Settings, 
  Image as ImageIcon, 
  Layout, 
  Plus, 
  Trash2, 
  ChevronRight,
  Monitor,
  Cpu,
  Zap,
  CheckCircle2,
  Info,
  RefreshCw,
  Volume2,
  Play,
  Download,
  ChevronDown,
  X
} from 'lucide-react';
import { AppState, DEFAULT_SYSTEM_PROMPT, ReferenceImage, StoryScene, SceneType, SceneMode, LLMProvider, ILMU_LIDI_STYLE, ILMU_MENTAL_STYLE, ILMU_SURVIVAL_STYLE, ILMU_NYANTUY_STYLE, SCENE_TYPE_MODES } from './types';
import FileUpload from './components/FileUpload';
import StoryTable from './components/StoryTable';
import AudioPlayer from './components/AudioPlayer';
import TabButton from './components/TabButton';
import { 
  analyzeNarrativeToScenes, 
  generateSceneImage, 
  refineScenePrompt, 
  generatePromptsFromFrames,
  detectCharactersFromNarrative,
  generateCharacterPrompt,
  transformToVoiceDirector,
  generateTTS
} from './services/geminiService';

// Helper to distribute items into buckets
const distributeItems = (items: string[], count: number, separator: string): string[] => {
    const result: string[] = new Array(count).fill("");
    const base = Math.floor(items.length / count);
    const extra = items.length % count;
    let current = 0;
    
    for (let i = 0; i < count; i++) {
        const take = base + (i < extra ? 1 : 0);
        const slice = items.slice(current, current + take);
        result[i] = slice.join(separator);
        current += take;
    }
    return result;
};

// Robust text distributor that falls back from Sentences -> Clauses -> Words
const distributeText = (text: string, count: number): string[] => {
    if (count <= 1) return [text];
    const cleanText = text.trim();
    if (!cleanText) return new Array(count).fill("");

    // Strategy 1: Split by Sentences
    const sentenceRegex = /[^.!?\n]+[.!?]+|[^.!?\n]+$/g;
    const sentences = cleanText.match(sentenceRegex)?.map(s => s.trim()).filter(s => s) || [cleanText];
    
    if (sentences.length >= count) {
        return distributeItems(sentences, count, " ");
    }

    // Strategy 2: Split by Clauses (Commas, Semicolons, Uppercase transitions)
    const clauseParts = cleanText.split(/([,;])/);
    const clauses: string[] = [];
    
    for (let i = 0; i < clauseParts.length; i += 2) {
        const part = clauseParts[i];
        const delim = clauseParts[i + 1] || "";
        const combined = (part + delim).trim();
        if (combined) {
            clauses.push(combined);
        }
    }
    
    if (clauses.length >= count) {
        return distributeItems(clauses, count, " ");
    }

    // Strategy 3: Split by Words (Fallback)
    const words = cleanText.split(/\s+/);
    return distributeItems(words, count, " ");
};

// Split text into chunks of 2-20 words, combining sentences when possible.
// Used for "2. Pembagian Kata" column — each row = one chunk of ~2-20 words.
const splitTextByWordCount = (text: string, minWords: number = 2, maxWords: number = 20): string[] => {
    const cleanText = text.trim();
    if (!cleanText) return [];

    // Step 1: split into sentences
    const sentenceRegex = /[^.!?\n]+[.!?]+|[^.!?\n]+$/g;
    const sentences = cleanText.match(sentenceRegex)?.map(s => s.trim()).filter(s => s) || [cleanText];

    const chunks: string[] = [];
    let currentChunk = "";
    let currentWordCount = 0;

    for (const sentence of sentences) {
        const sentenceWords = sentence.split(/\s+/).length;

        // If this single sentence exceeds maxWords, split it by words
        if (sentenceWords > maxWords) {
            // Flush current chunk first
            if (currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
                currentWordCount = 0;
            }

            const words = sentence.split(/\s+/);
            let i = 0;
            while (i < words.length) {
                if (i < words.length - maxWords) {
                    // Take exactly maxWords
                    chunks.push(words.slice(i, i + maxWords).join(" "));
                    i += maxWords;
                } else {
                    // Remaining words (less than maxWords)
                    chunks.push(words.slice(i).join(" "));
                    break;
                }
            }
            continue;
        }

        // If adding this sentence keeps us within maxWords, add it
        if (currentWordCount + sentenceWords <= maxWords) {
            currentChunk = currentChunk ? currentChunk + " " + sentence : sentence;
            currentWordCount += sentenceWords;
        } else {
            // Flush current chunk if it has enough words, otherwise merge anyway
            if (currentWordCount >= minWords || currentWordCount > 0) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
            currentWordCount = sentenceWords;
        }
    }

    // Flush remaining
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks.length > 0 ? chunks : [cleanText];
};

// Re-split each scene's splitText using local word-count-based logic (2-20 words).
// Also merges consecutive short scenes so each row has ~2-20 words.
const postProcessScenes = (scenes: StoryScene[]): StoryScene[] => {
    if (scenes.length === 0) return scenes;

    const MIN_WORDS = 2;
    const MAX_WORDS = 20;
    const mergedScenes: StoryScene[] = [];

    for (let i = 0; i < scenes.length; i++) {
        const current = scenes[i];
        let mergedNarrative = current.narrativeText;
        const scenesToMerge: StoryScene[] = [current];
        let j = i + 1;

        while (j < scenes.length) {
            const nextWc = scenes[j].narrativeText.split(/\s+/).length;
            const currentWc = mergedNarrative.split(/\s+/).length;

            if (currentWc >= MIN_WORDS) break;
            if (currentWc + nextWc > MAX_WORDS) {
                // If still below MIN, try adding one more short scene to reach minimum
                if (nextWc <= MAX_WORDS - currentWc) {
                    mergedNarrative += " " + scenes[j].narrativeText;
                    scenesToMerge.push(scenes[j]);
                    j++;
                }
                break;
            }
            mergedNarrative += " " + scenes[j].narrativeText;
            scenesToMerge.push(scenes[j]);
            j++;
        }

        if (scenesToMerge.length === 1) {
            // Single scene: keep as is, will be re-split below
            mergedScenes.push(current);
        } else {
            // Multiple short scenes merged into one — reduce to a single frame
            // (they are now one visual unit)
            const firstFrame = scenesToMerge[0].frames[0];
            mergedScenes.push({
                ...scenesToMerge[0],
                narrativeText: mergedNarrative.trim(),
                frames: firstFrame ? [{
                    ...firstFrame,
                    format: "Single Panel"
                }] : [{
                    id: `frame-${Date.now()}-${mergedScenes.length}`,
                    format: "Single Panel",
                    sceneType: 'host-direct' as SceneType,
                    sceneMode: 'intro' as SceneMode,
                    visualPrompt: "",
                    splitText: [],
                    isGenerating: false
                }]
            });
        }
        i = j - 1;
    }

    // Re-split each scene's splitText using word-count logic
    return mergedScenes.map(scene => {
        const chunks = splitTextByWordCount(scene.narrativeText);
        const finalChunks = chunks.length > 0 ? chunks : [scene.narrativeText];
        const frameCount = scene.frames.length;
        const allWords = scene.narrativeText.split(/\s+/);

        if (frameCount <= 1) {
            // Single-frame: all chunks in one frame
            return {
                ...scene,
                frames: scene.frames.map(f => ({ ...f, splitText: finalChunks }))
            };
        }

        // Multi-frame (Sequence/Multi Panel): distribute words evenly across frames
        const wordsPerFrame = Math.floor(allWords.length / frameCount);
        const remainder = allWords.length % frameCount;
        
        const distributedChunks: string[] = [];
        let wordIndex = 0;
        
        for (let i = 0; i < frameCount; i++) {
            const count = wordsPerFrame + (i < remainder ? 1 : 0);
            if (count > 0 && wordIndex < allWords.length) {
                distributedChunks.push(allWords.slice(wordIndex, wordIndex + count).join(" "));
                wordIndex += count;
            } else {
                distributedChunks.push("");
            }
        }

        return {
            ...scene,
            frames: scene.frames.map((f, idx) => ({ ...f, splitText: [distributedChunks[idx] || ""] }))
        };
    });
};

const TRANSLATIONS: Record<'id' | 'en', any> = {
  id: {
    configTitle: "Konfigurasi Produksi",
    textModel: "Text Model Provider",
    narratorName: "Nama Narator (Channel)",
    narratorSuffix: "Narrator Suffix",
    narratorSuffixPlaceholder: "Contoh: Mengenakan baju merah bertuliskan \"Ilmu Survival\"",
    narratorPlaceholder: "Contoh: Norman, Ilmu Lidi, dll",
    styleSuffix: "Visual Style Suffix",
    stylePlaceholder: "Masukkan prompt style suffix di sini...",
    easterEgg: "Easter Egg Configuration",
    negativePrompt: "Negative Prompt Keywords",
    negativePlaceholder: "Contoh: blur, distorted, low quality, batik, monas, garis pemisah, vertical line...",
    negativeHint: "Pisahkan dengan koma. Kata-kata ini akan dikecualikan saat pembuatan gambar.",
    contextNarrative: "1. Konteks Narasi (Lengkap)",
    contextPlaceholder: "Tempelkan cerita lengkap untuk konteks yang lebih baik...",
    refImages: "2. Referensi Gambar (1-10 Karakter)",
    targetParagraph: "3. Paragraf Target Visual",
    targetPlaceholder: "Paste paragraf spesifik yang ingin divisualisasikan menjadi storyboard...",
    analyzeBtn: "Buat Storyboard",
    analyzing: "Sedang Menganalisis...",
    resultTitle: "Visual Storyboard Result",
    systemReady: "System Ready",
    totalScenes: "Total Scenes",
    saveProject: "Simpan Proyek",
    loadProject: "Buka Proyek",
    aiEngine: "AI Engine",
    geminiKey: "Custom Gemini API Key",
    connectKey: "Masukkan API Key",
    keyConnected: "API Key Tersimpan",
    billingInfo: "Informasi Billing",
    nvidiaKey: "Nvidia API Key",
    sumopodKey: "SumoPod API Key",
    alertTarget: "Mohon isi Paragraf Target yang akan divisualisasikan.",
    alertNvidia: "Mohon masukkan Nvidia API Key.",
    alertSumopod: "Mohon masukkan SumoPod API Key.",
    noChar: "Tidak ada karakter spesifik",
    generateCharBtn: "Generate Karakter",
    generatingChar: "Mendeteksi Karakter...",
    generateCharImg: "Generate Gambar",
    newSceneText: "Tulis narasi baru di sini...",
    confirmDelete: "Apakah anda yakin ingin menghapus baris ini?",
    uploadBtn: "Upload",
    addCharBtn: "Tambah Karakter",
    charName: "Nama Karakter",
    charPrompt: "Prompt Visual",
    charImage: "Gambar Karakter",
    maxImages: "Maks 10 gambar",
    filled: "Terisi",
    charNamePlaceholder: "Nama Karakter",
    charPromptPlaceholder: "Prompt visual...",
    refinePlaceholder: "Instruksi revisi...",
    refinePrompt: "Revisi Prompt",
    uploadHint: "Upload 1-10 karakter. Gunakan 'Global Refs' untuk mengunggah referensi visual (max 2) yang akan digunakan untuk semua karakter.",
    voiceDirectorBtn: "Ubah ke Versi Voice Director",
    voiceDirectorLoading: "Mengolah Naskah...",
    voiceDirectorTitle: "4. Versi Voice Director",
    voiceDirectorPlaceholder: "Hasil naskah dengan sound cues akan muncul di sini...",
    generateTTS: "Generate TTS",
    generatingTTS: "Generating TTS...",
    ttsModel: "Pilih Model TTS",
    ttsVoice: "Pilih Suara",
    ttsCopies: "Jumlah Copy",
    ttsPreset: "Preset Instruksi",
    ttsCustom: "Instruksi Kustom"
  },
  en: {
    configTitle: "Production Configuration",
    textModel: "Text Model Provider",
    narratorName: "Narrator Name (Channel)",
    narratorPlaceholder: "Example: Norman, Ilmu Lidi, etc",
    styleSuffix: "Visual Style Suffix",
    stylePlaceholder: "Enter style suffix prompt here...",
    easterEgg: "Easter Egg Configuration",
    negativePrompt: "Negative Prompt Keywords",
    negativePlaceholder: "Example: blur, distorted, low quality, batik, monas, split line, vertical divider...",
    negativeHint: "Separate with commas. These words will be excluded during image generation.",
    contextNarrative: "1. Narrative Context (Full)",
    contextPlaceholder: "Paste full story for better context...",
    refImages: "2. Reference Images (1-10 Characters)",
    targetParagraph: "3. Visual Target Paragraph",
    targetPlaceholder: "Paste the specific paragraph you want to visualize into a storyboard...",
    analyzeBtn: "Generate Storyboard",
    analyzing: "Analyzing...",
    resultTitle: "Visual Storyboard Result",
    systemReady: "System Ready",
    totalScenes: "Total Scenes",
    saveProject: "Save Project",
    loadProject: "Load Project",
    aiEngine: "AI Engine",
    geminiKey: "Custom Gemini API Key",
    connectKey: "Enter API Key",
    keyConnected: "API Key Saved",
    billingInfo: "Billing Info",
    nvidiaKey: "Nvidia API Key",
    sumopodKey: "SumoPod API Key",
    alertTarget: "Please fill in the Target Paragraph to be visualized.",
    alertNvidia: "Please enter Nvidia API Key.",
    alertSumopod: "Please enter SumoPod API Key.",
    noChar: "No specific characters",
    generateCharBtn: "Generate Characters",
    generatingChar: "Detecting Characters...",
    generateCharImg: "Generate Image",
    newSceneText: "Write new narrative here...",
    confirmDelete: "Are you sure you want to delete this row?",
    uploadBtn: "Upload",
    addCharBtn: "Add Character",
    charName: "Character Name",
    charPrompt: "Visual Prompt",
    charImage: "Character Image",
    maxImages: "Max 10 images",
    filled: "Filled",
    charNamePlaceholder: "Character Name",
    charPromptPlaceholder: "Visual prompt...",
    refinePlaceholder: "Refine instruction...",
    refinePrompt: "Refine Prompt",
    uploadHint: "Upload 1-10 characters. Use 'Global Refs' to upload visual references (max 2) that will be used for all characters.",
    voiceDirectorBtn: "Convert to Voice Director Version",
    voiceDirectorLoading: "Processing Script...",
    voiceDirectorTitle: "4. Versi Voice Director",
    voiceDirectorPlaceholder: "Script with sound cues will appear here...",
    generateTTS: "Generate TTS",
    generatingTTS: "Generating TTS...",
    ttsModel: "Select TTS Model",
    ttsVoice: "Select Voice",
    ttsCopies: "Copies",
    ttsPreset: "Instruction Preset",
    ttsCustom: "Custom Instruction"
  }
};

// Helper to convert base64 to Blob, auto-detecting format
const createAudioBlob = (base64: string, mimeType: string): Blob => {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  // Check for RIFF header (WAV)
  if (bytes.length >= 4 && bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70) {
    return new Blob([bytes], { type: 'audio/wav' });
  }
  
  // Check for ID3 header or MP3 sync word
  if ((bytes.length >= 3 && bytes[0] === 73 && bytes[1] === 68 && bytes[2] === 51) || 
      (bytes.length >= 2 && bytes[0] === 255 && (bytes[1] & 224) === 224)) {
    return new Blob([bytes], { type: 'audio/mp3' });
  }

  // Otherwise, assume it's raw PCM and wrap it in a WAV header
  let sampleRate = 24000;
  if (mimeType && mimeType.includes('rate=')) {
    const match = mimeType.match(/rate=(\d+)/);
    if (match) sampleRate = parseInt(match[1], 10);
  }

  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };
  
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + bytes.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, bytes.length, true);
  
  return new Blob([wavHeader, bytes], { type: 'audio/wav' });
};

const TTS_PRESETS: Record<string, string> = {
  'Ilmu Lidi': "Gunakan persona Teman Cerita yang KASUAL, BERSAHABAT, dan sedikit NYELENEH. Gunakan PITCH SEDANG, tempo NORMAL yang mengalir wajar. Suara harus NATURAL DAN BERCELOTEH, seolah sedang nongkrong sambil ngopi. Beri JEDA MANUSIAWI sebelum fakta penting. Gunakan ayunan intonasi pada akhir kalimat tanya. Sampaikan materi dengan gaya akrab 'eh dengerin deh'.",
  'Ilmu Survival': "Gunakan persona Survivor yang TANGGUH, WASPADA, namun tetap TENANG. Gunakan PITCH SEDANG-RENDAH, tempo SEDIKIT LEBIH LAMBAT dan TEGAS. Suara harus terdengar SERIUS, BERWIBAWA, dan PENGALAMAN. Beri JEDA MANUSIAWI yang cukup panjang sebelum poin krusial untuk menciptakan ketegangan. Gunakan intonasi yang datar namun penuh penekanan pada kata-kata kunci keselamatan. Sampaikan materi dengan gaya 'dengerin, ini masalah hidup dan mati'.",
  'Ilmu Nyantuy': "Gunakan persona Teman Cerita yang KASUAL dan BERSAHABAT. PENTING: Ikuti aturan teknis berikut secara ketat: 1. Gunakan PITCH SEDANG, hindari nada melengking, hindari nada terlalu berat. 2. Gunakan TEMPO HIDUP & AGAK LEBIH CEPAT, sekitar 150 kata per menit, tetapi tetap mengalir wajar. Bicaralah dengan ritme orang yang sedang ngobrol seru — antusias, bukan terburu-buru. Jangan melambat. 3. Suara harus NATURAL DAN BERCELOTEH (Conversational). Tunjukkan pembawaan rileks seolah sedang menjelaskan sesuatu yang menarik sambil menikmati segelas kopi. Jangan kaku membacakan teks lurus bak penyiar berita. 4. Terapkan JEDA MANUSIAWI. Beri jeda sepersekian detik sebelum membeberkan fakta penting, seolah sedang berpikir memilah kata. Gunakan ayunan intonasi pada akhir kalimat tanya untuk memancing rasa penasaran. 5. Sampaikan materi psikologi dengan gaya akrab 'eh dengerin deh'. Biarkan penyampaian terasa sedikit spontan supaya pendengar merasa sedang berinteraksi dengan manusia sungguhan:",
  'Norman': "Gunakan persona yang formal, informatif, dan sedikit kaku seperti penyiar berita. Gunakan pitch yang stabil, tempo yang teratur, dan intonasi yang datar. Hindari gaya berceloteh atau jeda yang terlalu lama. Sampaikan materi secara langsung dan objektif.",
  'Ilmu Mental': "Gunakan persona Psikolog yang TENANG, BERWIBAWA, dan EMPATIK. Gunakan PITCH SEDANG, tidak tinggi tidak rendah. Gunakan TEMPO SEDANG, tidak cepat tidak lambat, mengalir tenang seperti sedang sesi konseling. Suara harus NATURAL dan TEDUH, seolah sedang berbicara satu-satu dengan pendengar di ruang terapi. Beri JEDA MANUSIAWI sebelum mengungkapkan insight psikologis yang penting. Gunakan intonasi yang LEMBUT dan MENENANGKAN pada akhir kalimat. Sampaikan materi dengan gaya reflektif 'pernahkah lo merasa...' atau 'coba lo pikirkan...'. Hindari nada menghakimi. Buat pendengar merasa DIPAHAMI, bukan dikuliahi."
};

const App: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<AppState>({
    contextNarrative: '',
    targetParagraph: '',
    // characterList removed, derived from refImages
    customPrompt: DEFAULT_SYSTEM_PROMPT,
    refImages: [], 
    scenes: [],
    isAnalyzing: false,
    analysisError: undefined,
    narratorName: 'Ilmu Lidi',
    narratorSuffix: '',
    stylePreset: 'Ilmu Lidi',
    styleSuffix: ILMU_LIDI_STYLE,
    easterEggCount: 1,
    easterEggTypes: ['pop culture'],
    negativePrompt: '',
    language: 'id',
    geminiApiKey: '',
    isDetectingCharacters: false,
    globalSourceRefs: [],
    voiceDirectorVersion: '',
    ttsModel: 'gemini-3.1-flash-tts-preview',
    ttsVoice: 'Iapetus',
    ttsCopies: 1,
    ttsPreset: 'Ilmu Lidi',
    ttsCustomInstruction: ''
  });

  const [isTransformingVoice, setIsTransformingVoice] = useState(false);
  const [isGeneratingTTS, setIsGeneratingTTS] = useState(false);
  const [ttsError, setTtsError] = useState("");
  const [generatedAudioUrls, setGeneratedAudioUrls] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'story' | 'voice' | 'storyboard'>('story');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [generateAllProgress, setGenerateAllProgress] = useState("");
  const cancelGenerationRef = useRef(false);

  // Load API key from localStorage on mount
  React.useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        setState(p => ({ ...p, geminiApiKey: savedKey }));
    }
  }, []);

  // Save API key to localStorage when it changes
  React.useEffect(() => {
    if (state.geminiApiKey) {
        localStorage.setItem('gemini_api_key', state.geminiApiKey);
    }
  }, [state.geminiApiKey]);

  const handleConnectKey = async () => {
    await (window as any).aistudio.openSelectKey();
    setState(p => ({ ...p, hasApiKey: true }));
  };

  const t = TRANSLATIONS[state.language];

  const handleContextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, contextNarrative: e.target.value }));
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setState(prev => ({ ...prev, targetParagraph: e.target.value }));
  };

  const handleTransformToVoiceDirector = async () => {
    if (!state.targetParagraph.trim()) return;

    setIsTransformingVoice(true);
    try {
        const result = await transformToVoiceDirector(
            state.targetParagraph,
            state.language,
            state.geminiApiKey
        );
        setState(prev => ({ ...prev, voiceDirectorVersion: result }));
    } catch (error: any) {
        alert("Error: " + error.message);
    } finally {
        setIsTransformingVoice(false);
    }
  };

  const handleGenerateTTS = async () => {
    if (!state.voiceDirectorVersion.trim()) return;

    setIsGeneratingTTS(true);
    setTtsError("");
    setGeneratedAudioUrls([]);
    
    try {
        const instruction = state.ttsPreset === 'Custom' ? state.ttsCustomInstruction : TTS_PRESETS[state.ttsPreset];
        const urls: string[] = [];

        // Generate copies
        for (let i = 0; i < state.ttsCopies; i++) {
            const result = await generateTTS(
                state.voiceDirectorVersion,
                state.ttsModel,
                state.ttsVoice,
                instruction,
                state.geminiApiKey
            );
            
            const blob = createAudioBlob(result.data, result.mimeType);
            urls.push(URL.createObjectURL(blob));
        }
        
        setGeneratedAudioUrls(urls);
    } catch (error: any) {
        setTtsError("TTS Error: " + error.message);
    } finally {
        setIsGeneratingTTS(false);
    }
  };

  const handleRefImagesChange = (images: ReferenceImage[]) => {
    setState(prev => ({ ...prev, refImages: images }));
  };

  const handleDeleteImage = (id: string) => {
    setState(prev => ({
      ...prev,
      refImages: prev.refImages.filter(img => img.id !== id)
    }));
  };

  const handleGenerateCharacters = async () => {
    console.log("handleGenerateCharacters clicked");
    if (!state.contextNarrative.trim()) {
        console.log("Context narrative is empty");
        alert("Mohon isi Konteks Narasi terlebih dahulu.");
        return;
    }


    console.log("Starting character detection...");
    setState(prev => ({ ...prev, isDetectingCharacters: true }));

    try {
        console.log("Detecting characters from narrative...");
        const detected = await detectCharactersFromNarrative(
            state.contextNarrative,
            state.narratorName || 'Norman',
            state.styleSuffix,
            state.language,
            state.geminiApiKey
        );
        console.log("Detected characters:", detected);

        if (detected.length === 0) {
            alert("Tidak ada karakter baru yang terdeteksi dalam narasi.");
        }

        const newRefImages: ReferenceImage[] = detected.map((char, idx) => ({
            id: `gen-char-${Date.now()}-${idx}`,
            name: char.name,
            visualPrompt: char.visualPrompt,
            data: '', // No image yet
            isGenerating: false
        }));

        setState(prev => {
            const combined = [...prev.refImages];
            console.log("Current refImages count:", combined.length);
            // Add only if not already exists by name
            newRefImages.forEach(newImg => {
                if (!combined.some(existing => existing.name.toLowerCase() === newImg.name.toLowerCase())) {
                    if (combined.length < 10) {
                        console.log("Adding new character:", newImg.name);
                        combined.push(newImg);
                    } else {
                        console.log("Max characters reached, skipping:", newImg.name);
                    }
                } else {
                    console.log("Character already exists, skipping:", newImg.name);
                }
            });
            return { ...prev, refImages: combined, isDetectingCharacters: false };
        });
    } catch (error: any) {
        console.error("Error in handleGenerateCharacters:", error);
        alert("Gagal mendeteksi karakter: " + error.message);
        setState(prev => ({ ...prev, isDetectingCharacters: false }));
    }
  };

  const handleAddCharacter = () => {
    if (state.refImages.length >= 10) {
        alert("Batas maksimum 10 karakter tercapai.");
        return;
    }
    const newChar: ReferenceImage = {
        id: `manual-char-${Date.now()}`,
        name: '',
        visualPrompt: '',
        data: '',
        isGenerating: false
    };
    setState(prev => ({ ...prev, refImages: [...prev.refImages, newChar] }));
  };

  const handleGenerateCharacterPrompt = async (id: string) => {
    const char = state.refImages.find(img => img.id === id);
    if (!char || !char.name.trim()) return;

    setState(prev => ({
        ...prev,
        refImages: prev.refImages.map(img => img.id === id ? { ...img, isGenerating: true } : img)
    }));

    try {
        const prompt = await generateCharacterPrompt(
            char.name,
            state.contextNarrative,
            state.narratorName,
            state.styleSuffix,
            state.language,
            state.geminiApiKey
        );

        setState(prev => ({
            ...prev,
            refImages: prev.refImages.map(img => img.id === id ? { ...img, isGenerating: false, visualPrompt: prompt } : img)
        }));
    } catch (error: any) {
        alert("Gagal generate prompt karakter: " + error.message);
        setState(prev => ({
            ...prev,
            refImages: prev.refImages.map(img => img.id === id ? { ...img, isGenerating: false } : img)
        }));
    }
  };

  const handleGenerateCharacterImage = async (id: string) => {
    const char = state.refImages.find(img => img.id === id);
    if (!char || !char.visualPrompt) return;

    setState(prev => ({
        ...prev,
        refImages: prev.refImages.map(img => img.id === id ? { ...img, isGenerating: true } : img)
    }));

    try {
        // Create a character-specific style suffix with white background
        const charStyleSuffix = state.styleSuffix.replace(/pastel color background/gi, "pure white background");

        // Map globalSourceRefs to ReferenceImage format for generateSceneImage
        const sourceRefsAsImages: ReferenceImage[] = state.globalSourceRefs.map((data, idx) => ({
            id: `source-ref-${idx}`,
            name: `Reference ${idx + 1}`,
            data: data
        }));

        const imageUrl = await generateSceneImage(
            char.visualPrompt,
            sourceRefsAsImages,
            undefined,
            state.narratorName,
            charStyleSuffix,
            state.negativePrompt,
            state.geminiApiKey
        );

        setState(prev => ({
            ...prev,
            refImages: prev.refImages.map(img => img.id === id ? { ...img, isGenerating: false, data: imageUrl } : img)
        }));
    } catch (error: any) {
        alert("Gagal generate gambar karakter: " + error.message);
        setState(prev => ({
            ...prev,
            refImages: prev.refImages.map(img => img.id === id ? { ...img, isGenerating: false } : img)
        }));
    }
  };

  const handleCharacterPromptChange = (id: string, newPrompt: string) => {
    setState(prev => ({
        ...prev,
        refImages: prev.refImages.map(img => img.id === id ? { ...img, visualPrompt: newPrompt } : img)
    }));
  };

  const handleGlobalSourceRefsChange = (refs: string[]) => {
    setState(prev => ({
        ...prev,
        globalSourceRefs: refs
    }));
  };

  const handleRefineCharacterPrompt = async (id: string, instruction: string) => {
    const char = state.refImages.find(img => img.id === id);
    if (!char || !char.visualPrompt || !instruction.trim()) return;

    setState(prev => ({
        ...prev,
        refImages: prev.refImages.map(img => img.id === id ? { ...img, isGenerating: true } : img)
    }));

    try {
        const refined = await refineScenePrompt(
            state.contextNarrative,
            state.refImages.map(r => r.name).join(", "),
            char.name,
            char.visualPrompt,
            instruction,
            state.customPrompt,
            state.narratorName,
            state.narratorSuffix,
            state.styleSuffix,
            state.easterEggCount,
            state.easterEggTypes,
            state.negativePrompt,
            state.language,
            state.geminiApiKey,
            true // isCharacter
        );

        setState(prev => ({
            ...prev,
            refImages: prev.refImages.map(img => img.id === id ? { ...img, isGenerating: false, visualPrompt: refined } : img)
        }));
    } catch (error: any) {
        alert("Gagal refine prompt: " + error.message);
        setState(prev => ({
            ...prev,
            refImages: prev.refImages.map(img => img.id === id ? { ...img, isGenerating: false } : img)
        }));
    }
  };

  const getCharacterListString = () => {
      return state.refImages.map(img => img.name).join(', ') || t.noChar;
  };

  const handleAnalyzeStory = async () => {
    if (!state.targetParagraph.trim()) {
        alert(t.alertTarget);
        return;
    }

    setState(prev => ({ ...prev, isAnalyzing: true, analysisError: undefined, scenes: [] }));

    try {
      const derivedCharList = getCharacterListString();

      const scenes = await analyzeNarrativeToScenes(
        state.contextNarrative,
        state.targetParagraph,
        derivedCharList,
        state.customPrompt,
        state.narratorName,
        state.narratorSuffix,
        state.styleSuffix,
        state.easterEggCount,
        state.easterEggTypes,
        state.negativePrompt,
        state.language,
        state.geminiApiKey
      );

      const resplitScenes = postProcessScenes(scenes);

      setState(prev => ({ ...prev, scenes: resplitScenes, isAnalyzing: false }));
    } catch (error: any) {
      setState(prev => ({ 
        ...prev, 
        isAnalyzing: false, 
        analysisError: error.message || "Failed to analyze story" 
      }));
    }
  };

  const handleSaveNarrative = useCallback((sceneId: string, newText: string) => {
    setState(prev => ({
        ...prev,
        scenes: prev.scenes.map(scene => {
            if (scene.id !== sceneId) return scene;

            const newSplitTexts = splitTextByWordCount(newText);

            // Single-frame scene: all chunks go into the single frame
            if (scene.frames.length === 1) {
                return { 
                    ...scene, 
                    narrativeText: newText, 
                    frames: scene.frames.map((frame) => ({ ...frame, splitText: newSplitTexts }))
                };
            }

            // Multi-frame scene: each frame gets its own chunk
            return { 
                ...scene, 
                narrativeText: newText, 
                frames: scene.frames.map((frame, idx) => ({ 
                    ...frame, 
                    splitText: [newSplitTexts[idx] || ""] 
                }))
            };
        })
    }));
  }, []);

  const handleAddScene = useCallback((indexToInsertAfter?: number) => {
    const newScene: StoryScene = {
        id: `scene-${Date.now()}`,
        narrativeText: t.newSceneText,
        frames: [{
            id: `frame-${Date.now()}`,
            format: "Single Panel",
            sceneType: 'host-direct' as SceneType,
            sceneMode: 'intro' as SceneMode,
            visualPrompt: "", 
            splitText: splitTextByWordCount(t.newSceneText),
            isGenerating: false
        }],
        isRestructuring: false
    };

    setState(prev => {
        const newScenes = [...prev.scenes];
        if (typeof indexToInsertAfter === 'number') {
            newScenes.splice(indexToInsertAfter + 1, 0, newScene);
        } else {
            newScenes.push(newScene);
        }
        return { ...prev, scenes: newScenes };
    });
  }, []);

  const handleDeleteScene = useCallback((sceneId: string) => {
    if (window.confirm(t.confirmDelete)) {
        setState(prev => ({
            ...prev,
            scenes: prev.scenes.filter(s => s.id !== sceneId)
        }));
    }
  }, [t.confirmDelete]);

  const handleFormatChange = useCallback(async (sceneId: string, format: "Single Panel" | "Multi Panel" | "Sequence", count: number) => {
    setState(prev => ({
        ...prev,
        scenes: prev.scenes.map(scene => {
            if (scene.id !== sceneId) return scene;

            const targetPartsCount = format === 'Single Panel' ? 1 : count;
            const textParts = splitTextByWordCount(scene.narrativeText);

            if (format === 'Sequence') {
                const targetCount = count;
                let existingFrames = [...scene.frames];
                const resultFrames = [];

                for (let i = 0; i < targetCount; i++) {
                    const formatLabel = `Sequence ${i + 1}/${targetCount}`;
                    const splitTextForFrame = [textParts[i] || ""];
                    const initialPrompt = i === 0 ? "" : "Referensi dari Gambar sebelumnya, tapi... ";

                    if (i < existingFrames.length) {
                        resultFrames.push({
                            ...existingFrames[i],
                            format: formatLabel,
                            splitText: splitTextForFrame
                        });
                    } else {
                        resultFrames.push({
                            id: `frame-${Date.now()}-${i}`,
                            format: formatLabel,
                            visualPrompt: initialPrompt,
                            splitText: splitTextForFrame,
                            isGenerating: false
                        });
                    }
                }
                return { ...scene, frames: resultFrames };

            } else {
                const formatLabel = format === 'Single Panel' ? 'Single Panel' : `Multi Panel (${count})`;
                const existingFrame = scene.frames[0];
                
                const newFrame = {
                    ...existingFrame,
                    format: formatLabel,
                    splitText: textParts
                };
                
                return { ...scene, frames: [newFrame] };
            }
        })
    }));
  }, []);

  const handleGeneratePrompts = useCallback(async (sceneId: string) => {
      const scene = state.scenes.find(s => s.id === sceneId);
      if (!scene) return;


      setState(prev => ({
          ...prev,
          scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isGeneratingPrompts: true } : s)
      }));

      try {
          const derivedCharList = getCharacterListString();
          
          const prompts = await generatePromptsFromFrames(
              state.contextNarrative,
              derivedCharList,
              scene.narrativeText,
              scene.frames,
              state.customPrompt,
              state.narratorName,
              state.narratorSuffix,
              state.styleSuffix,
              state.easterEggCount,
              state.easterEggTypes,
              state.negativePrompt,
              state.language,
              state.geminiApiKey
          );

          setState(prev => ({
              ...prev,
              scenes: prev.scenes.map(s => s.id === sceneId ? { 
                  ...s, 
                  isGeneratingPrompts: false,
                  frames: s.frames.map((f, i) => ({
                      ...f,
                      visualPrompt: prompts[i] || f.visualPrompt // Fallback
                  }))
              } : s)
          }));

      } catch (error: any) {
          setState(prev => ({
              ...prev,
              scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isGeneratingPrompts: false } : s)
          }));
          alert("Gagal membuat prompt: " + error.message);
      }
  }, [state.scenes, state.contextNarrative, state.refImages, state.customPrompt, state.narratorName, state.styleSuffix, state.easterEggCount, state.easterEggTypes, state.negativePrompt, state.language, state.hasApiKey]);

  const handleUpdatePrompt = useCallback((sceneId: string, frameId: string, newPrompt: string) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        return {
          ...scene,
          frames: scene.frames.map(frame => 
            frame.id === frameId ? { ...frame, visualPrompt: newPrompt } : frame
          )
        };
      })
    }));
  }, []);

  const handleUpdateSplitText = useCallback((sceneId: string, frameId: string, newSplitText: string[]) => {
    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        return {
          ...scene,
          frames: scene.frames.map(frame => 
            frame.id === frameId ? { ...frame, splitText: newSplitText } : frame
          )
        };
      })
    }));
  }, []);

  const handleUpdateSceneType = useCallback((sceneId: string, frameId: string, newSceneType: SceneType) => {
    const modes = SCENE_TYPE_MODES[newSceneType];
    const defaultMode = modes && modes.length > 0 ? modes[0] : 'intro' as SceneMode;
    
    // Map scene type to a short composition hint for the visual prompt
    const compositionHints: Record<string, string> = {
      'host-direct': 'Mascot face kamera, eye contact, gestur alami. Teks overlay floating.',
      'icon-explainer': 'Mascot berdiri di samping IKON dengan LABEL TEKS. Ikon sebagai elemen utama.',
      'split-contrast': 'DUA SISI dalam satu frame — kiri vs kanan. Garis pemisah di tengah. Kontras gelap/terang.',
      'scene-interaction': 'DUA KARAKTER berinteraksi. Over-the-shoulder shot. Body language relasi.',
      'concept-visual': 'DIAGRAM/KONSEP ABSTRAK sebagai elemen utama 60-70% frame. Mascot mengamati.',
      'typography-hero': 'SATU KATA/FRASA BESAR sebagai hero 50-60% frame. Mascot di pojok bereaksi.',
      'stock-footage': 'Background FOTO REALISTIS penuh frame. Mascot overlay kecil di pojok.',
      'multi-panel': 'Frame terbagi jadi 2-4 PANEL komik, masing-masing dengan adegan sendiri.',
      'whiteboard-list': 'PAPAN TULIS besar 60-70% frame dengan bullet points. Mascot di samping.',
      'quote-card': 'KARTU KUTIPAN di tengah frame. Mascot di pojok kontemplatif.',
      'data-visual': 'ANGKA BESAR + GRAFIK di tengah 60% frame. Mascot menunjuk/bereaksi.',
      'metaphor-scene': 'METAFORA PENUH — mascot ADA DI DALAM metafora, bukan mengamati dari luar.',
      'process-flow': 'Diagram ALUR bertahap dengan PANAH. Mascot menunjuk satu tahap. Label di setiap tahap.',
      'pov-scene': 'Perspektif FIRST PERSON — kamera = mata karakter. Tangan di tepi frame.',
      'cinematic-insert': 'Adegan FILM realistik — TANPA MASCOT. Pencahayaan sinematik sesuai mood.',
      'timeline-progress': 'Garis WAKTU horizontal dengan milestone. Masa lalu pudar, masa depan cerah.',
      'cross-section': 'IRISAN objek 70% frame — lihat ke DALAM. Label callout. Mascot di samping.',
      'scale-compare': 'Perbandingan UKURAN — objek raksasa vs kecil. Mascot sebagai skala referensi.',
      'drawing-live': 'TANGAN menggambar di papan — visible di tepi frame. Gambar sketsa parselesai.',
      'transformation': 'DUA STATE — BEFORE (pudar/grayscale) vs AFTER (vibrant/glowing). Zona transisi.',
    };
    const hint = compositionHints[newSceneType] || '';
    const marker = `\n[SCENE: ${newSceneType.toUpperCase().replace(/-/g, ' ')} — ${hint}]`;

    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(scene => {
        if (scene.id !== sceneId) return scene;
        return {
          ...scene,
          frames: scene.frames.map(frame => {
            if (frame.id !== frameId) return frame;
            // Update visualPrompt: replace old scene type marker or append new one
            const oldMarkerMatch = frame.visualPrompt.match(/\n\[SCENE:.*?\]/);
            const updatedPrompt = oldMarkerMatch
              ? frame.visualPrompt.replace(/\n\[SCENE:.*?\]/, marker)
              : frame.visualPrompt + marker;
            return { ...frame, sceneType: newSceneType, sceneMode: defaultMode, visualPrompt: updatedPrompt };
          })
        };
      })
    }));
  }, []);


  const handleRefinePrompt = useCallback(async (sceneId: string, frameId: string, instruction: string) => {
    if (!instruction.trim()) return;


    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === sceneId ? {
        ...s,
        frames: s.frames.map(f => f.id === frameId ? { ...f, isRefining: true } : f)
      } : s)
    }));

    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    const frame = scene.frames.find(f => f.id === frameId);
    if (!frame) return;

    try {
        const derivedCharList = getCharacterListString();

        const newPrompt = await refineScenePrompt(
            state.contextNarrative,
            derivedCharList,
            scene.narrativeText,
            frame.visualPrompt,
            instruction,
            state.customPrompt,
            state.narratorName,
            state.narratorSuffix,
            state.styleSuffix,
            state.easterEggCount,
            state.easterEggTypes,
            state.negativePrompt,
            state.language,
            state.geminiApiKey,
            false // isCharacter
        );

        setState(prev => ({
            ...prev,
            scenes: prev.scenes.map(s => s.id === sceneId ? {
                ...s,
                frames: s.frames.map(f => f.id === frameId ? { ...f, isRefining: false, visualPrompt: newPrompt } : f)
            } : s)
        }));

    } catch (error: any) {
        setState(prev => ({
            ...prev,
            scenes: prev.scenes.map(s => s.id === sceneId ? {
                ...s,
                frames: s.frames.map(f => f.id === frameId ? { ...f, isRefining: false } : f)
            } : s)
        }));
        alert("Gagal merevisi prompt: " + error.message);
    }
  }, [state.scenes, state.contextNarrative, state.refImages, state.customPrompt, state.narratorName, state.styleSuffix, state.easterEggCount, state.easterEggTypes, state.negativePrompt, state.language, state.hasApiKey]);

  const handleGenerateImage = useCallback(async (sceneId: string, frameId: string, overridePreviousImage?: string) => {
    const scene = state.scenes.find(s => s.id === sceneId);
    if (!scene) return;
    
    const frameIndex = scene.frames.findIndex(f => f.id === frameId);
    if (frameIndex === -1) return;
    const frame = scene.frames[frameIndex];

    let previousImage: string | undefined = undefined;
    
    if (overridePreviousImage) {
        previousImage = overridePreviousImage;
    } else if (frameIndex > 0) {
        const prevFrame = scene.frames[frameIndex - 1];
        if (prevFrame.imageUrl) {
            previousImage = prevFrame.imageUrl;
        }
    }

    const currentPromptLower = frame.visualPrompt.toLowerCase();
    
    let relevantRefs = state.refImages.filter(img => 
        img.data && currentPromptLower.includes(img.name.toLowerCase())
    );

    if (previousImage && frameIndex > 0) {
        const prevFrame = scene.frames[frameIndex - 1];
        const prevPromptLower = prevFrame.visualPrompt.toLowerCase();
        
        relevantRefs = state.refImages.filter(img => {
            const inCurrent = img.data && currentPromptLower.includes(img.name.toLowerCase());
            const inPrevious = prevPromptLower.includes(img.name.toLowerCase());
            return inCurrent && !inPrevious;
        });
    }

    // V2.17 Update: Force Narrator ref if no character is detected
    if (relevantRefs.length === 0) {
        const narratorRef = state.refImages.find(img => img.data && img.name.toLowerCase().trim() === state.narratorName.toLowerCase().trim());
        if (narratorRef) {
            relevantRefs = [narratorRef];
        }
    }

    setState(prev => ({
      ...prev,
      scenes: prev.scenes.map(s => s.id === sceneId ? {
        ...s,
        frames: s.frames.map(f => f.id === frameId ? { ...f, isGenerating: true, error: undefined } : f)
      } : s)
    }));

    try {
      const imageUrl = await generateSceneImage(
          frame.visualPrompt, 
          relevantRefs, 
          previousImage,
          state.narratorName,
          state.styleSuffix,
          state.negativePrompt,
          state.geminiApiKey,
          frame.sceneType
      );
      
      setState(prev => ({
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? {
            ...s,
            frames: s.frames.map(f => f.id === frameId ? { ...f, isGenerating: false, imageUrl } : f)
        } : s)
      }));
      
      return imageUrl; 
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? {
            ...s,
            frames: s.frames.map(f => f.id === frameId ? { ...f, isGenerating: false, error: "GenAI Error: " + error.message } : f)
        } : s)
      }));
      throw error;
    }
  }, [state.scenes, state.refImages]);

  const handleGenerateSequence = useCallback(async (sceneId: string) => {
      const scene = state.scenes.find(s => s.id === sceneId);
      if (!scene) return;
      if (scene.frames.length < 2) return;

      setState(prev => ({
          ...prev,
          scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isGeneratingSequence: true } : s)
      }));

      let lastGeneratedImage: string | undefined = undefined;

      for (let i = 0; i < scene.frames.length; i++) {
          const frame = scene.frames[i];
          try {
              const imageUrl = await handleGenerateImage(sceneId, frame.id, lastGeneratedImage);
              if (imageUrl) {
                  lastGeneratedImage = imageUrl;
              }
              
          } catch (e) {
              console.error(`Sequence generation failed at frame ${i}`, e);
              break; 
          }
      }

      setState(prev => ({
        ...prev,
        scenes: prev.scenes.map(s => s.id === sceneId ? { ...s, isGeneratingSequence: false } : s)
      }));

  }, [state.scenes, handleGenerateImage]);

  const handleGenerateAllImages = useCallback(async () => {
      cancelGenerationRef.current = false;
      setIsGeneratingAll(true);
      setGenerateAllProgress("Starting...");

      const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

      try {
          const pendingPromises: Promise<void>[] = [];
          let lastRequestTime = 0;

          for (let sIdx = 0; sIdx < state.scenes.length; sIdx++) {
              const scene = state.scenes[sIdx];
              let lastGeneratedImage: string | undefined = undefined;

              for (let fIdx = 0; fIdx < scene.frames.length; fIdx++) {
                  if (cancelGenerationRef.current) {
                      setGenerateAllProgress("Cancelled.");
                      setIsGeneratingAll(false);
                      return;
                  }

                  const frame = scene.frames[fIdx];
                  
                  if (frame.imageUrl) {
                      if (scene.type === 'sequence') {
                          lastGeneratedImage = frame.imageUrl;
                      }
                      continue; 
                  }

                  // Enforce 6 seconds between TRIGGERS to respect 10 RPM limit
                  const now = Date.now();
                  const timeSinceLastRequest = now - lastRequestTime;
                  if (lastRequestTime > 0 && timeSinceLastRequest < 6000) {
                      const waitTime = 6000 - timeSinceLastRequest;
                      setGenerateAllProgress(`Waiting ${Math.ceil(waitTime/1000)}s...`);
                      await delay(waitTime);
                  }
                  
                  if (cancelGenerationRef.current) {
                      setGenerateAllProgress("Cancelled.");
                      setIsGeneratingAll(false);
                      return;
                  }

                  setGenerateAllProgress(`Triggering Scene ${sIdx + 1}, Frame ${fIdx + 1}...`);
                  lastRequestTime = Date.now();

                  if (scene.type === 'sequence') {
                      // Sequential MUST await because next frame depends on this image
                      try {
                          const imageUrl = await handleGenerateImage(scene.id, frame.id, lastGeneratedImage);
                          if (imageUrl) {
                              lastGeneratedImage = imageUrl;
                          }
                      } catch (e) {
                          console.error(`Failed to generate image for Scene ${sIdx + 1}, Frame ${fIdx + 1}`, e);
                      }
                  } else {
                      // Non-sequential can run in parallel background
                      const p = handleGenerateImage(scene.id, frame.id).catch(e => {
                          console.error(`Failed to generate image for Scene ${sIdx + 1}, Frame ${fIdx + 1}`, e);
                      });
                      pendingPromises.push(p);
                  }
              }
          }
          
          if (pendingPromises.length > 0 && !cancelGenerationRef.current) {
              setGenerateAllProgress("Waiting for remaining images to complete...");
              await Promise.all(pendingPromises);
          }

          if (!cancelGenerationRef.current) {
              setGenerateAllProgress("Completed!");
          }
      } finally {
          setIsGeneratingAll(false);
      }
  }, [state.scenes, handleGenerateImage]);

  const handleCancelGenerateAll = useCallback(() => {
      cancelGenerationRef.current = true;
      setGenerateAllProgress("Cancelling...");
  }, []);

  const handleSaveProject = useCallback(() => {
    const projectData = {
        version: "2.18",
        timestamp: Date.now(),
        state: {
            contextNarrative: state.contextNarrative,
            targetParagraph: state.targetParagraph,
            customPrompt: state.customPrompt,
            refImages: state.refImages,
            scenes: state.scenes,
            narratorName: state.narratorName,
            narratorSuffix: state.narratorSuffix,
            stylePreset: state.stylePreset,
            styleSuffix: state.styleSuffix,
            easterEggCount: state.easterEggCount,
            easterEggTypes: state.easterEggTypes,
            negativePrompt: state.negativePrompt,
            language: state.language
        }
    };

    const blob = new Blob([JSON.stringify(projectData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `storyboard-norman-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [state]);

  const handleLoadProject = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const result = event.target?.result as string;
            const parsed = JSON.parse(result);
            
            // Basic validation
            if (!parsed.state || !Array.isArray(parsed.state.scenes)) {
                throw new Error("Invalid project file format");
            }

            // Re-split each scene's splitText using local word-count-based logic (10-20 words)
            const loadedScenes: StoryScene[] = parsed.state.scenes || [];
            const resplitScenes = postProcessScenes(loadedScenes);

            // Restore state
            setState(prev => ({
                ...prev,
                contextNarrative: parsed.state.contextNarrative || "",
                targetParagraph: parsed.state.targetParagraph || "",
                customPrompt: parsed.state.customPrompt || DEFAULT_SYSTEM_PROMPT,
                refImages: parsed.state.refImages || [],
                scenes: resplitScenes,
                isAnalyzing: false,
                analysisError: undefined,
                narratorName: parsed.state.narratorName || 'Norman',
                narratorSuffix: parsed.state.narratorSuffix || '',
                stylePreset: parsed.state.stylePreset || 'Ilmu Lidi',
                styleSuffix: parsed.state.styleSuffix || ILMU_LIDI_STYLE,
                easterEggCount: parsed.state.easterEggCount !== undefined ? parsed.state.easterEggCount : 1,
                easterEggTypes: parsed.state.easterEggTypes || ['pop culture'],
                negativePrompt: parsed.state.negativePrompt || '',
                language: parsed.state.language || 'id'
            }));
            
            alert("Project loaded successfully!");
        } catch (error: any) {
            alert("Failed to load project: " + error.message);
        }
        
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };
    reader.readAsText(file);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 selection:bg-blue-500/30 font-sans">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Layout className="w-6 h-6 text-white" />
             </div>
             <div>
                <h1 className="text-xl font-bold tracking-tight text-white">Visual Storyboard</h1>
                <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Multi Channel Edition</p>
             </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
             <button
                onClick={handleSaveProject}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all flex items-center gap-2 shadow-sm active:scale-95"
             >
                <Save className="h-4 w-4 text-blue-400" />
                {t.saveProject}
             </button>
             <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-all flex items-center gap-2 shadow-sm active:scale-95"
             >
                <Upload className="h-4 w-4 text-purple-400" />
                {t.loadProject}
             </button>
             <input 
                ref={fileInputRef} 
                type="file" 
                accept=".json" 
                className="hidden" 
                onChange={handleLoadProject}
             />
             <div className="h-8 w-px bg-slate-800 mx-2"></div>
             <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
                <Zap className={`w-3.5 h-3.5 ${state.geminiApiKey ? 'text-blue-400' : 'text-slate-500'}`} />
                <input 
                    type="password"
                    value={state.geminiApiKey}
                    onChange={(e) => setState(p => ({ ...p, geminiApiKey: e.target.value }))}
                    placeholder="Gemini API Key..."
                    className="bg-transparent text-xs text-slate-200 outline-none w-24 focus:w-48 transition-all placeholder-slate-500"
                />
                {state.geminiApiKey ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
             </div>
             <div className="h-8 w-px bg-slate-800 mx-2"></div>
             <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Master Preset</span>
                 <select 
                    value={state.stylePreset}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'Ilmu Lidi') {
                            setState(p => ({
                                ...p,
                                narratorName: 'Ilmu Lidi',
                                stylePreset: 'Ilmu Lidi',
                                styleSuffix: ILMU_LIDI_STYLE,
                                easterEggCount: 2,
                                easterEggTypes: ['pop culture', 'khas indonesia'],
                                ttsModel: 'gemini-3.1-flash-tts-preview',
                                ttsVoice: 'Iapetus',
                                ttsPreset: 'Ilmu Lidi'
                            }));
                        } else if (val === 'Ilmu Survival') {
                            setState(p => ({
                                ...p,
                                narratorName: 'Ilmu Survival',
                                stylePreset: 'ILMU SURVIVAL',
                                styleSuffix: ILMU_SURVIVAL_STYLE,
                                easterEggCount: 2,
                                easterEggTypes: ['pop culture', 'khas indonesia'],
                                ttsModel: 'gemini-3.1-flash-tts-preview',
                                ttsVoice: 'Iapetus',
                                ttsPreset: 'Ilmu Survival'
                            }));
                        } else if (val === 'Ilmu Nyantuy') {
                            setState(p => ({
                                ...p,
                                narratorName: 'Ilmu Nyantuy',
                                stylePreset: 'ILMU NYANTUY',
                                styleSuffix: ILMU_NYANTUY_STYLE,
                                easterEggCount: 2,
                                easterEggTypes: ['pop culture', 'khas indonesia'],
                                ttsModel: 'gemini-3.1-flash-tts-preview',
                                ttsVoice: 'Iapetus',
                                ttsPreset: 'Ilmu Nyantuy'
                            }));
                        } else if (val === 'Ilmu Mental') {
                            setState(p => ({
                                ...p,
                                narratorName: 'Ilmu Mental',
                                stylePreset: 'Ilmu Mental',
                                styleSuffix: ILMU_MENTAL_STYLE,
                                easterEggCount: 0,
                                easterEggTypes: [],
                                ttsModel: 'gemini-2.5-pro-preview-tts',
                                ttsVoice: 'puck',  // Male voice — bisa diganti via dropdown Pilih Suara
                                ttsPreset: 'Ilmu Mental'
                            }));
                        } else {
                            setState(p => ({ ...p, stylePreset: 'Custom' }));
                        }
                    }}
                    className="bg-slate-800 text-xs text-slate-200 font-bold outline-none cursor-pointer px-2 py-1 rounded border border-slate-700 hover:bg-slate-700 transition-colors"
                >
                    <option value="Custom" className="bg-slate-900">Custom</option>
                    <option value="Ilmu Lidi" className="bg-slate-900">Ilmu Lidi</option>
                    <option value="Ilmu Mental" className="bg-slate-900">Ilmu Mental</option>
                    <option value="Ilmu Survival" className="bg-slate-900">Ilmu Survival</option>
                    <option value="Ilmu Nyantuy" className="bg-slate-900">Ilmu Nyantuy</option>
                </select>
             </div>
             <div className="h-8 w-px bg-slate-800 mx-2"></div>
             <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-700">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lang</span>
                <select 
                    value={state.language}
                    onChange={(e) => setState(p => ({...p, language: e.target.value as 'id' | 'en'}))}
                    className="bg-slate-800 text-xs text-slate-200 font-bold outline-none cursor-pointer px-2 py-1 rounded border border-slate-700 hover:bg-slate-700 transition-colors"
                >
                    <option value="id" className="bg-slate-900">ID</option>
                    <option value="en" className="bg-slate-900">EN</option>
                </select>
             </div>
             <div className="h-8 w-px bg-slate-800 mx-2"></div>
             <div className="hidden md:flex flex-col items-end">
               <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter">Version 2.20</span>
               <span className="text-xs text-slate-300 font-medium">Last Updated: Apr 5, 2026 20:47</span>
             </div>
          </motion.div>
        </div>
      {/* Sticky Status Bar */}
      <div className={`w-full py-2 px-6 flex items-center justify-center font-bold text-xs uppercase tracking-widest shadow-lg ${state.stylePreset === 'Custom' ? 'bg-purple-600 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
          <span className="flex items-center gap-2">
            {state.stylePreset === 'Custom' ? '⚠️ CUSTOM STYLE ACTIVE - MANUAL EDIT' : `ACTIVE PRESET: ${state.stylePreset}`}
          </span>
      </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 flex flex-col">
        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 mb-8">
          <TabButton 
            active={activeTab === 'story'} 
            onClick={() => setActiveTab('story')} 
            icon={<ImageIcon className="w-4 h-4" />} 
            label="Konteks & Karakter" 
          />
          <TabButton 
            active={activeTab === 'voice'} 
            onClick={() => setActiveTab('voice')} 
            icon={<Volume2 className="w-4 h-4" />} 
            label="Voice & Audio" 
          />
          <TabButton 
            active={activeTab === 'storyboard'} 
            onClick={() => setActiveTab('storyboard')} 
            icon={<Layout className="w-4 h-4" />} 
            label="Storyboard" 
          />
        </div>

        <AnimatePresence mode="wait">
          {activeTab === 'story' && (
            <motion.div 
              key="story"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 md:grid-cols-12 gap-6"
            >


              {/* Card 4: Story Context */}
              <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                      <Layout className="w-4 h-4 text-indigo-500" /> {t.contextNarrative}
                  </h3>
                  <textarea
                      className="w-full flex-1 min-h-[200px] bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none placeholder-slate-600 text-slate-200 leading-relaxed custom-scrollbar"
                      placeholder={t.contextPlaceholder}
                      value={state.contextNarrative}
                      onChange={handleContextChange}
                  />
                  <button
                      onClick={handleGenerateCharacters}
                      disabled={state.isDetectingCharacters}
                      className="w-full py-3 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                      <Sparkles className={`w-4 h-4 ${state.isDetectingCharacters ? 'animate-spin' : ''}`} />
                      {state.isDetectingCharacters ? t.generatingChar : t.generateCharBtn}
                  </button>
              </div>

              {/* Card 5: Character References */}
              <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                      <ImageIcon className="w-4 h-4 text-emerald-500" /> {t.refImages}
                  </h3>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl p-1 flex-1 overflow-hidden">
                       <FileUpload 
                          label="" 
                          currentImages={state.refImages} 
                          onFilesChange={handleRefImagesChange}
                          onGenerateImage={handleGenerateCharacterImage}
                          onPromptChange={handleCharacterPromptChange}
                          onGeneratePrompt={handleGenerateCharacterPrompt}
                          globalSourceRefs={state.globalSourceRefs}
                          onGlobalSourceRefsChange={handleGlobalSourceRefsChange}
                          t={t}
                       />
                  </div>
              </div>

              {/* Advanced Settings Toggle */}
              <div className="md:col-span-12">
                  <button 
                      onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                      className="w-full flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700 hover:bg-slate-800 transition-all"
                  >
                      <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                          <Settings className="w-4 h-4" /> Advanced Settings
                      </span>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                  </button>
              </div>

              <AnimatePresence>
                  {isAdvancedOpen && (
                      <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="md:col-span-12 grid grid-cols-1 md:grid-cols-12 gap-6"
                      >
                          {/* Card 2: Visual Style & Prompt */}
                          <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
                                  <ImageIcon className="w-4 h-4 text-purple-500" /> Visual Style & Prompts
                              </h3>
                              <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                                      Active Preset: <span className={state.stylePreset === 'Custom' ? 'text-purple-400' : 'text-blue-400'}>{state.stylePreset}</span>
                                  </span>
                                  {state.stylePreset !== 'Custom' && (
                                      <span className="text-[10px] text-slate-500 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">LOCKED</span>
                                  )}
                              </div>
                              <textarea 
                                  value={state.styleSuffix}
                                  onChange={(e) => setState(p => ({...p, styleSuffix: e.target.value, stylePreset: 'Custom'}))}
                                  placeholder={t.stylePlaceholder}
                                  className={`bg-slate-950 border ${state.stylePreset === 'Custom' ? 'border-purple-500/50' : 'border-slate-800'} text-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full h-20 resize-none transition-all ${state.stylePreset !== 'Custom' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  readOnly={state.stylePreset !== 'Custom'}
                              />
                              <input 
                                  type="text" 
                                  value={state.negativePrompt}
                                  onChange={(e) => setState(p => ({...p, negativePrompt: e.target.value}))}
                                  placeholder={t.negativePlaceholder}
                                  className="bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded-lg px-4 py-2.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 w-full"
                              />
                          </div>

                          {/* Card 3: Easter Egg */}
                          <div className="md:col-span-6 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4">
                              <div className="flex items-center justify-between mb-2">
                                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                      <Zap className="w-4 h-4 text-amber-500" /> {t.easterEgg}
                                  </h3>
                                  <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-lg border border-slate-800">
                                      <span className="text-[10px] font-bold text-slate-500">COUNT</span>
                                      <input 
                                          type="number" 
                                          min="0" 
                                          max="5"
                                          value={state.easterEggCount}
                                          onChange={(e) => {
                                              const count = Math.max(0, Math.min(5, parseInt(e.target.value) || 0));
                                              setState(p => {
                                                  const currentTypes = [...p.easterEggTypes];
                                                  if (count > currentTypes.length) {
                                                      for (let i = currentTypes.length; i < count; i++) {
                                                          currentTypes.push('pop culture');
                                                      }
                                                  } else if (count < currentTypes.length) {
                                                      currentTypes.splice(count);
                                                  }
                                                  return { ...p, easterEggCount: count, easterEggTypes: currentTypes };
                                              });
                                          }}
                                          className="bg-transparent text-blue-400 text-sm font-bold w-8 outline-none text-center"
                                      />
                                  </div>
                              </div>
                              
                              <AnimatePresence>
                                  {state.easterEggCount > 0 && (
                                      <motion.div 
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 max-h-[140px]"
                                      >
                                          {state.easterEggTypes.map((type, idx) => (
                                              <motion.div 
                                                key={idx}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-slate-800"
                                              >
                                                  <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                      {idx + 1}
                                                  </div>
                                                  <select 
                                                      value={type}
                                                      onChange={(e) => {
                                                          const newTypes = [...state.easterEggTypes];
                                                          newTypes[idx] = e.target.value;
                                                          setState(p => ({ ...p, easterEggTypes: newTypes }));
                                                      }}
                                                      className="bg-transparent text-slate-200 text-xs outline-none flex-1 cursor-pointer"
                                                  >
                                                      <option value="pop culture" className="bg-slate-900 text-slate-200">Pop Culture</option>
                                                      <option value="internasional" className="bg-slate-900 text-slate-200">Internasional</option>
                                                      <option value="khas indonesia" className="bg-slate-900 text-slate-200">Khas Indonesia</option>
                                                  </select>
                                              </motion.div>
                                          ))}
                                      </motion.div>
                                  )}
                              </AnimatePresence>
                          </div>
                      </motion.div>
                  )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'voice' && (
            <motion.div 
              key="voice"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8"
            >
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl w-full"
        >
            <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Volume2 className="h-6 w-6 text-purple-500" />
                  </div>
                  Voice Director & TTS
                </h2>
            </div>

            <div className="space-y-6 flex flex-col h-full">
                <div className="space-y-2 flex flex-col flex-1">
                    <label className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                            <Zap className="w-3 h-3" />
                            {t.targetParagraph}
                        </label>
                        <textarea
                            className="w-full flex-1 min-h-[120px] bg-slate-900 border border-blue-500/30 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none scrollbar-thin placeholder-slate-600 text-slate-200 leading-relaxed shadow-inner"
                            placeholder={t.targetPlaceholder}
                            value={state.targetParagraph}
                            onChange={handleTargetChange}
                        />
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={handleTransformToVoiceDirector}
                            disabled={isTransformingVoice || !state.targetParagraph.trim()}
                            className={`flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all border
                                ${isTransformingVoice || !state.targetParagraph.trim()
                                    ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                                    : 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 shadow-lg shadow-blue-500/5'
                                }`}
                        >
                            {isTransformingVoice ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Monitor className="w-3.5 h-3.5" />
                            )}
                            {isTransformingVoice ? t.voiceDirectorLoading : t.voiceDirectorBtn}
                        </motion.button>
                    </div>

                    <div className="space-y-2 flex flex-col flex-1">
                        <label className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                            <Monitor className="w-3 h-3" />
                            {t.voiceDirectorTitle}
                        </label>
                        <textarea
                            className="w-full flex-1 min-h-[120px] bg-slate-900 border border-purple-500/30 rounded-xl p-4 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all resize-none scrollbar-thin placeholder-slate-600 text-slate-200 leading-relaxed shadow-inner"
                            placeholder={t.voiceDirectorPlaceholder}
                            value={state.voiceDirectorVersion}
                            onChange={(e) => setState(prev => ({ ...prev, voiceDirectorVersion: e.target.value }))}
                        />

                        {/* TTS Controls */}
                        <div className="p-4 bg-slate-900/50 rounded-xl border border-purple-500/20 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.ttsModel}</label>
                                    <select 
                                        value={state.ttsModel}
                                        onChange={(e) => setState(prev => ({ ...prev, ttsModel: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500"
                                    >
                                        <option value="gemini-3.1-flash-tts-preview">gemini-3.1-flash-tts-preview (recommended)</option>
                                        <option value="gemini-2.5-pro-preview-tts">gemini-2.5-pro-preview-tts (slower/preview)</option>
                                        <option value="gemini-2.5-flash-preview-tts">gemini-2.5-flash-preview-tts</option>
                                    </select>
                                    {state.ttsModel.includes('2.5-pro') && (
                                        <p className="text-[10px] text-amber-400 leading-snug">
                                            2.5 Pro TTS preview bisa jauh lebih lambat. Jika request melewati 120 detik, sistem akan stop dan tampilkan error, bukan loading terus.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.ttsVoice}</label>
                                    <select 
                                        value={state.ttsVoice}
                                        onChange={(e) => setState(prev => ({ ...prev, ttsVoice: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500"
                                    >
                                        {['Iapetus', 'Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].map(v => (
                                            <option key={v} value={v}>{v}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.ttsCopies}</label>
                                    <select 
                                        value={state.ttsCopies}
                                        onChange={(e) => setState(prev => ({ ...prev, ttsCopies: parseInt(e.target.value) }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500"
                                    >
                                        {[1, 2, 3, 4, 5].map(n => (
                                            <option key={n} value={n}>{n} Copy</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.ttsPreset}</label>
                                    <input 
                                        type="text"
                                        value={state.ttsPreset}
                                        onChange={(e) => setState(prev => ({ ...prev, ttsPreset: e.target.value }))}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.ttsCustom}</label>
                                <textarea 
                                    value={state.ttsPreset === 'Custom' ? state.ttsCustomInstruction : TTS_PRESETS[state.ttsPreset]}
                                    onChange={(e) => setState(prev => ({ ...prev, ttsCustomInstruction: e.target.value, ttsPreset: 'Custom' }))}
                                    className={`w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-200 outline-none focus:ring-1 focus:ring-purple-500 min-h-[80px] resize-none transition-all ${state.ttsPreset !== 'Custom' ? 'opacity-70' : ''}`}
                                    placeholder="Masukkan instruksi gaya bicara kustom..."
                                />
                            </div>

                            <div className="flex flex-wrap gap-3">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleGenerateTTS}
                                    disabled={isGeneratingTTS || !state.voiceDirectorVersion.trim()}
                                    className={`flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl text-xs font-bold transition-all shadow-lg
                                        ${isGeneratingTTS || !state.voiceDirectorVersion.trim()
                                            ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                            : 'bg-purple-600 hover:bg-purple-500 text-white shadow-purple-900/20'
                                        }`}
                                >
                                    {isGeneratingTTS ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Volume2 className="w-4 h-4" />
                                    )}
                                    {isGeneratingTTS ? t.generatingTTS : t.generateTTS}
                                </motion.button>
                                
                                {ttsError && (
                                    <div className="w-full mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                                        {ttsError}
                                    </div>
                                )}

                                {generatedAudioUrls.length > 0 && (
                                    <div className="flex flex-col gap-3 w-full mt-4">
                                        {generatedAudioUrls.map((url, idx) => (
                                            <AudioPlayer key={idx} url={url} index={idx} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
        </motion.div>
            </motion.div>
          )}

          {activeTab === 'storyboard' && (
            <motion.div 
              key="storyboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-8"
            >
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="w-full"
        >
            <div className="flex flex-col gap-4">
                <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    onClick={handleAnalyzeStory}
                    disabled={state.isAnalyzing || !state.targetParagraph}
                    className={`w-full py-5 rounded-2xl font-bold text-white transition-all shadow-xl flex items-center justify-center gap-3 text-lg
                    ${state.isAnalyzing || !state.targetParagraph
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                        : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:shadow-blue-500/25 border border-white/10'
                    }`}
                >
                    {state.isAnalyzing ? (
                        <>
                            <motion.div 
                              animate={{ rotate: 360 }}
                              transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                              className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white"
                            />
                            {t.analyzing}
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-6 h-6" />
                            {t.analyzeBtn}
                        </>
                    )}
                </motion.button>

                {state.analysisError && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 bg-red-900/20 border border-red-800/50 rounded-xl text-sm text-red-400 flex items-start gap-3"
                    >
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <p>{state.analysisError}</p>
                    </motion.div>
                )}
            </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl min-h-[600px] w-full"
        >
             <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Layout className="h-6 w-6 text-purple-500" />
                  </div>
                  {t.resultTitle}
                </h2>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-950 rounded-full border border-slate-800">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t.totalScenes}</span>
                        <span className="text-xs font-bold text-blue-400">{state.scenes.length}</span>
                    </div>
                </div>
             </div>

             <StoryTable 
                scenes={state.scenes} 
                refImages={state.refImages}
                onGenerateImage={handleGenerateImage}
                onGenerateSequence={handleGenerateSequence}
                onUpdatePrompt={handleUpdatePrompt}
                onRefinePrompt={handleRefinePrompt}
                onFormatChange={handleFormatChange}
                onSaveNarrative={handleSaveNarrative}
                onAddScene={handleAddScene}
                onDeleteScene={handleDeleteScene}
                onUpdateSplitText={handleUpdateSplitText}
                onUpdateSceneType={handleUpdateSceneType}
                onGeneratePrompts={handleGeneratePrompts}
                onGenerateAllImages={handleGenerateAllImages}
                isGeneratingAll={isGeneratingAll}
                generateAllProgress={generateAllProgress}
                onCancelGenerateAll={handleCancelGenerateAll}
                language={state.language}
             />
        </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;