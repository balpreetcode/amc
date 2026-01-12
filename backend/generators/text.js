/**
 * Text Generation Module
 * Uses OpenAI API for text-to-text generation
 */

const axios = require('axios');

// Don't cache the API key - read it dynamically from process.env each time
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

/**
 * Generate text using OpenAI
 * @param {string} prompt - User prompt
 * @param {string} systemPrompt - System prompt for context
 * @param {string} model - OpenAI model to use
 * @param {number} temperature - Temperature for generation
 * @param {boolean} includeMetadata - Whether to return API call metadata
 * @returns {Promise<string|object>} Generated text or object with result and metadata
 */
async function generateText(prompt, systemPrompt = '', model = 'gpt-4o-mini', temperature = 0.7, includeMetadata = false) {
    const messages = [];

    if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    console.log(`[OpenAI] Request - Model: ${model}, Temperature: ${temperature}`);

    const requestPayload = {
        model,
        messages,
        temperature
    };

    const requestMetadata = {
        provider: 'openai',
        model,
        prompt,
        systemPrompt,
        temperature
    };

    const startTime = Date.now();

    try {
        const response = await axios.post(
            OPENAI_API_URL,
            requestPayload,
            {
                headers: {
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        const duration = Date.now() - startTime;
        const generatedText = response.data.choices[0].message.content;

        if (includeMetadata) {
            return {
                result: generatedText,
                apiCall: {
                    request: requestMetadata,
                    response: {
                        text: generatedText,
                        model: response.data.model,
                        promptTokens: response.data.usage?.prompt_tokens,
                        completionTokens: response.data.usage?.completion_tokens,
                        totalTokens: response.data.usage?.total_tokens,
                        finishReason: response.data.choices[0].finish_reason
                    },
                    timestamp: new Date().toISOString(),
                    duration
                }
            };
        }

        return generatedText;
    } catch (error) {
        // Attach metadata to error
        const duration = Date.now() - startTime;
        error.apiCall = {
            request: requestMetadata,
            response: error.response?.data || { error: error.message },
            timestamp: new Date().toISOString(),
            duration
        };
        throw error;
    }
}

/**
 * Parse JSON from text with fallback
 * @param {string} text - Text that may contain JSON
 * @param {Function} fallbackGenerator - Fallback function if parsing fails
 * @returns {any} Parsed JSON or fallback result
 */
function parseJSON(text, fallbackGenerator = null) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1].trim() : text.trim();
    const cleanedText = jsonText.replace(/^\uFEFF/, '');

    try {
        return JSON.parse(cleanedText);
    } catch (e) {
        // Try to find array or object patterns
        const arrayMatch = cleanedText.match(/\[[\s\S]*\]/);
        const objectMatch = cleanedText.match(/\{[\s\S]*\}/);

        if (arrayMatch) {
            try {
                return JSON.parse(arrayMatch[0]);
            } catch (e2) { }
        }

        if (objectMatch) {
            try {
                return JSON.parse(objectMatch[0]);
            } catch (e2) { }
        }

        const arrayStart = cleanedText.indexOf('[');
        const arrayEnd = cleanedText.lastIndexOf(']');
        if (arrayStart !== -1 && arrayEnd > arrayStart) {
            try {
                return JSON.parse(cleanedText.slice(arrayStart, arrayEnd + 1));
            } catch (e2) { }
        }

        const objectStart = cleanedText.indexOf('{');
        const objectEnd = cleanedText.lastIndexOf('}');
        if (objectStart !== -1 && objectEnd > objectStart) {
            try {
                return JSON.parse(cleanedText.slice(objectStart, objectEnd + 1));
            } catch (e2) { }
        }

        // Only log error if no fallback is provided (meaning it's a critical error)
        if (!fallbackGenerator) {
            console.error('Failed to parse JSON:', e.message);
            throw new Error('Failed to parse JSON response');
        }
        // Silently use fallback
        return fallbackGenerator(text);
    }
}

module.exports = {
    generateText,
    parseJSON
};
