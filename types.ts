export type SceneType =
  | 'host-direct'
  | 'icon-explainer'
  | 'split-contrast'
  | 'scene-interaction'
  | 'concept-visual'
  | 'typography-hero'
  | 'stock-footage'
  | 'multi-panel'
  | 'whiteboard-list'
  | 'quote-card'
  | 'data-visual'
  | 'metaphor-scene'
  | 'process-flow'
  | 'pov-scene'
  | 'cinematic-insert'
  | 'timeline-progress'
  | 'cross-section'
  | 'scale-compare'
  | 'drawing-live'
  | 'transformation';

export type SceneMode =
  // host-direct modes
  | 'intro'
  | 'hook'
  // icon-explainer modes
  | 'multi-icon'
  | 'single-icon'
  | 'comparison'
  // split-contrast modes
  | 'before-after'
  | 'good-bad'
  // scene-interaction modes
  | 'duo'
  | 'vs-group'
  // concept-visual modes
  | 'abstract-diagram'
  | 'real-reference'
  // typography-hero modes
  | 'single-word'
  | 'definition'
  // stock-footage modes
  | 'nature-calm'
  | 'urban-life'
  | 'clinical-setting'
  // multi-panel modes
  | 'panel-2'
  | 'panel-3'
  | 'panel-4'
  // whiteboard-list modes
  | 'bullet-points'
  | 'numbered-list'
  | 'checklist'
  // quote-card modes
  | 'expert-quote'
  | 'provocative-quote'
  | 'ironic-quote'
  // data-visual modes
  | 'big-number'
  | 'bar-comparison'
  | 'trend-arrow'
  // metaphor-scene modes
  | 'living-metaphor'
  | 'object-metaphor'
  | 'environment-metaphor'
  // process-flow modes
  | 'chain-reaction'
  | 'cycle-loop'
  | 'branching-path'
  // pov-scene modes
  | 'first-person'
  | 'dual-pov'
  | 'flashback'
  // cinematic-insert modes
  | 'emotional-scene'
  | 'social-scene'
  | 'memory-fragment'
  // timeline-progress modes
  | 'horizontal-timeline'
  | 'evolution-steps'
  | 'countdown-progress'
  // cross-section modes
  | 'brain-cutaway'
  | 'system-inside'
  | 'layers-reveal'
  // scale-compare modes
  | 'size-contrast'
  | 'intensity-meter'
  | 'magnifying-glass'
  // drawing-live modes
  | 'hand-doodle'
  | 'ink-flow'
  | 'chalk-talk'
  // transformation modes
  | 'morph-transition'
  | 'break-free'
  | 'fusion-split';

export const SCENE_TYPE_MODES: Record<SceneType, SceneMode[]> = {
  'host-direct': ['intro', 'hook'],
  'icon-explainer': ['multi-icon', 'single-icon', 'comparison'],
  'split-contrast': ['before-after', 'good-bad'],
  'scene-interaction': ['duo', 'vs-group'],
  'concept-visual': ['abstract-diagram', 'real-reference'],
  'typography-hero': ['single-word', 'definition'],
  'stock-footage': ['nature-calm', 'urban-life', 'clinical-setting'],
  'multi-panel': ['panel-2', 'panel-3', 'panel-4'],
  'whiteboard-list': ['bullet-points', 'numbered-list', 'checklist'],
  'quote-card': ['expert-quote', 'provocative-quote', 'ironic-quote'],
  'data-visual': ['big-number', 'bar-comparison', 'trend-arrow'],
  'metaphor-scene': ['living-metaphor', 'object-metaphor', 'environment-metaphor'],
  'process-flow': ['chain-reaction', 'cycle-loop', 'branching-path'],
  'pov-scene': ['first-person', 'dual-pov', 'flashback'],
  'cinematic-insert': ['emotional-scene', 'social-scene', 'memory-fragment'],
  'timeline-progress': ['horizontal-timeline', 'evolution-steps', 'countdown-progress'],
  'cross-section': ['brain-cutaway', 'system-inside', 'layers-reveal'],
  'scale-compare': ['size-contrast', 'intensity-meter', 'magnifying-glass'],
  'drawing-live': ['hand-doodle', 'ink-flow', 'chalk-talk'],
  'transformation': ['morph-transition', 'break-free', 'fusion-split'],
};

export const SCENE_TYPE_LABELS: Record<SceneType, string> = {
  'host-direct': 'Host Direct',
  'icon-explainer': 'Icon Explainer',
  'split-contrast': 'Split Contrast',
  'scene-interaction': 'Scene Interaction',
  'concept-visual': 'Concept Visual',
  'typography-hero': 'Typography Hero',
  'stock-footage': 'Stock Footage',
  'multi-panel': 'Multi Panel',
  'whiteboard-list': 'Whiteboard List',
  'quote-card': 'Quote Card',
  'data-visual': 'Data Visual',
  'metaphor-scene': 'Metaphor Scene',
  'process-flow': 'Process Flow',
  'pov-scene': 'POV Scene',
  'cinematic-insert': 'Cinematic Insert',
  'timeline-progress': 'Timeline Progress',
  'cross-section': 'Cross Section',
  'scale-compare': 'Scale Compare',
  'drawing-live': 'Drawing Live',
  'transformation': 'Transformation',
};

export const SCENE_MODE_LABELS: Record<SceneMode, string> = {
  'intro': 'Intro — warm opening, mascot wave/senyum',
  'hook': 'Hook — mascot point ke kamera, ajakan',
  'multi-icon': 'Multi Icon — 2-3 ikon bergantian dengan label',
  'single-icon': 'Single Icon — 1 ikon besar fokus',
  'comparison': 'Comparison — dua ikon bersebelahan (salah vs benar)',
  'before-after': 'Before/After — perubahan situasi',
  'good-bad': 'Good vs Bad — kontras positif/negatif',
  'duo': 'Duo — dua karakter saling merespon',
  'vs-group': 'Vs Group — satu karakter vs kelompok',
  'abstract-diagram': 'Abstract Diagram — ilustrasi/diagram buatan',
  'real-reference': 'Real Reference — foto real sebagai konteks',
  'single-word': 'Single Word — 1 kata IMPACT besar',
  'definition': 'Definition — kata besar + subtitle penjelas',
  'nature-calm': 'Nature Calm — pemandangan alam menenangkan',
  'urban-life': 'Urban Life — hiruk pikuk kota',
  'clinical-setting': 'Clinical Setting — ruang terapi/klinik',
  'panel-2': 'Panel 2 — dua panel bersebelahan',
  'panel-3': 'Panel 3 — tiga panel berurutan',
  'panel-4': 'Panel 4 — empat panel grid',
  'bullet-points': 'Bullet Points — poin tanpa urutan',
  'numbered-list': 'Numbered List — langkah berurutan',
  'checklist': 'Checklist — daftar centang',
  'expert-quote': 'Expert Quote — kutipan otoritatif',
  'provocative-quote': 'Provocative Quote — kutipan bikin mikir',
  'ironic-quote': 'Ironic Quote — kutipan tajam/sarkastik',
  'big-number': 'Big Number — satu angka IMPACT besar',
  'bar-comparison': 'Bar Comparison — perbandingan batang',
  'trend-arrow': 'Trend Arrow — garis tren naik/turun',
  'living-metaphor': 'Living Metaphor — adegan metafora hidup',
  'object-metaphor': 'Object Metaphor — benda sebagai simbol',
  'environment-metaphor': 'Environment Metaphor — lanskap sebagai konsep',
  'chain-reaction': 'Chain Reaction — efek domino berantai',
  'cycle-loop': 'Cycle Loop — siklus berulang',
  'branching-path': 'Branching Path — percabangan keputusan',
  'first-person': 'First Person — POV dari mata karakter',
  'dual-pov': 'Dual POV — dua perspektif berbeda',
  'flashback': 'Flashback — kilas balik masa lalu',
  'emotional-scene': 'Emotional Scene — adegan emosional seperti film',
  'social-scene': 'Social Scene — adegan interaksi sosial realistis',
  'memory-fragment': 'Memory Fragment — cuplikan memori buram/vignette',
  'horizontal-timeline': 'Horizontal Timeline — garis waktu kiri ke kanan',
  'evolution-steps': 'Evolution Steps — perubahan bertahap versi 1→2→3',
  'countdown-progress': 'Countdown Progress — progress bar/hari ke hari',
  'brain-cutaway': 'Brain Cutaway — irisan otak highlight area',
  'system-inside': 'System Inside — dalamnya sistem (sosial/rumah sakit)',
  'layers-reveal': 'Layers Reveal — lapisan dikupas luar→dalam',
  'size-contrast': 'Size Contrast — perbandingan besaran raksasa vs kecil',
  'intensity-meter': 'Intensity Meter — meter intensitas ringan→parah',
  'magnifying-glass': 'Magnifying Glass — zoom detail kecil yang penting',
  'hand-doodle': 'Hand Doodle — tangan menggambar sketsa di kertas',
  'ink-flow': 'Ink Flow — tinta mengalir membentuk diagram',
  'chalk-talk': 'Chalk Talk — kapur di papan muncul sendiri',
  'morph-transition': 'Morph Transition — transformasi gradual',
  'break-free': 'Break Free — melepaskan diri dari cangkang/label',
  'fusion-split': 'Fusion Split — dua hal bergabung atau satu terbelah',
};

export const SCENE_TYPE_FUNCTIONS: Record<SceneType, string> = {
  'host-direct': '🎤 Hook, transisi, CTA — mascot face kamera, gesture',
  'icon-explainer': '🎯 Mengajar konsep — mascot + labeled icons posisi presisi',
  'split-contrast': '⚡ Membandingkan dua sisi — split visual + warna kontras',
  'scene-interaction': '👥 Menunjukkan relasi — dua karakter berinteraksi',
  'concept-visual': '🧠 Memvisualisasikan abstrak — diagram + reaction',
  'typography-hero': '✏️ Menekankan kata kunci — teks besar + mascot reaksi',
  'stock-footage': '🎬 Video real sebagai background — mood/konteks visual',
  'multi-panel': '🗂️ Beberapa panel dalam satu frame — perbandingan/step',
  'whiteboard-list': '📋 Papan tulis dengan bullet points — daftar/checklist',
  'quote-card': '💬 Quote tokoh dalam kartu elegan — otoritas/inspirasi',
  'data-visual': '📊 Angka statistik divisualkan — data yang impact',
  'metaphor-scene': '🎭 Metafora visual hidup — abstrak jadi cerita',
  'process-flow': '🔄 Alur dinamis — reaksi berantai, siklus, percabangan',
  'pov-scene': '👁️ Perspektif subjektif — empati dan sudut pandang',
  'cinematic-insert': '🎬 Adegan film pendek — storytelling emosional tanpa mascot',
  'timeline-progress': '📅 Perubahan sepanjang waktu — garis visual temporal',
  'cross-section': '🧬 Potongan melintang — lihat ke dalam otak/sistem',
  'scale-compare': '📏 Perbandingan besaran — ukuran, intensitas, skala',
  'drawing-live': '✍️ Menggambar langsung — real-time reveal di frame',
  'transformation': '🦋 Perubahan bentuk — morph, lepas label, gabung/pecah',
};

export interface StoryFrame {
  id: string;
  format: string; // Always "Single Panel" in new system; kept for backward compat
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
  stylePreset: 'Ilmu Lidi' | 'ILMU SURVIVAL' | 'ILMU NYANTUY' | 'Ilmu Mental' | 'Custom';
  styleSuffix: string;
  easterEggCount: number;
  easterEggTypes: string[];
  negativePrompt: string;
  language: 'id' | 'en';
  geminiApiKey: string;
  isDetectingCharacters: boolean;
  globalSourceRefs: string[];
  voiceDirectorVersion: string;
  ttsModel: string;
  ttsVoice: string;
  ttsCopies: number;
  ttsPreset: 'Ilmu Lidi' | 'Ilmu Survival' | 'Norman' | 'Ilmu Nyantuy' | 'Ilmu Mental' | 'Custom';
  ttsCustomInstruction: string;
}

export const ILMU_LIDI_STYLE = "Modern 2D webcomic style, PURE MINIMALIST SOLID WHITE BACKGROUND, bold clean line art, stylized character design, flat colors with cel-shading, cinematic dramatic lighting on subject only, 8k resolution, high quality digital illustration.";

export const ILMU_MENTAL_STYLE = ILMU_LIDI_STYLE;

export const ILMU_SURVIVAL_STYLE = "Gritty brush-and-ink noir illustration, raw and expressive textured brushstrokes, heavy shadow pooling, stark white minimal background, decaying post-apocalyptic textures, selective crimson red coloring, high contrast, sharp focus, 8k resolution, high quality digital art.";

export const ILMU_NYANTUY_STYLE = "Ultra-minimalist 2D cartoon style, crude MS Paint aesthetic, basic flat colors, unpolished rough outlines, intentionally simple drawing, humorous deadpan tone, solid white background, low-effort high-comedy internet meme vibe, lo-fi digital art.";

export const DEFAULT_SYSTEM_PROMPT = `Peran Utama: Anda adalah Asisten AI Kreatif, Creative Director, dan Storyboard Artist Profesional untuk kanal YouTube "{{NARRATOR_NAME}}".

Tugas Inti: Tugas utama Anda adalah menganalisis naskah narasi, memecahnya menjadi urutan adegan (storyboard) yang sesuai aturan, dan mengubahnya menjadi prompt gambar (image prompt) dalam Bahasa Indonesia yang berorientasi Internasional.

1. ATURAN STRUKTUR & KOMPOSISI
Setiap scene = 1 frame dengan format "Single Panel". Tidak ada Multi Panel atau Sequence.

A. OPTIMASI RETENSI VIDEO (CREATIVE & DYNAMIC VISUALS):
Untuk mempertahankan retensi penonton, prompt visual HARUS mengaplikasikan 4 elemen ini:
1. Sudut Kamera Dinamis: Gunakan extreme low angle, dutch angle, over-the-shoulder, bird-eye view, atau foreshortening dramatis.
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
