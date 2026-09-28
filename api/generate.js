export default async function handler(req, res) {
  // Configure CORS headers for Vercel deployment
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Ensure request is POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Please use POST.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. Vercel 설정에서 API 키를 추가해주세요.' 
    });
  }

  try {
    const { image, mimeType = 'image/png', userNote = '', mode = 'full' } = req.body;

    if (!image) {
      return res.status(400).json({ error: '분석할 이미지 데이터가 필요합니다.' });
    }

    // Clean base64 string format if data URI prefix exists
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

    const systemPrompt = `너는 대한민국 최고 수준의 1타 수학강사이자 친절한 AI 오답 전담 선생님이다.
사용자가 제출한 수학 문제 이미지(학습자가 직접 푼 오답 또는 교재/시험지 문제)를 정밀하게 분석하여 다음 양식에 맞춰 완벽하고 명쾌하게 해설하라.

### [해설 가이드라인]
1. **📌 문제 인식 (Problem Statement)**:
   - 이미지 속 수학 문제와 주어진 조건을 수식 포함 정확히 LaTeX 서식($...$ 또는 $$...$$)으로 정리.

2. **❌ 오답 원인 분석 (Error Diagnosis)**:
   - 풀이가 포함되어 있는 경우, 어느 단계(Step)에서 개념 착오, 계산 실수, 또는 공식 오용이 발생했는지 원인을 명확하게 짚어줄 것.
   - 문제만 있는 경우, 학생들이 가장 자주 범하는 오답 함정과 주의할 점 설명.

3. **💡 단계별 정석 풀이 (Step-by-Step Solution)**:
   - 1단계부터 최종 정답까지 누구나 이해할 수 있게 쉬운 말로 단계별 설명.
   - 모든 수식과 계산 과정은 LaTeX($...$, $$...$$)을 적용하여 정교하게 작성.

4. **🔑 핵심 개념 & 필수 공식 (Key Concepts)**:
   - 이 문제를 해결하는 데 쓰인 핵심 수학 개념 2~3가지와 관련 공식 정리.

5. **🎯 유사 쌍둥이 연습 문제 (Practice Problem)**:
   - 복습을 위해 동일한 개념을 적용할 수 있는 유사한 난이도의 연습문제 1개 출제.
   - [쌍둥이 문제 정답 및 풀이]를 밑에 접이식 형태처럼 명시.

모든 수식은 KaTeX/MathJax 표준 문법인 $inline$ 및 $$block format$$을 엄격히 준수하라.`;

    const userPromptText = userNote 
      ? `[사용자의 추가 질문/요청]: ${userNote}\n\n첨부된 수학 문제 이미지를 분석하여 오답 노트를 작성해 주세요.` 
      : `첨부된 수학 문제 이미지를 분석하여 자세한 오답 원인과 단계별 해설을 작성해 주세요.`;

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

    const payload = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: userPromptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      }
    };

    const apiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!apiResponse.ok) {
      const errorText = await apiResponse.text();
      console.error('Gemini API Error:', errorText);
      return res.status(apiResponse.status).json({ 
        error: 'Gemini API 호출 중 오류가 발생했습니다.', 
        details: errorText 
      });
    }

    const result = await apiResponse.json();
    const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedText) {
      return res.status(500).json({ error: 'AI 해설 답변을 생성할 수 없습니다.' });
    }

    return res.status(200).json({
      success: true,
      solution: generatedText
    });

  } catch (err) {
    console.error('Server execution error:', err);
    return res.status(500).json({ 
      error: '서버 내부 처리 중 오류가 발생했습니다.', 
      details: err.message 
    });
  }
}