import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.get("/api/test", (req, res) => {
  res.json({
    ok: true,
    message: "CodeNova AI backend is working"
  });
});

app.post("/api/ai", async (req, res) => {
  try {
    const { message, code, file } = req.body;

    const prompt = `
You are CodeNova AI, an expert coding assistant.

Current file:
${file || "No file selected"}

Current code:
${code || "No code selected"}

User request:
${message}

Help with the code.
Give a clear and practical answer.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt
    });

    res.json({
      reply: response.text || "Gemini did not return a response."
    });

  } catch (error) {
    console.error("GEMINI ERROR:", error);

    res.status(500).json({
      reply: "Gemini error: " + error.message
    });
  }
});

app.listen(PORT, () => {
  console.log("");
  console.log("=================================");
  console.log("   CodeNova AI is running");
  console.log("   http://localhost:3000");
  console.log("=================================");
  console.log("");
});