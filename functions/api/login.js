export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const password = body.password;
        
        // Cloudflare üzerindeki Environment Variable (Çevre Değişkeni) kontrolü
        const correctPassword = env.APP_PASSWORD;

        if (!correctPassword) {
            // Eğer Cloudflare'de şifre ayarlanmamışsa geliştirme aşaması için 123 olsun
            if (password === '123') {
                return new Response(JSON.stringify({ success: true }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            }
            return new Response(JSON.stringify({ success: false, error: 'Cloudflare ortam değişkeni (APP_PASSWORD) ayarlanmamış!' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        if (password === correctPassword) {
            return new Response(JSON.stringify({ success: true }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            return new Response(JSON.stringify({ success: false, error: 'Hatalı şifre' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }
    } catch (error) {
        return new Response(JSON.stringify({ success: false, error: 'Geçersiz istek' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}