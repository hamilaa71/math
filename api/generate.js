import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const { image, apiKey } = req.body;
    const finalApiKey = apiKey || process.env.GEMINI_API_KEY;

    if (!finalApiKey) {
      return res.status(400).json({ error: "API 키가 필요합니다." });
    }

    if (!image) {
      return res.status(400).json({ error: "이미지 데이터가 없습니다." });
    }

    const matches = image.match(/^data:(image\/\w+);base64,(.+)$/);
    let mimeType = "image/png";
    let base64Data = image;

    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    }

    const genAI = new GoogleGenerativeAI(finalApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

    // 수식을 LaTeX 형식($...$ 및 $$...$$)으로 출력하도록 프롬프트 지정
    const prompt = `
이 이미지에 포함된 수학 문제를 분석하여 단계별로 친절하게 풀어주세요.

[수식 작성 규칙]
1. 모든 수학 식, 변수, 숫자 표현은 반드시 LaTeX 문법을 사용하세요.
2. 문장 내부 수식은 인라인 LaTeX 형식($수식$)을 사용하세요. (예: $y = ax^2 + bx + c$, $x = -\\frac{b}{2a}$)
3. 별도 줄로 강조할 중요한 계산식은 디스플레이 LaTeX 형식($$수식$$)을 사용하세요.
4. 백틱(\`) 문자는 절대로 사용하지 마세요.

다음 구성을 따라 응답해 주세요:
1. **[문제 확인]**
2. **[핵심 개념/공식]**
3. **[단계별 풀이]**
4. **[최종 정답]**
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
    return res.status(500).json({ error: error.message || "서버 에러가 발생했습니다." });
  }
}
