import { GoogleGenAI, Modality } from "@google/genai";
import test from "node:test";
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

test("applet test-tts", { skip: !process.env.GEMINI_API_KEY }, async () => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: "Hello world" }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Zephyr" },
        },
      },
    },
  });
  const inlineData = response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  console.log("MIME:", inlineData?.mimeType);
});
