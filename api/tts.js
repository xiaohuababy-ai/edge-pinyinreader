// api/tts.js - 直接调用微软 Edge TTS API（无需第三方库）
export default async function handler(req, res) {
    // 只允许 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '请使用 POST 请求' });
    }

    try {
        const { text, voice = 'zh-CN-XiaoxiaoNeural', rate = 0, pitch = 0 } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: '缺少 text 参数' });
        }

        console.log(`🎤 合成语音: "${text}" (${voice})`);

        // 1. 获取访问令牌
        const token = await getAccessToken();
        if (!token) {
            throw new Error('无法获取 Edge TTS 访问令牌');
        }

        // 2. 合成语音
        const audioBuffer = await synthesizeSpeech(text, voice, token, rate, pitch);

        // 3. 返回 Base64 编码的音频
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

// 获取 Edge TTS 访问令牌
async function getAccessToken() {
    const url = 'https://api.bing.microsoft.com/v1.0/edge/tts/token';
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        if (!response.ok) {
            console.error('获取令牌失败:', response.status);
            return null;
        }

        return await response.text();
    } catch (error) {
        console.error('获取令牌异常:', error);
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
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Authorization': `Bearer ${token}`,
            'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'
        },
        body: ssml
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('合成语音失败:', response.status, errorText.substring(0, 200));
        throw new Error(`语音合成失败: ${response.status}`);
    }

    // 获取音频数据
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}