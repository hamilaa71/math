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
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    // 간결하고 단계별로 답이 나오도록 프롬프트 개편
    const prompt = `
이 이미지의 수학 문제를 군더더기 없이 간결하게 단계별로 풀어주세요.

[작성 및 서식 규칙]
1. 사족이나 장황한 서론/개념 설명은 모두 제외하세요.
2. 아래 3가지 구분만 사용하여 군더더기 없이 핵심 계산 과정만 제시하세요:
   ### 📌 문제 요약
   ### ✏️ 단계별 풀이
   ### 🎯 최종 정답
3. 수식은 반드시 LaTeX 문법만 사용하세요:
   - 문장 내 수식: $수식$
   - 독립된 수식: $$수식$$
4. 마크다운 목록 기호(*, -)나 백틱(\`)을 문장에 섞어 쓰지 말고, 단락 구분으로 깔끔하게 작성하세요.
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
