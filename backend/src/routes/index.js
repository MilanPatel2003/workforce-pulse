import { Router } from 'express';

export function createDataRoutes(state) {
  const router = Router();

  router.get('/data', (req, res) => {
    res.json({ rows: state.rows, audit: state.audit });
  });

  router.get('/metrics', (req, res) => {
    res.json(state.metrics);
  });

  return router;
}

export function createAIRoute(state) {
  const router = Router();

  router.post('/ai/chat', async (req, res) => {
    const { messages } = req.body;
    if (!messages?.length) return res.status(400).json({ error: 'No messages provided' });

    try {
      const { chatWithGemini } = await import('../services/gemini.js');
      const reply = await chatWithGemini(messages);
      res.json({ reply });
    } catch (err) {
      const status = err?.response?.status;
      if (status === 429) {
        return res.status(429).json({ error: 'Rate limit reached. Please wait a moment and try again.' });
      }
      console.error('Gemini error:', err?.response?.data || err.message);
      res.status(500).json({ error: 'AI request failed. Please try again.' });
    }
  });

  return router;
}
