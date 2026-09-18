export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Eğer istek /api/login adresine ve POST metodu ile geliyorsa şifre kontrolü yap
    if (url.pathname === '/api/login' && request.method === 'POST') {
      try {
        const body = await request.json();
        const password = body.password;
        const correctPassword = env.APP_PASSWORD;

        if (!correctPassword) {
            if (password === '123') {
                return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
            }
            return new Response(JSON.stringify({ success: false, error: 'Cloudflare ortam değişkeni (APP_PASSWORD) ayarlanmamış!' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        if (password === correctPassword) {
            return new Response(JSON.stringify({ success: true }), { headers: { 'Content-Type': 'application/json' } });
        } else {
            return new Response(JSON.stringify({ success: false, error: 'Hatalı şifre' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }
      } catch (e) {
          return new Response(JSON.stringify({ success: false, error: 'Geçersiz istek' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }
    
    // Diğer tüm isteklerde normal HTML/CSS/JS dosyalarını (statik siteyi) göster
    return env.ASSETS.fetch(request);
  }
};
