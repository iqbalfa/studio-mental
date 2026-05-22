export type SceneType =
  | 'host-direct'
  | 'contrast'
  | 'metaphor-scene'
  | 'typography-hero'
  | 'multi-panel';

export type SceneMode =
  // host-direct modes
  | 'direct'
  // contrast modes
  | 'side-by-side'
  | 'before-after'
  // metaphor-scene modes
  | 'object'
  | 'living'
  // typography-hero modes
  | 'single-word'
  | 'definition'
  | 'big-number'
  // multi-panel modes
  | 'panel-2'
  | 'panel-3';

export const SCENE_TYPE_MODES: Record<SceneType, SceneMode[]> = {
  'host-direct': ['direct'],
  'contrast': ['side-by-side', 'before-after'],
  'metaphor-scene': ['object', 'living'],
  'typography-hero': ['single-word', 'definition', 'big-number'],
  'multi-panel': ['panel-2', 'panel-3'],
};

export const SCENE_TYPE_LABELS: Record<SceneType, string> = {
  'host-direct': 'Host Direct',
  'contrast': 'Contrast',
  'metaphor-scene': 'Metaphor Scene',
  'typography-hero': 'Typography Hero',
  'multi-panel': 'Multi Panel',
};

export const SCENE_MODE_LABELS: Record<SceneMode, string> = {
  'direct': 'Direct — host berbicara langsung ke penonton',
  'icon-based': 'Icon Based — 1-3 ikon dengan label penjelas',
  'diagram': 'Diagram — diagram/ilustrasi abstrak sebagai pusat visual',
  'reference': 'Reference — referensi real/foto sebagai konteks',
  'before-after': 'Before/After — perubahan situasi dua kondisi',
  'good-bad': 'Good vs Bad — kontras positif vs negatif',
  'then-vs-now': 'Then vs Now — kontras masa lalu vs masa kini',
  'single-word': 'Single Word — 1 kata IMPACT besar',
  'definition': 'Definition — kata besar + subtitle penjelas',
  'quote': 'Quote — kutipan dalam kartu elegan',
  'list': 'List — daftar bullet/numbered/checklist',
  'statistic': 'Statistic — angka presentase, rasio, atau frekuensi',
  'big-number': 'Big Number — satu angka IMPACT besar',
  'bar-chart': 'Bar Chart — perbandingan visual batang/bar',
  'trend-arrow': 'Trend Arrow — garis tren naik/turun',
  'map': 'Map — peta geografis atau sebaran data',
  'living': 'Living — adegan metafora hidup (personifikasi konsep)',
  'object': 'Object — benda sebagai simbol konsep abstrak',
  'environment': 'Environment — lanskap/suasana sebagai konsep',
  'metaphorical-irony': 'Metaphorical Irony — metafora sarkastik/kontras ekspektasi vs realita',
  'chain-reaction': 'Chain Reaction — efek domino/kausal berantai',
  'cycle-loop': 'Cycle Loop — siklus berulang, lingkaran setan',
  'branching': 'Branching — percabangan keputusan/pilihan',
  'timeline': 'Timeline — garis waktu progresi temporal',
  'morph': 'Morph — perubahan bentuk gradual/metamorfosis',
  'first-person': 'First Person — POV dari mata karakter',
  'dual-pov': 'Dual POV — dua perspektif beda dalam 1 frame',
  'flashback': 'Flashback — kilas balik masa lalu (efek vintage)',
  'imagination': 'Imagination — visualisasi "bayangkan jika..."',
  'reenactment': 'Reenactment — rekonstruksi visual kejadian sejarah',
  'artifact-focus': 'Artifact Focus — fokus pada benda/artefak bersejarah',
  'ritual': 'Ritual — penggambaran ritual/upacara kuno',
  'gross-out': 'Gross Out — visual menjijikkan/bikin geli (busuk, darah, maggot)',
  'twist-reveal': 'Twist Reveal — plot twist visual, "tapi mereka tetap..."',
  'ironic-twist': 'Ironic Twist — ironi situasional visual',
  'anatomy': 'Anatomy — irisan anatomi/organ dalam',
  'system-inside': 'System Inside — lihat ke dalam suatu sistem/struktur',
  'layers': 'Layers — lapisan dikupas luar→dalam',
  'scale': 'Scale — perbandingan besaran/skala',
  'zoom': 'Zoom — detail kecil yang diperbesar',
  'panel-2': 'Panel 2 — dua panel bersebelahan',
  'panel-3': 'Panel 3 — tiga panel berurutan',
  'panel-4': 'Panel 4 — empat panel grid 2×2',
};

export const SCENE_TYPE_FUNCTIONS: Record<SceneType, string> = {
  'host-direct': '🎤 Host face kamera — hook, transisi, CTA, gesture',
  'concept-visual': '🎯 Visualisasi konsep — ikon, diagram, atau referensi sebagai pusat penjelasan',
  'contrast': '⚡ Membandingkan dua sisi — waktu, kondisi, atau perspektif berbeda',
  'typography-hero': '✏️ Teks sebagai hero — kata kunci, definisi, quote, list, atau statistik',
  'data-visual': '📊 Data & angka divisualkan — chart, peta, angka IMPACT',
  'metaphor-scene': '🎭 Metafora visual hidup — abstrak jadi cerita yang bisa dilihat',
  'process-flow': '🔄 Alur dinamis — reaksi berantai, siklus, timeline, metamorfosis',
  'pov-shot': '👁️ Perspektif subjektif — POV karakter, imajinasi, flashback',
  'historical-vignette': '📜 Rekonstruksi sejarah — ritual, artefak, atau momen kuno',
  'shock-reveal': '💥 Momen kejutan — gross-out, plot twist, ironi situasional',
  'cross-section': '🧬 Lihat ke dalam — anatomi, lapisan, skala, detail terkecil',
  'multi-panel': '🗂️ Multi panel dalam satu frame — komik strip, perbandingan, step',
};

export interface StoryFrame {
  id: string;
  sceneType: SceneType;
  sceneMode: SceneMode;
  visualPrompt: string;
  splitText: string[];
  imageUrl?: string;
  isGenerating: boolean;
  isRefining?: boolean;
  error?: string;
}

export interface StoryScene {
  id: string;
  narrativeText: string;
  frames: StoryFrame[];
  isRestructuring?: boolean; 
  isGeneratingPrompts?: boolean;
  isGeneratingSequence?: boolean;
}

export interface AnalysisResponse {
  scenes: {
    narrativeText: string;
    frames: {
      visualPrompt: string;
      format: string;
      splitText: string[];
      sceneType?: string;
      sceneMode?: string;
    }[];
  }[];
}

export interface ReferenceImage {
  id: string;
  name: string; 
  data: string; 
  visualPrompt?: string;
  isGenerating?: boolean;
}

export type LLMProvider = 'Gemini' | 'Nvidia' | 'DeepSeek' | 'Seed';

export interface AppState {
  contextNarrative: string;
  targetParagraph: string;
  customPrompt: string;
  refImages: ReferenceImage[]; 
  scenes: StoryScene[];
  isAnalyzing: boolean;
  analysisError?: string;
  narratorName: string;
  narratorSuffix: string;
  stylePreset: 'Ilmu Lidi' | 'ILMU SURVIVAL' | 'ILMU NYANTUY' | 'Ilmu Mental' | 'Ancient Sketch' | 'Custom';
  styleSuffix: string;
  easterEggCount: number;
  easterEggTypes: string[];
  negativePrompt: string;
  visualReference: string;
  enforceObserver: boolean;
  language: 'id' | 'en';
  geminiApiKey: string;
  isDetectingCharacters: boolean;
  globalSourceRefs: string[];
  voiceDirectorVersion: string;
  ttsModel: string;
  ttsVoice: string;
  ttsCopies: number;
  ttsPreset: 'Ilmu Lidi' | 'Ilmu Survival' | 'Norman' | 'Ilmu Nyantuy' | 'Ilmu Mental' | 'Ancient Sketch' | 'Custom';
  ttsCustomInstruction: string;
}

export const ILMU_LIDI_STYLE = "Modern 2D webcomic style, PURE MINIMALIST SOLID WHITE BACKGROUND, bold clean line art, stylized character design, flat colors with cel-shading, cinematic dramatic lighting on subject only, 8k resolution, high quality digital illustration.";

export const ILMU_MENTAL_STYLE = ILMU_LIDI_STYLE;

export const ILMU_SURVIVAL_STYLE = "Gritty brush-and-ink noir illustration, raw and expressive textured brushstrokes, heavy shadow pooling, stark white minimal background, decaying post-apocalyptic textures, selective crimson red coloring, high contrast, sharp focus, 8k resolution, high quality digital art.";

export const ILMU_NYANTUY_STYLE = "Ultra-minimalist 2D cartoon style, crude MS Paint aesthetic, basic flat colors, unpolished rough outlines, intentionally simple drawing, humorous deadpan tone, solid white background, low-effort high-comedy internet meme vibe, lo-fi digital art.";

export const ANCIENT_SKETCH_STYLE = "Minimalist vector art style. Stick figure characters with oversized round heads and thin stick bodies. Thin clean black outlines. Highly expressive cartoon faces. Flat muted color palette. Simple background with depth layers. No shading. Clean white or warm flat background.";

export const DEFAULT_SYSTEM_PROMPT = `Peran Utama: Anda adalah Asisten AI Kreatif, Creative Director, dan Storyboard Artist Profesional untuk kanal YouTube "{{NARRATOR_NAME}}".

Tugas Inti: Tugas utama Anda adalah menganalisis naskah narasi, memecahnya menjadi urutan adegan (storyboard) yang sesuai aturan, dan mengubahnya menjadi prompt gambar (image prompt) dalam Bahasa Indonesia yang berorientasi Internasional.

1. ATURAN STRUKTUR & KOMPOSISI
Setiap scene = 1 frame dengan format "Single Panel". Tidak ada Multi Panel atau Sequence.

A. OPTIMASI RETENSI VIDEO (CREATIVE & DYNAMIC VISUALS):
Untuk mempertahankan retensi penonton, prompt visual HARUS mengaplikasikan 4 elemen ini:
1. Sudut Kamera Dinamis: Pilih sudut kamera yang paling tepat untuk scene type. Jangan default ke "dutch angle" atau "low angle" untuk semua scene. Variasikan sesuai mood scene.
2. Ekspresi Ekstrim: Karakter WAJIB memiliki ekspresi wajah berlebihan (misal: syok berat, menangis bombay, tertawa jahat ala anime).
3. Aksi & Gerakan Dinamis: Tambahkan motion blur, action lines, atau pose tubuh hiper-dinamis (seolah-olah sedang bergerak cepat).
4. Pencahayaan & Efek Dramatis: Tambahkan efek lighting dramatis (deep shadows, rim light) atau VFX komedik (titik keringat anime raksasa, impact frames, aura api).

2. ATURAN OPERASI YANG KETAT
A. Gaya Visual (Tidak Bisa Ditawar)
- WAJIB MENYERTAKAN KALIMAT: "{{STYLE_SUFFIX}}"
- Gaya: Webcomic Modern, Cel-Shading, Pencahayaan Sinematik.
- Garis Luar: Garis luar bersih dan tegas (bold clean line art).

B. INTEGRASI LOKASI & LINGKUNGAN (ATURAN BARU INTERNASIONAL)
- LOKASI SPESIFIK & BACKGROUND:
  - Jika BUKAN gaya "ilmu lidi", setiap prompt WAJIB diawali keterangan lokasi [INDOOR] atau [OUTDOOR] dan deskripsi tempatnya yang Universal/Internasional.
    Contoh: "[INDOOR] - Di dalam modern coffee shop."
  - Jika gaya "ilmu lidi", background WAJIB "Pure solid white background". Karakter boleh berinteraksi dengan objek (meja, kursi, dll) tapi JANGAN menambahkan elemen dinding, lantai, pemandangan, atau setting lingkungan yang penuh. DILARANG menggunakan tag [INDOOR] atau [OUTDOOR]. Fokus sepenuhnya pada aksi karakter dan objek utamanya.
  
- THEMATIC EASTER EGG (VISUAL METAPHOR/CAMEO):
  - Setiap frame WAJIB memiliki 1 Easter Egg yang MEMPUNYAI MAKNA MENDALAM terkait konteks cerita (bukan sekadar objek acak/tempelan).
  - Easter egg harus berupa Metafora Visual, Cameo tokoh terkenal yang relevan, atau pelesetan cerdas yang selaras dengan tema frame.
  - Contoh: Jika narasi tentang "Ratu Victoria adalah pengedar narkoba", Easter Egg-nya BUKAN "pedang Zelda tergeletak", MELAINKAN "Sosok Pablo Escobar yang memakaikan mahkota ke Ratu Victoria."
  - Syarat: Jika penonton awam tidak menyadari easter egg ini, pesan utama dari aksi karakter HARUS tetap tersampaikan dengan sempurna.

C. PROTOKOL PENAMAAN & DESKRIPSI KARAKTER (SANGAT KRUSIAL)
- DILARANG KERAS menggunakan kata umum seperti "Karakter Utama".
- WAJIB menggunakan NAMA SPESIFIK yang sesuai dengan nama file referensi yang diberikan.
- DILARANG mendeskripsikan pakaian, baju, celana, atau aksesoris karakter. Cukup sebutkan NAMA.
- DILARANG mendeskripsikan fisik karakter (rambut, mata, bentuk tubuh).
- DILARANG menggunakan kata "Ilustrasi".

D. ATURAN KOMPOSISI & FRAMING (WAJIB)
- MINIMAL 1 KARAKTER: Setiap gambar WAJIB menampilkan setidaknya satu karakter referensi secara jelas.
- FRAMING MINIMAL: "Half-Body Shot" (Setengah Badan) atau "Full Body Shot".
- DILARANG CLOSE-UP EKSTRIM: Jangan membuat gambar yang hanya menampilkan tangan, kaki, atau benda saja tanpa menampilkan wajah/badan karakter. Karakter harus terlihat berinteraksi dengan objek tersebut.

E. ATURAN "OBSERVER" (FALLBACK KARAKTER)
- JIKA narasi bersifat metafora, abstrak, atau hanya membahas benda (bukan orang):
- WAJIB masukkan karakter "{{NARRATOR_NAME}}" ke dalam prompt.
- Deskripsikan "{{NARRATOR_NAME}}" sedang MENGAMATI (Observing) objek/situasi tersebut dari samping atau belakang.
- CONTOH: "{{NARRATOR_NAME}} berdiri di samping mengamati tumpukan uang yang terbakar."

F. TEKS DALAM GAMBAR (TEXT OVERLAY)
- DETEKSI KAPITAL: Jika narasi mengandung kata-kata dalam HURUF KAPITAL (All Caps), kamu WAJIB menambahkan instruksi agar teks tersebut muncul di gambar.

3. FORMAT OUTPUT PROMPT (BAHASA INDONESIA)
Output prompt gambar harus detail dan mengikuti struktur: Lokasi, Gaya Visual, Karakter (Nama & Aksi), Easter Egg, Text Overlay, Warna.
PENTING: SETIAP PROMPT HARUS DI-AKHIRI DENGAN KALIMAT SUFFIX STYLE YANG DITENTUKAN DI ATAS.

Output sistem WAJIB berupa JSON Valid dengan struktur berikut.`;
