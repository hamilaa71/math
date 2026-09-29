import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { image, apiKey } = req.body;

    // API Key 우선순위 (클라이언트 전달 키 -> Vercel 환경 변수)
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!finalApiKey) {
      return res.status(400).json({
        error: "Gemini API 키가 없습니다. 화면 우측 상단의 [🔑 API 키 설정]에서 키를 등록하거나 Vercel 환경 변수(GEMINI_API_KEY)를 설정해 주세요."
      });
    }

    if (!image) {
      return res.status(400).json({ error: "분석할 이미지 데이터가 없습니다." });
    }

    // Base64 데이터 추출 및 MIME 타입 분리
    const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
    let mimeType = "image/png";
    let base64Data = image;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const genAI = new GoogleGenerativeAI(finalApiKey);
    
    // 모델 지정 (최신 gemini-2.5-flash 지원)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
이 이미지에 포함된 수학 문제를 분석하여 단계별로 친절하게 풀어주세요.

다음 형식으로 응답해 주세요:
1. **[문제 확인]**: 인식된 문제 내용 정돈
2. **[핵심 개념/공식]**: 문제 풀이에 쓰이는 주요 수학 개념이나 공식
3. **[단계별 풀이]**: 차근차근 과정 설명
4. **[최종 정답]**: 최종 답 강조
`;

    const imagePart = {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ result: text });

  } catch (error) {
    console.error("Gemini API Error:", error);
    return res.status(500).json({
      error: error.message || "문제 풀이 처리 중 오류가 발생했습니다."
    });
  }
}
