// Keep tests offline even when a developer has provider keys in their shell or local env file.
process.env.GROQ_API_KEY = '';
process.env.DEEPGRAM_API_KEY = '';
