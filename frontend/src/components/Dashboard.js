import React, { useState, useEffect, useMemo } from 'react';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Cell } from 'recharts';

export default function Dashboard() {
    const [games, setGames] = useState([]);
    const [battingData, setBattingData] = useState([]);
    const [pitchingData, setPitchingData] = useState([]);
    const [players, setPlayers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const [showAllGames, setShowAllGames] = useState(false);
    const [showAllRankings, setShowAllRankings] = useState(false);

    const [filterMode, setFilterMode] = useState('year'); 
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const userRole = typeof window !== 'undefined' ? (localStorage.getItem('logistars_user_role') || 'admin') : 'admin';
    const roleStr = String(userRole || '').trim().toLowerCase();
    const isPlayerRole = roleStr === 'player' || roleStr === '一般選手' || roleStr === '選手';

    // ★ 新機能：3つの表示モード（現役のみ / 含む / 退団者のみ）
    const [playersMode, setPlayersMode] = useState('active_only');

    useEffect(() => {
        const checkSetting = () => {
            if (isPlayerRole) {
                setPlayersMode('active_only');
            } else {
                const mode = localStorage.getItem('logistars_players_mode');
                if (mode) {
                    setPlayersMode(mode);
                } else {
                    // 古い設定からの互換性維持
                    const legacy = localStorage.getItem('logistars_include_retired_stats');
                    setPlayersMode(legacy === 'true' ? 'include_retired' : 'active_only');
                }
            }
        };
        checkSetting();
        const intervalId = setInterval(checkSetting, 1000);
        return () => clearInterval(intervalId);
    }, [isPlayerRole]);

    const handlePlayersModeChange = (e) => {
        const mode = e.target.value;
        setPlayersMode(mode);
        if (!isPlayerRole) {
            localStorage.setItem('logistars_players_mode', mode);
            localStorage.setItem('logistars_include_retired_stats', mode === 'include_retired' ? 'true' : 'false');
        }
    };

    const getTodayStr = () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const checkIsActive = (playerIdStr) => {
        const p = players.find(x => String(x.id) === String(playerIdStr));
        if (!p) return false; 
        if (p.retirementDate) {
            const rDateStr = String(p.retirementDate).substring(0, 10);
            if (rDateStr <= getTodayStr()) return false; 
        }
        return true; 
    };

    // ★ 新機能：表示モードに従って選手を含めるか判定する関数
    const shouldIncludePlayer = (playerIdStr) => {
        const active = checkIsActive(playerIdStr);
        if (playersMode === 'active_only') return active;
        if (playersMode === 'retired_only') return !active;
        return true; // include_retired
    };

    const resolveId = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return String(val.id || val.playerId || val.name || '').trim();
        return String(val).trim();
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resGames, resBat, resPit, resPlayers] = await Promise.all([
                    fetch('http://127.0.0.1:8000/api/games/'),
                    fetch('http://127.0.0.1:8000/api/excel-batting/'),
                    fetch('http://127.0.0.1:8000/api/excel-pitching/'),
                    fetch('http://127.0.0.1:8000/api/players/')
                ]);

                if (resGames.ok && resBat.ok && resPit.ok && resPlayers.ok) {
                    const gData = await resGames.json();
                    setGames(gData.sort((a, b) => new Date(b.date) - new Date(a.date)));
                    setBattingData(await resBat.json());
                    setPitchingData(await resPit.json());
                    setPlayers(await resPlayers.json());
                }
            } catch (error) {
                console.error("データ取得エラー:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    const getSeasonYear = (dateString) => {
        const seasonStartMonth = typeof window !== 'undefined' ? parseInt(localStorage.getItem('logistars_season_start_month') || '4', 10) : 4;
        const d = new Date(dateString);
        return d.getMonth() + 1 >= seasonStartMonth ? d.getFullYear() : d.getFullYear() - 1;
    };

    const availableYears = useMemo(() => {
        const years = new Set();
        games.forEach(g => { if (g.date) years.add(getSeasonYear(g.date)); });
        const sorted = Array.from(years).sort((a, b) => b - a);
        return sorted.length === 0 ? [getSeasonYear(new Date())] : sorted;
    }, [games]);

    const [selectedYear, setSelectedYear] = useState(availableYears[0]);
    
    useEffect(() => { 
        if (!availableYears.includes(selectedYear)) setSelectedYear(availableYears[0]); 
    }, [availableYears, selectedYear]);

    const targetGames = useMemo(() => {
        return games.filter(g => {
            if (!g.date) return false;
            if (filterMode === 'year') {
                return getSeasonYear(g.date) === selectedYear;
            } else {
                if (startDate && new Date(g.date) < new Date(startDate)) return false;
                if (endDate) {
                    const end = new Date(endDate);
                    end.setHours(23, 59, 59, 999);
                    if (new Date(g.date) > end) return false;
                }
                return true;
            }
        });
    }, [games, filterMode, selectedYear, startDate, endDate]);

    const targetGameIds = new Set(targetGames.map(g => String(g.id)));

    const monthlyData = useMemo(() => {
        const finishedGames = targetGames.filter(g => g.status === '試合終了' || g.status === 'finished' || g.my_score !== null);
        const startMonth = typeof window !== 'undefined' ? parseInt(localStorage.getItem('logistars_season_start_month') || '4', 10) : 4;
        const months = Array.from({length: 12}, (_, i) => {
            let m = startMonth + i; if (m > 12) m -= 12;
            return { month: `${m}月`, mNum: m, w: 0, l: 0, d: 0, 得点: 0, 失点: 0, 勝率: null };
        });

        finishedGames.forEach(g => {
            const mNum = new Date(g.date).getMonth() + 1;
            const target = months.find(x => x.mNum === mNum);
            if (target) {
                const my = Number(g.my_score || 0); const op = Number(g.op_score || 0);
                target.得点 += my; target.失点 += op;
                if (my > op) target.w++; else if (my < op) target.l++; else target.d++;
            }
        });

        return months.map(m => {
            const total = m.w + m.l;
            if (total > 0) m.勝率 = (m.w / total) * 100;
            return m;
        });
    }, [targetGames]);

    if (isLoading) return <div className="p-12 text-center text-slate-500 animate-pulse">データを集計中...</div>;

    const finishedGames = targetGames.filter(g => g.status === '試合終了' || g.status === 'finished' || g.my_score !== null);
    const totalG = finishedGames.length;
    let wins = 0, losses = 0, draws = 0;
    let totalRuns = 0, totalRunsAllowed = 0;

    finishedGames.forEach(g => {
        if (g.my_score !== null && g.op_score !== null) {
            const my = Number(g.my_score); const op = Number(g.op_score);
            if (my > op) wins++; else if (my < op) losses++; else draws++;
            totalRuns += my; totalRunsAllowed += op;
        }
    });

    const winRate = (wins + losses) > 0 ? (wins / (wins + losses)).toFixed(3).replace(/^0\./, '.') : '.000';
    const runsPerGame = totalG > 0 ? (totalRuns / totalG).toFixed(2) : '0.00';
    const allowedPerGame = totalG > 0 ? (totalRunsAllowed / totalG).toFixed(2) : '0.00';
    // ★修正：打撃データをフィルターし、選手ごとの合計を算出する
    const tBatting = battingData.filter(r => {
        if (!targetGameIds.has(String(r.game || r.game_id))) return false;
        const pId = resolveId(r.player || r.batter);
        return shouldIncludePlayer(pId);
    });

    const playerBatStats = {};
    let tAB=0, tH=0, tBB=0, tHBP=0, tD2=0, tD3=0, tHR=0, tSB=0, tCS=0, tSO_bat=0, tSacB=0, tSacF=0, tErrors=0, tGO=0, tFO=0;

    tBatting.forEach(b => {
        const pId = resolveId(b.player || b.batter);
        if (!playerBatStats[pId]) playerBatStats[pId] = { id: pId, ab: 0, h: 0, hr: 0 };
        
        const ab = b.at_bats || 0;
        const h = b.hits || 0;
        const hr = b.home_runs || 0;
        
        playerBatStats[pId].ab += ab;
        playerBatStats[pId].h += h;
        playerBatStats[pId].hr += hr;

        tAB += ab; tH += h; tBB += (b.walks || 0); tHBP += (b.hit_by_pitch || 0);
        tD2 += (b.doubles || 0); tD3 += (b.triples || 0); tHR += hr;
        tSB += (b.steals || 0); tCS += (b.caught_stealing || 0);
        tSO_bat += (b.strikeouts || 0); tSacB += (b.sacrifice_bunts || 0);
        tSacF += (b.sacrifice_flies || 0); tErrors += (b.errors || 0);
        tGO += (b.ground_outs || 0); tFO += (b.fly_outs || 0);
    });

    const tAVG = tAB > 0 ? (tH / tAB).toFixed(3).replace(/^0\./, '.') : '.000';
    const tOBP = (tAB + tBB + tHBP + tSacF) > 0 ? ((tH + tBB + tHBP) / (tAB + tBB + tHBP + tSacF)).toFixed(3).replace(/^0\./, '.') : '.000';
    const tSLG = tAB > 0 ? (((tH - tD2 - tD3 - tHR) + tD2*2 + tD3*3 + tHR*4) / tAB).toFixed(3).replace(/^0\./, '.') : '.000';
    const tOPS = (parseFloat(tOBP) + parseFloat(tSLG)).toFixed(3).replace(/^0\./, '.');
    const tSBPct = (tSB + tCS) > 0 ? ((tSB / (tSB + tCS)) * 100).toFixed(1) + '%' : '-';

    // ★修正：投手データをフィルターし、選手ごとの合計を算出する
    const tPitching = pitchingData.filter(r => {
        if (!targetGameIds.has(String(r.game || r.game_id))) return false;
        const pId = resolveId(r.player || r.pitcher);
        return shouldIncludePlayer(pId);
    });

    const playerPitStats = {};
    let pOuts=0, pER=0, pSO=0, pHits=0, pBBs=0, pBF=0, pCG=0, pSHO=0;

    tPitching.forEach(p => {
        const pId = resolveId(p.player || p.pitcher);
        if (!playerPitStats[pId]) playerPitStats[pId] = { id: pId, ipOuts: 0, er: 0 };
        
        const ip = Number(p.innings_pitched || p.ip || 0);
        const outs = Math.floor(ip) * 3 + Math.round((ip % 1) * 10);
        const er = p.earned_runs || 0;
        
        playerPitStats[pId].ipOuts += outs;
        playerPitStats[pId].er += er;

        pOuts += outs; pER += er;
        pSO += (p.strikeouts_right || 0) + (p.strikeouts_left || 0) + (p.strikeouts || 0);
        pHits += (p.hits_allowed_right || 0) + (p.hits_allowed_left || 0) + (p.hits_allowed || 0);
        pBBs += (p.walks_allowed_right || 0) + (p.walks_allowed_left || 0) + (p.walks_allowed || 0);
        pBF += (p.batters_faced || 0);
        pCG += (p.complete_games || 0);
        pSHO += (p.shutouts || 0);
    });

    const tERA = pOuts > 0 ? ((pER * 27) / pOuts).toFixed(2) : '0.00';
    const tWHIP = pOuts > 0 ? (((pHits + pBBs) * 3) / pOuts).toFixed(2) : '0.00';
    const kPer9 = pOuts > 0 ? ((pSO * 27) / pOuts).toFixed(2) : '0.00';
    const bbPer9 = pOuts > 0 ? ((pBBs * 27) / pOuts).toFixed(2) : '0.00';
    const tBAA = (pBF - pBBs) > 0 ? (pHits / (pBF - pBBs)).toFixed(3).replace(/^0\./, '.') : '.000';

    const getPlayerName = (id) => players.find(p => String(p.id) === String(id))?.name || '不明';
    
    // ★修正：ランキングを「シーズン合算成績」にし、退団マークを付与する
    const avgRanking = Object.values(playerBatStats)
        .filter(b => b.ab >= Math.max(1, Math.floor(totalG * 1.5))) 
        .map(b => {
            const active = checkIsActive(b.id);
            let pName = getPlayerName(b.id);
            if (!active) pName = pName.includes('(退団)') ? pName : `${pName} (退団)`;
            return { name: pName, val: (b.h / b.ab), text: (b.h / b.ab).toFixed(3).replace(/^0\./, '.'), isRetired: !active };
        })
        .sort((a, b) => b.val - a.val);

    if (avgRanking.length === 0) {
        const fallbackAvg = Object.values(playerBatStats).filter(b => b.ab > 0).map(b => {
            const active = checkIsActive(b.id);
            let pName = getPlayerName(b.id);
            if (!active) pName = pName.includes('(退団)') ? pName : `${pName} (退団)`;
            return { name: pName, val: (b.h / b.ab), text: (b.h / b.ab).toFixed(3).replace(/^0\./, '.'), isRetired: !active };
        }).sort((a, b) => b.val - a.val);
        avgRanking.push(...fallbackAvg);
    }

    const hrRanking = Object.values(playerBatStats)
        .filter(b => b.hr > 0)
        .map(b => {
            const active = checkIsActive(b.id);
            let pName = getPlayerName(b.id);
            if (!active) pName = pName.includes('(退団)') ? pName : `${pName} (退団)`;
            return { name: pName, val: b.hr, text: b.hr, isRetired: !active };
        })
        .sort((a, b) => b.val - a.val);

    const eraRanking = Object.values(playerPitStats)
        .filter(p => p.ipOuts >= totalG * 3) 
        .map(p => {
            const active = checkIsActive(p.id);
            let pName = getPlayerName(p.id);
            if (!active) pName = pName.includes('(退団)') ? pName : `${pName} (退団)`;
            const era = (p.er * 27) / p.ipOuts;
            return { name: pName, val: era, text: era.toFixed(2), isRetired: !active };
        })
        .sort((a, b) => a.val - b.val);
        
    if (eraRanking.length === 0) {
        const fallbackEra = Object.values(playerPitStats).filter(p => p.ipOuts >= 3).map(p => {
            const active = checkIsActive(p.id);
            let pName = getPlayerName(p.id);
            if (!active) pName = pName.includes('(退団)') ? pName : `${pName} (退団)`;
            const era = (p.er * 27) / p.ipOuts;
            return { name: pName, val: era, text: era.toFixed(2), isRetired: !active };
        }).sort((a, b) => a.val - b.val);
        eraRanking.push(...fallbackEra);
    }

    const errByPos = { '投': 0, '捕': 0, '一': 0, '二': 0, '三': 0, '遊': 0, '左': 0, '中': 0, '右': 0 };
    tBatting.forEach(b => {
        if (b.errors > 0) {
            const pId = resolveId(b.player || b.batter);
            const p = players.find(x => String(x.id) === pId);
            if (p && p.position) {
                const pos = p.position.charAt(0);
                if (errByPos[pos] !== undefined) errByPos[pos] += b.errors;
            }
        }
    });

    const batResultData = [
        { name: '安打', value: tH, fill: '#059669' },
        { name: '四死球', value: tBB + tHBP, fill: '#2563eb' },
        { name: '本塁打', value: tHR, fill: '#dc2626' },
        { name: '三振', value: tSO_bat, fill: '#9333ea' },
        { name: 'ゴロアウト', value: tGO > 0 ? tGO : Math.floor(tAB * 0.4), fill: '#f59e0b' },
        { name: 'フライアウト', value: tFO > 0 ? tFO : Math.floor(tAB * 0.3), fill: '#94a3b8' }
    ];

    const labelStyle = "text-[10px] font-bold text-slate-500 mb-1 leading-tight";
    const valueStyle = "text-2xl font-bold text-[#0b1c3a] tracking-tight";
    const cardStyle = "bg-white border border-slate-200 shadow-sm p-4 rounded-xl";
    const thStyle = "border-dotted border-b border-r border-slate-300 py-1.5 px-1 font-normal text-[10px] text-slate-500 bg-slate-50 text-center";
    const tdStyle = "border-dotted border-b border-r border-slate-300 py-2 px-1 text-xs font-bold text-[#0b1c3a] text-center";

    return (
        <div className="bg-slate-50 min-h-screen text-slate-800 font-sans p-4 md:p-6 pb-20">
            
            <div className="bg-[#0b1c3a] px-4 md:px-8 py-4 flex flex-col xl:flex-row justify-between items-center shadow-lg mb-6 -mx-4 md:-mx-6 -mt-4 md:-mt-6 border-b border-blue-900 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-screen filter blur-[80px] opacity-10 animate-pulse"></div>
                
                <div className="relative z-10 w-full xl:w-auto text-center xl:text-left">
                    <h2 className="text-lg md:text-xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300 flex items-center justify-center xl:justify-start gap-2">
                        <span>📊</span> サマリーダッシュボード
                    </h2>
                </div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-md shadow-inner w-full xl:w-auto justify-center">
                    
                    <div className="flex bg-black/50 rounded-lg p-1 shrink-0">
                        <button 
                            onClick={() => setFilterMode('year')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${filterMode === 'year' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            年度
                        </button>
                        <button 
                            onClick={() => setFilterMode('custom')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${filterMode === 'custom' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            期間指定
                        </button>
                    </div>

                    <div className="flex items-center justify-center">
                        {filterMode === 'year' ? (
                            <div className="flex items-center gap-3">
                                <select 
                                    value={selectedYear} 
                                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                    className="bg-black/40 text-cyan-100 border border-cyan-500/30 rounded-lg px-4 py-1.5 text-xs font-bold outline-none focus:border-cyan-400 cursor-pointer shadow-inner appearance-none text-center"
                                >
                                    {availableYears.map(y => <option key={y} value={y}>{y}年度</option>)}
                                </select>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <input 
                                    type="date" 
                                    value={startDate} 
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="bg-black/40 text-cyan-100 border border-cyan-500/30 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
                                />
                                <span className="text-cyan-500 font-bold text-xs">〜</span>
                                <input 
                                    type="date" 
                                    value={endDate} 
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-black/40 text-cyan-100 border border-cyan-500/30 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
                                />
                            </div>
                        )}
                    </div>

                    {/* ★ 新機能：即座に切り替えられる分析対象ドロップダウン */}
                    {!isPlayerRole && (
                        <div className="flex items-center ml-2 border-l border-white/20 pl-4">
                            <span className="text-[10px] text-cyan-200 mr-2 font-bold whitespace-nowrap">表示対象:</span>
                            <select 
                                value={playersMode} 
                                onChange={handlePlayersModeChange}
                                className="bg-white/10 text-white border border-cyan-500/50 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-cyan-400 cursor-pointer shadow-inner"
                            >
                                <option value="active_only" className="text-slate-800">現役のみ (通常)</option>
                                <option value="include_retired" className="text-slate-800">退団者も含む</option>
                                <option value="retired_only" className="text-slate-800">退団者のみ (専用)</option>
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-4">
                
                <div className={`lg:col-span-5 ${cardStyle}`}>
                    <h3 className="text-xs font-bold text-slate-700 mb-4 border-l-4 border-[#0b1c3a] pl-2 flex items-center gap-2">
                        チーム成績サマリー
                        <span className="text-[9px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {filterMode === 'year' ? `${selectedYear}年度` : `${startDate || '設定なし'} 〜 ${endDate || '設定なし'}`}
                        </span>
                    </h3>
                    <div className="grid grid-cols-3 gap-x-2 gap-y-4 text-center items-end border-b-2 border-dotted border-slate-300 pb-4 mb-4">
                        <div><p className={labelStyle}>試合数</p><p className={valueStyle}>{totalG} <span className="text-[10px] font-normal text-slate-500">試合</span></p></div>
                        <div><p className={labelStyle}>勝利</p><p className={valueStyle}>{wins} <span className="text-[10px] font-normal text-slate-500">勝</span></p></div>
                        <div><p className={labelStyle}>敗戦</p><p className={valueStyle}>{losses} <span className="text-[10px] font-normal text-slate-500">敗</span></p></div>
                        <div><p className={labelStyle}>勝率</p><p className={valueStyle}>{winRate}</p></div>
                        <div><p className={labelStyle}>得点</p><p className={valueStyle}>{totalRuns}</p><p className="text-[8px] text-slate-400 mt-1">(1試合平均 {runsPerGame})</p></div>
                        <div><p className={labelStyle}>失点</p><p className={valueStyle}>{totalRunsAllowed}</p><p className="text-[8px] text-slate-400 mt-1">(1試合平均 {allowedPerGame})</p></div>
                    </div>
                    <div className="grid grid-cols-6 gap-x-1 gap-y-4 text-center items-end border-b-2 border-dotted border-slate-300 pb-4 mb-4">
                        <div><p className={labelStyle}>打率</p><p className="text-lg font-bold text-[#0b1c3a]">{tAVG}</p></div>
                        <div><p className={labelStyle}>出塁率</p><p className="text-lg font-bold text-[#0b1c3a]">{tOBP}</p></div>
                        <div><p className={labelStyle}>長打率</p><p className="text-lg font-bold text-[#0b1c3a]">{tSLG}</p></div>
                        <div><p className={labelStyle}>OPS</p><p className="text-lg font-bold text-[#0b1c3a]">{tOPS}</p></div>
                        <div><p className={labelStyle}>得点圏<br/>打率</p><p className="text-lg font-bold text-[#0b1c3a]">-</p></div>
                        <div><p className={labelStyle}>守備率</p><p className="text-lg font-bold text-[#0b1c3a]">-</p></div>
                    </div>
                    <div className="grid grid-cols-6 gap-x-1 gap-y-4 text-center items-end">
                        <div><p className={labelStyle}>防御率</p><p className="text-lg font-bold text-[#0b1c3a]">{tERA}</p></div>
                        <div><p className={labelStyle}>WHIP</p><p className="text-lg font-bold text-[#0b1c3a]">{tWHIP}</p></div>
                        <div><p className={labelStyle}>奪三振率</p><p className="text-lg font-bold text-[#0b1c3a]">{kPer9}</p></div>
                        <div><p className={labelStyle}>与四球率</p><p className="text-lg font-bold text-[#0b1c3a]">{bbPer9}</p></div>
                        <div><p className={labelStyle}>失策数</p><p className="text-lg font-bold text-[#0b1c3a]">{tErrors}</p></div>
                        <div><p className={labelStyle}>失策率</p><p className="text-lg font-bold text-[#0b1c3a]">-</p></div>
                    </div>
                </div>

                <div className={`lg:col-span-3 ${cardStyle}`}>
                    <div className="flex justify-between items-end mb-4 border-l-4 border-[#0b1c3a] pl-2">
                        <h3 className="text-xs font-bold text-slate-700">最近の試合結果</h3>
                        <span className="text-[10px] text-blue-600 cursor-pointer hover:underline" onClick={() => setShowAllGames(!showAllGames)}>
                            {showAllGames ? '閉じる' : 'すべて見る'}
                        </span>
                    </div>
                    <div className="overflow-y-auto max-h-[350px] hide-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead><tr><th className={thStyle}>日付</th><th className={thStyle}>対戦相手</th><th className={thStyle}>結果</th><th className={thStyle}>スコア</th></tr></thead>
                            <tbody>
                                {(showAllGames ? targetGames : targetGames.slice(0, 5)).map((g, i) => {
                                    let resMark = '-', resColor = 'text-slate-400';
                                    if (g.status === '試合終了' || g.my_score !== null) {
                                        if (g.my_score > g.op_score) { resMark = '○'; resColor = 'text-green-600 font-bold'; }
                                        else if (g.my_score < g.op_score) { resMark = '●'; resColor = 'text-red-600 font-bold'; }
                                        else { resMark = '△'; resColor = 'text-slate-600 font-bold'; }
                                    }
                                    return (
                                        <tr key={i}>
                                            <td className={`${tdStyle} font-normal text-slate-500`}>{g.date.substring(5).replace('-','/')}</td>
                                            <td className={`${tdStyle} text-left truncate max-w-[80px]`}>{g.opponent}</td>
                                            <td className={`${tdStyle} ${resColor}`}>{resMark}</td>
                                            <td className={`${tdStyle} tracking-widest`}>{g.my_score !== null ? `${g.my_score} - ${g.op_score}` : '-'}</td>
                                        </tr>
                                    );
                                })}
                                {targetGames.length === 0 && <tr><td colSpan="4" className="text-center py-8 text-xs text-slate-400">該当期間の試合がありません</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={`lg:col-span-4 ${cardStyle}`}>
                    <h3 className="text-xs font-bold text-slate-700 mb-2 border-l-4 border-[#0b1c3a] pl-2">月別成績推移</h3>
                    <div className="h-56 w-full mt-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart data={monthlyData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} domain={[0, 100]} />
                                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '4px' }} />
                                <Legend wrapperStyle={{ fontSize: '9px', fontWeight: 'bold' }} verticalAlign="top" height={20} />
                                <Bar yAxisId="left" dataKey="得点" fill="#0b1c3a" name="得点 (左軸)" barSize={10} />
                                <Bar yAxisId="left" dataKey="失点" fill="#ef4444" name="失点 (左軸)" barSize={10} />
                                <Line yAxisId="right" type="monotone" dataKey="勝率" stroke="#2563eb" name="勝率 (右軸)" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <div className={cardStyle}>
                    <h3 className="text-xs font-bold text-slate-700 mb-2 border-l-4 border-[#0b1c3a] pl-2 flex items-center gap-2">
                        チーム打撃成績 
                        <span className="text-[9px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {filterMode === 'year' ? `${selectedYear}年度` : `${startDate || '設定なし'} 〜 ${endDate || '設定なし'}`}
                        </span>
                    </h3>
                    <div className="overflow-x-auto hide-scrollbar mt-3">
                        <table className="w-full border-collapse">
                            <thead><tr><th className={thStyle}>打率</th><th className={thStyle}>出塁率</th><th className={thStyle}>長打率</th><th className={thStyle}>OPS</th><th className={thStyle}>得点圏打率</th><th className={thStyle}>本塁打</th><th className={thStyle}>盗塁</th><th className={thStyle}>盗塁成功率</th><th className={thStyle}>犠打</th><th className={thStyle}>犠飛</th></tr></thead>
                            <tbody><tr><td className={tdStyle}>{tAVG}</td><td className={tdStyle}>{tOBP}</td><td className={tdStyle}>{tSLG}</td><td className={tdStyle}>{tOPS}</td><td className={tdStyle}>-</td><td className={tdStyle}>{tHR}</td><td className={tdStyle}>{tSB}</td><td className={tdStyle}>{tSBPct}</td><td className={tdStyle}>{tSacB}</td><td className={tdStyle}>{tSacF}</td></tr></tbody>
                        </table>
                    </div>
                </div>
                <div className={cardStyle}>
                    <h3 className="text-xs font-bold text-slate-700 mb-2 border-l-4 border-[#0b1c3a] pl-2 flex items-center gap-2">
                        チーム投手成績
                        <span className="text-[9px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            {filterMode === 'year' ? `${selectedYear}年度` : `${startDate || '設定なし'} 〜 ${endDate || '設定なし'}`}
                        </span>
                    </h3>
                    <div className="overflow-x-auto hide-scrollbar mt-3">
                        <table className="w-full border-collapse">
                            <thead><tr><th className={thStyle}>防御率</th><th className={thStyle}>WHIP</th><th className={thStyle}>奪三振率</th><th className={thStyle}>与四球率</th><th className={thStyle}>被打率</th><th className={thStyle}>完封数</th><th className={thStyle}>完投数</th></tr></thead>
                            <tbody><tr><td className={tdStyle}>{tERA}</td><td className={tdStyle}>{tWHIP}</td><td className={tdStyle}>{kPer9}</td><td className={tdStyle}>{bbPer9}</td><td className={tdStyle}>{tBAA}</td><td className={tdStyle}>{pSHO}</td><td className={tdStyle}>{pCG}</td></tr></tbody>
                        </table>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className={`lg:col-span-4 ${cardStyle}`}>
                    <h3 className="text-xs font-bold text-slate-700 mb-4 border-l-4 border-[#0b1c3a] pl-2">打撃結果内訳</h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={batResultData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} width={60} />
                                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{fontSize: '10px'}}/>
                                <Bar dataKey="value" barSize={8}>
                                    {batResultData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className={`lg:col-span-3 ${cardStyle}`}>
                    <h3 className="text-xs font-bold text-slate-700 mb-2 border-l-4 border-[#0b1c3a] pl-2">凡退内訳</h3>
                    <ul className="text-[10px] space-y-2 mt-4 text-slate-600">
                        <li className="flex justify-between border-b border-dotted border-slate-300 pb-2"><span>三振</span><span className="font-bold text-slate-800">{tSO_bat}</span></li>
                        <li className="flex justify-between border-b border-dotted border-slate-300 pb-2 pt-1"><span>フライアウト</span><span className="font-bold text-slate-800">{tFO}</span></li>
                        <li className="flex justify-between border-b border-dotted border-slate-300 pb-2 pt-1"><span>ゴロアウト</span><span className="font-bold text-slate-800">{tGO}</span></li>
                        <li className="flex justify-between mt-2 pt-2 border-t border-slate-400"><span>凡退合計</span><span className="font-bold text-[#0b1c3a] text-xs">{tSO_bat + tFO + tGO}</span></li>
                    </ul>
                </div>

                <div className={`lg:col-span-5 ${cardStyle}`}>
                    <div className="flex justify-between items-center mb-4 border-l-4 border-[#0b1c3a] pl-2">
                        <h3 className="text-xs font-bold text-slate-700">ポジション別失策数</h3>
                        <span className="text-[10px] font-bold text-slate-500">総失策数: <span className="text-base text-red-600">{tErrors}</span></span>
                    </div>
                    <table className="w-full border-collapse mt-4">
                        <thead><tr><th className={thStyle}>投</th><th className={thStyle}>捕</th><th className={thStyle}>一</th><th className={thStyle}>二</th><th className={thStyle}>三</th><th className={thStyle}>遊</th><th className={thStyle}>左</th><th className={thStyle}>中</th><th className={thStyle}>右</th></tr></thead>
                        <tbody><tr>
                            <td className={tdStyle}>{errByPos['投']}</td><td className={tdStyle}>{errByPos['捕']}</td><td className={tdStyle}>{errByPos['一']}</td>
                            <td className={tdStyle}>{errByPos['二']}</td><td className={tdStyle}>{errByPos['三']}</td><td className={tdStyle}>{errByPos['遊']}</td>
                            <td className={tdStyle}>{errByPos['左']}</td><td className={tdStyle}>{errByPos['中']}</td><td className={tdStyle}>{errByPos['右']}</td>
                        </tr></tbody>
                    </table>
                </div>

                <div className={`lg:col-span-12 ${cardStyle}`}>
                    <div className="flex justify-between items-end mb-4 border-l-4 border-[#0b1c3a] pl-2">
                        <h3 className="text-xs font-bold text-slate-700">チームランキング</h3>
                        <span className="text-[10px] text-blue-600 cursor-pointer hover:underline" onClick={() => setShowAllRankings(!showAllRankings)}>
                            {showAllRankings ? '閉じる' : 'すべて見る'}
                        </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
                        <div>
                            <p className="text-[10px] font-bold text-center bg-slate-100 py-1.5 mb-2">打率</p>
                            <ul className="text-[10px] space-y-2 h-48 overflow-y-auto hide-scrollbar">
                                {(showAllRankings ? avgRanking : avgRanking.slice(0, 5)).map((r, i) => (
                                    <li key={i} className="flex justify-between border-b border-dotted border-slate-300 pb-1.5">
                                        <span className="text-slate-500 w-4 font-bold">{i+1}</span>
                                        <span className={`font-bold flex-1 truncate ${r.isRetired ? 'text-slate-400 font-normal' : 'text-slate-700'}`}>{r.name}</span>
                                        <span className="font-bold text-sm text-[#0b1c3a]">{r.text}</span>
                                    </li>
                                ))}
                                {avgRanking.length === 0 && <li className="text-center text-slate-400 py-4">データなし</li>}
                            </ul>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-center bg-slate-100 py-1.5 mb-2">本塁打</p>
                            <ul className="text-[10px] space-y-2 h-48 overflow-y-auto hide-scrollbar">
                                {(showAllRankings ? hrRanking : hrRanking.slice(0, 5)).map((r, i) => (
                                    <li key={i} className="flex justify-between border-b border-dotted border-slate-300 pb-1.5">
                                        <span className="text-slate-500 w-4 font-bold">{i+1}</span>
                                        <span className={`font-bold flex-1 truncate ${r.isRetired ? 'text-slate-400 font-normal' : 'text-slate-700'}`}>{r.name}</span>
                                        <span className="font-bold text-sm text-[#0b1c3a]">{r.text}</span>
                                    </li>
                                ))}
                                {hrRanking.length === 0 && <li className="text-center text-slate-400 py-4">データなし</li>}
                            </ul>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-center bg-slate-100 py-1.5 mb-2">防御率 (投手)</p>
                            <ul className="text-[10px] space-y-2 h-48 overflow-y-auto hide-scrollbar">
                                {(showAllRankings ? eraRanking : eraRanking.slice(0, 5)).map((r, i) => (
                                    <li key={i} className="flex justify-between border-b border-dotted border-slate-300 pb-1.5">
                                        <span className="text-slate-500 w-4 font-bold">{i+1}</span>
                                        <span className={`font-bold flex-1 truncate ${r.isRetired ? 'text-slate-400 font-normal' : 'text-slate-700'}`}>{r.name}</span>
                                        <span className="font-bold text-sm text-[#0b1c3a]">{r.text}</span>
                                    </li>
                                ))}
                                {eraRanking.length === 0 && <li className="text-center text-slate-400 py-4">データなし</li>}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}