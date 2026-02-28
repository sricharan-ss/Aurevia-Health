import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
    try {
        const result = await genAI.listModels();
        console.log("Available Models:");
        result.models.forEach((m) => {
            console.log(`${m.name} - ${m.supportedGenerationMethods}`);
        });
    } catch (error) {
        console.error("Error listing models:", error);
    }
}

listModels();
