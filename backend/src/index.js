import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { buildDataset } from './services/ingest.js';
import { computeMetrics } from './services/metrics.js';
import { buildSystemPrompt } from './services/gemini.js';
import { createDataRoutes, createAIRoute } from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4000;

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      callback(null, true);
    } else {
      callback(null, true); // allow all in dev; tighten in prod
    }
  },
}));
app.use(express.json());

// Global state (in-memory)
const state = { rows: [], audit: {}, metrics: {}, employeeMap: {} };

async function init() {
  const csvPath = path.join(__dirname, 'data/activity_logs.csv');
  const jsonPath = path.join(__dirname, 'data/employees.json');

  console.log('📊 Loading and normalizing data...');
  const dataset = await buildDataset(csvPath, jsonPath);
  state.rows = dataset.rows;
  state.audit = dataset.audit;
  state.employeeMap = dataset.employeeMap;

  console.log(`✅ ${dataset.rows.length} valid rows loaded (${dataset.audit.rows_dropped} dropped)`);
  console.log(`👥 ${Object.keys(dataset.employeeMap).length} employees | Ghost: ${dataset.audit.ghost_employees} | No-activity: ${dataset.audit.no_activity_employees}`);

  state.metrics = computeMetrics(dataset.rows, dataset.employeeMap, dataset.audit);
  state.metrics.audit = dataset.audit;

  buildSystemPrompt(state.metrics);
  console.log('🤖 Gemini system prompt built');
  console.log(`💰 Recoverable: ${state.metrics.headline.recoverable_hours_per_month.toFixed(1)} hrs/mo | ₹${Math.round(state.metrics.headline.recoverable_inr_per_month).toLocaleString('en-IN')}/mo`);
}

// Routes
app.use('/api', createDataRoutes(state));
app.use('/api', createAIRoute(state));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

init()
  .then(() => {
    app.listen(PORT, () => console.log(`🚀 Workforce Pulse API on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to init:', err);
    process.exit(1);
  });
