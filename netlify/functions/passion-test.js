const GEMINI_MODEL = 'gemini-2.5-flash';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

const buildPrompt = (answers) => `
You are a focused coach for creators and entrepreneurs.
Analyze these reflection answers and return ONLY valid JSON with:
{
  "passion_categories": ["string", "... up to 5"],
  "root_suggestions": [{ "title": "string", "description": "string", "strength": number }],
  "personalized_insights": "string"
}

Answers:
${answers.map((answer, index) => `Q${index + 1}: ${answer}`).join('\n')}
`;

const parseGeminiText = (payload) => {
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error('Missing model output');
  }
  return JSON.parse(text);
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: jsonHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers: jsonHeaders, body: JSON.stringify({ error: 'Server missing GEMINI_API_KEY' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const answers = Array.isArray(payload.answers) ? payload.answers.filter((item) => typeof item === 'string') : [];
    if (answers.length === 0) {
      return { statusCode: 400, headers: jsonHeaders, body: JSON.stringify({ error: 'answers must be a non-empty string array' }) };
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: buildPrompt(answers) }] }],
          generationConfig: {
            responseMimeType: 'application/json',
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        headers: jsonHeaders,
        body: JSON.stringify({ error: `Gemini request failed: ${errText}` }),
      };
    }

    const modelPayload = await response.json();
    const result = parseGeminiText(modelPayload);
    return {
      statusCode: 200,
      headers: jsonHeaders,
      body: JSON.stringify(result),
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: jsonHeaders,
      body: JSON.stringify({ error: error instanceof Error ? error.message : 'Unexpected server error' }),
    };
  }
};
