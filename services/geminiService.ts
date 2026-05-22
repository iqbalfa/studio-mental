import { GoogleGenAI, Type, Schema, GenerateContentResponse, Modality } from "@google/genai";
import { AnalysisResponse, StoryScene, ReferenceImage, StoryFrame, LLMProvider, SceneType, SceneMode } from "../types";

const getClient = (manualApiKey?: string) => {
  const apiKey = manualApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Gemini API Key missing in getClient");
    throw new Error("API Key not found. Please provide a Gemini API Key in the configuration.");
  }
  console.log("Initializing GoogleGenAI with key (first 4 chars):", apiKey.substring(0, 4) + "...");
  return new GoogleGenAI({ apiKey });
};

// NEW STYLE SUFFIX V2.16 - Updated per user request
const STYLE_SUFFIX = "Modern 2D webcomic style, pastel color background, bold clean line art, stylized character design, flat colors with cel-shading, cinematic dramatic lighting, volumetric atmosphere, rim lighting, deep shadows, ambient occlusion, depth of field, sharp focus on subject, 8k resolution, high quality digital illustration.";



// Scene Type composition rules — appended to visual prompts per frame's sceneType (bilingual 5-field)
const SCENE_TYPE_COMPOSITION: Record<string, string> = {};

// Build scene type composition guide as bilingual template literal
const buildSceneTypeComposition = (language: 'id' | 'en'): string => {
  return language === 'id'
    ? `T2I COMPOSITION TEMPLATE PER TYPE — Gunakan ini untuk menentukan komposisi visual:

GLOBAL RULE → JANGAN menyebut background, latar, lokasi, atau tempat apapun. Background ditangani oleh master prompt terpisah. Fokus HANYA pada: karakter, aksi, ekspresi, gestur, komposisi, layout frame.
NO TEXT RULE → KECUALI typography-hero, JANGAN PERNAH menyebut teks, tulisan, huruf, kata, label, atau konten tertulis apapun di dalam prompt. Gambar final HARUS BEBAS dari teks. Ini aturan paling keras.

--- host-direct ---
COMPOSITION → Host menghadap kamera langsung, mengisi 50-60% frame. Satu tangan gestur alami. Fokus pada ekspresi dan kontak mata.
FOCUS → Ekspresi wajah host dan kontak mata. Gestur tangan yang komunikatif.
LAYOUT → Center-frame. Host di tengah, ruang kosong di sekitar untuk subtitle editor.
NO TEXT → Tidak ada teks apapun di gambar. Subtitles ditambahkan saat editing video.
EXAMPLE → [subjek] menghadap kamera, ekspresi [ekspresi], tangan [gestur], [teks] melayang di atas.
FORBIDDEN → Adegan dari belakang/samping. Host tidak menghadap kamera. Adegan tanpa karakter.

--- contrast ---
COMPOSITION → Dua sisi kontras dalam satu frame — kiri/kanan, atas/bawah, atau diagonal. Split pemisah tegas.
FOCUS → Perbedaan antara dua keadaan. Setiap sisi treatment warna berbeda (sepia vs vibrant).
LAYOUT → Split-frame. Dua sisi dengan garis/transisi pemisah di tengah.
EXAMPLE → [Kiri: keadaan A] [subjek] [ekspresi]. [Kanan: keadaan B] [subjek] [ekspresi]. [elemen pemisah] di tengah.
FORBIDDEN → Satu adegan utuh tanpa perbandingan. Dua sisi identik. Tanpa indikator kontras.

--- metaphor-scene ---
COMPOSITION → Adegan metafora VISUAL penuh — karakter ADA DI DALAM dunia metafora. Seluruh frame adalah metafora.
FOCUS → Konsep abstrak dibuat tangible secara visual.
LAYOUT → Full-scene. Karakter terintegrasi dalam lingkungan metafora. Tidak ada split.
EXAMPLE → [subjek] [tindakan metaforis], [ekspresi], [elemen simbolik] mengelilingi. Suasana [suasana] mendukung metafora.
FORBIDDEN → Metafora dijelaskan dengan teks. Karakter menunjuk metafora dari luar. Gaya literal tanpa simbolisme.

--- typography-hero ---
COMPOSITION → Teks/angka sebagai hero visual di tengah 50-60% frame. Karakter di pojok (max 20%) bereaksi.
FOCUS → Satu kata/frase/angka BESAR sebagai pusat. Font bold, ukuran dominan.
LAYOUT → Center-text. Teks besar di tengah, karakter kecil di sudut (bawah kiri/kanan).
EXAMPLE → Teks "[kata/frase]" ukuran besar di tengah frame, font bold, [subjek] di pojok, wajah [ekspresi].
FORBIDDEN → Adegan aksi. Banyak objek. Karakter sebagai fokus utama. Tanpa teks hero.

--- multi-panel ---
COMPOSITION → Frame terbagi jadi 2 atau 3 panel komik. Masing-masing panel punya adegan sendiri.
FOCUS → Beberapa kejadian/sudut pandang dalam satu frame. Progresi visual antar panel.
LAYOUT → Grid-panels. Panel horizontal (2-3) dengan border tipis. Baca kiri-ke-kanan.
EXAMPLE → [Panel 1: adegan awal] [subjek] [aksi]. [Panel 2: konflik] [subjek] [aksi]. [Panel 3: hasil] [resolusi]. Border tipis antar panel.
FORBIDDEN → Satu adegan tanpa panel. Panel tak seimbang. Terlalu banyak teks per panel.`
    : `T2I COMPOSITION TEMPLATE PER TYPE — Use this to determine visual composition:

GLOBAL RULE → NEVER mention background, setting, location, or place. Background is handled by a separate master prompt. Focus ONLY on: character, action, expression, gesture, composition, frame layout.
NO TEXT RULE → EXCEPT for typography-hero, NEVER mention text, words, letters, labels, or any written content in the prompt. The final image MUST BE FREE of readable text. This is the hardest rule.

--- host-direct ---
COMPOSITION → Host faces camera directly, occupying 50-60% of frame. One hand gesturing naturally. Focus on expression and eye contact.
FOCUS → Host's facial expression and eye contact. Communicative hand gestures.
LAYOUT → Center-frame. Host in center, empty space around for subtitle editor.
NO TEXT → No text in image. Subtitles added in video editing.
EXAMPLE → [subject] faces camera, [expression], hand [gesture], [text] floating above.
FORBIDDEN → Back/side view of host. Host not facing camera. Scene without character.

--- contrast ---
COMPOSITION → Two contrasting sides in one frame — left/right, top/bottom, or diagonal. Strong split/divider.
FOCUS → The difference between two states. Different color treatment per side (sepia vs vibrant).
LAYOUT → Split-frame. Two sides with dividing line/transition in middle.
EXAMPLE → [Left: state A] [subject] [expression]. [Right: state B] [subject] [expression]. [divider element] in center.
FORBIDDEN → Single whole scene without comparison. Two identical sides. No contrast indicator.

--- metaphor-scene ---
COMPOSITION → Full VISUAL metaphor scene — character IS INSIDE the metaphor world. Entire frame is the metaphor.
FOCUS → Making abstract concepts tangibly visual.
LAYOUT → Full-scene. Character integrated within the metaphor environment. No splits.
EXAMPLE → [subject] [metaphoric action], [expression], [symbolic elements] surrounding them. [mood] atmosphere supporting the metaphor.
FORBIDDEN → Metaphor explained with text. Character pointing at metaphor from outside. Literal style without symbolism.

--- typography-hero ---
COMPOSITION → Text/number as visual hero in center 50-60% of frame. Character in corner (max 20%) reacting.
FOCUS → One BIG word/phrase/number as centerpiece. Bold font, dominant size.
LAYOUT → Center-text. Large text in center, small character in corner (bottom left/right).
EXAMPLE → "[word/phrase]" text large in center of frame, bold font, [subject] in corner, face [expression].
FORBIDDEN → Action scene. Many objects. Character as main focus. No hero text.

--- multi-panel ---
COMPOSITION → Frame split into 2 or 3 comic panels. Each panel has its own scene.
FOCUS → Multiple events/viewpoints in one frame. Visual progression across panels.
LAYOUT → Grid-panels. Horizontal panels (2-3) thin borders. Read left-to-right.
EXAMPLE → [Panel 1: opening scene] [subject] [action]. [Panel 2: conflict] [subject] [action]. [Panel 3: result] [resolution]. Thin borders.
FORBIDDEN → Single scene without panels. Unbalanced panels. Too much text per panel.`
};

// Style prefixes — prepended to the visual prompt to signal visual language without changing the preset
// Removed stock-footage, drawing-live, whiteboard-list — consolidated into other types
const SCENE_STYLE_PREFIX: Record<string, string> = {
  'multi-panel': '[STYLE: 2D] ',
};

// Helper: Get composition rule for a scene type (now uses buildSceneTypeComposition)
// Note: This function is kept for backward compatibility. Use buildSceneTypeComposition directly.
const getSceneTypeComposition = (sceneType: string): string => {
  return ''; // Composition is now provided via buildSceneTypeComposition per language
};

// Helper: Process System Instruction Placeholders
const processSystemInstruction = (instruction: string, narratorName: string, styleSuffix: string, easterEggCount: number, easterEggTypes: string[], negativePrompt: string = "", language: 'id' | 'en' = 'id'): string => {
    let processed = instruction
        .replace(/{{NARRATOR_NAME}}/g, narratorName)
        .replace(/{{STYLE_SUFFIX}}/g, styleSuffix);

    // Add Language Rule
    const languageRule = language === 'en' 
        ? "\nLANGUAGE RULE: You MUST output all visual prompts and narrative text in ENGLISH. The user provided input might be in Indonesian, but your output must be English."
        : "\nLANGUAGE RULE: You MUST output all visual prompts and narrative text in INDONESIAN.";
    
    processed += languageRule;

    // Construct Easter Egg Rule dynamically
    let easterEggRule = "";
    if (easterEggCount === 0) {
        easterEggRule = "NO EASTER EGGS: Do not include any specific easter eggs in the prompt.";
    } else {
        easterEggRule = `THEMATIC EASTER EGG RULE (MANDATORY & CONTEXTUAL):
- You MUST include exactly ${easterEggCount} Easter Egg(s) in the description.
- Types requested: ${easterEggTypes.map((type, i) => `  ${i+1}. ${type}`).join(', ')}
- CRITICAL CONCEPT: Easter eggs MUST NOT be random, disconnected objects (like a random sword on the floor). They MUST add deep thematic meaning or act as a clever visual metaphor/cameo related to the narrative's context.
- Example: If the narrative is "Queen Victoria was the biggest drug dealer", the easter egg should be "Pablo Escobar is the one placing the crown on her".
- Fallback constraint: If the viewer doesn't understand the easter egg, the primary narrative message MUST still be perfectly clear.
- Do not change the main character's base outfit or appearance defined in the reference.
`;
    }

    // Replace the static Easter Egg section in the default prompt if it exists, 
    // or append/inject if we are using a custom prompt that might not have the placeholder.
    // The DEFAULT_SYSTEM_PROMPT has a section "B. INTEGRASI LOKASI & EASTER EGG".
    // We will try to replace the specific sub-bullet about Single Easter Egg.
    
    // Regex to find the "THEMATIC EASTER EGG (VISUAL METAPHOR/CAMEO)" block and replace it
    const easterEggRegex = /- THEMATIC EASTER EGG \(VISUAL METAPHOR\/CAMEO\):[\s\S]*?- Syarat: Jika penonton awam tidak menyadari easter egg ini, pesan utama dari aksi karakter HARUS tetap tersampaikan dengan sempurna\./;
    
    if (easterEggRegex.test(processed)) {
        processed = processed.replace(easterEggRegex, easterEggRule);
    } else {
        // If regex fails (custom prompt), append it to the end of the prompt
        processed += `\n\n${easterEggRule}`;
    }

    // Add Negative Prompt Rule
    if (negativePrompt.trim()) {
        const negativeRule = `
NEGATIVE PROMPT / FORBIDDEN CONCEPTS (STRICT):
- The following words/concepts are STRICTLY FORBIDDEN in the visual prompts: ${negativePrompt}
- Do NOT include them even if the narrative mentions them.
- Find creative alternatives or omit them entirely.
`;
        processed += negativeRule;
    }

    return processed;
};

// Helper: Clean JSON String from potential Markdown or Conversational text
const cleanJsonString = (input: string): string => {
    let text = input;
    
    // 1. Remove Markdown Code Block wrappers (```json ... ```)
    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = text.match(codeBlockRegex);
    if (match) {
        text = match[1];
    }

    // 2. Find the OUTERMOST JSON Object boundaries (start with { and end with })
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start !== -1 && end !== -1 && end >= start) {
        text = text.substring(start, end + 1);
    }
    
    // 3. Repair common JSON errors (Gemini without responseSchema)
    // Remove trailing commas before } or ]
    text = text.replace(/,(\s*[}\]])/g, '$1');
    // Fix unquoted property names (word: → "word":)
    text = text.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":');
    // Replace smart/curly quotes with straight quotes
    text = text.replace(/[\u201C\u201D]/g, '"');
    // Remove // comments
    text = text.replace(/\/\/.*$/gm, '');
    
    return text.trim();
};

// Helper: Parse JSON with repair fallback
const safeJsonParse = (text: string): any => {
    try {
        return JSON.parse(text);
    } catch (firstError: any) {
        // Attempt repair: escape unescaped newlines inside string values
        try {
            const repaired = text.replace(/(?<=: ")([^"]*?)\n([^"]*?)(?=")/g, '\\n');
            return JSON.parse(repaired);
        } catch (secondError: any) {
            throw new Error(`JSON parse failed. Position ${firstError.message.match(/position (\d+)/)?.[1] || '?'}: ${firstError.message}. Raw (200 chars): ${text.slice(0, 200)}`);
        }
    }
};

// Helper: Escape Regex
const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Helper: Enhance physical traits for specific characters like Ilmu Lidi.
const enhanceSpecificCharacters = (prompt: string): string => {
    const ilmuLidiRegex = /ilmu\s*lidi/i;
    if (ilmuLidiRegex.test(prompt) && !prompt.toLowerCase().includes("sepatu merah")) {
        return prompt + " (Karakter Ilmu Lidi WAJIB digambar dengan tangan hitam tetapi telapak tangan putih serta kaki hitam dengan sepatu merah).";
    }
    return prompt;
};

// Helper: Apply Narrator Suffix to Visual Prompts
const applyNarratorSuffix = (prompt: string, narratorName: string, narratorSuffix: string): string => {
    let finalPrompt = enhanceSpecificCharacters(prompt);

    if (!narratorSuffix.trim() || !narratorName.trim()) return finalPrompt;
    
    // If the prompt already contains the suffix, don't append it again.
    if (finalPrompt.toLowerCase().includes(narratorSuffix.toLowerCase().trim())) {
        return finalPrompt;
    }

    const narratorRegex = new RegExp(`(${escapeRegExp(narratorName)})`, 'i');
    if (narratorRegex.test(finalPrompt)) {
        return finalPrompt.replace(narratorRegex, `$1 ${narratorSuffix.trim()}`);
    }
    return finalPrompt;
};

// Helper: Retry operation with exponential backoff
const retryOperation = async <T>(
    operation: () => Promise<T>, 
    retries = 2, 
    delay = 2000
): Promise<T> => {
    try {
        return await operation();
    } catch (err: any) {
        const msg = (err.message || "").toLowerCase();
        // Retry on Server Errors (5xx), RPC failures, or Network Errors
        if (retries > 0 && (
            msg.includes("500") || 
            msg.includes("503") || 
            msg.includes("rpc failed") || 
            msg.includes("fetch failed") || 
            msg.includes("network error") || 
            msg.includes("unknown") ||
            msg.includes("unexpected token") // Retry on JSON parse errors sometimes helps if model hallucinated
        )) {
            console.warn(`API Error (${msg}). Retrying in ${delay}ms... (Attempts left: ${retries})`);
            await new Promise(res => setTimeout(res, delay));
            return retryOperation(operation, retries - 1, delay * 2);
        }
        throw err;
    }
};

// Helper: Call SumoPod API (Supports DeepSeek and Seed models)
const callSumoPodAI = async (apiKey: string, modelName: string, messages: any[], temperature = 0.7, maxTokens = 4096) => {
    if (!apiKey) throw new Error("SumoPod API Key is required.");

    const directUrl = "https://ai.sumopod.com/v1/chat/completions";
    // Using corsproxy.io as a fallback
    const proxyUrl = "https://corsproxy.io/?" + encodeURIComponent(directUrl);
    
    const payload = {
        model: modelName,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false
    };

    const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
    };

    const makeRequest = async (url: string) => {
        const response = await fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`SumoPod API Error (${response.status}): ${errText}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || "";
    };

    try {
        // Attempt Direct Call
        return await makeRequest(directUrl);
    } catch (error: any) {
        // Retry via Proxy on failure
        if (error.message && (error.message.includes("Failed to fetch") || error.message.includes("NetworkError"))) {
            console.warn("Direct SumoPod connection failed (CORS). Retrying via Proxy...");
            try {
                return await makeRequest(proxyUrl);
            } catch (proxyError: any) {
                throw new Error(`Koneksi SumoPod Gagal (CORS). Gunakan Extension 'Allow CORS' atau Proxy. (${proxyError.message})`);
            }
        }
        throw error;
    }
};

/**
 * Uses Gemini 3 Flash to analyze text and generate nested scene/frames
 */
export const analyzeNarrativeToScenes = async (
  context: string,
  targetParagraph: string,
  characterList: string,
  systemInstruction: string,
  narratorName: string = "Norman",
  narratorSuffix: string = "",
  styleSuffix: string = "Modern 2D webcomic style",
  easterEggCount: number = 1,
  easterEggTypes: string[] = ["pop culture"],
  negativePrompt: string = "",
  language: 'id' | 'en' = 'id',
  manualApiKey?: string,
  enforceObserver: boolean = true
): Promise<StoryScene[]> => {
  const ai = getClient(manualApiKey);
  
  // Process placeholders in system instruction
  const finalSystemInstruction = processSystemInstruction(systemInstruction, narratorName, styleSuffix, easterEggCount, easterEggTypes, negativePrompt, language);
  
  // Bilingual scene type decision guide
  const sceneTypeGuide = language === 'id' ? `PANDUAN SCENE TYPE — Pilih berdasarkan FUNGSI NARASI adegan ini:

═══════════════════════════════════════════════════════
🔴 ATURAN UTAMA — HARAM MELANGGAR:
1. DUA ADEGAN BERTURUT-TURUT TIDAK BOLEH SAMA SCENE TYPE-nya.
   Jika scene N adalah "host-direct", scene N+1 HARUS beda tipe.
2. GUNAKAN SEMUA 5 SCENE TYPES dalam satu storyboard.
   Variasi visual adalah kunci retensi penonton.
3. Setiap scene harus punya IDENTITAS VISUAL UNIK.
   Jangan ulangi komposisi yang sama.
═══════════════════════════════════════════════════════

TIPS VARIASI:
- "capek banget" → metaphor-scene (visualisasi kelelahan)
- "Dan tau nggak?" → host-direct (retoris pendek, langsung ke penonton)
- "dulu vs sekarang" → contrast (split-frame perbandingan)
- "istilah penting" → typography-hero (teks/angka sebagai hero)
- "3 langkah" → multi-panel (urutan dalam panel komik)

host-direct:
  KAPAN → Host bicara LANGSUNG ke kamera: pembuka, CTA penutup, bridging topik, pertanyaan retoris, interaksi langsung dengan penonton
  JANGAN → Adegan menjelaskan konsep tanpa interaksi host; voice-over naratif tanpa host di layar
  KARAKTER → WAJIB ${narratorName} (host). TIDAK BOLEH karakter lain.
  VIBE → Tatap kamera, gestur tangan ekspresif dan dinamis, seolah bicara ke penonton dengan energi. BUKAN pasif atau statis.
  ALTERNATIF → contrast, metaphor-scene, typography-hero

contrast:
  KAPAN → Membandingkan DUA SISI: dulu vs sekarang, baik vs buruk, mitos vs fakta, ironi, paradoks, ekspektasi vs realita
  JANGAN → Urutan langkah/sequence (pakai multi-panel); metafora abstrak (metaphor-scene)
  KARAKTER → DUA karakter BERBEDA — ${narratorName} di satu sisi, figuran (atau objek) di sisi lain. JANGAN ${narratorName} di kedua sisi.
  VIBE → Dua keadaan berdampingan. Split-frame atau transisi. Dramatisasi perbedaan. Hitam-putih vs warna.
  ALTERNATIF → host-direct, metaphor-scene, multi-panel

metaphor-scene:
  KAPAN → Analogi MENDALAM, konsep abstrak DIVISUALISASIKAN secara surealis/kiasan: "beban pikiran seperti gunung", "kebohongan seperti jaring laba-laba"
  JANGAN → Penjelasan literal; adegan realitas sehari-hari tanpa simbolisme; teks sebagai hero (typography-hero)
  KARAKTER → FIGURAN atau OBJEK simbolik. JANGAN ${narratorName}. Objek tanpa karakter lebih bagus (bola rantai, jam pasir retak, sangkar kosong).
  VIBE → Karakter di DALAM dunia metafora. Surealis, simbolik, imajinatif, seperti Pixar.
  ALTERNATIF → host-direct, contrast, multi-panel

typography-hero:
  KAPAN → Kata kunci, definisi, kutipan, angka penting sebagai HERO visual utama — bikin penonton INGAT
  JANGAN → Adegan yang butuh aksi atau narasi bergerak; konten yang lebih efektif jika dijelaskan secara visual
  KARAKTER → TANPA KARAKTER APAPUN. Hanya teks/angka sebagai hero visual. Ini HARD RULE — tidak boleh ada karakter.
  VIBE → Teks/angka BESAR mendominasi frame. Bold, minimalis, berani. Satu kata/frase/angka sebagai pusat perhatian.
  ALTERNATIF → host-direct, contrast, multi-panel

multi-panel:
  KAPAN → BEBERAPA PANEL (2-3) dalam SATU frame: urutan langkah, kronologi, adegan paralel, sequence events
  JANGAN → Satu momen saja yang cukup dengan satu scene type; terlalu banyak teks per panel
  KARAKTER → Campur bebas antar panel. Jangan semua panel karakter sama. Variasikan ${narratorName} + figuran + objek.
  VIBE → Gaya komik strip. Beberapa kejadian simultan dalam satu frame. Grid, komparasi.
  ALTERNATIF → contrast, metaphor-scene, host-direct
` : `SCENE TYPE GUIDE — Pick based on NARRATIVE FUNCTION:

═══════════════════════════════════════════════════════
🔴 HARD RULES — MUST FOLLOW:
1. NO TWO CONSECUTIVE SCENES may have the same sceneType.
   If scene N is "host-direct", scene N+1 MUST be different.
2. USE ALL 5 SCENE TYPES across the storyboard.
   Visual variety is key to viewer retention.
3. Each scene must have a VISUALLY UNIQUE IDENTITY.
   Don't repeat the same composition.
═══════════════════════════════════════════════════════

host-direct:
  WHEN → Host speaks DIRECTLY to camera: opening hook, closing CTA, topic transition, rhetorical question, direct viewer engagement
  NOT when → Scene explaining a concept without host interaction; voice-over narration without host on screen
  CHARACTER → MUST use ${narratorName} (host). NO other characters allowed.
  VIBE → Eye contact with camera, natural gestures. Warm, personal, engaging.
  ALTERNATIVE → contrast, metaphor-scene, typography-hero

contrast:
  WHEN → Comparing TWO SIDES: past vs present, good vs bad, myth vs fact, irony, paradox, expectation vs reality
  NOT when → Steps/sequence (use multi-panel); abstract metaphor (metaphor-scene)
  CHARACTER → TWO DIFFERENT characters — ${narratorName} on one side, supporting character (or object) on the other. Do NOT use ${narratorName} on both sides.
  VIBE → Two states side by side. Split-frame or transition. Dramatization of difference. B&W vs color.
  ALTERNATIVE → host-direct, metaphor-scene, multi-panel

metaphor-scene:
  WHEN → Deep ANALOGY, abstract concept VISUALIZED surrealistically/figuratively: "mental burden as a mountain", "lies as a spider web"
  NOT when → Literal explanation; everyday reality without symbolism; text as hero (typography-hero)
  CHARACTER → SUPPORTING character or symbolic OBJECT. Do NOT use ${narratorName}. Object-only is great (chain ball, cracked hourglass, empty cage).
  VIBE → Character INSIDE the metaphor world. Surreal, symbolic, imaginative, Pixar-style.
  ALTERNATIVE → host-direct, contrast, multi-panel

typography-hero:
  WHEN → Key word, definition, quote, important number as visual HERO — makes viewers REMEMBER
  NOT when → Scenes needing action or narrative movement; content better explained visually
  CHARACTER → NO CHARACTER AT ALL. Only text/number as visual hero. This is a HARD RULE.
  VIBE → BIG text/number dominates frame. Bold, minimal, striking. One word/phrase/number as focal point.
  ALTERNATIVE → host-direct, contrast, multi-panel

multi-panel:
  WHEN → Multiple PANELS (2-3) in ONE frame: steps, chronology, parallel scenes, sequence events
  NOT when → Single moment that one scene type can handle; too much text per panel
  CHARACTER → Mix freely across panels. Don't use the same character in all panels. Vary ${narratorName} + supporting + objects.
  VIBE → Comic strip style. Multiple simultaneous events in one frame. Grid, comparison.
  ALTERNATIVE → contrast, metaphor-scene, host-direct
`;
  // Bilingual T2I composition template per scene type
  const sceneTypeComposition = buildSceneTypeComposition(language);

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      scenes: {
        type: Type.ARRAY,
        description: "List of scenes. RULE: Every sentence ending in a period (.), question mark (?), or exclamation mark (!) MUST be a separate Scene object.",
        items: {
          type: Type.OBJECT,
          properties: {
            narrativeText: { type: Type.STRING },
            frames: {
              type: Type.ARRAY,
              description: "Array of visual frames.",
              items: {
                type: Type.OBJECT,
                properties: {
                    visualPrompt: { type: Type.STRING, description: `Detailed prompt in ${language === 'en' ? 'ENGLISH' : 'INDONESIAN'} (International Context). Must start with '[INDOOR/OUTDOOR] - [Location Name]'. Must include 'easter_egg' as per instructions.` },
                    splitText: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "Each item = 2-20 words chunk for timing/text overlay. Each scene = 1 frame."
                    },
                    sceneType: { type: Type.STRING, description: `Scene type for this frame. CRITICAL: Choose based on NARRATIVE FUNCTION of this scene, not arbitrarily.

${sceneTypeGuide}` },
                    sceneMode: { type: Type.STRING, description: "Mode for the chosen sceneType, auto-detected from narrative." }
                },
                required: ["visualPrompt", "splitText", "sceneType", "sceneMode"]
              }
            }
          },
          required: ["narrativeText", "frames"]
        }
      }
    },
    required: ["scenes"]
  };

  const promptContent = `
    Analyze the following Target Narrative based on the Context.
    
    OUTPUT LANGUAGE: ${language === 'en' ? 'ENGLISH' : 'INDONESIAN'}
    
    INPUT DATA:
    1. Context (Backstory/Previous Events): "${context}"
    2. Characters: "${characterList}"
    3. TARGET NARRATIVE (Process THIS Text Only): "${targetParagraph}"

    OBJECTIVE: Break down ONLY the "TARGET NARRATIVE" into scenes. 

    CRITICAL SCOPE BOUNDARY (STRICT):
    - YOU MUST ONLY process the text inside "TARGET NARRATIVE".
    - ABSOLUTELY DO NOT generate scenes from the "Context". Context is ONLY for understanding character/setting.
    - ABSOLUTELY DO NOT continue the story beyond the "TARGET NARRATIVE".
    - STOP processing exactly when "TARGET NARRATIVE" ends.
    - If "TARGET NARRATIVE" contains 3 sentences, output MUST contain exactly 3 Scenes.
    
    CRITICAL RULE 0 (PRESERVE HEADINGS):
    - IF a line looks like a Heading/Subtitle (e.g., "Tanda #2:", "Nomor 3.", "Poin Pertama:", "Langkah A:"), YOU MUST TREAT IT AS A SEPARATE SCENE.
    - DO NOT merge the heading with the next sentence. Even if it doesn't end with a period.
    - Example Input: "Tanda #2: Tega Menolak Teman. Nah, kita masuk ke..."
    - Example Output: 
      Scene 1: "Tanda #2: Tega Menolak Teman."
      Scene 2: "Nah, kita masuk ke..."

    CRITICAL RULE 1: Group short consecutive sentences into SCENES of 3-15 words each. Do NOT split every sentence into its own scene — that creates too many tiny scenes. And do NOT group too many sentences — scenes should be digestible 3-15 word chunks. If multiple short sentences together form a coherent visual idea and stay within 3-15 words, combine them into one scene. Example: "Open your fridge. Go on. Take a look." (8 words total) → ONE scene. "A carton of milk. Some cheese. Maybe that leftover pizza." (11 words) → ONE scene. But "A carton of milk. Some cheese. Maybe that leftover pizza. None of it is old. None of it has expired." (18 words) → must be split into two scenes.

    CRITICAL RULE 2: Each scene = 1 frame. No Multi Panel, no Sequence. The 'splitText' array contains chunks of 3-15 words for timing. The visualPrompt describes a single image.

    CRITICAL - VISUAL PROMPT STRUCTURE:
    
    RULE 1: NO BACKGROUND OR STYLE DESCRIPTIONS
    - Do NOT include any background, location, or style descriptions in your prompt.
    - Do NOT start with "[Indoor/Outdoor]" or any location tag.
    - Do NOT mention "white background", "full color", "vector style", or any visual style terms.
    - The visual style and background are handled by an automatic style suffix appended after generation.
    - Focus ONLY on: character action, expression, composition, camera angle, objects involved.
    - Example prompt (what you should write): "${styleSuffix.toLowerCase().includes('stick figure') 
      ? (language === 'id' ? 'Stick figure karakter berdiri di depan lemari es terbuka, ekspresi terkejut.' : 'A stick figure character stands in front of an open refrigerator, surprised expression, low angle shot, comic composition.') 
      : (language === 'id' 
        ? narratorName + ' berdiri di depan lemari es terbuka, ekspresi terkejut setengah badan.' 
        : narratorName + ' standing in front of an open refrigerator, surprised expression, half body shot.')}"
    - Example of what NOT to do (style/background): "Pure solid minimalist white background. In a modern kitchen..."
    
    RULE 2: THEMATIC EASTER EGGS (MANDATORY & CONTEXTUAL)
    - You MUST include ${easterEggCount} specific easter egg(s). Target types: ${easterEggTypes.join(", ")}.
    - CRITICAL RULE: Easter eggs MUST NOT be random objects placed in the background. They MUST BE deeply connected to the context of the text, acting as visual metaphors, clever cameos, or thematic symbols.
    - Example: Text: "Queen Victoria is a huge drug dealer." -> Easter Egg: "Pablo Escobar is the person placing the crown on her head."
    - If the user doesn't get the reference, the main action MUST still make complete sense on its own.
    
    RULE 3: VIDEO RETENTION & CREATIVE DIRECTION (MANDATORY)
    - To maximize video retention, prompts MUST be highly engaging, memorable, and visually dramatic.
    - 1. CINEMATOGRAPHY: Use dynamic camera angles (e.g., Extreme Close-Up, Low Angle, Dutch Angle, Over-the-shoulder, Fish-eye). Break visual monotony.
    - 2. EXAGGERATED EMOTIONS: Characters MUST display intense, exaggerated expressions (e.g., extreme shock, crying rivers, evil laughing, burning rage, comedic deadpan) based on text tone.
    - 3. DYNAMIC ACTION: Add motion lines, extreme action poses, speed blur, or foreshortening to make scenes feel alive.
    - 4. LIGHTING & VFX: Add dramatic lighting (rim lighting, deep shadows) or visual comedy VFX (giant anime sweat drops, impact frames).

    CASE 1: SUBTITLES / HEADINGS (V2.8 SPECIAL RULE)
    - DETECT: If text is a subtitle/label (e.g. "Tanda #3: ...", "Nomor 1: ...", or a short emphatic statement).
    - ACTION: The visual prompt MUST describe a Title Card.
    - INSTRUCTION: Add "Teks besar '[Content]' muncul di tengah layar dengan font Headline tebal. Desain minimalis."
    
    CASE 2: STANDARD FRAME
    - Standard visual description. Include 'easter_egg'. A single image that captures the narrative.
    - The 'splitText' contains chunks for timing — the image itself is one unified composition.

    CRITICAL - CHARACTER PRESENCE (STRICT USAGE OF AVAILABLE CHARACTERS):
    1. AVAILABLE CHARACTERS: You have these characters available: "${characterList}".
    2. USAGE RULE: You MUST use the characters from the AVAILABLE CHARACTERS list in the scenes. Do NOT just use "${narratorName}" for everything.
    3. DISTRIBUTION: If there are multiple available characters, distribute them across the scenes. Have them act out or interact with the situations described in the narrative.
    ${enforceObserver
        ? `4. FALLBACK: Only if the narrative is purely abstract and no other characters fit, use "${narratorName}" observing the scene. But strongly prefer using the other available characters.`
        : `4. DO NOT add "${narratorName}" as an observer. If the scene has no available characters, you may leave it without any character. This is a non-mascot channel.`
    }
    
    CRITICAL - FRAMING & COMPOSITION RULES (STRICT):
    1. MINIMUM FRAMING: "Half-Body Shot" (Setengah Badan) or "Full Body Shot".
    2. VISIBILITY: Reference Character SHOULD be visible in host-direct and some scenes, but NOT in every frame. typography-hero scenes MUST have NO character. metaphor-scene may use objects instead of characters. contrast should use DIFFERENT characters on each side, not the same character twice.
    3. PROHIBITION: DO NOT generate Extreme Close-ups of body parts (hands, feet) or objects without purpose. Object-only scenes ARE allowed for metaphor and typography.

    CRITICAL - CHARACTER DESCRIPTION RULES:
    1. REFERENCE CHARACTER (narrator/host with reference image): JUST use the character name and their action/pose. DO NOT describe clothing, physical features, or appearance — the reference image handles the visual identity. DO NOT use the word "Ilustrasi".
    2. SUPPORTING CHARACTER (figuran WITHOUT reference image): MUST describe IN FULL — age, gender, outfit, hairstyle. Example: "seorang wanita 30 tahun berambut pendek dengan blazer navy". This ensures the image generator can create a visually distinct character. Figuran descriptions must be specific and memorable.

    FINANCIAL/MATH OVERLAY RULE (CRITICAL FOR V2.7):
    If the narrative contains monetary values or calculations (e.g., "sepuluh ribu", "tiga ratus ribu", "tiga juta enam ratus ribu"):
    1. CONVERT words to digits (e.g., "tiga juta" -> "3,000,000" or "3M" -> Use International Format).
    2. DETECT timeframe if present/implied (hari/bulan/tahun).
    3. ADD INSTRUCTION: "Teks besar '[Angka] [Periode]' muncul melayang dengan font tebal digital."
    
    STYLE MANDATE:
    - Do NOT include any style description or style suffix in your prompt.
    - The visual style suffix will be appended automatically after generation.
    - Your prompt MUST contain ONLY: scene content, character actions, expressions, composition, camera angles.
    
    SCENE TYPE VARIETY & COMPOSITION (CRITICAL — DO NOT IGNORE):
    - VARY the sceneType across scenes. Do NOT default to "host-direct" for every scene.
    - Use ALL 5 scene types across the storyboard for maximum visual variety.
    - Choose based on NARRATIVE FUNCTION, not convenience.
    
    CHARACTER DISTRIBUTION (CRITICAL):
    - ${narratorName} ONLY for host-direct scenes. For contrast, metaphor, multi-panel → use OTHER characters or objects.
    - typography-hero → NO CHARACTER AT ALL. Text/number only.
    - ${narratorName} in MAX 50% of scenes. The rest MUST vary.
    
    **CRITICAL: YOUR visualPrompt MUST REFLECT the chosen sceneType's visual language.**
    Do NOT just write "Mascot is doing X" for every scene type. Each scene type has UNIQUE visual composition:
    
    | sceneType | What visualPrompt MUST describe |
    |---|---|
    | host-direct | Mascot FACE KAMERA 50-60% frame, gestur tangan DINAMIS dan EKSPRESIF, kontak mata langsung. Teks overlay sebagai floating labels. DILARANG: pose statis "berdiri tegak", "tatapan lembut", atau gestur pasif. |
    | contrast | DUA SISI kontras dalam satu frame — kiri/kanan split-frame. Garis pemisah tegas. Satu sisi sepia/lama, sisi lain vibrant/baru. |
    | metaphor-scene | METAFORA PENUH — mascot ADA DI DALAM adegan metafora. Seluruh frame adalah dunia metafora. Gaya surealis, simbolik. |
    | typography-hero | TEKS/ANGKA sebagai hero 50-60% frame — kata kunci BESAR di tengah. Mascot di pojok (max 20% frame) bereaksi. |
    | multi-panel | Frame terbagi jadi 2-3 PANEL komik. Masing-masing panel punya adegan sendiri. Border tipis pemisah. |
    
    CONTOH: Jika sceneType="typography-hero", visualPrompt HARUS deskripsikan teks besar sebagai elemen hero. Jika sceneType="contrast", visualPrompt HARUS deskripsikan dua sisi dengan split-frame. Jika tidak ada elemen scene type dalam visualPrompt, scene type tidak berguna.
    
    🔴 NO TEXT IN IMAGE: Unless sceneType is "typography-hero", DO NOT describe any text, words, letters, labels, signs, subtitles, speech bubbles, or written content appearing inside the image. The rendered image must contain ZERO text elements except when typography IS the hero. This is a HARD RULE.
    
    CRITICAL — THESE MUST BE INCLUDED VERBATIM IN EVERY visualPrompt:
    - Anti-Mirror Clause: "Do NOT apply flipped/reversed text effects (text mirroring) to any text, logos, symbols, or written words on the character's clothing/accessories. Keep text in original readable orientation. Physical mirrors/reflections as props ARE allowed."
    ${enforceObserver
        ? `- If narratorName "${narratorName}" is NOT mentioned in the prompt, AND that is the only available character: add ". ${narratorName} is standing in the scene, observing quietly (Half-Body Shot)."`
        : `- Do NOT add "${narratorName}" as an observer. Scenes may proceed without any character present.`
    }
    
    RETURN JSON FORMAT ONLY. The output must be valid JSON matching the schema.
  `;

  let text = "";

  const generateConfig = {
      contents: promptContent,
      config: {
        systemInstruction: finalSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema
      }
  };

  try {
      const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        ...generateConfig,
        config: {
          ...generateConfig.config,
          safetySettings: [
            { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
            { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' }
          ]
        }
      }), 2, 2000); // 2 retries
      text = response.text || "";
  } catch (error: any) {
      throw new Error(`Storyboard generation failed. Server busy or input too complex. (${error.message})`);
  }

  if (!text) throw new Error("No response from AI");

  // Robust cleaning (Handles Nvidia/DeepSeek/Seed artifacts)
  text = cleanJsonString(text);

  try {
    const data = JSON.parse(text) as AnalysisResponse;
    return data.scenes.map((scene, sIdx) => ({
      id: `scene-${Date.now()}-${sIdx}`,
      narrativeText: scene.narrativeText,
      frames: scene.frames.map((frame, fIdx) => ({
        id: `frame-${Date.now()}-${sIdx}-${fIdx}`,
        sceneType: (frame.sceneType || 'host-direct') as SceneType,
        sceneMode: (frame.sceneMode || 'direct') as SceneMode,
        visualPrompt: applyNarratorSuffix(frame.visualPrompt, narratorName, narratorSuffix),
        splitText: frame.splitText,
        isGenerating: false
      })),
      isRestructuring: false
    }));
  } catch (e) {
    console.error("JSON Parse Error. Cleaned text:", text);
    throw new Error(`Failed to parse AI response. Ensure response is JSON.`);
  }
};

/**
 * Generates visual prompts from current split text config using Gemini 3 Flash
 */
export const generatePromptsFromFrames = async (
    context: string,
    characterList: string,
    narrativeText: string,
    frames: StoryFrame[],
    systemInstruction: string,
    narratorName: string = "Norman",
    narratorSuffix: string = "",
    styleSuffix: string = "Modern 2D webcomic style",
    easterEggCount: number = 1,
    easterEggTypes: string[] = ["pop culture"],
    negativePrompt: string = "",
    language: 'id' | 'en' = 'id',
    manualApiKey?: string,
    enforceObserver: boolean = true
): Promise<string[]> => {
    const ai = getClient(manualApiKey);

    // Process placeholders in system instruction
    const finalSystemInstruction = processSystemInstruction(systemInstruction, narratorName, styleSuffix, easterEggCount, easterEggTypes, negativePrompt, language);

    // Prepare a simplified representation of the frames for the AI
    const framesConfig = frames.map((f, i) => ({
        index: i,
        splitText: f.splitText
    }));

    // Bilingual T2I composition template per scene type
    const sceneTypeComposition = buildSceneTypeComposition(language);

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            prompts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Array of visual prompts. Length MUST match the number of frames provided."
            }
        },
        required: ["prompts"]
    };

    const promptContent = `
        Generate ${language === 'en' ? 'ENGLISH' : 'INDONESIAN'} Visual Prompts based on the configuration provided.
        
        Context: ${context}
        Characters (Names): ${characterList}
        Full Narrative: ${narrativeText}
        
        FRAMES CONFIGURATION: ${JSON.stringify(framesConfig)}

        STRICT LOGIC:
        1. Input is an array of frames. Output MUST be an array of "prompts" of exactly the same length.
        2. INDEX MAPPING IS CRITICAL. Prompt at index 0 corresponds to Frame at index 0. Prompt at index 1 corresponds to Frame at index 1.
        
        3. STANDARD FRAME: Each frame represents ONE SINGLE IMAGE. Do NOT describe multiple panels or sequences.
           - The 'splitText' array contains text chunks for overlay timing — the image itself is a single unified composition.
           - Include 'easter_egg' in the scene description.
           - NEVER use phrases like "di frame berikutnya" or describe what happens in other frames.
           - A single prompt describes ONLY A SINGLE IMAGE. This is critical.
        
        4. SCENE TYPE VISUAL COMPOSITION (CRITICAL) — Each sceneType MUST drive unique visuals:

${sceneTypeComposition}
        
        CRITICAL: Do NOT use the same composition for different sceneTypes.
        
        5. TEXT OVERLAY RULE (V2.8 UPDATE):
           - IF the text contains words in ALL CAPS (e.g. "GAK SADAR DIRI"), you MUST include an instruction: "Teks besar '[WORD]' muncul di gambar dengan font tebal komik."
           - **SUBTITLE / HEADING RULE**: If the narrative looks like a Heading (e.g. "Tanda #3: ...", "Nomor 1: ..."), you MUST include instruction: "Teks besar '[FULL SUBTITLE]' muncul di tengah layar dengan font Headline tebal. Desain minimalis."

        6. FINANCIAL/MATH OVERLAY RULE (CRITICAL FOR V2.7):
           - IF the narrative contains monetary values or calculations (e.g., "sepuluh ribu", "tiga ratus ribu", "tiga juta enam ratus ribu"):
           - CONVERT words to digits (e.g., "tiga juta" -> "3M" or "3,000,000").
           - DETECT timeframe if present/implied (hari/bulan/tahun).
           - ADD INSTRUCTION: "Teks besar '[Angka] [Periode]' muncul melayang dengan font tebal digital."
           
        7. CRITICAL - CHARACTER PRESENCE (FALLBACK OBSERVER RULE):
           - IF the narrative is abstract/metaphorical and NO specific character fits:
           - YOU MUST INCLUDE "${narratorName}" in the prompt.
           - DESCRIBE him as OBSERVING the scene (e.g. "${narratorName} watching the situation").

        8. NO BACKGROUND OR STYLE DESCRIPTIONS:
           - Do NOT include any background, location, or style descriptions.
           - Do NOT start with "[Indoor/Outdoor]" or any location tag.
           - The visual style and background are handled by an automatic suffix appended after generation.
           - Focus ONLY on: character action, expression, composition, camera angle, objects.
           - Include ${easterEggCount} "easter_egg" item(s): ${easterEggTypes.join(", ")}.
        
        9. CHARACTER DESCRIPTION RESTRICTIONS (STRICT):
           - DO NOT describe character clothing or physical appearance.
           - DO NOT use the word "Ilustrasi".
           - Rely ONLY on the Character Name for visual consistency via reference images.

        10. FRAMING & COMPOSITION RULES (MANDATORY):
           - MINIMUM FRAMING: "Half-Body Shot" (Setengah Badan) or "Full Body Shot".
           - VISIBILITY: At least one Reference Character MUST be visible in every frame.
           - PROHIBITION: DO NOT generate Extreme Close-ups of body parts (hands, feet) or objects without the character's face/body being visible.
           
        11. STYLE REQUIREMENT:
           - Do NOT include any style description, style suffix, or visual style terms in your prompt.
           - The style suffix will be appended automatically after generation.
           - Your prompt MUST contain ONLY scene content — character actions, expressions, composition, camera angles.
           - This is critical to avoid duplicate style/background descriptions in the final image prompt.
        
        12. VARIATION RULE — EVERY PROMPT MUST BE UNIQUE:
           - Each prompt MUST be visually distinct from the others. No two prompts should describe the same scene.
           - Even when narrative content is similar between frames, vary the camera angle, character pose, composition, perspective, background focus, or visual elements.
           - Do NOT copy-paste the same description for different frames.
           - Example of what NOT to do (duplicate): Frame 0: "person in front of fridge" AND Frame 1: "person in front of fridge" — BAD, these are identical.
           - Example of good variation: Frame 0: "person in front of fridge, wide shot" AND Frame 1: "close-up of person's hand on fridge handle, low angle" — GOOD, distinct perspectives.
        
        14. CRITICAL UNIQUENESS — EACH PROMPT MUST BE VISUALLY DISTINCT:
           - The FULL CONTEXT is: ${context}
           - This specific scene's text is: "${narrativeText}"
           - Your prompt MUST focus on the UNIQUE details of THIS specific narrative text.
           - Do NOT reuse compositions or descriptions from other scenes.
           - Analyze what makes THIS moment different: is it a specific object, emotion, action, or setting change?
           - Example: "a carton of milk. some cheese." = focus on refrigerator shelves, food packaging, barcode, cold air — different from "leftover pizza" which = pizza box, opened slice, food waste.
           - The sceneType label is just a guide — the NARRATIVE CONTENT determines the actual visual.
        
        15. CRITICAL — INCLUDE THESE VERBATIM IN EVERY prompt:
           - Anti-Mirror Clause: "Do NOT apply flipped/reversed text effects (text mirroring) to any text, logos, symbols, or written words on the character's clothing/accessories. Keep text in original readable orientation. Physical mirrors/reflections as props ARE allowed."
           ${enforceObserver
               ? `- If narratorName "${narratorName}" is NOT mentioned in the prompt, AND that is the only available character: add ". ${narratorName} is standing in the scene, observing quietly (Half-Body Shot)."`
               : `- Do NOT add "${narratorName}" as an observer. Scene without any character is allowed.`
           }
        RETURN JSON FORMAT ONLY. Output must be a JSON object with a "prompts" array of strings.
    `;

    let text = "";

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents: promptContent,
            config: {
                systemInstruction: finalSystemInstruction,
                responseMimeType: "application/json",
                responseSchema: schema
            }
        }));
        text = response.text || "";
    } catch (e: any) {
        throw new Error(`Prompt generation failed: ` + e.message);
    }
    
    if(!text) throw new Error("No response");
    
    // Clean potential markdown or conversation wrappers
    text = cleanJsonString(text);

    const data = JSON.parse(text) as { prompts: string[] };
    return data.prompts.map(p => {
        // Cleanup any stray formatting prefixes that the AI might have included
        let cleaned = p.replace(/^(?:Sequence|Frame|Panel|Langkah|Step|Prompt)[\s\w\(\)\/]*[:\.\-]*\s*/gi, "").trim();
        cleaned = cleaned.replace(/^(?:\d+\.)\s*/g, "").trim();
        const enhanced = applyNarratorSuffix(cleaned, narratorName, narratorSuffix);
        // Append style suffix — visible in T2I column, sent AS-IS to Gemini (no hidden modifications)
        return enhanced + "\n" + styleSuffix;
    });
};

/**
 * Refines a specific prompt based on instruction using Gemini 3 Flash
 */
export const refineScenePrompt = async (
  context: string,
  characterList: string,
  narrativeChunk: string,
  currentPrompt: string,
  instruction: string,
  systemInstruction: string,
  narratorName: string,
  narratorSuffix: string,
  styleSuffix: string,
  easterEggCount: number,
  easterEggTypes: string[],
  negativePrompt: string,
  language: 'id' | 'en',
  manualApiKey?: string,
  isCharacter: boolean = false
): Promise<string> => {
  const ai = getClient(manualApiKey);

  // Create a character-specific style suffix with white background if needed
  const finalStyleSuffix = isCharacter 
    ? styleSuffix.replace(/pastel color background/gi, "pure white background")
    : styleSuffix;

  // Process placeholders in system instruction
  const finalSystemInstruction = processSystemInstruction(systemInstruction, narratorName, finalStyleSuffix, easterEggCount, easterEggTypes, negativePrompt, language);

  const promptContent = `
    Refine the following Visual Prompt based on the User Instruction.
    Context: ${context}
    Characters: ${characterList}
    ${isCharacter ? `Target Character: ${narrativeChunk}` : `Narrative Chunk: ${narrativeChunk}`}
    Current Prompt: ${currentPrompt}
    User Instruction: ${instruction}

    Output ONLY the revised prompt text in ${language === 'en' ? 'ENGLISH' : 'INDONESIAN'}.
    
    CRITICAL: 
    - NEVER use "Karakter Utama" or "Main Character". 
    - ALWAYS use the specific character Name from the provided Characters list.
    ${isCharacter ? "- DESCRIBE clothing, physical appearance, and accessories in detail." : "- DO NOT describe clothing or physical appearance of the character (handled by style rules)."}
    - DO NOT use the word "Ilustrasi".
    - MAINTAIN the Location ([Indoor/Outdoor]) description if present.
    - MAINTAIN "easter_egg" if present.
    - ${isCharacter ? 'MANDATORY: Include the phrase "Fullbody Shot".' : 'STRICTLY FORCE "Half-Body Shot" or wider. No close-ups of just hands/feet.'}
    ${isCharacter ? "- ENSURE the background is explicitly mentioned as 'pure white background'." : `- IF no character is present, ADD "${narratorName}" observing the scene.`}
    
    STYLE PRESERVATION:
    - The revised prompt MUST still contain: "${finalStyleSuffix}"
    - If it is missing, APPEND it to the end.
    
    CRITICAL OUTPUT RULE: Return ONLY the plain text string. Do NOT use JSON.
  `;

  // GEMINI
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: promptContent,
    config: {
      systemInstruction: finalSystemInstruction, // Pass the persona
    }
  });

  let result = response.text || currentPrompt;
  result = result.replace(/^```json/, '').replace(/^```/, '').replace(/```$/, '').trim();

  try {
      if (result.trim().startsWith('{')) {
          const parsed = JSON.parse(result);
          if (parsed.visualPrompt) return applyNarratorSuffix(parsed.visualPrompt, narratorName, narratorSuffix) + "\n" + styleSuffix;
          if (parsed.prompt) return applyNarratorSuffix(parsed.prompt, narratorName, narratorSuffix) + "\n" + styleSuffix;
      }
  } catch (e) {
      // Not JSON
  }

  return applyNarratorSuffix(result, narratorName, narratorSuffix) + "\n" + styleSuffix;
};

/**
 * Transforms narrative text into a Voice Director version with emotion cues.
 */
export const transformToVoiceDirector = async (
  text: string,
  language: 'id' | 'en' = 'id',
  manualApiKey?: string
): Promise<string> => {
  const ai = getClient(manualApiKey);

  const systemInstruction = `Peran: Kamu adalah seorang Script Editor untuk Voice Over.

Tugas:
1. Analisis Teks: Baca dan pahami konteks serta emosi dari teks yang diberikan.
2. Tambahkan Keterangan Emosi: Sisipkan sound cues (keterangan suara) TEPAT SEBELUM frasa atau kata yang ingin diubah suaranya.
   - Gunakan HANYA list ini: [whisper], [sigh], [chuckle], [hesitate], [deadpan], [emphasize], [questioning], [trembling], [fast pace], [pause 2s].
   - PENTING: Sound cues harus tepat sesuai format list tersebut.
   - PENTING: Hindari meletakkan sound cue di akhir naskah.
   - BAHASA: Gunakan bahasa ${language === 'id' ? 'Indonesia' : 'Inggris'} untuk sound cues.
3. Penekanan Kata: Ubah kata-kata yang membutuhkan penekanan kuat atau emphasis menjadi HURUF KAPITAL SEMUA (ALL CAPS).
4. Output: Hanya berikan naskah hasil revisi tanpa pengantar atau penutup.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-lite-preview",
    contents: text,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  });

  return response.text || text;
};

/**
 * Generates TTS audio from text using Gemini TTS model.
 *
 * Important: Gemini 2.5 Pro TTS preview can stall indefinitely when consumed via
 * generateContentStream in the browser. Use the non-streaming endpoint for TTS
 * and enforce a client-side timeout so the UI never stays in "Generating..."
 * forever. Gemini 3.1 Flash TTS still works with this non-streaming path.
 */
export const generateTTS = async (
  text: string,
  modelId: string,
  voiceName: string,
  instruction: string,
  manualApiKey?: string
): Promise<{ data: string, mimeType: string }> => {
  const ai = getClient(manualApiKey);

  const normalizedModelId = modelId === 'gemini-2.5-flash-tts-preview'
    ? 'gemini-2.5-flash-preview-tts'
    : modelId;

  const prompt = instruction ? `${instruction}\n\nText to speak: ${text}` : text;
  const request = {
    model: normalizedModelId,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      temperature: 1,
      responseModalities: ["AUDIO"] as any,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName },
        },
      },
    },
  };

  const timeoutMs = normalizedModelId.includes('2.5-pro') ? 120000 : 60000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(new Error(`TTS request timed out after ${Math.round(timeoutMs / 1000)}s. Try Gemini 3.1 Flash TTS or split the script into a shorter segment.`));
    }, timeoutMs);
  });

  let response: GenerateContentResponse;
  try {
    response = await Promise.race([
      ai.models.generateContent(request),
      timeoutPromise,
    ]);
  } catch (error: any) {
    throw new Error(`Gemini TTS failed with ${normalizedModelId}: ${error.message || error}`);
  }

  const audioParts = response.candidates?.[0]?.content?.parts
    ?.map((part: any) => part.inlineData)
    .filter((inlineData: any) => inlineData?.data) || [];

  if (audioParts.length === 0) {
    const responseText = response.text || response.candidates?.[0]?.finishReason || 'No audio returned';
    throw new Error(`Failed to generate audio data from Gemini (${normalizedModelId}). ${responseText}`);
  }

  const audioBytes: Uint8Array[] = [];
  let mimeType = audioParts[0].mimeType || 'audio/pcm;rate=24000';

  for (const inlineData of audioParts) {
    mimeType = inlineData.mimeType || mimeType;
    const binaryString = window.atob(inlineData.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    audioBytes.push(bytes);
  }

  const totalLength = audioBytes.reduce((acc, val) => acc + val.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of audioBytes) {
    combined.set(arr, offset);
    offset += arr.length;
  }

  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < combined.length; i += chunkSize) {
    const chunk = combined.slice(i, i + chunkSize);
    // Use a loop for character conversion to avoid stack overflow for large arrays
    let chunkString = '';
    for (let j = 0; j < chunk.length; j++) {
      chunkString += String.fromCharCode(chunk[j]);
    }
    binary += chunkString;
  }
  const b64Data = window.btoa(binary);

  return { data: b64Data, mimeType };
};

/**
 * Detects characters from the narrative and provides visual prompts for each.
 */
export const detectCharactersFromNarrative = async (
  context: string,
  narratorName: string = "Norman",
  styleSuffix: string = "Modern 2D webcomic style",
  language: 'id' | 'en' = 'id',
  manualApiKey?: string
): Promise<{ name: string; visualPrompt: string }[]> => {
  const ai = getClient(manualApiKey);

  // Create a character-specific style suffix with white background
  const charStyleSuffix = styleSuffix.replace(/pastel color background/gi, "pure white background");
  
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      characters: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Character name found in the narrative." },
            visualPrompt: { type: Type.STRING, description: "Visual description for image generation including characteristics, outfit, accessories, and style." }
          },
          required: ["name", "visualPrompt"]
        }
      }
    },
    required: ["characters"]
  };

  const promptContent = `
    Analyze the following narrative and detect all characters mentioned.
    For each character, provide their name and a detailed visual prompt for an AI image generator.
    
    Narrative: "${context}"
    
    RULES:
    1. Detect only characters that are actually mentioned or implied as active participants.
    2. If the narrator "${narratorName}" is mentioned or implied, include them.
    3. Character names MUST be 1-2 words only.
    4. Visual Prompt MUST include:
       - MANDATORY: Include the phrase "Fullbody Shot" to ensure the whole character is visible.
       - Character's physical characteristics (personality, vibe, signature pose).
       - Detailed outfit (clothing, style).
       - Accessories (hats, jewelry, tools, etc.).
       - Style Suffix: ${charStyleSuffix}
    5. Ensure the background is explicitly mentioned as "pure white background".
    6. Maximum 10 characters.
    7. Output in ${language === 'en' ? 'ENGLISH' : 'INDONESIAN'}.
    
    RETURN JSON FORMAT ONLY.
  `;

  console.log("Detecting characters with model: gemini-3.1-flash-lite-preview");
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: promptContent,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }));

    console.log("Gemini response received for character detection");
    const text = cleanJsonString(response.text || "{}");
    console.log("Cleaned JSON text:", text);
    const data = JSON.parse(text);
    return data.characters || [];
  } catch (error: any) {
    console.error("Error in detectCharactersFromNarrative:", error);
    throw new Error(`Character detection failed: ${error.message}`);
  }
};

/**
 * Generates a visual prompt for a single character name.
 */
export const generateCharacterPrompt = async (
  name: string,
  context: string,
  narratorName: string = "Norman",
  styleSuffix: string = "Modern 2D webcomic style",
  language: 'id' | 'en' = 'id',
  manualApiKey?: string
): Promise<string> => {
  const ai = getClient(manualApiKey);

  // Create a character-specific style suffix with white background
  const charStyleSuffix = styleSuffix.replace(/pastel color background/gi, "pure white background");

  const promptContent = `
    Generate a detailed visual prompt for the character named "${name}" based on the following context.
    
    Context: "${context}"
    
    RULES:
    1. Visual Prompt MUST include:
       - MANDATORY: Include the phrase "Fullbody Shot" to ensure the whole character is visible.
       - Character's physical characteristics (personality, vibe, signature pose).
       - Detailed outfit (clothing, style).
       - Accessories (hats, jewelry, tools, etc.).
       - Style Suffix: ${charStyleSuffix}
    2. Ensure the background is explicitly mentioned as "pure white background".
    3. Output in ${language === 'en' ? 'ENGLISH' : 'INDONESIAN'}.
    
    RETURN ONLY THE PROMPT TEXT.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: promptContent,
    });

    return response.text.trim();
  } catch (error: any) {
    throw new Error(`Character prompt generation failed: ${error.message}`);
  }
};

/**
 * Generates an image using Gemini 2.5 Flash Image
 */
export const generateSceneImage = async (
  visualPrompt: string,
  refImages: ReferenceImage[] = [],
  previousImage?: string,
  narratorName: string = 'Norman',
  styleSuffix: string = STYLE_SUFFIX,
  negativePrompt: string = '',
  manualApiKey?: string,
  sceneType?: string,
  enforceObserver: boolean = true,
  visualReference: string = ''
): Promise<string> => {
  const ai = getClient(manualApiKey);
  
  // Construct the prompt parts
  const parts: any[] = [];
  let combinedText = "";

  // SEND PROMPT AS-IS — no hidden modifications.
  // Everything the user sees in the T2I column is exactly what gets sent.
  const finalVisualPrompt = visualPrompt.trim();

  // 1. Visual Reference (PRIMARY — always sent first as the visual identity anchor)
  if (visualReference) {
      const mimeType = visualReference.split(';')[0].split(':')[1] || "image/jpeg";
      parts.push({
          inlineData: {
              mimeType: mimeType,
              data: visualReference.split(',')[1]
          }
      });
      combinedText += `PRIMARY VISUAL REFERENCE: This is the visual identity reference. All generated images MUST match this image's style, composition aesthetic, line art quality, and overall visual language. Characters should be drawn in this art style. Adapt the scene description below to match this visual identity.\n`;
  }

  // 2. Character Reference Images (only if prompt mentions their name)
  if (refImages.length > 0) {
      refImages.forEach((img, index) => {
          const mimeType = img.data.split(';')[0].split(':')[1] || "image/jpeg";
          parts.push({
              inlineData: {
                  mimeType: mimeType, 
                  data: img.data.split(',')[1] 
              }
          });
          combinedText += `Reference image ${index + 1} represents character: ${img.name} (appearance/face reference).\n`;
      });
  }

  // 3. Previous Image (scene-to-scene continuity)
  if (previousImage) {
      const mimeType = previousImage.split(';')[0].split(':')[1] || "image/jpeg";
      parts.push({
          inlineData: {
              mimeType: mimeType, 
              data: previousImage.split(',')[1]
          }
      });
      combinedText += `PREVIOUS FRAME (continuity): Use this as the starting point. Modify based on the prompt below.\n`;
  }

  // 4. Add final combined text
  combinedText += finalVisualPrompt;
  parts.push({ text: combinedText });

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-image-preview',
    contents: {
        parts: parts
    },
    config: {
        imageConfig: {
            aspectRatio: "16:9"
        }
    }
  });

  let responseText = "";
  for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
      }
      if (part.text) {
          responseText += part.text;
      }
  }

  const finishReason = response.candidates?.[0]?.finishReason;
  throw new Error(`No image generated. Finish Reason: ${finishReason}. Response: ${responseText}`);
};

/**
 * Batch generate prompts for ALL scenes in ONE Gemini call.
 * Unlike generatePromptsFromFrames (per-scene), this lets the AI see ALL scenes
 * and produce visually DISTINCT prompts for each one.
 */
/**
 * Strip Indonesian location descriptions from visual prompts.
 * Detects patterns like "Di dalam [tempat]", "[INDOOR] - [lokasi]", etc.
 * and replaces them with pure white background indicators.
 */
function stripLocationDescriptions(prompt: string): string {
  // Pattern: [INDOOR] - description or [OUTDOOR] - description
  prompt = prompt.replace(/\[INDOOR\]\s*-\s*[^,.]+[.,]?\s*/gi, '');
  prompt = prompt.replace(/\[OUTDOOR\]\s*-\s*[^,.]+[.,]?\s*/gi, '');
  
  // Pattern: "Di dalam [tempat]", "Di [tempat]", etc.
  prompt = prompt.replace(/Di dalam\s+[^,.]{3,40}[.,]?\s*/gi, '');
  prompt = prompt.replace(/Di (ruang|meja|bangku|kantor|sekolah|rumah|kelas|kamar|gedung|lantai|lorong|jalan|taman|pasar|mall|restoran|cafe|kedai|warung|tempat)\s+[^,.]{0,30}[.,]?\s*/gi, '');
  
  // Pattern: "ruang tamu", "meja kantor", "bangku kelas" as standalone
  prompt = prompt.replace(/(ruang tamu|bangku kelas|meja kantor|ruang keluarga|kamar tidur|ruang makan)(\s+[^,.]{0,10})?[.,]?\s*/gi, '');
  
  // Clean up multiple spaces
  prompt = prompt.replace(/\s{2,}/g, ' ').trim();
  
  return prompt;
}

export const batchGeneratePrompts = async (
  scenes: { sceneId: string; narrativeText: string; frames: StoryFrame[] }[],
  context: string,
  characterList: string,
  systemInstruction: string,
  narratorName: string,
  narratorSuffix: string,
  styleSuffix: string,
  easterEggCount: number,
  easterEggTypes: string[],
  negativePrompt: string,
  language: 'id' | 'en',
  manualApiKey?: string,
  enforceObserver: boolean = true
): Promise<Record<string, string[]>> => {
  const finalSystemInstruction = processSystemInstruction(systemInstruction, narratorName, styleSuffix, easterEggCount, easterEggTypes, negativePrompt, language);
  const ai = getClient(manualApiKey);

  // Build the scene list
  const sceneListStr = scenes.map((scene, i) => {
    const frame = scene.frames[0];
    return `Scene ${i} (ID: ${scene.sceneId}):
  Narrative: "${scene.narrativeText}"
  SceneType: ${frame?.sceneType || 'unknown'}
  SceneMode: ${frame?.sceneMode || 'unknown'}
  SplitText: ${JSON.stringify(frame?.splitText || [])}
  Word Count: ${scene.narrativeText.split(/\\s+/).filter(w => w.length > 0).length}`;
  }).join('\n\n');

  const promptContent = `Generate ${language === 'en' ? 'ENGLISH' : 'INDONESIAN'} Visual Prompts for ALL ${scenes.length} scenes.

FULL STORY CONTEXT:
${context}

CHARACTERS: ${characterList}

EACH SCENE MUST HAVE A UNIQUE, VISUALLY DISTINCT PROMPT.
No two prompts should describe the same visual composition.
Even when scenes share similar content, vary: camera angle, character pose, perspective, background focus, lighting mood, and visual elements.

HERE ARE ALL SCENES (each needs one visual prompt):
${sceneListStr}

SCENE TYPE VISUAL GUIDES (use these to differentiate each prompt):
- host-direct: Character faces viewer directly, eye contact, like talking to camera.
- contrast: Side-by-side, split composition (before/after). Two states compared.
- metaphor-scene: Abstract, symbolic, surreal. NOT literal. Full metaphor world.
- typography-hero: Text/headline/number is the main visual. Title card format. Big bold text.
- multi-panel: Multiple panels in one image (comic strip). 2-3 panels.

ANTI-DUPLICATE RULE (CRITICAL):
- Read ALL scenes above. For each scene, analyze what makes it UNIQUE.
- Even if SceneType is the same, the NARRATIVE CONTENT must drive different visuals.
- Example: Scene about "milk and cheese" = focus on food packaging, refrigerator shelves, cold air
- Example: Scene about "leftover pizza" = focus on pizza box, opened slice, food waste
- These MUST produce different prompts.

INCLUDE in EVERY prompt:
- Anti-Mirror Clause: "Do NOT apply flipped/reversed text effects (text mirroring) to any text, logos, symbols, or written words on the character's clothing/accessories. Keep text in original readable orientation. Physical mirrors/reflections as props ARE allowed."
${enforceObserver ? `- If narratorName "${narratorName}" needs to appear observing.'` : `- Do NOT add "${narratorName}" as an observer.`}

OUTPUT FORMAT (STRICT JSON):
{
  "prompts": [
    { "sceneId": "${scenes[0]?.sceneId || ''}", "prompt": "..." },
    { "sceneId": "${scenes[1]?.sceneId || ''}", "prompt": "..." }${scenes.length > 2 ? `,\n    { "sceneId": "...", "prompt": "..." }` : ''}
  ]
}
The output MUST be valid JSON. The "prompts" array MUST have exactly ${scenes.length} items, one per scene in the same order.`;

  const promptContentParts = [{
    role: "user",
    parts: [{ text: promptContent }]
  }];

  const schema = {
    type: "object",
    properties: {
      prompts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            sceneId: { type: "string" },
            prompt: { type: "string" }
          },
          required: ["sceneId", "prompt"]
        }
      }
    },
    required: ["prompts"]
  };

  let text = "";
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: promptContentParts,
      config: {
        systemInstruction: finalSystemInstruction,
        responseMimeType: "application/json",
        responseSchema: schema
      }
    }));
    text = response.text || "";
  } catch (e: any) {
    throw new Error(`Batch prompt generation failed: ` + e.message);
  }

  if (!text) throw new Error("No response from batch prompt generation");

  text = cleanJsonString(text);
  const data = JSON.parse(text) as { prompts: { sceneId: string; prompt: string }[] };

  // Build result map { sceneId: [prompts] }
  const result: Record<string, string[]> = {};
  for (const item of data.prompts) {
    if (!result[item.sceneId]) result[item.sceneId] = [];
    const enhanced = applyNarratorSuffix(item.prompt, narratorName, narratorSuffix);
    const stripped = stripLocationDescriptions(enhanced);
    result[item.sceneId].push(stripped + "\\n" + styleSuffix);
  }

  return result;
};

/**
 * Step 1: AI split narrative into scenes + assign sceneType + sceneMode in one call.
 * Full trust: AI returns word-for-word narrative from original, no reconstruction.
 */
export const analyzeNarrativeSplitScenes = async (
  context: string,
  characterList: string,
  language: 'id' | 'en',
  manualApiKey?: string
): Promise<{ narrativeText: string; splitText: string[]; sceneType: string; sceneMode: string }[]> => {
  const rawText = (context || '').trim();
  if (!rawText) return [];

  const ai = getClient(manualApiKey);

  const promptContent = `You are a professional storyboard editor splitting a narrative into scenes. For EACH scene, split by sentence boundaries and assign the MOST appropriate scene type and scene mode.

FULL NARRATIVE:
${rawText}

CHARACTERS: ${characterList}

RULES (in priority order — earlier rules override later ones):

#1 SENTENCE INTEGRITY (ABSOLUTE — NEVER BREAK THIS):
- The SENTENCE is the atomic unit. NEVER split a single sentence across two scenes.
- Every sentence from the FULL NARRATIVE must appear ENTIRELY in ONE scene, unchanged.
- Exception: ONLY split a sentence if it is >15 words. Then split at a COMMA or natural pause.
- VERIFICATION: After writing all scenes, read each narrativeText. If any narrativeText contains a sentence fragment (incomplete sentence) that was complete in the full narrative, you have FAILED. Rewrite.

#2 SCENE SIZE (sentence count is PRIMARY — counts work for ALL languages):
- Target 2-3 SENTENCES per scene. This is your main goal.
- ABSOLUTE MAX 4 sentences per scene. If a group of 4+ adjacent sentences would exceed 4, SPLIT into two scenes of 2-3 sentences each.
- Word count is SECONDARY: typically 3-15 words per scene in English, but let sentence count be your guide.
- MINIMUM: a scene can have 1 sentence only if that sentence is 3+ words. Otherwise group with adjacent.
- IMPORTANT: 5 short sentences like "A. B. C. D. E." must be split into 2 scenes (e.g. "A. B." and "C. D. E."). Do NOT keep 5 sentences in one scene.

#3 GROUPING:
- Group adjacent sentences that share a unified visual concept.
- Scene type is assigned AFTER splitting — do NOT manipulate scene boundaries just to get a different scene type.

#4 splitText (subtitle chunks):
- Divide narrativeText into subtitle-sized chunks.
- Each chunk MUST respect sentence boundaries — never split a sentence across chunks.

#5 PRESERVE EXACT ORIGINAL WORDING:
- Every letter, period, comma, space must match the original.
- Never paraphrase, rephrase, or summarize.
- VERIFICATION: Concatenate all narrativeText fields. The result must equal the FULL NARRATIVE exactly. If words are missing or added, you have FAILED.

SCENE TYPES — Assign the BEST type for each scene. Each type has a NARRATIVE INTENT — use what the scene IS DOING, not just what it LOOKS like. Distribute them — never use the same type twice in a row:
- host-direct: "Direct address to viewer" — character faces camera, engages directly. Best for hooks, CTA, rhetorical questions, conclusions.
- contrast: "Compare two states" — split-frame showing side-by-side or before/after of two contrasting conditions. Best for irony, paradox, comparison.
- metaphor-scene: "Surreal symbolism" — abstract concept turned into tangible visual. Character INSIDE the metaphor world. Best for deep analogies and emotional concepts.
- typography-hero: "Text IS the visual" — large bold word, phrase, or number dominates frame. Best for key terms, definitions, punchy one-liners.
- multi-panel: "Comic strip" — 2 or 3 panels in one image showing sequence, progression, or parallel events. Best for steps, chronology, montage.

SCENE MODES per sceneType (pick the BEST, then implement it visually):
host-direct → direct
contrast → side-by-side | before-after
typography-hero → single-word | definition | big-number
metaphor-scene → object | living
multi-panel → panel-2 | panel-3

OUTPUT FORMAT (strict JSON):
{
  "scenes": [
    {
      "narrativeText": "Open your fridge. Go on. Take a look. A carton of milk. Some cheese.",
      "splitText": ["Open your fridge.", "Go on.", "Take a look.", "A carton of milk.", "Some cheese."],
      "sceneType": "host-direct",
      "sceneMode": "intro"
    }
  ]
}

No extra fields. Only the JSON. The "scenes" array MUST have all scenes covering the FULL narrative.`;

  const schema = {
    type: "object",
    properties: {
      scenes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            narrativeText: { type: "string" },
            splitText: {
              type: "array",
              items: { type: "string" }
            },
            sceneType: { type: "string" },
            sceneMode: { type: "string" }
          },
          required: ["narrativeText", "splitText", "sceneType", "sceneMode"]
        }
      }
    },
    required: ["scenes"]
  };

  const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: [{ role: 'user', parts: [{ text: promptContent }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: schema
    }
  }));

  const text = (response.text || "").trim();
  if (!text) throw new Error("Empty response from scene splitting");

  const cleaned = cleanJsonString(text);
  const data = JSON.parse(cleaned) as { scenes: { narrativeText: string; splitText: string[]; sceneType: string; sceneMode: string }[] };

  // Post-process: auto-split oversized scenes, merge singletons
  return postProcessScenes(data.scenes);
};

/**
 * Post-process: split any scene that exceeds the sentence/word limit.
 * Each chunk in splitText should be 1 sentence → split when chunks > 4.
 * Also merge singletons (< 5 words total) with adjacent scene.
 * Uses splitText as sentence boundaries for reliable splitting.
 */
function postProcessScenes(
  scenes: { narrativeText: string; splitText: string[]; sceneType: string; sceneMode: string }[]
): { narrativeText: string; splitText: string[]; sceneType: string; sceneMode: string }[] {
  const result: typeof scenes = [];

  // Phase 1: Split oversized scenes (too many sentences OR too many words)
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const chunkCount = scene.splitText.length;
    const wordCount = scene.narrativeText.split(/\s+/).length;

    if (chunkCount >= 5 || (wordCount > 20 && chunkCount >= 4)) {
      // Split into 2 scenes at the midpoint
      const mid = Math.ceil(chunkCount / 2);
      const firstChunks = scene.splitText.slice(0, mid);
      const secondChunks = scene.splitText.slice(mid);

      // First half: keep original type, but adjust multi-panel mode based on chunk count
      let firstMode = scene.sceneMode;
      if (scene.sceneType === 'multi-panel') {
        firstMode = getMultiPanelMode(firstChunks.length);
      }
      result.push({
        narrativeText: firstChunks.join(' '),
        splitText: firstChunks,
        sceneType: scene.sceneType,
        sceneMode: firstMode,
      });

      // Second half: pick a DIFFERENT type + DEFAULT mode for that type
      const secondHalfText = secondChunks.join(' ');
      const secondType = getSplitSceneType(scene.sceneType, secondHalfText);
      result.push({
        narrativeText: secondHalfText,
        splitText: secondChunks,
        sceneType: secondType,
        sceneMode: getDefaultSceneMode(secondType),
      });
    } else {
      result.push(scene);
    }
  }

  // Phase 2: Merge singleton scenes (< 5 words total) with adjacent
  for (let i = 0; i < result.length; i++) {
    const wordCount = result[i].narrativeText.split(/\s+/).length;
    if (wordCount < 5 && result.length > 1) {
      if (i > 0) {
        const prev = result[i - 1];
        prev.narrativeText = prev.narrativeText + ' ' + result[i].narrativeText;
        prev.splitText.push(...result[i].splitText);
        result.splice(i, 1);
        i--;
      } else if (i < result.length - 1) {
        const next = result[i + 1];
        next.narrativeText = result[i].narrativeText + ' ' + next.narrativeText;
        next.splitText = [...result[i].splitText, ...next.splitText];
        result.splice(i, 1);
        i--;
      }
    }
  }

  // Phase 3: Validate & fix invalid sceneType+sceneMode combinations
  for (const scene of result) {
    scene.sceneMode = validateSceneMode(scene.sceneType, scene.sceneMode);
  }

  // Phase 3b: Adjust multi-panel mode to match actual chunk count
  for (const scene of result) {
    if (scene.sceneType === 'multi-panel') {
      scene.sceneMode = getMultiPanelMode(scene.splitText.length);
    }
  }

  // Phase 4: Break consecutive duplicate sceneTypes by swapping the second one
  // Uses content-aware selection based on narrative text, not arbitrary rotation
  for (let i = 1; i < result.length; i++) {
    if (result[i].sceneType === result[i - 1].sceneType) {
      const alternate = getContentAwareSceneType(result[i].sceneType, result[i].narrativeText, i, result);
      result[i].sceneType = alternate;
      result[i].sceneMode = getDefaultSceneMode(alternate);
    }
  }

  return result;
}

/** Default scene mode for each scene type — used when creating new scenes */
const DEFAULT_SCENE_MODES: Record<string, string> = {
  'host-direct': 'direct',
  'contrast': 'side-by-side',
  'typography-hero': 'single-word',
  'metaphor-scene': 'object',
  'multi-panel': 'panel-2',
};

const SCENE_TYPE_ORDER = [
  'host-direct', 'contrast', 'metaphor-scene', 'typography-hero', 'multi-panel'
];

function getDefaultSceneMode(type: string): string {
  return DEFAULT_SCENE_MODES[type] || 'direct';
}

/** Adjust multi-panel mode based on actual chunk count */
function getMultiPanelMode(chunkCount: number): string {
  if (chunkCount >= 3) return 'panel-3';
  return 'panel-2';
}

/**
 * Pick the best scene type for the second half of a split.
 * Uses content hints + prefers relevant types over arbitrary cycling.
 */
function getSplitSceneType(originalType: string, secondHalfText: string): string {
  const text = secondHalfText.toLowerCase();

  // Content-based hints for Indonesian & English
  if (text.includes('tapi') || text.includes('tetapi') || text.includes('sedangkan') ||
      text.includes('sementara') || text.includes('different') || text.includes('contrast') ||
      text.includes('padahal') || text.includes('sebaliknya') || text.includes('bukan')) {
    return 'contrast';
  }
  if (text.includes('bayangkan') || text.includes('imagine') || text.includes('seperti') ||
      text.includes('andaikan') || text.includes('seolah') || text.includes('andai')) {
    return 'metaphor-scene';
  }
  if (text.includes('?') && (text.includes('siapa') || text.includes('apa') || text.includes('dimana') ||
      text.includes('how') || text.includes('why') || text.includes('what') ||
      text.includes('tau nggak') || text.includes('tahu nggak') || text.includes('nggak'))) {
    return 'host-direct';
  }
  if (text.includes('?') || text.includes('tau nggak') || text.includes('tahu nggak')) {
    return 'host-direct';
  }

  // Default: prefer concept-visual (icon-based) for descriptive content,
  // host-direct for question-like content, contrast for comparisons
  // Avoid cycling — use content-aware defaults
  if (originalType === 'multi-panel' || originalType === 'host-direct') {
    return 'concept-visual';
  }
  if (originalType === 'contrast') {
    return 'concept-visual';
  }
  if (originalType === 'concept-visual') {
    return 'host-direct';
  }
  return 'concept-visual';
}

/**
 * Content-aware scene type selection for consecutive duplicate fix.
 * Analyzes narrative text to pick a semantically appropriate alternative.
 * Prioritizes types that match the content over arbitrary rotation.
 */
function getContentAwareSceneType(
  currentType: string,
  narrativeText: string,
  index: number,
  allScenes: { sceneType: string }[]
): string {
  const text = narrativeText.toLowerCase();
  const recentTypes = new Set<string>();
  for (let j = Math.max(0, index - 3); j < index; j++) {
    recentTypes.add(allScenes[j].sceneType);
  }

  // Priority 1: Content-based hints — emosi/perasaan → metaphor-scene
  if (text.includes('capek') || text.includes('lelah') || text.includes('sedih') ||
      text.includes('senang') || text.includes('takut') || text.includes('cemas') ||
      text.includes('marah') || text.includes('kecewa') || text.includes('rasa') ||
      text.includes('ngeras') || text.includes('perasaan') || text.includes('emosi') ||
      text.includes('tired') || text.includes('sad') || text.includes('happy') ||
      text.includes('angry') || text.includes('fear') || text.includes('anxious') ||
      text.includes('emotion') || text.includes('feeling') || text.includes('stress')) {
    if ('metaphor-scene' !== currentType && !recentTypes.has('metaphor-scene'))
      return 'metaphor-scene';
  }

  // Perbandingan/ironi → contrast
  if (text.includes('tapi') || text.includes('tetapi') || text.includes('sedangkan') ||
      text.includes('sementara') || text.includes('padahal') || text.includes('sebaliknya') ||
      text.includes('bukan') || text.includes('beda') || text.includes('berbeda') ||
      text.includes('different') || text.includes('but') || text.includes('however') ||
      text.includes('whereas') || text.includes('contrast') || text.includes('instead') ||
      text.includes('actually') || text.includes('on the other hand')) {
    if ('contrast' !== currentType && !recentTypes.has('contrast'))
      return 'contrast';
  }

  // Priority 2: Keyword-based scoring
  const candidateTypes = getCandidateTypes(currentType, recentTypes, text);
  if (candidateTypes.length > 0) return candidateTypes[0];

  // Priority 3: Fallback rotation (paling lambat diproses, paling jarang kepake)
  const idx = SCENE_TYPE_ORDER.indexOf(currentType);
  for (let offset = 1; offset < SCENE_TYPE_ORDER.length; offset++) {
    const candidate = SCENE_TYPE_ORDER[(idx + offset) % SCENE_TYPE_ORDER.length];
    if (!recentTypes.has(candidate)) return candidate;
  }
  return SCENE_TYPE_ORDER[(idx + 1) % SCENE_TYPE_ORDER.length];
}

/**
 * Score all scene types by keyword match against narrative text.
 * Returns types sorted by relevance, excluding current type and recent types.
 */
function getCandidateTypes(
  currentType: string,
  recentTypes: Set<string>,
  text: string
): string[] {
  const keywords: Record<string, string[]> = {
    'host-direct': ['lo', 'gue', 'kamu', 'anda', 'kita', 'nggak', 'ya', '?',
                    'you', 'we', 'i', '?', 'let me', 'right?', 'guys',
                    'tau nggak', 'tahu nggak'],
    'contrast': ['tapi', 'tetapi', 'sedangkan', 'sementara', 'padahal', 'sebaliknya',
                 'but', 'however', 'whereas', 'while', 'contrast', 'instead',
                 'actually', 'bukan', 'beda', 'berbeda', 'dulu', 'sekarang'],
    'metaphor-scene': ['seperti', 'bagai', 'laksana', 'ibarat', 'kiasan', 'analogi',
                       'like', 'as if', 'metaphor', 'symbol', 'imagine', 'andaikan',
                       'andai', 'seolah', 'pikiran', 'beban', 'ringan', 'berat'],
    'typography-hero': ['adalah', 'ialah', 'yaitu', 'yakni', 'istilah', 'sebutan',
                        'nama', 'kata kunci', 'definition', 'term', 'called',
                        'pokoknya', 'intinya', 'singkatnya'],
    'multi-panel': ['lalu', 'kemudian', 'setelah', 'mulai', 'langkah', 'tahap',
                    'before', 'after', 'then', 'step', 'progres',
                    'sebelum', 'sesudah', 'semula', 'kini']
  };

  const scored: { type: string; score: number }[] = [];

  for (const type of SCENE_TYPE_ORDER) {
    if (type === currentType || recentTypes.has(type)) continue;

    const typeKeywords = keywords[type] || [];
    let score = 0;
    for (const kw of typeKeywords) {
      if (text.includes(kw)) score++;
    }
    if (score > 0) scored.push({ type, score });
  }

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);
  return scored.map(s => s.type);
}

/** Map of which modes are valid for each sceneType */
const VALID_SCENE_MODES: Record<string, string[]> = {
  'host-direct': ['direct'],
  'contrast': ['side-by-side', 'before-after'],
  'typography-hero': ['single-word', 'definition', 'big-number'],
  'metaphor-scene': ['object', 'living'],
  'multi-panel': ['panel-2', 'panel-3'],
};

/**
 * If the sceneMode is NOT valid for the sceneType, replace with the default mode.
 */
function validateSceneMode(sceneType: string, sceneMode: string): string {
  const validModes = VALID_SCENE_MODES[sceneType];
  if (!validModes) return getDefaultSceneMode(sceneType);
  if (validModes.includes(sceneMode)) return sceneMode;
  return getDefaultSceneMode(sceneType);
}

/**
 * Step 2: Generate scene types + T2I prompts for all (already-split) scenes.
 * AI sees all scenes at once → distributes unique scene types and distinct prompts.
 */
export const batchGenerateTypesAndPrompts = async (
  scenes: { sceneId: string; narrativeText: string; splitText: string[]; sceneType?: string; sceneMode?: string }[],
  context: string,
  characterList: string,
  systemInstruction: string,
  narratorName: string,
  narratorSuffix: string,
  styleSuffix: string,
  easterEggCount: number,
  easterEggTypes: string[],
  negativePrompt: string,
  language: 'id' | 'en',
  manualApiKey?: string,
  enforceObserver: boolean = true
): Promise<Record<string, { sceneType: string; sceneMode: string; visualPrompt: string }>> => {
  const ai = getClient(manualApiKey);

  const sceneListStr = scenes.map((s, i) =>
    `Scene ${i} (ID: ${s.sceneId}):\n  Narrative: "${s.narrativeText}"\n  SplitText: ${JSON.stringify(s.splitText)}\n  Word Count: ${s.narrativeText.split(/\s+/).filter(Boolean).length}\n  Scene Type: ${s.sceneType || 'TBD'}\n  Scene Mode: ${s.sceneMode || 'TBD'}`
  ).join('\n\n');

  // Build conditional character style rules (depends on preset + language)
  const isStickFigure = styleSuffix.toLowerCase().includes('stick figure');
  const characterListArr = characterList.split(',').map(c => c.trim()).filter(Boolean);
  const otherChars = characterListArr.filter(c => c.toLowerCase() !== narratorName.toLowerCase());
  const charListStr = characterListArr.join(', ');
  const otherCharsStr = otherChars.length > 0 ? otherChars.join(', ') 
    : (language === 'id' 
        ? 'figuran kontekstual (deskripsikan LENGKAP: umur, jenis kelamin, outfit, gaya rambut — contoh: "seorang wanita 30 tahun berambut pendek dengan blazer navy", "pria paruh baya berkemeja batik, rambut disisir rapi", "anak laki-laki 10 tahun berseragam SD, rambut cepak")'
        : 'contextual supporting character (describe IN FULL: age, gender, outfit, hairstyle — example: "a 30-year-old woman with short hair in a navy blazer", "a middle-aged man in batik shirt with neatly combed hair", "a 10-year-old boy in school uniform with a buzz cut")');
  const charExample = otherChars.length > 0 ? otherChars[0] : (language === 'id' ? 'seorang teman' : 'a friend');
  
  const characterRules = language === 'id'
    ? isStickFigure
      ? `3. GAMBARKAN DENGAN DETAIL: Lukis adegan dengan kata-kata. Jangan deskripsi generik seperti "seseorang melihat makanan", tapi "seorang stick figure dengan ekspresi jijik berlebihan, mundur dari daging busuk yang menjijikkan". Gunakan detail sensorik — tekstur, reaksi, ekspresi.
4. GAYA KARAKTER: Gunakan "Stick figure" atau "Karakter stick figure" sebagai pengganti "seseorang". Jangan deskripsikan anatomi realistis atau wajah detail.
5. DISTRIBUSI KARAKTER: ${narratorName} HANYA untuk host-direct. Untuk contrast, metaphor-scene, multi-panel → pakai karakter lain (${otherCharsStr}) atau objek simbolik tanpa karakter. typography-hero → TANPA karakter apapun. Ini aturan paling keras.`
      : `3. GAMBARKAN DENGAN DETAIL: Gunakan NAMA KARAKTER SPESIFIK dari daftar referensi. Karakter tersedia: ${charListStr}. ${narratorName} = narrator/host. Lainnya = figuran pendukung.
4. DISTRIBUSI KARAKTER (HARD RULE): 
   - host-direct → WAJIB ${narratorName} (host bicara ke kamera).
   - contrast → ${narratorName} + ${charExample}, atau dua figuran berbeda. JANGAN ${narratorName} sendirian di kedua sisi.
   - metaphor-scene → FIGURAN (${otherCharsStr}) atau objek simbolik TANPA karakter. JANGAN ${narratorName}.
   - typography-hero → TANPA KARAKTER. Hanya teks/angka sebagai hero visual.
   - multi-panel → Campur bebas: beberapa panel boleh ${narratorName}, sisanya figuran atau object-only.
5. ${narratorName} MAKSIMAL muncul di 50% scene. Sisanya HARUS karakter lain atau tanpa karakter.`
    : isStickFigure
      ? `3. BE SPECIFIC AND VIVID: Paint the scene with words. Instead of "a person looks at food", describe "a stick figure person with an exaggerated disgusted expression, recoiling from a grotesque dripping slab of ancient meat". Use sensory details — textures, reactions, expressions.
4. CHARACTER STYLE: Use "A stick figure person" or "A crude stick figure character" instead of "A person" when the scene involves characters. Never describe realistic human anatomy or detailed faces.
5. CHARACTER DISTRIBUTION: ${narratorName} ONLY for host-direct. For contrast, metaphor-scene, multi-panel → use other characters (${otherCharsStr}) or symbolic objects without characters. typography-hero → NO characters. This is the hardest rule.`
      : `3. BE SPECIFIC AND VIVID: Paint the scene with words. Use specific CHARACTER NAMES from the reference list. Available characters: ${charListStr}. ${narratorName} = narrator/host. Others = supporting cast.
4. CHARACTER DISTRIBUTION (HARD RULE):
   - host-direct → MUST use ${narratorName} (host speaks to camera).
   - contrast → ${narratorName} + ${charExample}, or two different supporting characters. Do NOT use ${narratorName} alone on both sides.
   - metaphor-scene → SUPPORTING character (${otherCharsStr}) or symbolic object WITHOUT any character. Do NOT use ${narratorName}.
   - typography-hero → NO CHARACTER. Only text/number as visual hero.
   - multi-panel → Free mix: some panels may use ${narratorName}, others supporting characters or object-only.
5. ${narratorName} appears in MAX 50% of scenes. The rest MUST use other characters or no character at all.`;

  // Bilingual scene type decision guide
  const sceneTypeGuide = language === 'id' ? `PANDUAN SCENE TYPE — Pilih berdasarkan FUNGSI NARASI adegan ini:

═══════════════════════════════════════════════════════
🔴 ATURAN UTAMA — HARAM MELANGGAR:
1. DUA ADEGAN BERTURUT-TURUT TIDAK BOLEH SAMA SCENE TYPE-nya.
   Jika scene N adalah "host-direct", scene N+1 HARUS beda tipe.
2. GUNAKAN SEMUA 5 SCENE TYPES dalam satu storyboard.
   Variasi visual adalah kunci retensi penonton.
3. Setiap scene harus punya IDENTITAS VISUAL UNIK.
   Jangan ulangi komposisi yang sama.
═══════════════════════════════════════════════════════

TIPS VARIASI:
- "capek banget" → metaphor-scene (visualisasi kelelahan)
- "Dan tau nggak?" → host-direct (retoris pendek, langsung ke penonton)
- "dulu vs sekarang" → contrast (split-frame perbandingan)
- "istilah penting" → typography-hero (teks/angka sebagai hero)
- "3 langkah" → multi-panel (urutan dalam panel komik)

host-direct:
  KAPAN → Host bicara LANGSUNG ke kamera: pembuka, CTA penutup, bridging topik, pertanyaan retoris, interaksi langsung dengan penonton
  JANGAN → Adegan menjelaskan konsep tanpa interaksi host; voice-over naratif tanpa host di layar
  KARAKTER → WAJIB ${narratorName} (host). TIDAK BOLEH karakter lain.
  VIBE → Tatap kamera, gestur tangan ekspresif dan dinamis, seolah bicara ke penonton dengan energi. BUKAN pasif atau statis.
  ALTERNATIF → contrast, metaphor-scene, typography-hero

contrast:
  KAPAN → Membandingkan DUA SISI: dulu vs sekarang, baik vs buruk, mitos vs fakta, ironi, paradoks, ekspektasi vs realita
  JANGAN → Urutan langkah/sequence (pakai multi-panel); metafora abstrak (metaphor-scene)
  KARAKTER → DUA karakter BERBEDA — ${narratorName} di satu sisi, figuran (atau objek) di sisi lain. JANGAN ${narratorName} di kedua sisi.
  VIBE → Dua keadaan berdampingan. Split-frame atau transisi. Dramatisasi perbedaan. Hitam-putih vs warna.
  ALTERNATIF → host-direct, metaphor-scene, multi-panel

metaphor-scene:
  KAPAN → Analogi MENDALAM, konsep abstrak DIVISUALISASIKAN secara surealis/kiasan: "beban pikiran seperti gunung", "kebohongan seperti jaring laba-laba"
  JANGAN → Penjelasan literal; adegan realitas sehari-hari tanpa simbolisme; teks sebagai hero (typography-hero)
  KARAKTER → FIGURAN atau OBJEK simbolik. JANGAN ${narratorName}. Objek tanpa karakter lebih bagus (bola rantai, jam pasir retak, sangkar kosong).
  VIBE → Karakter di DALAM dunia metafora. Surealis, simbolik, imajinatif, seperti Pixar.
  ALTERNATIF → host-direct, contrast, multi-panel

typography-hero:
  KAPAN → Kata kunci, definisi, kutipan, angka penting sebagai HERO visual utama — bikin penonton INGAT
  JANGAN → Adegan yang butuh aksi atau narasi bergerak; konten yang lebih efektif jika dijelaskan secara visual
  KARAKTER → TANPA KARAKTER APAPUN. Hanya teks/angka sebagai hero visual. Ini HARD RULE — tidak boleh ada karakter.
  VIBE → Teks/angka BESAR mendominasi frame. Bold, minimalis, berani. Satu kata/frase/angka sebagai pusat perhatian.
  ALTERNATIF → host-direct, contrast, multi-panel

multi-panel:
  KAPAN → BEBERAPA PANEL (2-3) dalam SATU frame: urutan langkah, kronologi, adegan paralel, sequence events
  JANGAN → Satu momen saja yang cukup dengan satu scene type; terlalu banyak teks per panel
  KARAKTER → Campur bebas antar panel. Jangan semua panel karakter sama. Variasikan ${narratorName} + figuran + objek.
  VIBE → Gaya komik strip. Beberapa kejadian simultan dalam satu frame. Grid, komparasi.
  ALTERNATIF → contrast, metaphor-scene, host-direct
` : `SCENE TYPE GUIDE — Pick based on NARRATIVE FUNCTION:

═══════════════════════════════════════════════════════
🔴 HARD RULES — MUST FOLLOW:
1. NO TWO CONSECUTIVE SCENES may have the same sceneType.
   If scene N is "host-direct", scene N+1 MUST be different.
2. USE ALL 5 SCENE TYPES across the storyboard.
   Visual variety is key to viewer retention.
3. Each scene must have a VISUALLY UNIQUE IDENTITY.
   Don't repeat the same composition.
═══════════════════════════════════════════════════════

host-direct:
  WHEN → Host speaks DIRECTLY to camera: opening hook, closing CTA, topic transition, rhetorical question, direct viewer engagement
  NOT when → Scene explaining a concept without host interaction; voice-over narration without host on screen
  CHARACTER → MUST use ${narratorName} (host). NO other characters allowed.
  VIBE → Eye contact with camera, natural gestures. Warm, personal, engaging.
  ALTERNATIVE → contrast, metaphor-scene, typography-hero

contrast:
  WHEN → Comparing TWO SIDES: past vs present, good vs bad, myth vs fact, irony, paradox, expectation vs reality
  NOT when → Steps/sequence (use multi-panel); abstract metaphor (metaphor-scene)
  CHARACTER → TWO DIFFERENT characters — ${narratorName} on one side, supporting character (or object) on the other. Do NOT use ${narratorName} on both sides.
  VIBE → Two states side by side. Split-frame or transition. Dramatization of difference. B&W vs color.
  ALTERNATIVE → host-direct, metaphor-scene, multi-panel

metaphor-scene:
  WHEN → Deep ANALOGY, abstract concept VISUALIZED surrealistically/figuratively: "mental burden as a mountain", "lies as a spider web"
  NOT when → Literal explanation; everyday reality without symbolism; text as hero (typography-hero)
  CHARACTER → SUPPORTING character or symbolic OBJECT. Do NOT use ${narratorName}. Object-only is great (chain ball, cracked hourglass, empty cage).
  VIBE → Character INSIDE the metaphor world. Surreal, symbolic, imaginative, Pixar-style.
  ALTERNATIVE → host-direct, contrast, multi-panel

typography-hero:
  WHEN → Key word, definition, quote, important number as visual HERO — makes viewers REMEMBER
  NOT when → Scenes needing action or narrative movement; content better explained visually
  CHARACTER → NO CHARACTER AT ALL. Only text/number as visual hero. This is a HARD RULE.
  VIBE → BIG text/number dominates frame. Bold, minimal, striking. One word/phrase/number as focal point.
  ALTERNATIVE → host-direct, contrast, multi-panel

multi-panel:
  WHEN → Multiple PANELS (2-3) in ONE frame: steps, chronology, parallel scenes, sequence events
  NOT when → Single moment that one scene type can handle; too much text per panel
  CHARACTER → Mix freely across panels. Don't use the same character in all panels. Vary ${narratorName} + supporting + objects.
  VIBE → Comic strip style. Multiple simultaneous events in one frame. Grid, comparison.
  ALTERNATIVE → contrast, metaphor-scene, host-direct
`;
  // Bilingual T2I composition template per scene type
  const sceneTypeComposition = buildSceneTypeComposition(language);

  const promptContent = `Generate ONLY the T2I visual prompts for ALL ${scenes.length} scenes below.

FULL STORY CONTEXT:
${context}

CHARACTERS: ${characterList}

HERE ARE THE SCENES (already split). Each scene already has a sceneType and sceneMode assigned. You ONLY need to generate the visualPrompt that matches the assigned sceneType and sceneMode.
${sceneListStr}

${sceneTypeGuide}

${sceneTypeComposition}

CREATIVITY DIRECTIVES — Let the chosen sceneType drive every aspect of the composition. Do NOT specify any camera angles, shot sizes, or cinematographic terminology (no close-up, wide shot, Dutch angle, bird's eye, worm's eye, over-the-shoulder, rule of thirds, leading lines, low angle, high angle, or any camera movement terms).

SCENE MODES (pick the BEST mode per sceneType, then implement it into the visual prompt composition). The assigned sceneMode is provided per scene — implement it visually:
host-direct → direct
  - direct: Host or mascot facing camera, direct conversation with audience, engaging gesturing
contrast → side-by-side | before-after
  - side-by-side: Two contrasting states split in one frame
  - before-after: Temporal transition between two states
typography-hero → single-word | definition | big-number
  - single-word: ONE big word, center frame
  - definition: Word + brief explanation
  - big-number: One massive number with label
metaphor-scene → object | living
  - object: Inanimate object with symbolic meaning
  - living: Human body / animal as metaphor
multi-panel → panel-2 | panel-3
  - panel-2: Two-panel comic strip
  - panel-3: Three-panel sequence

The CHOSEN sceneMode MUST directly influence the visualPrompt composition and layout, not just be a label.

SUPPORTING CHARACTER DESCRIPTION (FIGURAN): When using characters other than the MAIN narrator/host, the visualPrompt MUST ALWAYS describe: AGE (e.g., "30 tahun", "paruh baya", "remaja"), GENDER (pria/wanita/laki-laki/perempuan), OUTFIT (e.g., "blazer navy", "kemeja batik", "seragam SD"), and HAIRSTYLE (e.g., "rambut pendek rapi", "rambut diikat", "rambut cepak"). This ensures supporting characters are visually distinct and identifiable without reference images.

CRITICAL VISUAL PROMPT RULES:
1. SCENE TYPE IS THE PRIMARY RULE: The chosen sceneType determines EVERYTHING — composition, visual focus, hierarchy, character assignment, and mood. Your prompt must FIRST serve the sceneType, THEN the narrative content.
2. EVERY prompt MUST be visually DISTINCT from all others. Vary the composition, focus, and visual elements.
3. CHARACTER VARIETY (HARD RULE): Do NOT use the same character in more than 50% of scenes. Distribute characters across scenes according to their scene type. See CHARACTER DISTRIBUTION rules above.
4. NO CHARACTER for typography-hero: If sceneType is typography-hero, the visualPrompt MUST NOT mention any character at all. Only text/number elements.
${characterRules}
5. NO TEXT/NO LETTERS (HARD RULE): Unless sceneType is "typography-hero", the visualPrompt MUST NOT mention or describe ANY text, words, letters, labels, signs, subtitles, speech bubbles, or alphanumeric characters appearing inside the image. The generated image MUST have ZERO readable text. This is the #1 most common violation — enforce it ruthlessly.
6. NO LOCATION/SETTING: Do NOT describe any room, table, wall, floor, or setting details. Background is PURE WHITE/clean with visual elements only. Do NOT start with tags like "[Indoor/Outdoor]".
7. Do NOT include style descriptions or style suffix text.
8. Include Anti-Mirror Clause: "Do NOT apply flipped/reversed text effects (text mirroring) to any text, logos, symbols, or written words on the character's clothing/accessories. Keep text in original readable orientation. Physical mirrors/reflections as props ARE allowed."
9. REPRESENT EVERY SENTENCE: Each scene has multiple sentences. The visual prompt must capture the ESSENCE/MEANING of EVERY sentence in a single cohesive image. Do NOT drop any sentence's concept.
10. DIVERSITY: Vary scene types across adjacent scenes — do NOT use the same sceneType for two consecutive scenes if an alternative fits. Each scene must have a visually distinct composition.

OUTPUT FORMAT (MUST BE VALID JSON — NO MARKDOWN, NO CODEBLOCKS) — Start your response with { and end with }. Echo sceneType and sceneMode AS-IS from input. Only generate visualPrompt:
{
  "scenes": [
    {
      "sceneId": "${scenes[0]?.sceneId || ''}",
      "sceneType": "host-direct",
      "sceneMode": "direct",
      "visualPrompt": "${language === 'en' ? 'A person standing in front of an open refrigerator.' : narratorName + ' berdiri di depan lemari es terbuka, ekspresi terkejut.'}"
    }${scenes.length > 1 ? `,\n    {\n      "sceneId": "...",\n      "sceneType": "...",\n      "sceneMode": "...",\n      "visualPrompt": "..."\n    }` : ''}
  ]
}
The "scenes" array MUST have exactly ${scenes.length} items, one per scene in order.`;

  let text = "";
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: promptContent }] }],
      config: {
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
        ]
      }
    }));
    // Try multiple ways to extract text from Gemini response
    const r = response as any;
    text = r.text || r.candidates?.[0]?.content?.parts?.[0]?.text || '';
    // Deep fallback: iterate all candidates
    if (!text) {
      for (const c of (r.candidates || [])) {
        for (const p of (c?.content?.parts || [])) {
          if (p?.text) { text += p.text; }
        }
      }
    }
    // Debug: if still no text, throw with raw response structure
    if (!text) {
      const debug = {
        hasText: !!r.text,
        candidatesCount: r.candidates?.length,
        finishReason: r.candidates?.[0]?.finishReason,
        safetyRatings: r.candidates?.[0]?.safetyRatings,
        promptFeedback: r.promptFeedback,
        promptLength: promptContent.length
      };
      throw new Error(`Empty response debug: ${JSON.stringify(debug)}`);
    }
  } catch (e: any) {
    throw new Error(`Types & prompts generation failed: ${e.message}`);
  }

  const cleaned = cleanJsonString(text);
  const data = safeJsonParse(cleaned) as { scenes: { sceneId: string; sceneType: string; sceneMode: string; visualPrompt: string }[] };

  const result: Record<string, { sceneType: string; sceneMode: string; visualPrompt: string }> = {};
  for (const item of data.scenes) {
    const enhanced = applyNarratorSuffix(item.visualPrompt, narratorName, narratorSuffix);
    result[item.sceneId] = {
      sceneType: item.sceneType || 'host-direct',
      sceneMode: item.sceneMode || '',
      visualPrompt: enhanced + "\n" + styleSuffix
    };
  }

  // Phase 5: Fix consecutive duplicate sceneTypes (post-processing diversity)
  // Iterate in original scene order, fix any consecutive duplicates with content-aware selection
  const resultEntries = Object.entries(result);
  for (let i = 1; i < resultEntries.length; i++) {
    const [, currData] = resultEntries[i];
    const [, prevData] = resultEntries[i - 1];
    if (currData.sceneType === prevData.sceneType) {
      const sceneEntry = scenes.find(s => s.sceneId === resultEntries[i][0]);
      const sceneText = sceneEntry?.narrativeText || '';
      const alternate = getContentAwareSceneType(currData.sceneType, sceneText, i, resultEntries.map(([, d]) => d));
      result[resultEntries[i][0]].sceneType = alternate;
      result[resultEntries[i][0]].sceneMode = getDefaultSceneMode(alternate);
    }
  }

  return result;
};