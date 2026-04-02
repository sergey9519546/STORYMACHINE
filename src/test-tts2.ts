import { GoogleGenAI, Modality } from "@google/genai";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
async function run() {
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
  if (inlineData?.data) {
    const buffer = Buffer.from(inlineData.data, "base64");
    fs.writeFileSync("output.bin", buffer);
    console.log("Wrote output.bin, size:", buffer.length);
    console.log("First 16 bytes:", buffer.subarray(0, 16).toString("hex"));
    console.log("First 16 bytes (ascii):", buffer.subarray(0, 16).toString("ascii"));
  }
}
run();
