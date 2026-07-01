// api/tts.js - Vercel Serverless Function
import { EdgeTTS } from 'edge-tts';

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

        const tts = new EdgeTTS();
        const audioBuffer = await tts.speak(text, {
            voice: voice,
            rate: rate,
            pitch: pitch,
            volume: 0
        });

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
            error: error.message
        });
    }
}