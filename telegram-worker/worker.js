/* ============================================================
   MedOrion Awards — приймач заявок
   Cloudflare Worker. Стоїть між формою на сайті та Telegram.

   Навіщо: репозиторій сайту публічний. Якщо вписати токен бота
   в assets/js/main.js, його побачить будь-хто, хто відкриє сторінку,
   і зможе слати повідомлення у ваш чат від імені бота.
   Тут токен лежить у змінних Worker'а і назовні не виходить.

   Треба додати рівно одну змінну (Settings -> Variables and Secrets):
     BOT_TOKEN   тип Secret   токен від @BotFather

   Номер чату й дозволені домени — не секрети, вони нижче в коді.
   Якщо колись зміняться, їх можна або виправити тут, або перекрити
   змінними CHAT_ID / ALLOWED_ORIGIN у тих самих налаштуваннях.
   ============================================================ */

// Куди падають заявки — група «MedOrion / заявки»
const DEFAULT_CHAT_ID = '-1004475490563';

// Звідки дозволено надсилати. Список, а не одна адреса: під час переїзду
// на власний домен сайт якийсь час живе за кількома адресами одночасно,
// і з однією дозволеною формa мовчки перестала б приймати заявки.
const ALLOWED = [
  'https://www.medorion-awards.com',
  'https://medorion-awards.com',
  'https://ouranus4.github.io'
];

const FIELDS = {
  name:       { label: 'Імʼя',      max: 120 },
  phone:      { label: 'Телефон',        max: 60  },
  status:     { label: 'Статус',         max: 120 },
  nomination: { label: 'Напрям',         max: 120 },
  link:       { label: 'Посилання',      max: 300 },
  message:    { label: 'Повідомлення',   max: 2000 }
};

export default {
  async fetch(request, env) {
    // Дозволені адреси можна перекрити змінною: кілька через кому.
    const allowed = (env.ALLOWED_ORIGIN || '').trim()
      ? env.ALLOWED_ORIGIN.split(',').map(v => v.trim()).filter(Boolean)
      : ALLOWED;
    // Браузер порівнює відповідь із власним Origin, тож повертаємо саме його,
    // якщо він у списку. Інакше — першу дозволену адресу, і запит не пройде.
    const from = request.headers.get('Origin');
    const origin = allowed.includes(from) ? from : allowed[0];
    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (request.method !== 'POST') {
      return reply({ ok: false, error: 'method_not_allowed' }, 405, cors);
    }
    const chatId = env.CHAT_ID || DEFAULT_CHAT_ID;
    if (!env.BOT_TOKEN) {
      return reply({ ok: false, error: 'not_configured' }, 500, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return reply({ ok: false, error: 'bad_json' }, 400, cors);
    }

    // Приховане поле, якого людина не бачить і не заповнює.
    // Заповнене — значить, це бот: мовчки вдаємо успіх.
    if (typeof body.company === 'string' && body.company.trim() !== '') {
      return reply({ ok: true }, 200, cors);
    }

    const data = {};
    for (const key of Object.keys(FIELDS)) {
      const raw = body[key];
      data[key] = typeof raw === 'string' ? raw.trim().slice(0, FIELDS[key].max) : '';
    }
    if (!data.name || !data.phone) {
      return reply({ ok: false, error: 'missing_required' }, 400, cors);
    }

    const tg = await fetch(
      `https://api.telegram.org/bot${env.BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: format(data),
          parse_mode: 'HTML',
          disable_web_page_preview: true
        })
      }
    );

    const out = await tg.json().catch(() => null);
    if (!out || out.ok !== true) {
      // опис від Telegram лишається в логах Worker'а, назовні не йде
      console.error('telegram rejected', out && out.description);
      return reply({ ok: false, error: 'telegram_failed' }, 502, cors);
    }
    return reply({ ok: true }, 200, cors);
  }
};

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function format(d) {
  const lines = ['<b>Нова заявка — MedOrion Awards 2026</b>', ''];
  for (const key of Object.keys(FIELDS)) {
    if (d[key]) lines.push(`<b>${FIELDS[key].label}:</b> ${esc(d[key])}`);
  }
  return lines.join('\n');
}

function reply(obj, status, cors) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' }
  });
}
