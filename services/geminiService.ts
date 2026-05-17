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

// Scene Type composition rules — appended to visual prompts per frame's sceneType
const SCENE_TYPE_COMPOSITION: Record<string, string> = {
  'host-direct':
    "Composition: Host/mascot faces camera directly, occupying 50-60% of frame. Direct eye contact. One hand gesturing naturally. Minimal background. Focus on character's expression and connection with viewer. Text overlays appear as floating labels.",
  'icon-explainer':
    "Composition: Abstract symbolic icon/illustration is the main subject (50% of frame). Character stands beside icons, pointing or explaining. Icons have clean labels underneath. Minimal background. Sequential appearance of icons creates learning flow.",
  'split-contrast':
    "Composition: Clear visual split in the frame — could be left/right, top/bottom, or diagonal. Two contrasting elements side by side (e.g., before/after, good vs bad, calm vs chaos). Characters interact with each side. Use strong color/value contrast. A dividing line or gradient separates the two halves.",
  'scene-interaction':
    "Composition: Two or more characters interact within the frame. Equal emphasis (50-50) for duo mode. Main character faces group for vs-group mode. Use over-the-shoulder or wide shot. Body language and spatial relationship tell the story. Background context minimal.",
  'concept-visual':
    "Composition: A concept, diagram, or abstract illustration fills 60-70% of frame. Character is positioned to one side (max 25%) observing or reacting to the visual concept. Use flowing lines, arrows, connected nodes, or layered elements to explain the abstract idea visually.",
  'typography-hero':
    "Composition: Large bold text is the primary visual element, occupying 50-60% of frame center. Character is present in a corner (max 20% of frame) reacting to or presenting the text. Background is minimal or empty. Text has dramatic entrance animation implied.",
  'stock-footage':
    "Composition: Realistic photo or video-style background fills the entire frame (atmospheric setting). Character appears as overlay in bottom corner or side (max 20% of frame) as observer. The background sets the emotional tone — nature for calm, city for stress, clinical for therapy. High contrast between realistic bg and cartoon character.",
  'multi-panel':
    "Composition: Frame is divided into 2, 3, or 4 equal panel sections (like a comic strip). Each panel contains its own self-contained scene. Panels are read left-to-right or top-to-bottom. Thin borders separate panels. Character appears in one or more panels consistently. Minimal backgrounds per panel to avoid clutter.",
  'whiteboard-list':
    "Composition: A large whiteboard or chalkboard fills 60-70% of the frame with handwritten-style text and bullet points. Character stands beside the board holding a marker or pointer, facing toward the board or slightly toward camera. The list items are clearly readable. Simple visual icons may accompany each bullet point.",
  'quote-card':
    "Composition: A stylized card or banner in the center of frame containing a quote in elegant typography. The quote text is the hero. Character appears in lower corner or behind the card (max 20% of frame) in a contemplative pose. Attribution line at bottom of quote. Subtle decorative elements like quotation marks or line accents.",
  'data-visual':
    "Composition: A large numerical statistic, chart, or graph fills the center 60% of frame. Numbers are bold and oversized. Simple chart elements (bars, lines, or pie segments) in clean flat design. Character stands beside the data, pointing or reacting with surprise/emphasis. Minimal background to keep focus on the number.",
  'metaphor-scene':
    "Composition: A visually rich metaphorical scene fills the entire frame. The metaphor is shown as a literal scene (e.g., a person carrying a heavy backpack for 'emotional burden'). Character is integrated INTO the metaphor, not observing it. The scene should be immediately readable as symbolic. Use lighting and color to enhance the metaphorical mood. Think Pixar's 'Abstract Thought' sequence — abstract concepts made tangible through imaginative visuals.",
  'process-flow':
    "Composition: A dynamic flow diagram showing sequential stages connected by arrows, lines, or cascading elements. Stages flow left-to-right or top-to-bottom with clear progression markers (numbers, dots, or arrowheads). Character stands beside the flow, pointing to a specific stage or reacting to the overall process. Each stage has a small label or icon. Use motion lines or gradient flows between stages.",
  'pov-scene':
    "Composition: First-person or subjective perspective — camera shows what the character sees through their eyes. Hands/body parts of the POV character visible at frame edges for grounding. Character's reflection in mirror or window can establish who they are. Deep depth of field for emotional immersion. Use color grading to reflect emotional state (warm for comfort, cold for anxiety).",
  'cinematic-insert':
    "Composition: A short dramatic vignette like a movie scene — no mascot, no narrator character. The scene itself tells a story through pure visual storytelling. Use realistic lighting, deep shadows, and cinematic framing (wide shot for isolation, close-up for emotion). Color grading sets the mood: warm sepia for nostalgia, cold blue for sadness, desaturated for trauma. No text overlays. No explanatory elements. Just pure emotional scene.",
  'timeline-progress':
    "Composition: A horizontal or vertical timeline dominates the frame, showing progression through time. Key milestone markers connected by a continuous line or path. The character is positioned at one end of the timeline, either looking back at the past or forward toward the future. Each milestone has a small icon and date/label. Use fading/grayscale for past events, bright colors for present/future. Arrowhead at the end of the line indicates direction of time.",
  'cross-section':
    "Composition: A cutaway or cross-section view of an object, body part, or system fills 70% of frame. The outer shell is peeled away to reveal internal structures. Character stands beside or below the cross-section (max 20% of frame) pointing or reacting. Internal elements are clearly labeled with thin callout lines. Use translucent layering effect — outer layer semi-transparent, inner layers fully opaque and brightly colored for emphasis.",
  'scale-compare':
    "Composition: Two or more objects/people of drastically different sizes occupy the frame to show magnitude comparison. The larger element looms in background or one side, the smaller element in foreground or opposite side. Character can be the scale reference (small) facing a giant version of the same concept. Use forced perspective, wide-angle lens effect, or stacked visual hierarchy. Size difference should be instantly readable — no subtlety.",
  'drawing-live':
    "Composition: A hand (visible at frame edge, holding a marker/pen/chalk) actively draws on a blank surface that fills 60-70% of frame. The drawing is partially complete — some lines done, some still being sketched. The hand is the only character element. Character (narrator) watches from one side (max 15% of frame) with engaged expression. Sketchy, rough lines gradually revealing the concept. Small eraser marks or dust particles add realism.",
  'transformation':
    "Composition: The same subject is shown in TWO states within one frame — BEFORE on one side (fading, grayscale, cracked) transitioning into AFTER on the other side (vibrant, complete, glowing). The transition zone between them shows the morphing process: particles, cracks, light beams, or liquid flow bridging the two states. Character appears in one state, or as a silhouette in the transition zone. Think caterpillar-to-butterfly visual language.",
};

// Style prefixes — prepended to the visual prompt to signal visual language without changing the preset
// Only 2 styles: 2D (for illustrative/mascot scenes) and REALISTIC (for photo-like scenes)
const SCENE_STYLE_PREFIX: Record<string, string> = {
  'stock-footage': '[STYLE: REALISTIC] ',
  'cinematic-insert': '[STYLE: REALISTIC] ',
  'drawing-live': '[STYLE: 2D] ',
  'cross-section': '[STYLE: 2D] ',
  'data-visual': '[STYLE: 2D] ',
  'multi-panel': '[STYLE: 2D] ',
  'whiteboard-list': '[STYLE: 2D] ',
};

// Helper: Get composition rule for a scene type
const getSceneTypeComposition = (sceneType: string): string => {
  return SCENE_TYPE_COMPOSITION[sceneType] || SCENE_TYPE_COMPOSITION['host-direct'];
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
    
    return text.trim();
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
  manualApiKey?: string
): Promise<StoryScene[]> => {
  const ai = getClient(manualApiKey);
  
  // Process placeholders in system instruction
  const finalSystemInstruction = processSystemInstruction(systemInstruction, narratorName, styleSuffix, easterEggCount, easterEggTypes, negativePrompt, language);
  
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
                    format: { type: Type.STRING, description: "Format: 'Single Panel', 'Multi Panel (2)', 'Multi Panel (3)', or 'Sequence'. RULE: If 'splitText' array has more than 1 item, Format CANNOT be 'Single Panel'." },
                    splitText: { 
                        type: Type.ARRAY, 
                        items: { type: Type.STRING },
                        description: "The narrative text split into segments. If Single Panel, array MUST have 1 item. If Multi Panel, split by conjunctions. If Sequence, split by events."
                    },
                    sceneType: { type: Type.STRING, description: `Scene type for this frame. CRITICAL: Choose based on NARRATIVE FUNCTION of this scene, not arbitrarily.

MAPPING — Pick the BEST match for what this scene DOES:
- host-direct: Mascot speaks DIRECTLY to camera. Use for: opening hook, closing CTA, direct address, transition between topics, rhetorical question ("Lo tahu nggak sih..."). Mascot engages viewer.
- icon-explainer: Narasi menjelaskan KONSEP dengan contoh konkret. Use for: introducing specific terms, defining ideas, listing categories. Mascot stands beside labeled icons/objects.
- split-contrast: Membandingkan DUA SISI — good vs bad, dulu vs sekarang, mitos vs fakta. Use for: contrast, irony, "sisi gelap vs sisi terang", paradox.
- scene-interaction: Two or more characters interacting. Use for: dialogue between personas, social dynamics, internal conflict visualized as two characters arguing.
- concept-visual: Abstract concept that needs visual metaphor (diagram, brain, mind map). USE SPARINGLY — only when idea is purely abstract and no other type fits better.
- typography-hero: One key word/phrase lands with IMPACT. Use for: punchline, thesis statement, emphasis, climax ("SEMUA INI... PALSU"), big reveal.
- stock-footage: Setting the MOOD with a realistic scene. Use for: establishing shots (city street, therapy room), environmental context, "imagine this...".
- multi-panel: Showing BEFORE/AFTER or multiple STEPS in one frame. Use for: process comparison, "dulu vs sekarang" as comic panels.
- whiteboard-list: Listing items, steps, or facts. Use for: "there are X reasons why...", numbered causes, checklist of symptoms.
- quote-card: Notable STATEMENT presented as a card. Use for: expert quote, provocative statement, core thesis in a box.
- data-visual: STATISTIC or NUMBER that surprises. Use for: "X% of people...", shocking facts, comparisons of scale.
- metaphor-scene: Elaborate VISUAL METAPHOR where mascot is INSIDE the metaphor world. Use for: deep analogies, emotional states visualized as physical spaces.
- process-flow: Sequential FLOW or cycle. Use for: cause-and-effect chains, feedback loops, step-by-step progression.
- pov-scene: Audience sees from character's EYES. Use for: immersive moments, first-person experience, emotional flashback.
- cinematic-insert: Movie-like vignette WITHOUT mascot. Use for: pure storytelling moment, historical scene, flashback without narrator. NO mascot in frame.
- timeline-progress: Changes over TIME. Use for: evolution, journey, "X years later", progress bars.
- cross-section: Looking INSIDE something. Use for: brain cutaway, system anatomy, peeling layers.
- scale-compare: Size COMPARISON — tiny vs giant. Use for: magnitude emphasis, "just how big/small is this".
- drawing-live: Hand is DRAWING on a board. Use for: reveal-as-you-explain, sketch note style, chalk-talk.
- transformation: BEFORE → AFTER change. Use for: personal growth, habit change, metamorphosis.` },
                    sceneMode: { type: Type.STRING, description: "Mode for the chosen sceneType, auto-detected from narrative." }
                },
                required: ["visualPrompt", "format", "splitText", "sceneType", "sceneMode"]
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

    CRITICAL RULE 1: Split every sentence (ending with '.', '?', or '!') into a separate SCENE.
    
    CRITICAL RULE 2 (FORMAT & SPLITTING LOGIC):
    For each sentence, you MUST decide if it needs to be split (Multi Panel/Sequence) or kept as Single Panel.

    STEP A: CHECK FOR MULTI PANEL TRIGGERS ("ATAU", "DAN", "BUKAN... BUKAN... BUKAN")
    
    1. "TRIAD / TRIPLET NEGATION" (3 PARALLEL ITEMS) - V2.10
       - Trigger: A list of 3 distinct items, often with repetition like "Bukan A, bukan B, dan bukan C".
       - Example: "Kadang bukan inflasi, bukan harga beras naik, dan bukan juga kebijakan pemerintah."
       - Action: Split text into 3 parts.
       - FORMAT MUST BE: "Multi Panel (3)".
       - SPLIT: [Part 1, Part 2, Part 3]

    2. "ATAU" (Choice/Contrast):
       - Trigger: "Angkanya bikin hati TENANG, atau malah bikin pengen banting HP ke tembok?" 
       - Action: Split text into 2 parts. 
       - FORMAT MUST BE: "Multi Panel (2)".
    
    3. "DAN" (Distinct Parallel Ideas):
       - Trigger: "Kami gak nawarin koin micin, dan jelas gak nawarin pesugihan."
       - Action: Split text into 2 parts.
       - FORMAT MUST BE: "Multi Panel (2)".

    STEP B: CHECK FOR SEQUENCE TRIGGERS (AGGRESSIVE PACING RULE V2.8)
    1. Temporal Words: "Lalu", "Terus", "Kemudian".
    2. **AGGRESSIVE COMMA SPLITTING (V2.8):**
       - RULE: If a sentence is LONG (> 12 words) and contains an intermediate comma (","), you MUST split it into a "Sequence".
       - RATIONALE: Long sentences with pauses need visual pacing steps. Do NOT keep them as Single Panel.
       - Trigger Examples:
         - "Tapi kalau kamu punya tanda nomor tiga ini, sensasi belanja itu mendadak HILANG." -> SPLIT at comma -> Sequence.
         - "Padahal kalau dipikir-pikir lagi, sebenarnya itu cuma trik marketing." -> SPLIT at comma -> Sequence.
         - "Kita akan mulai hitung dari tanda LIMA, yang sering diremehkan." -> SPLIT at comma -> Sequence.
       
       - Action: Split text at the comma/conjunction.
       - FORMAT MUST BE: "Sequence".

    STEP C: SINGLE PANEL
    - ONLY if the text is short (< 10 words) AND has NO comma triggers AND is not a Heading.
    - FORMAT MUST BE: "Single Panel".

    STEP D: SUBTITLE/HEADING DETECTION
    - If the text is a Heading (Rule 0), Format MUST be "Single Panel" but visual prompt MUST be a Title Card.

    CRITICAL - VISUAL PROMPT STRUCTURE:
    
    RULE 1: LOCATION & BACKGROUND (MANDATORY & INTERNATIONAL)
    - IF NOT using "ilmu lidi" style: Start EVERY prompt with: "[Indoor/Outdoor] - [Specific Location Description]". Use Universal/International settings.
    - IF using "ilmu lidi" style: The background MUST BE described as "Pure solid minimalist white background". Characters can interact with primary objects (desk, chair, etc), but DO NOT add walls, floors, scenery, or full environmental settings. DO NOT use [Indoor/Outdoor]. Focus entirely on the character format, primary objects, and action. Example: "Pure solid minimalist white background. [Character] is doing [Action] with [Object]"
    - Example (Not Ilmu Lidi): "[Indoor] - Inside a modern minimalist office." or "[Outdoor] - In a busy street."
    
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
    
    CASE 2: MULTI PANEL (2 or 3)
    - If Format is "Multi Panel", create ONE prompt describing a split screen.
    - STRICT FORMAT (MUST FOLLOW THIS EXACTLY):
      "Split Screen / Multi Panel.
       Panel 1 (Kiri): [Action/Visual 1]. [Location].
       easter_egg: [Pop Culture Item]
       
       Panel 2 (Tengah/Kanan): [Action/Visual 2]. [Location].
       easter_egg: [Pop Culture Item]
       
       (IF 3 PANELS)
       Panel 3 (Kanan): [Action/Visual 3]"
           
    CASE 3: SEQUENCE (V2.4 LOGIC)
    - You MUST plan the visual flow.
    - SEPARATOR: You MUST separate the visual description for EACH frame using the delimiter " ||| ".
    - Example for 2 frames: "[Indoor] - [Location]... Visual Frame 1 description ||| [Indoor] - [Location]... Visual Frame 2 description starting with Referensi..."

    CASE 4: SINGLE PANEL (Standard)
    - Standard visual description. Include 'easter_egg'.

    CRITICAL - CHARACTER PRESENCE (STRICT USAGE OF AVAILABLE CHARACTERS):
    1. AVAILABLE CHARACTERS: You have these characters available: "${characterList}".
    2. USAGE RULE: You MUST use the characters from the AVAILABLE CHARACTERS list in the scenes. Do NOT just use "${narratorName}" for everything.
    3. DISTRIBUTION: If there are multiple available characters, distribute them across the scenes. Have them act out or interact with the situations described in the narrative.
    4. FALLBACK: Only if the narrative is purely abstract and no other characters fit, use "${narratorName}" observing the scene. But strongly prefer using the other available characters.
    
    CRITICAL - FRAMING & COMPOSITION RULES (STRICT):
    1. MINIMUM FRAMING: "Half-Body Shot" (Setengah Badan) or "Full Body Shot".
    2. VISIBILITY: At least one Reference Character MUST be visible in every frame.
    3. PROHIBITION: DO NOT generate Extreme Close-ups of body parts (hands, feet) or objects without the character's face/body being visible.

    CRITICAL - CHARACTER DESCRIPTION RESTRICTIONS (NEGATIVE PROMPTING):
    1. DO NOT describe the character's clothing (e.g., "memakai baju merah", "celana jeans", "topi").
    2. DO NOT describe the character's physical features (e.g., "rambut hitam", "mata besar").
    3. DO NOT use the word "Ilustrasi".
    4. JUST use the Character Name and their Action/Pose. The reference image handles the rest.

    FINANCIAL/MATH OVERLAY RULE (CRITICAL FOR V2.7):
    If the narrative contains monetary values or calculations (e.g., "sepuluh ribu", "tiga ratus ribu", "tiga juta enam ratus ribu"):
    1. CONVERT words to digits (e.g., "tiga juta" -> "3,000,000" or "3M" -> Use International Format).
    2. DETECT timeframe if present/implied (hari/bulan/tahun).
    3. ADD INSTRUCTION: "Teks besar '[Angka] [Periode]' muncul melayang dengan font tebal digital."
    
    STYLE MANDATE:
    - Every generated 'visualPrompt' MUST end with this exact sentence: "${styleSuffix}"
    
    SCENE TYPE VARIETY & COMPOSITION (CRITICAL — DO NOT IGNORE):
    - VARY the sceneType across scenes. Do NOT default to "concept-visual" for every scene.
    - A good storyboard uses 6-10 different scene types. Be deliberate.
    - Choose based on NARRATIVE FUNCTION, not convenience.
    
    **CRITICAL: YOUR visualPrompt MUST REFLECT the chosen sceneType's visual language.**
    Do NOT just write "Mascot is doing X" for every scene type. Each scene type has UNIQUE visual composition:
    
    | sceneType | What visualPrompt MUST describe |
    |---|---|
    | host-direct | Mascot face kamera, eye contact, gestur tangan alami, teks overlay floating. Karakter adalah fokus utama 50-60% frame. |
    | icon-explainer | Mascot berdiri di samping IKON/OBJEK dengan LABEL TEKS di bawahnya. Ikon adalah elemen visual utama di samping mascot. |
    | split-contrast | DUA SISI dalam satu frame — kiri vs kanan dengan garis pemisah. Satu sisi gelap/negatif, sisi lain terang/positif. |
    | scene-interaction | DUA KARAKTER berinteraksi. Over-the-shoulder shot atau wide shot. Body language menunjukkan relasi. |
    | concept-visual | DIAGRAM/OTAK/KONSEP ABSTRAK sebagai elemen utama 60-70% frame. Mascot di samping mengamati. USE SPARINGLY. |
    | typography-hero | SATU KATA/FRASA BESAR sebagai elemen utama 50-60% frame. Mascot di pojok bereaksi terhadap teks. Teks WAJIB visible. |
    | stock-footage | Background FOTO REALISTIS penuh frame (alam/kota/klinik). Mascot overlay kecil di pojok. |
    | multi-panel | Frame terbagi jadi 2-4 PANEL komik. Masing-masing panel punya adegan sendiri. Border tipis pemisah. |
    | whiteboard-list | PAPAN TULIS besar 60-70% frame dengan bullet points. Mascot berdiri di samping papan. |
    | quote-card | KARTU/KOTAK di tengah frame berisi KUTIPAN. Mascot di pojok kontemplatif. Dekorasi minimal. |
    | data-visual | ANGKA BESAR + GRAFIK/BATANG di tengah 60% frame. Mascot di samping menunjuk/bereaksi. |
    | metaphor-scene | Adegan METAFORA PENUH — mascot ADA DI DALAM metafora (bukan mengamati). Contoh: mascot di dalam kandang, atau memanggul beban raksasa. |
    | process-flow | Diagram ALUR bertahap dengan PANAH penghubung. Mascot menunjuk ke satu tahap. Label di setiap tahap. |
    | pov-scene | Perspektif FIRST PERSON — kamera = mata karakter. Tangan karakter visible di tepi frame. |
    | cinematic-insert | Adegan FILM realistik — TANPA MASCOT. Pencahayaan sinematik, warna sesuai mood. Pure storytelling visual. |
    | timeline-progress | Garis WAKTU horizontal/vertikal dengan milestone. Mascot di salah satu ujung. Masa lalu pudar, masa depan cerah. |
    | cross-section | IRISAN/BELAHAN objek 70% frame — lihat ke DALAM otak/sistem. Label callout. Mascot di samping. |
    | scale-compare | Perbandingan UKURAN — objek raksasa vs kecil dalam satu frame. Mascot sebagai skala referensi. |
    | drawing-live | TANGAN menggambar di papan — visible di tepi frame. Gambar sebagian selesai. Gaya sketsa. |
    | transformation | DUA STATE dalam satu frame — BEFORE (pudar/grayscale) vs AFTER (vibrant/glowing). Zona transisi di tengah. |
    
    CONTOH: Jika sceneType="icon-explainer", visualPrompt HARUS deskripsikan ikon dengan label. Jika sceneType="typography-hero", visualPrompt HARUS deskripsikan teks besar sebagai elemen hero. Jika tidak ada elemen scene type dalam visualPrompt, scene type tidak berguna.
    
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
        model: 'gemini-3.1-flash-lite-preview',
        ...generateConfig
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
      frames: scene.frames.flatMap((frame, fIdx) => {
        let correctedFormat = frame.format;
        const textSegments = frame.splitText || [];
        let isSequence = false;

        // STRICT LOGIC ENFORCEMENT:
        // If text is split (>1), it CANNOT be Single Panel.
        if (textSegments.length > 1) {
             const combinedText = textSegments.join(" ").toLowerCase();
             const fmtLower = (correctedFormat || "").toLowerCase();
             
             const isExplicitSequence = fmtLower.includes('sequence');
             const isExplicitMulti = fmtLower.includes('multi');

             if (isExplicitSequence) {
                 isSequence = true;
             } else if (isExplicitMulti) {
                 isSequence = false;
             } else {
                 // Auto-detect if format was incorrect/missing
                 const multiPanelTriggers = [" atau ", " sedangkan ", " sementara ", " di sisi lain ", " tapi ", " namun ", " bukan "];
                 const negativeCount = (combinedText.match(/bukan/g) || []).length;
                 const isMultiPanelContext = multiPanelTriggers.some(t => combinedText.includes(t)) || negativeCount >= 2;

                 if (!isMultiPanelContext) {
                     isSequence = true;
                     correctedFormat = `Sequence (${textSegments.length} Frames)`;
                 } else {
                     correctedFormat = `Multi Panel (${textSegments.length})`;
                     isSequence = false;
                 }
             }
        }

        // CRITICAL FIX: If Sequence, we MUST return multiple frame objects to ensure 1 prompt row per text split.
        if (isSequence && textSegments.length > 1) {
            const fullPrompt = frame.visualPrompt;
            
            // 1. Try splitting by explicit delimiter "|||"
            let splitParts = fullPrompt.split("|||").map(s => s.trim()).filter(s => s.length > 0);
            
            // 2. Fallback: Regex if delimiter failed or insufficient parts
            let usedRegex = false;
            if (splitParts.length < textSegments.length) {
                 const splitRegex = /(?:Frame|Panel|Sequence|Langkah|Step)\s*\d+[:.]|(?:\d+\.)\s/gi;
                 const regexParts = fullPrompt.split(splitRegex).map(s => s.trim()).filter(s => s.length > 0);
                 if (regexParts.length > splitParts.length) {
                     splitParts = regexParts;
                     usedRegex = true;
                 }
            }

            // CORRECTION FOR PREAMBLE ARTIFACT (V2.16 Bug Fix)
            // If regex split resulted in [Preamble, Frame1, Frame2...] structure where Preamble is just location info,
            // we must merge it into Frame 1 so Frame 1 isn't empty/just location.
            // Check: If we have more parts than segments, and index 0 is likely preamble.
            if (usedRegex && splitParts.length > textSegments.length) {
                const preamble = splitParts[0];
                // Heuristic: If preamble is short or starts with [Location], merge it.
                if (preamble.startsWith('[') || preamble.length < 50) {
                     splitParts[1] = `${preamble} ${splitParts[1]}`;
                     splitParts.shift(); // Remove preamble
                }
            }
            
            return textSegments.map((seg, i) => {
                let p = "";

                if (i < splitParts.length) {
                    p = splitParts[i];
                } else {
                    // Fallback strategies if splitting failed
                    if (splitParts.length > 0) {
                        p = splitParts[splitParts.length - 1]; 
                    } else {
                        p = (i === 0) ? fullPrompt : "Lanjutkan aksi dari frame sebelumnya sesuai narasi.";
                    }
                }

                // Cleanup any stray formatting prefixes that the AI might have included
                p = p.replace(/^(?:Sequence|Frame|Panel|Langkah|Step)[\s\w\(\)]*[:\-]*\s*/gi, "").trim();
                p = p.replace(/^(?:\d+\.)\s*/g, "").trim();

                // V2.0 Logic: Sequence > 1 must include reference prefix (Double Check Safety)
                if (i > 0) {
                     const prefix = "Referensi dari Gambar sebelumnya, tapi... ";
                     // Avoid double prefixing if AI already did it (which V2.4 requests)
                     if (!p.toLowerCase().startsWith("referensi dari")) {
                        p = prefix + p;
                     }
                }

                // Restore mandatory style if lost during split
                const styleCheck = "Modern 2D webcomic style"; // Basic check
                if (!p.includes(styleCheck)) {
                    p += " " + styleSuffix;
                }

                p = applyNarratorSuffix(p, narratorName, narratorSuffix);

                return {
                    id: `frame-${Date.now()}-${sIdx}-${fIdx}-${i}`,
                    format: `Sequence ${i+1}/${textSegments.length}`,
                    sceneType: (frame.sceneType || 'host-direct') as SceneType,
                    sceneMode: (frame.sceneMode || 'intro') as SceneMode,
                    visualPrompt: p,
                    splitText: [seg], // One segment per frame
                    isGenerating: false
                };
            });
        }

        // Multi Panel or Single Panel stays as 1 Frame object
        return [{
            id: `frame-${Date.now()}-${sIdx}-${fIdx}`,
            format: correctedFormat,
            sceneType: (frame.sceneType || 'host-direct') as SceneType,
            sceneMode: (frame.sceneMode || 'intro') as SceneMode,
            visualPrompt: applyNarratorSuffix(frame.visualPrompt, narratorName, narratorSuffix),
            splitText: frame.splitText,
            isGenerating: false
        }];
      }),
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
    manualApiKey?: string
): Promise<string[]> => {
    const ai = getClient(manualApiKey);

    // Process placeholders in system instruction
    const finalSystemInstruction = processSystemInstruction(systemInstruction, narratorName, styleSuffix, easterEggCount, easterEggTypes, negativePrompt, language);

    // Prepare a simplified representation of the frames for the AI
    const framesConfig = frames.map((f, i) => ({
        index: i,
        format: f.format,
        splitText: f.splitText
    }));

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
        
        3. IF FRAME FORMAT IS "Multi Panel":
           - The frame has a 'splitText' array with multiple items.
           - ACTION: Create ONE cohesive prompt that describes a comic strip Side-by-Side layout WITH visible panel borders.
           - STRICT FORMAT:
             "Komik Strip / Side-by-Side.
              Panel 1 (Kiri): [Action/Visual]. [Location].
              easter_egg: [Pop Culture]
              
              Panel 2 (Kanan): [Action/Visual]. [Location].
              easter_egg: [Pop Culture]
              
              (IF 3 PANELS)
              Panel 3 (Kanan): [Action/Visual]"
           - RULE: The panels must be arranged HORIZONTALLY (Left to Right). NEVER use Top/Bottom split.
           - RULE (CRITICAL): Setiap panel WAJIB memiliki border/kotak pemisah yang jelas — seperti komik strip. Gunakan garis hitam tebal sebagai frame antar panel. Jangan buat gambar tanpa pembatas panel.
           
        4. IF FRAME FORMAT CONTAINS "Sequence":
           - TARGET: Create a prompt for ONE SINGLE FRAME out of a sequence.
           - CRITICAL RULE: DO NOT describe the entire sequence. ONLY describe what happens in THIS SPECIFIC FRAME based on its 'splitText'.
           - CRITICAL ERROR PREVENTION: NEVER use phrases like "kemudian di frame berikutnya" or "di frame terakhir". A single prompt MUST describe ONLY A SINGLE IMAGE.
           - First frame of sequence: Describe the visual scene fully based on the text.
           - Subsequent frames of sequence: Start with 'Referensi dari Gambar sebelumnya, tapi...' then describe the action/change for THIS frame.
           - DO NOT include the text "Sequence X/Y" or "Frame X" inside the generated prompt.
           - DO NOT copy the description of Frame 1 into Frame 2.
           
           [EXAMPLE SEQUENCE CORRECT OUTPUT]:
           - Prompt 0 (Sequence 1/3): '[Indoor] - Di dalam kelas. Sapi makan rumput.'
           - Prompt 1 (Sequence 2/3): 'Referensi dari Gambar sebelumnya, tapi kini sapi sedang berlari kencang.'
           - Prompt 2 (Sequence 3/3): 'Referensi dari Gambar sebelumnya, tapi kini sapi berlari bersama kuda.'
           
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

        8. LOCATION & EASTER EGG RULES (MANDATORY):
           - Start EVERY prompt with: "[Indoor/Outdoor] - [Specific Location Description]".
           - Include ${easterEggCount} "easter_egg" item(s): ${easterEggTypes.join(", ")}.
        
        9. CHARACTER DESCRIPTION RESTRICTIONS (STRICT):
           - DO NOT describe character clothing or physical appearance.
           - DO NOT use the word "Ilustrasi".
           - Rely ONLY on the Character Name for visual consistency via reference images.

        10. FRAMING & COMPOSITION RULES (MANDATORY):
           - MINIMUM FRAMING: "Half-Body Shot" (Setengah Badan) or "Full Body Shot".
           - VISIBILITY: At least one Reference Character MUST be visible in every frame.
           - PROHIBITION: DO NOT generate Extreme Close-ups of body parts (hands, feet) or objects without the character's face/body being visible.
           
        11. STYLE REQUIREMENT (MANDATORY):
           - Every single prompt MUST end with or contain this exact sentence: "${styleSuffix}"
           - This is non-negotiable for the visual consistency.

        RETURN JSON FORMAT ONLY. Output must be a JSON object with a "prompts" array of strings.
    `;

    let text = "";

    try {
        const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
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
        let cleaned = p.replace(/^(?:Sequence|Frame|Panel|Langkah|Step|Prompt)[\s\w\(\)\/]*[:\-\.]*\s*/gi, "").trim();
        cleaned = cleaned.replace(/^(?:\d+\.)\s*/g, "").trim();
        return applyNarratorSuffix(cleaned, narratorName, narratorSuffix);
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
  narratorName: string = "Norman",
  narratorSuffix: string = "",
  styleSuffix: string = "Modern 2D webcomic style",
  easterEggCount: number = 1,
  easterEggTypes: string[] = ["pop culture"],
  negativePrompt: string = "",
  language: 'id' | 'en' = 'id',
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
    model: 'gemini-3.1-flash-lite-preview',
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
          if (parsed.visualPrompt) return applyNarratorSuffix(parsed.visualPrompt, narratorName, narratorSuffix);
          if (parsed.prompt) return applyNarratorSuffix(parsed.prompt, narratorName, narratorSuffix);
      }
  } catch (e) {
      // Not JSON
  }

  return applyNarratorSuffix(result, narratorName, narratorSuffix);
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
      model: 'gemini-3.1-flash-lite-preview',
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
      model: 'gemini-3.1-flash-lite-preview',
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
  refImages: ReferenceImage[],
  previousImage?: string,
  narratorName: string = "Norman",
  styleSuffix: string = "Modern 2D webcomic style",
  negativePrompt: string = "",
  manualApiKey?: string,
  sceneType?: string
): Promise<string> => {
  const ai = getClient(manualApiKey);
  
  // Construct the prompt parts
  const parts: any[] = [];
  let combinedText = "";

  let finalVisualPrompt = visualPrompt.replace(/^(?:Sequence|Frame|Panel|Langkah|Step)[\s\w\(\)]*[\:\-]*\s*/gi, "").trim();
  
  // Strip [SCENE: ...] marker — it's for display only, not for the image model
  finalVisualPrompt = finalVisualPrompt.replace(/\n\[SCENE:.*?\]/g, "").trim();

  // Filter Banned Words from Prompt (Client-side safety)
  if (negativePrompt.trim()) {
      const bannedList = negativePrompt.split(',').map(w => w.trim()).filter(w => w);
      bannedList.forEach(word => {
          const regex = new RegExp(word, 'gi');
          finalVisualPrompt = finalVisualPrompt.replace(regex, "");
      });
  }

  // Add scene type composition rule to guide AI composition
  if (sceneType) {
      const compositionRule = getSceneTypeComposition(sceneType);
      if (compositionRule) {
          finalVisualPrompt += `\n\nCOMPOSITION RULE: ${compositionRule}`;
      }
  }

  // Prepend style prefix to signal visual language
  if (sceneType && SCENE_STYLE_PREFIX[sceneType]) {
      finalVisualPrompt = SCENE_STYLE_PREFIX[sceneType] + finalVisualPrompt;
  }

  // V2.13: INTELLIGENT FALLBACK OBSERVER LOGIC
  if (refImages.length === 1 && refImages[0].name.toLowerCase().includes(narratorName.toLowerCase())) {
      if (!finalVisualPrompt.toLowerCase().includes(narratorName.toLowerCase())) {
           finalVisualPrompt += ` . ${narratorName} is standing in the scene, observing quietly (Half-Body Shot).`;
      }
  }

  // 1. Add Reference Images
  if (refImages.length > 0) {
      refImages.forEach((img, index) => {
          const mimeType = img.data.split(';')[0].split(':')[1] || "image/jpeg";
          parts.push({
              inlineData: {
                  mimeType: mimeType, 
                  data: img.data.split(',')[1] 
              }
          });
          combinedText += `Reference image ${index + 1} represents character: ${img.name}.\n`;
      });
  }

  // FALLBACK STYLE INSTRUCTION (Always applied, even if no ref)
  combinedText += `STYLE REFERENCE (MANDATORY):
  Use the defined Modern 2D Webcomic Style.
  Characteristics: Pastel background, bold clean lines, cel-shading, cinematic lighting.
  DO NOT draw the specific character "${narratorName}" UNLESS explicitly requested in the prompt or if no other character is present.\n`;

  // 2. Add Previous Image for Sequence Consistency
  if (previousImage) {
      const mimeType = previousImage.split(';')[0].split(':')[1] || "image/jpeg";
      parts.push({
          inlineData: {
              mimeType: mimeType, 
              data: previousImage.split(',')[1]
          }
      });
      combinedText += `PREVIOUS FRAME (Reference for continuity): Use this image as the starting point. Modify it based on the prompt below.\n`;
  }

  // 3. Add the Visual Prompt
  const finalRequestPrompt = `
    Generate a scene based on this prompt: "${finalVisualPrompt}".
    Style Description: ${styleSuffix}.
    ${refImages.length > 0 ? "Use the provided reference images for character consistency." : `Use '${narratorName}' ART STYLE (Flat colors, thick outlines).`}
    ${previousImage ? "EDIT/MODIFY the Previous Frame to match the new action/description. Keep style consistent." : ""}
    IMPORTANT: If the prompt asks for 'Text Overlay' or 'Teks besar', ensure the text is rendered clearly and legibly.
    CRITICAL: For Multi-Panel images, use a COMIC STRIP STYLE layout. Each panel MUST have a CLEAR PANEL BORDER / FRAME separating it from the other panel(s) — like a comic book or newspaper comic strip. Add a visible thick black or dark outline border around each individual panel. The panels must look like separate comic panels arranged side-by-side.
    ${styleSuffix.includes("pure white background") 
      ? "FRAMING REQUIREMENT: full body shot. Ensure the entire character is visible from head to toe (Full Body Shot). Do not crop the head or feet. The character must be centered."
      : "FRAMING REQUIREMENT: Ensure the character is visible from at least the waist up (Half-Body Shot). Do not crop the head. Do not make it an extreme close-up of objects/hands only."}
    ${negativePrompt ? `NEGATIVE PROMPT (DO NOT INCLUDE): ${negativePrompt}` : ""}
    CRITICAL: Do NOT mirror, flip, or reverse any text, logos, symbols, or written words visible on the character's clothing or accessories. Keep text in its original, readable orientation.
  `;
  
  combinedText += finalRequestPrompt;
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