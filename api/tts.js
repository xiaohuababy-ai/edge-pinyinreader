// api/tts.js - 模拟浏览器请求获取令牌
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '请使用 POST 请求' });
    }

    try {
        const { text, voice = 'zh-CN-XiaoxiaoNeural', rate = 0, pitch = 0 } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: '缺少 text 参数' });
        }

        console.log(`🎤 合成语音: "${text}" (${voice})`);

        // 获取访问令牌
        const token = await getAccessToken();
        if (!token) {
            throw new Error('无法获取 Edge TTS 访问令牌');
        }

        // 合成语音
        const audioBuffer = await synthesizeSpeech(text, voice, token, rate, pitch);

        const base64Audio = audioBuffer.toString('base64');
        res.status(200).json({
            success: true,
            audio: base64Audio,
            format: 'mp3'
        });

    } catch (error) {
        console.error('❌ TTS 错误:', error);
        res.status(500).json({
            success: false,
            error: error.message || '内部服务器错误'
        });
    }
}

// 获取 Edge TTS 访问令牌（模拟真实浏览器请求）
async function getAccessToken() {
    const tokenUrl = 'https://api.bing.microsoft.com/v1.0/edge/tts/token';
    
    try {
        const response = await fetch(tokenUrl, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
                'Accept': 'text/plain, */*',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Referer': 'https://azure.microsoft.com/',
                'Origin': 'https://azure.microsoft.com',
                'Sec-Fetch-Site': 'cross-site',
                'Sec-Fetch-Mode': 'cors',
                'Sec-Fetch-Dest': 'empty',
                'Pragma': 'no-cache',
                'Cache-Control': 'no-cache'
            }
        });

        console.log(`令牌响应状态: ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`令牌获取失败 (${response.status}):`, errorText.substring(0, 200));
            return null;
        }

        const token = await response.text();
        console.log(`✅ 令牌获取成功，长度: ${token.length}`);
        return token;

    } catch (error) {
        console.error('令牌获取异常:', error);
        return null;
    }
}

// 合成语音
async function synthesizeSpeech(text, voice, token, rate, pitch) {
    // 构建 SSML
    const ssml = `<?xml version="1.0" encoding="UTF-8"?>
<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="zh-CN">
    <voice name="${voice}">
        <prosody rate="${rate}%" pitch="${pitch}Hz">
            ${text}
        </prosody>
    </voice>
</speak>`;

    const url = 'https://api.bing.microsoft.com/v1.0/edge/tts/synthesize';
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/ssml+xml',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
            'Accept': '*/*',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Authorization': `Bearer ${token}`,
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
            'Referer': 'https://azure.microsoft.com/',
            'Origin': 'https://azure.microsoft.com'
        },
        body: ssml
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('合成语音失败:', response.status, errorText.substring(0, 200));
        throw new Error(`语音合成失败: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}