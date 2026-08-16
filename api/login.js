export default function handler(req, res) {
    // Sadece POST isteklerini kabul et
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Sadece POST desteklenir' });
    }

    const { password } = req.body;
    
    // Vercel üzerindeki Environment Variable (Çevre Değişkeni) kontrolü
    const correctPassword = process.env.APP_PASSWORD;

    if (!correctPassword) {
        // Eğer Vercel'de şifre ayarlanmamışsa güvenlik için geçici bir şifre kullan veya reddet
        // Şimdilik geliştirme aşaması için "123" olsun, ama canlıda process.env.APP_PASSWORD kullanılacak
        if (password === '123') {
            return res.status(200).json({ success: true });
        }
        return res.status(500).json({ success: false, error: 'Vercel ortam değişkeni (APP_PASSWORD) ayarlanmamış!' });
    }

    if (password === correctPassword) {
        return res.status(200).json({ success: true });
    } else {
        return res.status(401).json({ success: false, error: 'Hatalı şifre' });
    }
}
