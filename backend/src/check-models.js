const axios = require('axios');
require('dotenv').config();

async function checkModels() {
    const key = process.env.GEMINI_API_KEY;
    try {
        const response = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        console.log('Available Models:');
        response.data.models.forEach(m => {
            console.log(`- ${m.name}: ${m.displayName}`);
        });
    } catch (err) {
        console.error('Error fetching models:', err.response ? err.response.data : err.message);
    }
}

checkModels();
