import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

export default function PlayerAnalytics({ player, battingData, pitchingData, onBack }) {
    // タブ切り替え（打撃 or 投手）
    const [activeTab, setActiveTab] = useState(player.position === '投手' ? 'pitching' : 'batting');

    // データ抽出とソート
    const pBatting = battingData.filter(b => b.player === player.id).sort((a, b) => a.id - b.id); // 簡易ソート
    const pPitching = pitchingData.filter(p => p.player === player.id).sort((a, b) => a.id - b.id);

    // ==========================================
    // 打撃成績の計算
    // ==========================================
    const bG = pBatting.length;
    const bPA = pBatting.reduce((s, b) => s + (b.plate_appearances || 0), 0);
    const bAB = pBatting.reduce((s, b) => s + (b.at_bats || 0), 0);
    const bH = pBatting.reduce((s, b) => s + (b.hits || 0), 0);
    const b2B = pBatting.reduce((s, b) => s + (b.doubles || 0), 0);
    const b3B = pBatting.reduce((s, b) => s + (b.triples || 0), 0);
    const bHR = pBatting.reduce((s, b) => s + (b.home_runs || 0), 0);
    const bRBI = pBatting.reduce((s, b) => s + (b.rbi || 0), 0);
    const bR = pBatting.reduce((s, b) => s + (b.runs || 0), 0);
    const bSO = pBatting.reduce((s, b) => s + (b.strikeouts || 0), 0);
    const bBB = pBatting.reduce((s, b) => s + (b.walks || 0), 0);
    const bHBP = pBatting.reduce((s, b) => s + (b.hit_by_pitch || 0), 0);
    const bSB = pBatting.reduce((s, b) => s + (b.steals || 0), 0);
    const bTB = pBatting.reduce((s, b) => s + (b.total_bases || 0), 0);

    const bAVG = bAB > 0 ? (bH / bAB).toFixed(3).replace(/^0\./, '.') : '.000';
    const bOBP = (bAB + bBB + bHBP) > 0 ? ((bH + bBB + bHBP) / (bAB + bBB + bHBP)).toFixed(3).replace(/^0\./, '.') : '.000';
    const bSLG = bAB > 0 ? (bTB / bAB).toFixed(3).replace(/^0\./, '.') : '.000';
    const bOPS = (parseFloat(bOBP) + parseFloat(bSLG)).toFixed(3).replace(/^0\./, '.');

    // ==========================================
    // 投手成績の計算
    // ==========================================
    const pG = pPitching.length;
    const pIP = pPitching.reduce((s, p) => s + (p.innings_pitched || 0), 0);
    const pBF = pPitching.reduce((s, p) => s + (p.batters_faced_right || 0) + (p.batters_faced_left || 0), 0);
    const pH = pPitching.reduce((s, p) => s + (p.hits_allowed_right || 0) + (p.hits_allowed_left || 0), 0);
    const pHR = pPitching.reduce((s, p) => s + (p.home_runs_allowed || 0), 0);
    const pSO = pPitching.reduce((s, p) => s + (p.strikeouts_right || 0) + (p.strikeouts_left || 0), 0);
    const pBB = pPitching.reduce((s, p) => s + (p.walks_allowed_right || 0) + (p.walks_allowed_left || 0), 0);
    const pHBP = pPitching.reduce((s, p) => s + (p.hit_batters_right || 0) + (p.hit_batters_left || 0), 0);
    const pER = pPitching.reduce((s, p) => s + (p.earned_runs || 0), 0);
    const pWP = pPitching.reduce((s, p) => s + (p.wild_pitches || 0), 0);
    const pW = pPitching.reduce((s, p) => s + (p.wins || 0), 0);
    const pL = pPitching.reduce((s, p) => s + (p.losses || 0), 0);
    const pSV = pPitching.reduce((s, p) => s + (p.saves || 0), 0);
    const pHLD = pPitching.reduce((s, p) => s + (p.holds || 0), 0);
    const pGS = pPitching.reduce((s, p) => s + (p.starts || 0), 0);

    const pERA = pIP > 0 ? ((pER * 9) / pIP).toFixed(2) : '0.00';
    const pWHIP = pIP > 0 ? ((pH + pBB) / pIP).toFixed(2) : '0.00';

    // パイチャート用ダミーデータ（打球方向）
    const directionData = [{ name: '左方向', value: 18, fill: '#3b82f6' }, { name: '中方向', value: 32, fill: '#10b981' }, { name: '右方向', value: 16, fill: '#f59e0b' }, { name: 'その他', value: 12, fill: '#ef4444' }];
    
    // 共通のテーブルセルスタイル
    const thStyle = "border border-slate-300 bg-slate-100 py-1.5 px-2 text-slate-600 font-normal text-[10px]";
    const tdStyle = "border border-slate-300 py-1.5 px-2 text-center text-xs font-bold text-slate-700";

    return (
        <div className="bg-white min-h-screen text-slate-800 font-sans">
            {/* 上部ナビゲーションバー（画像そっくりに） */}
            <div className="bg-[#0b1c3a] text-white flex justify-between items-center px-6 py-2">
                <h1 className="text-lg font-bold tracking-widest">ロジスターズ ベースボール データベースシステム</h1>
            </div>
            
            {/* タブと戻るボタン */}
            <div className="bg-[#1e3a8a] text-white flex justify-between items-center px-6 py-2 text-sm font-bold">
                <div className="flex gap-6">
                    <button onClick={() => setActiveTab('batting')} className={`pb-1 ${activeTab === 'batting' ? 'border-b-2 border-white' : 'text-slate-300'}`}>打撃データ <span className="text-[10px] font-normal">（試合記録・打撃記録・傾向分析）</span></button>
                    <button onClick={() => setActiveTab('pitching')} className={`pb-1 ${activeTab === 'pitching' ? 'border-b-2 border-white' : 'text-slate-300'}`}>投手データ <span className="text-[10px] font-normal">（試合記録・投球記録・分析）</span></button>
                </div>
                <div className="flex gap-4 items-center">
                    <button onClick={onBack} className="border border-white px-3 py-1 text-xs hover:bg-white hover:text-[#1e3a8a] transition">← 戻る</button>
                    <button className="border border-white px-3 py-1 text-xs hover:bg-white hover:text-[#1e3a8a] transition">＋ 試合後入力</button>
                </div>
            </div>

            <div className="p-6">
                {/* 選手プロフィール＆サマリー領域 (Gridレイアウト) */}
                <div className="grid grid-cols-12 gap-6 mb-8 border-b border-slate-300 pb-6">
                    {/* 左側：プロフィール */}
                    <div className="col-span-3 flex gap-4">
                        <div className="w-24 h-32 bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-400 text-xs">NO IMAGE</div>
                        <div>
                            <h2 className="text-3xl font-black text-[#0b1c3a] tracking-tighter mb-1">{player.name}</h2>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-black text-[#0b1c3a]">{player.number || '-'}</span>
                                <span className="text-xs font-bold text-slate-600">{player.position} {player.batting_hand}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 leading-tight">生年月日: 2006/04/12<br/>身長/体重: 178cm / 72kg</p>
                        </div>
                    </div>

                    {/* 右側：サマリーKPIグリッド */}
                    <div className="col-span-9">
                        <h3 className="text-xs font-bold text-slate-600 mb-2">{activeTab === 'batting' ? '打撃成績サマリー' : '投手成績サマリー'} (2026年度)</h3>
                        {activeTab === 'batting' ? (
                            <div className="grid grid-cols-8 gap-x-4 gap-y-4 text-center">
                                <div><p className="text-[10px] text-slate-500">打率</p><p className="text-2xl font-bold">{bAVG}</p></div>
                                <div><p className="text-[10px] text-slate-500">試合</p><p className="text-2xl font-bold">{bG}</p></div>
                                <div><p className="text-[10px] text-slate-500">打席</p><p className="text-2xl font-bold">{bPA}</p></div>
                                <div><p className="text-[10px] text-slate-500">打数</p><p className="text-2xl font-bold">{bAB}</p></div>
                                <div><p className="text-[10px] text-slate-500">安打</p><p className="text-2xl font-bold">{bH}</p></div>
                                <div><p className="text-[10px] text-slate-500">二塁打</p><p className="text-2xl font-bold">{b2B}</p></div>
                                <div><p className="text-[10px] text-slate-500">三塁打</p><p className="text-2xl font-bold">{b3B}</p></div>
                                <div><p className="text-[10px] text-slate-500">本塁打</p><p className="text-2xl font-bold">{bHR}</p></div>
                                
                                <div><p className="text-[10px] text-slate-500">塁打</p><p className="text-xl font-bold">{bTB}</p></div>
                                <div><p className="text-[10px] text-slate-500">打点</p><p className="text-xl font-bold">{bRBI}</p></div>
                                <div><p className="text-[10px] text-slate-500">得点</p><p className="text-xl font-bold">{bR}</p></div>
                                <div><p className="text-[10px] text-slate-500">三振</p><p className="text-xl font-bold">{bSO}</p></div>
                                <div><p className="text-[10px] text-slate-500">四球</p><p className="text-xl font-bold">{bBB}</p></div>
                                <div><p className="text-[10px] text-slate-500">死球</p><p className="text-xl font-bold">{bHBP}</p></div>
                                <div><p className="text-[10px] text-slate-500">犠打</p><p className="text-xl font-bold">-</p></div>
                                <div><p className="text-[10px] text-slate-500">出塁率</p><p className="text-xl font-bold">{bOBP}</p></div>
                                
                                <div><p className="text-[10px] text-slate-500">長打率</p><p className="text-xl font-bold">{bSLG}</p></div>
                                <div><p className="text-[10px] text-slate-500">OPS</p><p className="text-xl font-bold text-blue-700">{bOPS}</p></div>
                                <div><p className="text-[10px] text-slate-500">盗塁</p><p className="text-xl font-bold">{bSB}</p></div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-9 gap-x-4 gap-y-4 text-center">
                                <div><p className="text-[10px] text-slate-500">登板</p><p className="text-2xl font-bold">{pG}</p></div>
                                <div><p className="text-[10px] text-slate-500">先発</p><p className="text-2xl font-bold">{pGS}</p></div>
                                <div><p className="text-[10px] text-slate-500">完投</p><p className="text-2xl font-bold">-</p></div>
                                <div><p className="text-[10px] text-slate-500">完封</p><p className="text-2xl font-bold">-</p></div>
                                <div><p className="text-[10px] text-slate-500">勝利</p><p className="text-2xl font-bold text-red-600">{pW}</p></div>
                                <div><p className="text-[10px] text-slate-500">敗戦</p><p className="text-2xl font-bold text-blue-600">{pL}</p></div>
                                <div><p className="text-[10px] text-slate-500">セーブ</p><p className="text-2xl font-bold">{pSV}</p></div>
                                <div><p className="text-[10px] text-slate-500">ホールド</p><p className="text-2xl font-bold">{pHLD}</p></div>
                                
                                <div><p className="text-[10px] text-slate-500">投球回</p><p className="text-xl font-bold">{pIP}</p></div>
                                <div><p className="text-[10px] text-slate-500">打者</p><p className="text-xl font-bold">{pBF}</p></div>
                                <div><p className="text-[10px] text-slate-500">被安打</p><p className="text-xl font-bold">{pH}</p></div>
                                <div><p className="text-[10px] text-slate-500">被本塁打</p><p className="text-xl font-bold">{pHR}</p></div>
                                <div><p className="text-[10px] text-slate-500">奪三振</p><p className="text-xl font-bold">{pSO}</p></div>
                                <div><p className="text-[10px] text-slate-500">与四球</p><p className="text-xl font-bold">{pBB}</p></div>
                                <div><p className="text-[10px] text-slate-500">与死球</p><p className="text-xl font-bold">{pHBP}</p></div>
                                <div><p className="text-[10px] text-slate-500">暴投</p><p className="text-xl font-bold">{pWP}</p></div>
                                
                                <div><p className="text-[10px] text-slate-500">防御率</p><p className="text-2xl font-bold text-blue-700">{pERA}</p></div>
                                <div><p className="text-[10px] text-slate-500">WHIP</p><p className="text-xl font-bold">{pWHIP}</p></div>
                            </div>
                        )}
                    </div>
                </div>

                {/* =========================================
                    打撃データ タブの内容（画像1枚目）
                    ========================================= */}
                {activeTab === 'batting' && (
                    <div className="space-y-6">
                        {/* 中段：試合別、方向別、凡退内訳 */}
                        <div className="grid grid-cols-12 gap-6">
                            {/* 試合別成績リスト */}
                            <div className="col-span-5">
                                <h3 className="text-sm font-bold text-[#0b1c3a] mb-2 border-l-4 border-[#0b1c3a] pl-2">試合別打撃成績</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className={thStyle}>日付</th><th className={thStyle}>対戦相手</th><th className={thStyle}>打席</th>
                                            <th className={thStyle}>打数</th><th className={thStyle}>安打</th><th className={thStyle}>打点</th>
                                            <th className={thStyle}>三振</th><th className={thStyle}>四球</th><th className={thStyle}>打率</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pBatting.slice(0, 7).map((b, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className={`${tdStyle} text-left font-normal`}>{(b.date||'').substring(5)}</td>
                                                <td className={`${tdStyle} text-left font-normal truncate max-w-[80px]`}>{b.opponent || '-'}</td>
                                                <td className={tdStyle}>{b.plate_appearances}</td>
                                                <td className={tdStyle}>{b.at_bats}</td>
                                                <td className={`${tdStyle} bg-red-50 text-red-600`}>{b.hits}</td>
                                                <td className={`${tdStyle} text-blue-600`}>{b.rbi}</td>
                                                <td className={tdStyle}>{b.strikeouts}</td>
                                                <td className={tdStyle}>{b.walks}</td>
                                                <td className={tdStyle}>{b.at_bats>0?(b.hits/b.at_bats).toFixed(3).replace(/^0\./, '.'):'-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="text-right mt-2"><button className="border border-slate-300 px-4 py-1 text-[10px] font-bold rounded hover:bg-slate-50">すべて見る</button></div>
                            </div>

                            {/* 打球方向別 (ドーナツ) */}
                            <div className="col-span-4">
                                <h3 className="text-sm font-bold text-[#0b1c3a] mb-2 border-l-4 border-[#0b1c3a] pl-2">打球方向別打数・安打数</h3>
                                <div className="flex items-center h-48 border border-slate-200 p-2">
                                    <div className="w-1/2 h-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={directionData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" stroke="none">
                                                    {directionData.map((e, i) => <Cell key={`c-${i}`} fill={e.fill} />)}
                                                </Pie>
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-[10px] pointer-events-none mt-[-5px]">
                                            <span className="text-slate-400">合計</span><span className="text-xl font-bold leading-none text-[#0b1c3a]">{bAB}</span>
                                        </div>
                                    </div>
                                    <div className="w-1/2 text-[10px] space-y-2">
                                        <div className="flex items-center justify-between"><span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500"></div>左方向</span><span className="font-bold">18打数</span><span>6安打</span></div>
                                        <div className="flex items-center justify-between"><span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500"></div>中方向</span><span className="font-bold">32打数</span><span>9安打</span></div>
                                        <div className="flex items-center justify-between"><span className="flex items-center gap-1"><div className="w-2 h-2 bg-yellow-500"></div>右方向</span><span className="font-bold">16打数</span><span>5安打</span></div>
                                    </div>
                                </div>
                            </div>

                            {/* 凡退内訳 */}
                            <div className="col-span-3">
                                <h3 className="text-sm font-bold text-[#0b1c3a] mb-2 border-l-4 border-[#0b1c3a] pl-2">打球結果凡退内訳</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead><tr><th className={thStyle}>凡退内容</th><th className={thStyle}>凡退数</th><th className={thStyle}>割合</th></tr></thead>
                                    <tbody>
                                        <tr><td className={`${tdStyle} text-left font-normal`}>内野ゴロ</td><td className={tdStyle}>26</td><td className={tdStyle}>33.3%</td></tr>
                                        <tr><td className={`${tdStyle} text-left font-normal`}>フライアウト</td><td className={tdStyle}>13</td><td className={tdStyle}>16.7%</td></tr>
                                        <tr><td className={`${tdStyle} text-left font-normal`}>三振</td><td className={tdStyle}>{bSO}</td><td className={tdStyle}>-</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 下段：細かい分析テーブル群（画像通りに多数配置） */}
                        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-300">
                            <div>
                                <h3 className="text-[11px] font-bold text-[#0b1c3a] mb-1">カウント別成績</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead><tr><th className={thStyle}>カウント</th><th className={thStyle}>打数</th><th className={thStyle}>安打</th><th className={thStyle}>打率</th></tr></thead>
                                    <tbody><tr><td className={`${tdStyle} font-normal`}>0-0</td><td className={tdStyle}>18</td><td className={tdStyle}>5</td><td className={tdStyle}>.278</td></tr><tr><td className={`${tdStyle} font-normal`}>2-1</td><td className={tdStyle}>10</td><td className={tdStyle}>5</td><td className={tdStyle}>.500</td></tr></tbody>
                                </table>
                            </div>
                            <div>
                                <h3 className="text-[11px] font-bold text-[#0b1c3a] mb-1">状況別成績</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead><tr><th className={thStyle}>状況</th><th className={thStyle}>打数</th><th className={thStyle}>安打</th><th className={thStyle}>打率</th></tr></thead>
                                    <tbody><tr><td className={`${tdStyle} font-normal`}>得点圏</td><td className={tdStyle}>24</td><td className={tdStyle}>7</td><td className={tdStyle}>.292</td></tr><tr><td className={`${tdStyle} font-normal`}>ランナー1塁</td><td className={tdStyle}>22</td><td className={tdStyle}>8</td><td className={tdStyle}>.364</td></tr></tbody>
                                </table>
                            </div>
                            <div>
                                <h3 className="text-[11px] font-bold text-[#0b1c3a] mb-1">打順別成績</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead><tr><th className={thStyle}>打順</th><th className={thStyle}>打席</th><th className={thStyle}>打数</th><th className={thStyle}>安打</th><th className={thStyle}>打率</th></tr></thead>
                                    <tbody><tr><td className={`${tdStyle} font-normal`}>1番</td><td className={tdStyle}>18</td><td className={tdStyle}>15</td><td className={tdStyle}>6</td><td className={tdStyle}>.400</td></tr><tr><td className={`${tdStyle} font-normal`}>3番</td><td className={tdStyle}>22</td><td className={tdStyle}>17</td><td className={tdStyle}>6</td><td className={tdStyle}>.353</td></tr></tbody>
                                </table>
                            </div>
                            <div>
                                <h3 className="text-[11px] font-bold text-[#0b1c3a] mb-1">球種別打撃成績</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead><tr><th className={thStyle}>球種</th><th className={thStyle}>打数</th><th className={thStyle}>安打</th><th className={thStyle}>打率</th></tr></thead>
                                    <tbody><tr><td className={`${tdStyle} font-normal`}>ストレート</td><td className={tdStyle}>32</td><td className={tdStyle}>11</td><td className={tdStyle}>.344</td></tr><tr><td className={`${tdStyle} font-normal`}>スライダー</td><td className={tdStyle}>16</td><td className={tdStyle}>4</td><td className={tdStyle}>.250</td></tr></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================
                    投手データ タブの内容（画像2枚目）
                    ========================================= */}
                {activeTab === 'pitching' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-12 gap-6">
                            {/* 試合別投球成績 */}
                            <div className="col-span-5">
                                <h3 className="text-sm font-bold text-[#0b1c3a] mb-2 border-l-4 border-[#0b1c3a] pl-2">試合別投球成績</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr>
                                            <th className={thStyle}>日付</th><th className={thStyle}>対戦相手</th><th className={thStyle}>投球回</th>
                                            <th className={thStyle}>打者</th><th className={thStyle}>被安打</th><th className={thStyle}>奪三振</th>
                                            <th className={thStyle}>失点</th><th className={thStyle}>自責</th><th className={thStyle}>防御率</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pPitching.slice(0, 7).map((p, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                                <td className={`${tdStyle} text-left font-normal`}>-</td>
                                                <td className={`${tdStyle} text-left font-normal truncate max-w-[80px]`}>-</td>
                                                <td className={tdStyle}>{p.innings_pitched}</td>
                                                <td className={tdStyle}>{(p.batters_faced_right||0)+(p.batters_faced_left||0)}</td>
                                                <td className={`${tdStyle} bg-red-50 text-red-600`}>{(p.hits_allowed_right||0)+(p.hits_allowed_left||0)}</td>
                                                <td className={`${tdStyle} text-blue-600`}>{(p.strikeouts_right||0)+(p.strikeouts_left||0)}</td>
                                                <td className={tdStyle}>{p.runs_allowed}</td>
                                                <td className={tdStyle}>{p.earned_runs}</td>
                                                <td className={tdStyle}>{p.innings_pitched>0 ? ((p.earned_runs*9)/p.innings_pitched).toFixed(2):'-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* イニング別投球数推移 (棒グラフ) */}
                            <div className="col-span-4">
                                <h3 className="text-sm font-bold text-[#0b1c3a] mb-2 border-l-4 border-[#0b1c3a] pl-2">イニング別投球数推移</h3>
                                <div className="h-48 border border-slate-200 p-2 pt-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={[{n:'1',v:16},{n:'2',v:18},{n:'3',v:15},{n:'4',v:14},{n:'5',v:13}]}>
                                            <XAxis dataKey="n" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                                            <Bar dataKey="v" fill="#1e3a8a" label={{ position: 'top', fontSize: 10, fill: '#64748b' }} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 球種別投球割合 */}
                            <div className="col-span-3">
                                <h3 className="text-sm font-bold text-[#0b1c3a] mb-2 border-l-4 border-[#0b1c3a] pl-2">球種別投球割合・成績</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead><tr><th className={thStyle}>球種</th><th className={thStyle}>割合</th><th className={thStyle}>被安打</th><th className={thStyle}>奪三振</th></tr></thead>
                                    <tbody>
                                        <tr><td className={`${tdStyle} font-normal text-left`}>ストレート</td><td className={tdStyle}>45.6%</td><td className={tdStyle}>12</td><td className={tdStyle}>28</td></tr>
                                        <tr><td className={`${tdStyle} font-normal text-left`}>スライダー</td><td className={tdStyle}>16.3%</td><td className={tdStyle}>10</td><td className={tdStyle}>11</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* 下段：細かい分析テーブル群 */}
                        <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-300">
                            <div>
                                <h3 className="text-[11px] font-bold text-[#0b1c3a] mb-1">投球結果内訳</h3>
                                <table className="w-full text-left border-collapse">
                                    <thead><tr><th className={thStyle}>結果</th><th className={thStyle}>回数</th><th className={thStyle}>割合</th></tr></thead>
                                    <tbody><tr><td className={`${tdStyle} font-normal text-left`}>三振</td><td className={tdStyle}>{pSO}</td><td className={tdStyle}>-</td></tr></tbody>
                                </table>
                            </div>
                            <div className="col-span-2 flex gap-4">
                                <div className="w-1/2">
                                    <h3 className="text-[11px] font-bold text-[#0b1c3a] mb-1">ランナー状況別成績</h3>
                                    <table className="w-full text-left border-collapse">
                                        <thead><tr><th className={thStyle}>状況</th><th className={thStyle}>被打率</th><th className={thStyle}>奪三振</th></tr></thead>
                                        <tbody><tr><td className={`${tdStyle} font-normal text-left`}>無走者</td><td className={tdStyle}>.192</td><td className={tdStyle}>40</td></tr></tbody>
                                    </table>
                                </div>
                                <div className="w-1/2">
                                    <h3 className="text-[11px] font-bold text-[#0b1c3a] mb-1">イニング別成績</h3>
                                    <table className="w-full text-left border-collapse">
                                        <thead><tr><th className={thStyle}>イニング</th><th className={thStyle}>防御率</th><th className={thStyle}>被打率</th></tr></thead>
                                        <tbody><tr><td className={`${tdStyle} font-normal text-left`}>1〜3回</td><td className={tdStyle}>0.93</td><td className={tdStyle}>.192</td></tr></tbody>
                                    </table>
                                </div>
                            </div>
                            <div>
                                <h3 className="text-[11px] font-bold text-[#0b1c3a] mb-1">コーチコメント</h3>
                                <div className="border border-slate-200 p-2 h-full bg-slate-50 text-xs text-slate-700">
                                    <p className="font-bold mb-1">2026/08/15</p>
                                    <p>テンポ良く投げられた。ストレートのコントロールが良かった。6回以降も球威が落ちず粘り強く投げられた。</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}