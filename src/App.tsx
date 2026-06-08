/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Activity,
  Database,
  Calendar,
  DollarSign,
  Percent,
  BarChart3,
  RefreshCw,
  Sliders,
  Cpu,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Play,
  HelpCircle,
  TrendingUp as BulletIcon
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

// Mock Historical Correlation Data (TAIEX Index vs Foreign Futures Net Position)
const HISTORICAL_DATA = [
  { date: "05-25", taiex: 21100, futures: -8200 },
  { date: "05-26", taiex: 21350, futures: -4500 },
  { date: "05-27", taiex: 21500, futures: 1500 },
  { date: "05-28", taiex: 21380, futures: -2100 },
  { date: "05-29", taiex: 21120, futures: -9500 },
  { date: "06-01", taiex: 20950, futures: -16000 },
  { date: "06-02", taiex: 20800, futures: -21000 },
  { date: "06-03", taiex: 21150, futures: -11000 },
  { date: "06-04", taiex: 21420, futures: 1200 },
  { date: "06-05", taiex: 21680, futures: 6500 },
];

export default function App() {
  // Input features (State initialized with a balanced slightly-bullish baseline)
  const [predictDate, setPredictDate] = useState("2026-06-08");
  const [taiexClose, setTaiexClose] = useState("21680");
  const [taiexChange, setTaiexChange] = useState("+260.50");
  const [techIndicators, setTechIndicators] = useState("均線呈多頭排列, KD 黃金交叉向上, RSI(5)=65");
  const [institutionalNet, setInstitutionalNet] = useState("外資:+185億, 投信:+22億, 自營商:-12億");
  
  // High Priority Chip Flow: State & slider helper
  const [futuresNet, setFuturesNet] = useState("淨多單 +6500 口 (偏多)");
  const [futuresValue, setFuturesValue] = useState(6500); // underlying slider value
  
  // High Priority Global Correlation
  const [usMarkets, setUsMarkets] = useState("TSMC ADR: +2.45%, SOX (費半): +1.80%");
  const [tsmcAdrChange, setTsmcAdrChange] = useState(2.45); // TSMC ADR slider value for visual control
  
  const [exchangeRate, setExchangeRate] = useState("31.250 (台幣升值 0.12 元)");

  // State for AI predictions
  const [loading, setLoading] = useState(false);
  const [scenarioLoading, setScenarioLoading] = useState(false);
  const [result, setResult] = useState<{
    rawMarkdown: string;
    direction: "UP" | "DOWN";
    confidence: number;
  } | null>(null);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  // Auto-detect warning signs (Black Swan Indicator) based on input values
  const [blackSwanDetails, setBlackSwanDetails] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if black swan circuit breaker conditions are met
    // Hard-coded rules: ADR crashes <= -3.5% or Futures Short >= 25,000 (value <= -25000)
    // Or external net flow is deeply negative.
    let warnings = [];
    if (tsmcAdrChange <= -3.5) {
      warnings.push(`TSMC ADR 重挫 (${tsmcAdrChange}%)`);
    }
    if (futuresValue <= -25000) {
      warnings.push(`外資布建極端淨空單大軍 (${futuresValue} 口)`);
    }
    
    // Check if institutional text mentions a heavy selloff
    if (institutionalNet.includes("-400億") || institutionalNet.includes("賣超超過400億") || institutionalNet.includes("賣超:-4")) {
      warnings.push("外資/法人單日現貨賣超突破 400 億大關");
    }

    if (warnings.length > 0) {
      setBlackSwanDetails(warnings.join(" 且 "));
    } else {
      setBlackSwanDetails(null);
    }
  }, [tsmcAdrChange, futuresValue, institutionalNet]);

  // Synchronize dynamic input changes to verbal descriptors
  const handleFuturesSliderChange = (val: number) => {
    setFuturesValue(val);
    const sign = val >= 0 ? "+" : "";
    const sentiment = val >= 10000 ? " (強烈多頭)" : val >= 2000 ? " (偏多)" : val <= -20000 ? " (偏空極端逃殺)" : val <= -10000 ? " (偏空)" : " (中性)";
    setFuturesNet(`淨部位 ${sign}${val} 口${sentiment}`);
  };

  const handleTsmcAdrChange = (val: number) => {
    setTsmcAdrChange(val);
    const sign = val >= 0 ? "+" : "";
    const sox = (val * 0.85).toFixed(2); // simulated SOX連動
    setUsMarkets(`TSMC ADR: ${sign}${val}%, SOX (費半): ${sign}${sox}%`);
  };

  // Preset Scenario Loader
  const handleScenarioSelect = async (scenarioType: "BULLISH_BREAKOUT" | "BEARISH_PANIC" | "CONSOLIDATION_CHOP") => {
    setScenarioLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetch("/api/generate-scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioType }),
      });
      if (!res.ok) throw new Error("模擬情境生成失敗，請手動調整參數。");
      const data = await res.json();
      
      if (data.predictDate) setPredictDate(data.predictDate);
      if (data.taiexClose) setTaiexClose(String(data.taiexClose));
      if (data.taiexChange) setTaiexChange(data.taiexChange);
      if (data.techIndicators) setTechIndicators(data.techIndicators);
      if (data.institutionalNet) setInstitutionalNet(data.institutionalNet);
      if (data.futuresNet) setFuturesNet(data.futuresNet);
      if (data.futuresNetValue !== undefined) setFuturesValue(data.futuresNetValue);
      if (data.usMarkets) setUsMarkets(data.usMarkets);
      
      // Parse TSMC ADR percentage from the generated text for slider sync
      const adrMatch = data.usMarkets.match(/TSMC ADR:\s*([+-]?\d+(\.\d+)?)/);
      if (adrMatch && adrMatch[1]) {
        setTsmcAdrChange(parseFloat(adrMatch[1]));
      }

      if (data.exchangeRate) setExchangeRate(data.exchangeRate);
    } catch (err: any) {
      setErrorStatus(err.message || "發生未知錯誤");
    } finally {
      setScenarioLoading(false);
    }
  };

  // Launch AI Prediction Engine via backend
  const triggerPrediction = async () => {
    setLoading(true);
    setErrorStatus(null);
    try {
      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          predictDate,
          taiexClose,
          taiexChange,
          techIndicators,
          institutionalNet,
          futuresNet,
          usMarkets,
          exchangeRate,
        }),
      });

      if (!res.ok) {
        throw new Error("預測引擎連線異常，請確認伺服器與 API 金鑰狀態。");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setErrorStatus(err.message || "發生未知錯誤");
    } finally {
      setLoading(false);
    }
  };

  // Interactive UI layout
  return (
    <div className="min-h-screen bg-[#0c0f16] text-[#f3f4f6] font-sans antialiased pb-12 selection:bg-rose-500 selection:text-white">
      {/* Dynamic Grid Background Panel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293708_1px,transparent_1px),linear-gradient(to_bottom,#1f293708_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />

      {/* Header Bar */}
      <header className="border-b border-slate-800 bg-[#0e131f]/90 sticky top-0 z-50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-xl">
              <Cpu className="w-6 h-6 text-rose-500 animate-pulse" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white flex items-center gap-2">
                TAIEX Quant Strategy Predictor
                <span className="text-xs bg-slate-800 text-slate-400 font-normal px-2.5 py-0.5 rounded-full border border-slate-700">
                  v2.8 Live
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                基於多源量化數據與 Google Gemini 決策推理核心之台指期方向二元策略預測機
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-slate-400">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>系統時間: 2026-06-06 UTC</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Data Entry & Scenario Tweaks (5 Cols) */}
        <div id="control_panel" className="lg:col-span-5 space-y-6">
          
          {/* Quick Scenario Preset Widget */}
          <section className="bg-[#121824] rounded-2xl border border-slate-800 p-5 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl -z-10" />
            <div className="flex items-center justify-between mb-3.5">
              <h2 className="font-display font-medium text-sm text-slate-200 tracking-wide flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                宏觀情境智能一鍵模擬
              </h2>
              {scenarioLoading && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              選擇典型市場狀態，AI 將為您一鍵配置出相對應的高模擬度盤後籌碼與美股數據。
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                id="preset_btn_bull"
                type="button"
                onClick={() => handleScenarioSelect("BULLISH_BREAKOUT")}
                disabled={scenarioLoading}
                className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-rose-950/40 bg-rose-950/10 hover:bg-rose-950/30 text-rose-400 transition-all active:scale-[0.98] disabled:opacity-50 text-center flex flex-col items-center gap-1"
              >
                <TrendingUp className="w-4 h-4" />
                多頭長紅突破
              </button>
              <button
                id="preset_btn_bear"
                type="button"
                onClick={() => handleScenarioSelect("BEARISH_PANIC")}
                disabled={scenarioLoading}
                className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-emerald-950/40 bg-emerald-950/10 hover:bg-emerald-950/30 text-emerald-400 transition-all active:scale-[0.98] disabled:opacity-50 text-center flex flex-col items-center gap-1"
              >
                <TrendingDown className="w-4 h-4" />
                空頭恐慌急殺
              </button>
              <button
                id="preset_btn_chop"
                type="button"
                onClick={() => handleScenarioSelect("CONSOLIDATION_CHOP")}
                disabled={scenarioLoading}
                className="px-3 py-2.5 text-xs font-semibold rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 transition-all active:scale-[0.98] disabled:opacity-50 text-center flex flex-col items-center gap-1"
              >
                <Sliders className="w-4 h-4" />
                平盤區間震盪
              </button>
            </div>
          </section>

          {/* Interactive Feature Setting Panel */}
          <section className="bg-[#121824] rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <h2 className="font-display font-medium text-sm text-slate-200 tracking-wide flex items-center gap-2 pb-2 border-b border-slate-800/80">
              <Database className="w-4 h-4 text-indigo-400" />
              今日大盤與期權量化特徵參數
            </h2>

            {/* Target Trading Day Info */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label id="lbl_pred_date" className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                  <Calendar className="w-3" />
                  預測標的日期
                </label>
                <input
                  id="inp_predict_date"
                  type="date"
                  value={predictDate}
                  onChange={(e) => setPredictDate(e.target.value)}
                  className="w-full bg-[#1b2336] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label id="lbl_taiex_close" className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                  <Activity className="w-3" />
                  大盤加權指數
                </label>
                <input
                  id="inp_taiex_close"
                  type="text"
                  placeholder="加權指數收盤點數"
                  value={taiexClose}
                  onChange={(e) => setTaiexClose(e.target.value)}
                  className="w-full bg-[#1b2336] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Today Change & Exchange Rate */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label id="lbl_taiex_chg" className="block text-[11px] font-mono text-slate-400 mb-1">今日漲跌點數</label>
                <input
                  id="inp_taiex_change"
                  type="text"
                  placeholder="例如: +120.50"
                  value={taiexChange}
                  onChange={(e) => setTaiexChange(e.target.value)}
                  className="w-full bg-[#1b2336] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <div>
                <label id="lbl_exchange" className="block text-[11px] font-mono text-slate-400 mb-1 flex items-center gap-1">
                  <DollarSign className="w-3" />
                  新台幣匯率變動
                </label>
                <input
                  id="inp_exchange_rate"
                  type="text"
                  placeholder="例如: 31.42 (貶值0.05)"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(e.target.value)}
                  className="w-full bg-[#1b2336] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* TECHNICAL & INSTITUTIONAL FLOW */}
            <div className="space-y-3 pt-1">
              <div>
                <label id="lbl_tech" className="block text-[11px] font-mono text-slate-400 mb-1">
                  技術指標面狀況 (MA / KD / RSI 排列)
                </label>
                <textarea
                  id="inp_tech_indicators"
                  rows={2}
                  value={techIndicators}
                  onChange={(e) => setTechIndicators(e.target.value)}
                  className="w-full bg-[#1b2336] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 leading-normal"
                />
              </div>

              <div>
                <label id="lbl_inst" className="block text-[11px] font-mono text-slate-400 mb-1">
                  三大法人現貨買賣超 (億元)
                </label>
                <textarea
                  id="inp_institutional_net"
                  rows={1}
                  value={institutionalNet}
                  onChange={(e) => setInstitutionalNet(e.target.value)}
                  className="w-full bg-[#1b2336] border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* CRITICAL CHIP FLOW: Foreign Futures Position */}
            <div className="bg-[#172030] p-3.5 rounded-xl border border-slate-700/50 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-indigo-300 font-bold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" />
                  籌碼權重(60%): 外資期貨淨未平倉
                </span>
                <span className="text-xs bg-slate-900 border border-slate-700 px-2.5 py-0.5 rounded-md font-mono text-white text-right">
                  {futuresValue >= 0 ? "+" : ""}{futuresValue} 口
                </span>
              </div>
              <input
                id="range_futures"
                type="range"
                min="-35000"
                max="25000"
                step="500"
                value={futuresValue}
                onChange={(e) => handleFuturesSliderChange(Number(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer text-xs"
              />
              <input
                id="inp_futures_net"
                type="text"
                value={futuresNet}
                onChange={(e) => setFuturesNet(e.target.value)}
                className="w-full bg-[#1b2336] border border-slate-700/50 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
              />
            </div>

            {/* GLOBAL CORRELATION WEIGHT: TSMC ADR */}
            <div className="bg-[#172030] p-3.5 rounded-xl border border-slate-700/50 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-mono text-amber-300 font-bold flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" />
                  全球連動(30%): TSMC ADR 漲跌
                </span>
                <span className="text-xs bg-slate-900 border border-slate-700 px-2.5 py-0.5 rounded-md font-mono text-white text-right">
                  {tsmcAdrChange >= 0 ? "+" : ""}{tsmcAdrChange}%
                </span>
              </div>
              <input
                id="range_adr"
                type="range"
                min="-6"
                max="6"
                step="0.05"
                value={tsmcAdrChange}
                onChange={(e) => handleTsmcAdrChange(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer text-xs"
              />
              <input
                id="inp_us_markets"
                type="text"
                value={usMarkets}
                onChange={(e) => setUsMarkets(e.target.value)}
                className="w-full bg-[#1b2336] border border-slate-700/50 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none"
              />
            </div>

            {/* Submittal Button with Animate Effects */}
            <button
              id="predict_submit_btn"
              type="button"
              onClick={triggerPrediction}
              disabled={loading}
              className={`w-full py-4 px-4 rounded-xl font-display font-bold text-sm tracking-wide text-white cursor-pointer select-none transition-all duration-200 active:scale-[0.99] shadow-lg flex items-center justify-center gap-2 overflow-hidden relative ${
                loading
                  ? "bg-slate-700 cursor-not-allowed"
                  : "bg-slate-100 text-slate-900 hover:bg-white active:bg-slate-200 shadow-slate-950/20"
              }`}
            >
              <AnimatePresence mode="wait">
                {loading ? (
                  <motion.div
                    key="predict-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>決策推理神經網路運算中...</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="predict-normal"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-slate-950 font-bold"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>連線 Google Gemini 啟動大盤方向預測</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
          </section>

          {/* Black Swan Detection System Warning Widget */}
          <AnimatePresence>
            {blackSwanDetails && (
              <motion.div
                id="circuit_breaker_alert"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 15 }}
                className="p-4 bg-amber-950/20 border border-amber-900/40 rounded-2xl flex gap-3 shadow-md relative overflow-hidden"
              >
                <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500 animate-pulse" />
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-1.5 animate-pulse">
                    雙向風控體制警告
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-1 leading-normal">
                    偵測到極端宏觀異象：
                    <span className="font-semibold text-rose-300"> {blackSwanDetails}</span>。
                    若達熔斷標準（ADR跌幅 ＞ 3.5% 或單日大賣 400億），本系統決策中心將實施熔斷避險暫停預測。
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: Results Display & High-Fidelity Charts (7 Cols) */}
        <div id="results_section" className="lg:col-span-7 space-y-6">
          <section className="bg-[#121824] rounded-2xl border border-slate-800 p-5 shadow-xl relative overflow-hidden min-h-[460px] flex flex-col justify-between">
            
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-4">
              <h2 className="font-display font-medium text-sm text-slate-200 tracking-wide flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-rose-400" />
                綜合決策推理與明日預測報告
              </h2>
              {result && (
                <span className="text-[10px] uppercase tracking-wider font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  推理成功
                </span>
              )}
            </div>

            {/* Main Interactive Screen State */}
            <div className="flex-grow flex flex-col justify-center">
              <AnimatePresence mode="wait">
                {errorStatus && (
                  <motion.div
                    id="err_screen"
                    key="error-screen"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="p-4 bg-rose-950/20 border border-rose-900/40 rounded-xl flex items-center gap-3 text-rose-300"
                  >
                    <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
                    <p className="text-xs leading-relaxed">{errorStatus}</p>
                  </motion.div>
                )}

                {loading ? (
                  <motion.div
                    id="loading_screen"
                    key="loading-anim"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-16 text-center flex flex-col items-center justify-center space-y-5"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-rose-500 animate-spin" />
                      <Cpu className="w-6 h-6 text-indigo-400 absolute animate-pulse" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-mono text-indigo-300 font-semibold uppercase tracking-widest animate-pulse">
                        決策推理運算大腦中...
                      </p>
                      <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                        正在評估【籌碼流 60%】、並與【全球連動 30%】及【技術指標 10%】完成加權融合推理
                      </p>
                    </div>
                    <div className="flex gap-2.5">
                      <span className="text-[10px] px-2 py-1 bg-slate-900 rounded font-mono text-slate-400 border border-slate-800">三大法人現貨超加權</span>
                      <span className="text-[10px] px-2 py-1 bg-slate-900 rounded font-mono text-slate-400 border border-slate-800">台指未平倉淨空單精算</span>
                    </div>
                  </motion.div>
                ) : blackSwanDetails && (tsmcAdrChange <= -3.5 || institutionalNet.includes("-400億") || futuresValue <= -25000) ? (
                  /* EXPLICIT SAFETY & COMPLIANCE GUARDRAIL: Black Swan Circuit Breaker */
                  <motion.div
                    id="circuit_breaker_active"
                    key="circuit-breaker"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-10 px-6 text-center border-2 border-dashed border-amber-900/50 bg-[#161211]/80 rounded-2xl flex flex-col items-center justify-center"
                  >
                    <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center mb-4">
                      <ShieldAlert className="w-6 h-6 text-amber-400 animate-pulse" />
                    </div>
                    <h3 className="text-base font-display font-bold text-amber-400 tracking-tight">
                      【金融科技風控 - 熔斷機制啟動】
                    </h3>
                    <p className="text-xs text-slate-300 mt-2.5 max-w-lg leading-relaxed">
                      由於偵測到市場出現極端黑天鵝事件威脅：
                      <span className="font-semibold text-rose-400 font-mono"> {blackSwanDetails}</span>
                      。今日盤後量化數據與技術指標已出現瞬間嚴重失真。
                    </p>
                    <div className="p-3 bg-black/40 rounded-xl border border-slate-800 mt-4 text-xs text-amber-500 max-w-md text-left font-mono leading-relaxed">
                      「今日大盤波動劇烈，模型啟動熔斷避險，暫停明日漲跌預測」
                    </div>
                    <p className="text-[10px] text-slate-500 mt-4 italic max-w-sm leading-relaxed">
                      本機制是為了防止極端政經突發、地緣大震盪造成技術指標預測失常。
                    </p>
                  </motion.div>
                ) : result ? (
                  <motion.div
                    id="prediction_result_content"
                    key="prediction-result"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-4"
                  >
                    {/* Visual Meter Header */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className={`p-4 rounded-2xl border flex flex-col justify-between overflow-hidden relative ${
                        result.direction === "UP" 
                        ? "bg-rose-950/20 border-rose-900/40 text-rose-400" 
                        : "bg-emerald-950/20 border-emerald-900/40 text-emerald-400"
                      }`}>
                        <div className="absolute top-2 right-2 opacity-10">
                          {result.direction === "UP" ? <TrendingUp className="w-16 h-16" /> : <TrendingDown className="w-16 h-16" />}
                        </div>
                        <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400">預測方向判定</span>
                        <div className="mt-2 flex items-baseline gap-2">
                          <span className="text-3xl font-display font-black tracking-tight flex items-center gap-1">
                            {result.direction === "UP" ? "漲 【偏多】" : "跌 【偏空】"}
                          </span>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
                        <span className="text-[11px] font-mono tracking-widest uppercase text-slate-400">模型預測信心度</span>
                        <div className="mt-2 flex items-baseline gap-1.5">
                          <span className="text-3xl font-display font-black text-white font-mono">{result.confidence}%</span>
                          <span className="text-xs text-slate-500">加權計分</span>
                        </div>
                        {/* Interactive gauge fill bar */}
                        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                          <div 
                            className={`h-full rounded-full ${result.direction === "UP" ? "bg-rose-500" : "bg-emerald-500"}`} 
                            style={{ width: `${result.confidence}%` }} 
                          />
                        </div>
                      </div>
                    </div>

                    {/* AI Predictions Standard Clean Markdown Display */}
                    <div className="bg-[#171f2e] border border-slate-800/80 rounded-2xl p-4.5 text-xs leading-relaxed text-slate-300 font-sans max-h-[350px] overflow-y-auto space-y-3 prose prose-invert prose-xs scrollbar-thin">
                      {/* Formatted Markdown segments parsed beautifully */}
                      <div className="whitespace-pre-line text-slate-200">
                        {result.rawMarkdown}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    id="welcome_placeholder"
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-16 text-center flex flex-col items-center justify-center space-y-4"
                  >
                    <div className="w-14 h-14 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center">
                      <Sliders className="w-6 h-6 text-slate-400" />
                    </div>
                    <div className="space-y-1.5 max-w-md">
                      <p className="text-sm font-display font-bold text-slate-200">
                        等待大盤籌碼決策推理數據
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        請調整左側的籌碼重要百分比，或是從「一鍵情境模擬」快速填入最新盤後格局（如多頭長紅、外資逃殺等），接著點擊「啟動大盤預測」享受高速推理服務。
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* FOOTER OF RESULTS PANEL: Absolute Compliance Hard Mandatory Disclaimer (MUST NEVER BE MOCKED) */}
            <div className="border-t border-slate-800/60 pt-3 mt-4 text-[10px] text-slate-400 font-mono leading-relaxed bg-[#0e131f]/60 p-3 rounded-xl border border-slate-850">
              <span className="font-bold text-rose-400/90 tracking-wide block mb-1">【開發學術風控宣告】</span>
              【風險警示與免責聲明】本報告為 AI 數據綜合推理模型，僅供開發學術與策略測試參考。歷史預測不代表未來績效，亦不構成任何對投資人的具體買賣要約或建議。投資人進行台指交易應獨立評估風險，並自負盈虧損益。
            </div>
          </section>

          {/* CHIP FLOW VS TAIEX PERFORMANCE REAL-TIME GRAPH (Recharts Integration) */}
          <section className="bg-[#121824] rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="font-display font-medium text-sm text-slate-200 tracking-wide flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400" />
                  外資台指期未平倉與加權指數關聯圖 (歷史仿真)
                </h3>
                <p className="text-[11px] text-slate-500 leading-normal">
                  量化追蹤歷史走勢：外資淨部位（區間柱狀）如何引領 TAIEX 加權大盤（折線趨勢）
                </p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-mono">
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-1.5 bg-rose-500 rounded-sm" /> 加權指數 (TAIEX)
                </span>
                <span className="flex items-center gap-1 text-slate-400">
                  <span className="w-2.5 h-1.5 bg-indigo-500 rounded-sm" /> 外資淨部位 (口)
                </span>
              </div>
            </div>

            {/* Recharts Container */}
            <div id="chart_container" className="h-[220px] w-full mt-3 font-mono">
              <ResponsiveContainer width="105%" height="100%">
                <ComposedChart
                  data={HISTORICAL_DATA}
                  margin={{ top: 10, right: -15, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="#4b5563"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                  />
                  {/* TAIEX Axis */}
                  <YAxis
                    yAxisId="left"
                    stroke="#4b5563"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 150', 'dataMax + 150']}
                  />
                  {/* Futures Net Axis */}
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#4b5563"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    domain={['dataMin - 5000', 'dataMax + 5000']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0e1320",
                      borderColor: "#1f2937",
                      borderRadius: "12px",
                      fontSize: "11px",
                      color: "#f3f4f6"
                    }}
                  />
                  {/* Futures Net Area */}
                  <defs>
                    <linearGradient id="futuresGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="futures"
                    fill="url(#futuresGrad)"
                    stroke="#4f46e5"
                    strokeWidth={1.5}
                    name="外資期貨淨部位"
                  />
                  
                  {/* TAIEX Line */}
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="taiex"
                    stroke="#f43f5e"
                    strokeWidth={3.5}
                    dot={{ stroke: '#f43f5e', strokeWidth: 1, r: 3 }}
                    activeDot={{ r: 5 }}
                    name="加權大盤指數"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
}

