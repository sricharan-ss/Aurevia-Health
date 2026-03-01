import axios from "axios";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") });

interface GeminiModel {
    name: string;
    version: string;
    displayName: string;
    description: string;
    supportedGenerationMethods: string[];
}

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY || "";
    if (!apiKey) {
        console.error("GEMINI_API_KEY is not set in .env");
        return;
    }

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await axios.get<{ models: GeminiModel[] }>(url);

        console.log("Available Models:");
        if (response.data.models) {
            response.data.models.forEach((m: GeminiModel) => {
                console.log(`${m.name} - ${m.supportedGenerationMethods.join(", ")}`);
            });
        } else {
            console.log("No models found or unexpected response structure.");
        }
    } catch (error: any) {
        console.error("Error listing models:", error.response?.data || error.message);
    }
}

listModels();
