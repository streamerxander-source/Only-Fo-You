const express = require('express');
const webpush = require('web-push');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(item => item.trim())
  .filter(Boolean);
const WEB_PUSH_CONTACT = process.env.WEB_PUSH_CONTACT || 'mailto:contato@example.com';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(WEB_PUSH_CONTACT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
  console.warn('VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY não configuradas. O push não funcionará até serem definidas em produção.');
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    if (!ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Vary', 'Origin');
    }
  } else if (!ALLOWED_ORIGINS.length) {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

const subscriptionsFile = path.join(__dirname, 'subscriptions.json');
let subscriptions = [];
if (fs.existsSync(subscriptionsFile)) {
  try {
    subscriptions = JSON.parse(fs.readFileSync(subscriptionsFile, 'utf8'));
  } catch (error) {
    subscriptions = [];
  }
}

function saveSubscriptions() {
  fs.writeFileSync(subscriptionsFile, JSON.stringify(subscriptions, null, 2));
}

app.get('/healthz', (req, res) => {
  res.json({ ok: true, service: 'push-server', timestamp: new Date().toISOString() });
});

app.post('/subscribe', (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ ok: false, error: 'Subscription inválida' });
  }

  const exists = subscriptions.some(item => item.endpoint === subscription.endpoint);
  if (!exist