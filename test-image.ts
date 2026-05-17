import { GoogleGenAI } from "@google/genai";

async function test() {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-image-preview',
            contents: {
                parts: [
                    { text: "A simple test image of a cat." }
                ]
            },
            config: {
                imageConfig: {
                    aspectRatio: "16:9"
                }
            }
        });
        
        let hasImage = false;
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                console.log("Image generated successfully!");
                hasImage = true;
            }
        }
        if (!hasImage) {
            console.log("No image generated. Finish reason:", response.candidates?.[0]?.finishReason);
            console.log("Response parts:", JSON.stringify(response.candidates?.[0]?.content?.parts, null, 2));
        }
    } catch (e) {
        console.error("Error:", e);
    }
}

test();
