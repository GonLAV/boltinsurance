const express = require('express');
const axios = require('axios');

const router = express.Router();

function missing(res, name) {
  return res.status(501).json({
    success: false,
    message: `${name} is not configured on the server`,
  });
}

function escapeXml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// POST /api/translate
router.post('/translate', async (req, res) => {
  const { text, to = 'en' } = req.body || {};
  if (!text) return res.status(400).json({ success: false, message: 'No text provided' });

  const endpoint = process.env.AZURE_TRANSLATOR_ENDPOINT;
  const region = process.env.AZURE_TRANSLATOR_REGION;
  const key = process.env.AZURE_TRANSLATOR_KEY;
  if (!endpoint || !region || !key) return missing(res, 'Translator');

  try {
    const url = `${endpoint.replace(/\/$/, '')}/translate?api-version=3.0&to=${encodeURIComponent(to)}`;
    const r = await axios.post(url, [{ Text: text }], {
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Ocp-Apim-Subscription-Region': region,
        'Content-Type': 'application/json',
      },
      timeout: 20000,
    });

    const translated = r.data?.[0]?.translations?.[0]?.text || '';
    return res.json({ success: true, translated });
  } catch (err) {
    const status = err?.response?.status || 500;
    const msg = err?.response?.data || err?.message || 'Translate failed';
    return res.status(status).json({ success: false, message: String(msg) });
  }
});

// POST /api/speak
router.post('/speak', async (req, res) => {
  const { text, voice = 'en-US-JennyNeural' } = req.body || {};
  if (!text) return res.status(400).json({ success: false, message: 'No text provided' });

  const region = process.env.AZURE_SPEECH_REGION;
  const key = process.env.AZURE_SPEECH_KEY;
  if (!region || !key) return missing(res, 'Speech');

  try {
    const ssml = `<speak version="1.0" xml:lang="en-US"><voice name="${escapeXml(voice)}">${escapeXml(text)}</voice></speak>`;
    const url = `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`;

    const r = await axios.post(url, ssml, {
      headers: {
        'Ocp-Apim-Subscription-Key': key,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
      },
      responseType: 'arraybuffer',
      timeout: 20000,
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    return res.send(Buffer.from(r.data));
  } catch (err) {
    const status = err?.response?.status || 500;
    const msg = err?.response?.data || err?.message || 'Speech failed';
    return res.status(status).json({ success: false, message: String(msg) });
  }
});

// POST /api/agent/sendMessage
// NOTE: Agent Service uses Entra auth; simplest safe option is to provide a bearer token via env.
router.post('/agent/sendMessage', async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ success: false, message: 'No text provided' });

  const endpoint = process.env.AZURE_AGENT_PROJECT_ENDPOINT;
  const agentId = process.env.AZURE_AGENT_ID;
  const token = process.env.AZURE_AGENT_BEARER_TOKEN;
  const apiVersion = process.env.AZURE_AGENT_API_VERSION || 'v1';

  if (!endpoint || !agentId || !token) return missing(res, 'Agent Service');

  try {
    const base = endpoint.replace(/\/$/, '');
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

    // 1) Create thread
    const thread = await axios.post(`${base}/threads?api-version=${apiVersion}`, {}, { headers, timeout: 20000 });
    const threadId = thread.data?.id;
    if (!threadId) throw new Error('Failed to create thread');

    // 2) Create message
    await axios.post(`${base}/threads/${threadId}/messages?api-version=${apiVersion}`, { role: 'user', content: { text } }, { headers, timeout: 20000 });

    // 3) Run agent
    const run = await axios.post(`${base}/threads/${threadId}/runs?api-version=${apiVersion}`, { assistant_id: agentId }, { headers, timeout: 20000 });
    const runId = run.data?.id;
    if (!runId) throw new Error('Failed to start run');

    // 4) Poll status
    let status = run.data?.status;
    const start = Date.now();
    while (status !== 'completed' && Date.now() - start < 20000) {
      await new Promise((r) => setTimeout(r, 1200));
      const s = await axios.get(`${base}/threads/${threadId}/runs/${runId}?api-version=${apiVersion}`, { headers, timeout: 20000 });
      status = s.data?.status;
      if (status === 'failed' || status === 'cancelled') throw new Error(`Run ${status}`);
    }

    // 5) Get messages and return latest assistant reply
    const msgs = await axios.get(`${base}/threads/${threadId}/messages?api-version=${apiVersion}`, { headers, timeout: 20000 });
    const lastAssistant = Array.isArray(msgs.data?.data) ? msgs.data.data.find((m) => m.role === 'assistant') : null;
    const reply = lastAssistant?.content?.text || '(no reply)';

    return res.json({ success: true, reply });
  } catch (err) {
    const status = err?.response?.status || 500;
    const msg = err?.response?.data || err?.message || 'Agent failed';
    return res.status(status).json({ success: false, message: String(msg) });
  }
});

module.exports = router;
