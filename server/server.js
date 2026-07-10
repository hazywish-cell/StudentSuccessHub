import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// NOTE: .env must define GOOGLE_API_KEY (this used to look for the
// nonexistent "Gemini_API_Key" and silently failed on every request).
const apiKey = process.env.GOOGLE_API_KEY;

if (!apiKey) {
    console.error(
        "GOOGLE_API_KEY is not set. Create server/.env with GOOGLE_API_KEY=<your key> " +
        "(see server/.env.example)."
    );
}

const ai = new GoogleGenAI({ apiKey });

app.get("/", (req, res) => {
    res.json({ status: "ok", service: "ai-chat-server" });
});

app.get("/health", (req, res) => {
    res.json({ status: "ok", geminiConfigured: Boolean(apiKey) });
});

app.post("/chat", async (req, res) => {

    if (!apiKey) {
        return res.status(500).json({
            reply: "AI server is missing its API key. Set GOOGLE_API_KEY in server/.env."
        });
    }

    try {

        const { message } = req.body;

        if (!message || typeof message !== "string" || !message.trim()) {
            return res.status(400).json({ reply: "Message is required." });
        }

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: message
        });

        res.json({
    reply: response.text || "Sorry, I couldn't generate a response."
});

    } catch (err) {

        console.error(err);

        res.status(500).json({
            reply: "Something went wrong."
        });

    }

});

app.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
    console.log(`GOOGLE_API_KEY configured: ${Boolean(apiKey)}`);
});