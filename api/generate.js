import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req, res) {
  // CORS 처리 및 POST 방식 검증
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Vercel 환경 변수 또는 요청 바디의 키 확인
  const apiKey = process.env.GEMINI_API_KEY || req.body?.apiKey;

  if (!apiKey) {
    return res.status(400).json({
      error: 'Gemini API 호출 실패: Vercel 배포 후 GEMINI_API_KEY를 설정하거나 우측 상단 [API 키 설정]에 유효한 키를 입력해주세요.'
    });
  }

  try {
    const { image } = req.body;
    if (!image) {
      return res.status(400).json({ error: '이미지가 전달되지 않았습니다.' });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // 가장 안정적이고 빠른 최신 비전 지원 모델 사용
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    // base64 데이터 정제
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.match(/data:(.*);base64/)?.[1] || 'image/png';

    const prompt = `당신은 친절하고 유능한 수학 선생님입니다.
제시된 이미지의 수학 문제를 분석하여 다음 순서와 형식으로 답변해주세요:

1. [문제 분석]: 문제 내용 정리
2. [핵심 개념]: 사용되는 수학 공식 및 개념
3. [단계별 풀이]: 오답 원인 지적 및 쉬운 풀이 과정
4. [최종 정답]: 명확한 최종 답안`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType
        }
      }
    ]);

    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ result: text });
  } catch (error) {
    console.error('API Error Details:', error);
    return res.status(500).json({ error: error.message || 'API 요청 처리 중 오류가 발생했습니다.' });
  }
}
