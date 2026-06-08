import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Initialize Gemini Client with safety checks and proper User-Agent header
const getGeminiClient = (): GoogleGenAI => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("Waring: GEMINI_API_KEY is not defined. Features using Gemini will fail.");
  }
  return new GoogleGenAI({
    apiKey: apiKey || "",
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Predict Next Trading Day TAIEX/Futures Direction
  app.post("/api/predict", async (req, res) => {
    try {
      const {
        predictDate,
        taiexClose,
        taiexChange,
        techIndicators,
        institutionalNet,
        futuresNet,
        usMarkets,
        exchangeRate,
      } = req.body;

      if (!taiexClose || !techIndicators || !futuresNet || !usMarkets) {
        return res.status(400).json({ error: "Missing required quantitative features." });
      }

      const ai = getGeminiClient();

      // We define system instruction and user prompt matching the specification precisely
      const systemInstruction = `You are the "TAIEX Quant Strategy Predictor," an advanced decision-reasoning engine specialized in the Taiwan Stock Exchange (TAIEX) and Taiwan Index Futures. Your sole task is to ingest structured technical, institutional, and global market data, and output a binary prediction ("漲" (Up) or "跌" (Down)) for the NEXT trading day/session.

[DECISION REASONING PROTOCOL]
You must weigh input features using the following objective priorities:
1. Chip Flow (三大法人 & 外資未平倉): High Priority (60% weight).
2. Global Correlation (TSMC ADR & SOX): High Priority (30% weight).
3. Technical Indicators (MA, KD, RSI): Medium Priority (10% weight).
Calculate a virtual probability score P(Up) in [0, 100]%. If P(Up) > 50%, output "預測方向：漲". If P(Up) <= 50%, output "預測方向：跌".

[CRITICAL SAFETY & COMPLIANCE GUARDRAILS]
1. Mandatory Disclaimer: You MUST explicitly output this exact disclaimer at the end of every response: "【風險警示與免責聲明】本報告為 AI 數據綜合推理模型，僅供開發學術與策略測試參考。歷史預測不代表未來績效，亦不構成任何對投資人的具體買賣要約或建議。投資人進行台指交易應獨立評估風險，並自負盈虧損益。"
2. NEVER predict exact Target Prices (target buy/sell points). Keep predictions restricted to direction and confidence.
3. Keep the tone completely objective, neutral, and data-driven (like a professional financial risk officer). No hype or sensationalism.

[OUTPUT STRUCTURE]
You must always reply in Traditional Chinese (Taiwan, zh-TW) using the exact Markdown format below:

#### 📊 【台指大盤方向預測：[Next Trading Date]】
* **預測方向判定**：【 漲 / 跌 】 (Choose exactly one)
* **模型預測信心度**：[0-100]% (Calculated from your weights)

#### 🔍 【多維度數據權重解析】
* **🟢 利多因子 (Bullish Forces)**：[Summarize 1-2 positive factors based on the data]
* **🔴 利空因子 (Bearish Forces)**：[Summarize 1-2 negative factors based on the data]

#### 🛠️ 【技術與籌碼綜合推理】
（約 100-150 字。精準剖析今天三大法人現貨買賣、外資期貨淨部位與美股對今日收盤大盤的引導作用。）

[DISCLAIMER_PLACEHOLDER] (Paste the mandatory disclaimer here)`;

      // Replace Next Trading Date inside system instructions or let user inputs guide it
      const finalSystemInstruction = systemInstruction.replace("[Next Trading Date]", predictDate || "下個交易日");

      const userPrompt = `請依據 System Instructions 規範，綜合以下今日最新盤後量化數據進行推理，給出明日（或下個開盤交易日）台指與加權大盤的漲跌預測報告：

### 📥 今日盤後數據輸入
- **預測標的日期**: ${predictDate || "未指定"}
- **大盤加權收盤指數**: ${taiexClose} (今日漲跌點數: ${taiexChange || "0"})
- **技術指標面 (MA / KD / RSI)**: ${techIndicators}
- **三大法人現貨買賣超 (億元)**: ${institutionalNet || "N/A"}
- **外資期貨未平倉部位 (口數)**: ${futuresNet}
- **美股主要指數連動 (含台積電 ADR / 費半)**: ${usMarkets}
- **美元兌新台幣匯率**: ${exchangeRate || "N/A"}

### ⚙️ 執行命令

請帶入各維度指標權重進行嚴密計分推理，並嚴格以規定的 Markdown 格式輸出結果。不要產生格式以外的廢話與招呼語。`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: userPrompt,
        config: {
          systemInstruction: finalSystemInstruction,
          temperature: 0.15, // Keep randomness extremely low as specified
          topP: 0.90,
        },
      });

      const predictionText = response.text || "";

      // Try to extract directional result and confidence dynamically for UI visualization
      // E.g., matching "預測方向判定**：【 漲 】" or similar
      const isUp = predictionText.includes("漲");
      const isDown = predictionText.includes("跌");
      let calculatedDirection: "UP" | "DOWN" = "UP";
      if (isDown && !isUp) {
        calculatedDirection = "DOWN";
      } else if (isUp && !isDown) {
        calculatedDirection = "UP";
      } else {
        // Fallback or heuristic
        calculatedDirection = predictionText.includes("漲") ? "UP" : "DOWN";
      }

      // Confidence matching: [0-100]%
      let confidence = 75; // fallback
      const confidenceMatch = predictionText.match(/模型預測信心度\*\*：\s*【?\s*(\d+)\s*%?/);
      if (confidenceMatch && confidenceMatch[1]) {
        confidence = parseInt(confidenceMatch[1], 10);
      } else {
        const anyPercentMatch = predictionText.match(/(\d+)\s*%/);
        if (anyPercentMatch && anyPercentMatch[1]) {
          confidence = parseInt(anyPercentMatch[1], 10);
        }
      }

      res.json({
        rawMarkdown: predictionText,
        direction: calculatedDirection,
        confidence: confidence,
      });
    } catch (error: any) {
      console.error("Prediction Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate prediction report." });
    }
  });

  // API Route: Dynamic Market Scenario Input Generator
  // This helps user generate realistic/simulated market data based on scenario prompts
  app.post("/api/generate-scenario", async (req, res) => {
    try {
      const { scenarioType } = req.body; // e.g. "BULLISH_BREAKOUT", "BEARISH_PANIC", "CONSOLIDATION_CHOP"
      const ai = getGeminiClient();

      let scenarioDesc = "";
      if (scenarioType === "BULLISH_BREAKOUT") {
        scenarioDesc = "多頭大漲情境：美股晶片股大漲、費半狂彈、台積電 ADR 大漲 3% 以上，外資現貨大買百億，期貨空單大幅回補（或多單增加），新台幣升值。均線呈多頭排列，KD 黃金交叉上揚。";
      } else if (scenarioType === "BEARISH_PANIC") {
        scenarioDesc = "空頭暴跌情境：美股急殺、費半大跌 4%、ADR 重挫，外資現貨大賣超過兩百億，台指期淨空單大增至兩萬五千口以上，新台幣重貶。均線呈現空頭排列，指標超賣或跌破支撐。";
      } else if (scenarioType === "CONSOLIDATION_CHOP") {
        scenarioDesc = "區間震盪情境：美股平盤震盪，外資小買小賣，三大法人多空分歧，台指期空單約在一萬多口附近，新台幣狹幅整理。KD指標高低游移，無明顯均線趨勢。";
      } else {
        scenarioDesc = "一般中性偏多情境：溫和上漲，美股小紅，外資期貨空單溫和整理，台幣持平。";
      }

      const prompt = `請為台股(TAIEX)與台指期貨，模擬生成一組符合「${scenarioDesc}」的典型盤後量化指標數據。
回傳的欄位必須為一個合法的 JSON 物件，不可以包含 Markdown 代碼塊（例如 \`\`\`json ），直接回傳一個純 JSON 字串即可，好方便程式解析。

JSON 結構欄位與規定：
{
  "predictDate": "YYYY-MM-DD (請設定為下一個交易日，今日基準是 2026-06-06，所以下個交易日可設為 2026-06-08 或 2026-06-09)",
  "taiexClose": "今日收盤價 (數字，台股約 21000 - 23000)",
  "taiexChange": "今日漲跌點數 (帶正負號，例如 +250.50 或 -320.10)",
  "techIndicators": "技術指標面描述 (均線/KD/RSI簡短描述，例如：KD高檔鈍化, RSI(5)=72, 五日線大於十日線)",
  "institutionalNet": "三大法人現貨買賣超 (例如：外資:+120億, 投信:+15億, 自營商:-5億)",
  "futuresNet": "外資期貨淨部位口數描述與數字 (例如：淨空單 -12500 口（偏空） 或 淨多單 +3500 口（偏多）)",
  "futuresNetValue": -12500, // 口數整數，負代表空單
  "usMarkets": "美股主要指數連動 (含台積電 ADR / 費半描述，例如：TSMC ADR: +2.1%, SOX: +1.5%)",
  "exchangeRate": "美元兌新台幣匯率 (例如：31.250 (台幣升值0.12元) 或 31.450 (台幣貶值0.08元))"
}`;

      const response = await ai.models.generateContent({
        model: "gemini-flash-latest",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      });

      const responseText = response.text?.trim() || "{}";
      const cleanedJson = responseText.replace(/^```json/, "").replace(/```$/, "").trim();
      const simulatedData = JSON.parse(cleanedJson);

      res.json(simulatedData);
    } catch (error: any) {
      console.error("Scenario Generation Error:", error);
      res.status(500).json({ error: error.message || "Failed to generate market scenario." });
    }
  });

  // Serve static UI assets and delegate to Vite in dev
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TAIEX Quant Strategy Predictor server active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
