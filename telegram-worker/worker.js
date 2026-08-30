/* ============================================================
   MedOrion Awards — приймач заявок
   Cloudflare Worker. Стоїть між формою на сайті та Telegram.

   Навіщо: репозиторій сайту публічний. Якщо вписати токен бота
   в assets/js/main.js, його побачить будь-хто, хто відкриє сторінку,
   і зможе слати повідомлення у ваш чат від імені бота.
   Тут токен лежить у змінних Worker'а і назовні не виходить.

   Змінні (Settings -> Variables and Secrets):
     BOT_TOKEN       secret   токен від @BotFather
     CHAT_ID         secret   куди слати заявки
     ALLOWED_ORIGIN  text     https://ouranus4.github.io
   ============================================================ */

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
    const origin = env.ALLOWED_ORIGIN || '*';
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
    if (!env.BOT_TOKEN || !env.CHAT_ID) {
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
          chat_id: env.CHAT_ID,
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
