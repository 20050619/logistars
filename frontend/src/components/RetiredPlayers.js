import React, { useState, useMemo } from 'react';

export default function RetiredPlayers({ players = [], battingResults = [], pitchingResults = [], games = [] }) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 退団者のみ抽出し、退団日が新しい順に並べる
    const retiredPlayers = useMemo(() => {
        return players
            .filter(p => p.retirementDate && new Date(p.retirementDate) <= today)
            .sort((a, b) => new Date(b.retirementDate) - new Date(a.retirementDate));
    }, [players]);

    const [selectedPlayer, setSelectedPlayer] = useState(null);
    const [activeTab, setActiveTab] = useState('batting');

    // 初回レンダリング時に最初の選手を選択
    React.useEffect(() => {
        if (retiredPlayers.length > 0 && !selectedPlayer) {
            setSelectedPlayer(retiredPlayers[0]);
        }
    }, [retiredPlayers, selectedPlayer]);

    // 通算打撃成績の計算に「試合数 (g)」を追加
    const getBattingStats = (pId) => {
        let g = 0, pa = 0, ab = 0, h = 0, d2 = 0, d3 = 0, hr = 0, rbi = 0, r = 0, bb = 0, k = 0, sb = 0;
        battingResults.forEach(res => {
            const resId = String(typeof res.player === 'object' ? res.player.id : (res.player || res.batter));
            if (resId === String(pId)) {
                g++; // 試合数をカウント
                pa += Number(res.plate_appearances || 0);
                ab += Number(res.at_bats || 0);
                h += Number(res.hits || 0);
                d2 += Number(res.doubles || 0);
                d3 += Number(res.triples || 0);
                hr += Number(res.home_runs || 0);
                rbi += Number(res.rbi || 0);
                r += Number(res.runs || 0);
                bb += Number(res.walks || 0) + Number(res.hit_by_pitch || 0);
                k += Number(res.strikeouts || 0);
                sb += Number(res.steals || 0);
            }
        });
        const avg = ab > 0 ? (h / ab).toFixed(3).replace(/^0/, '') : '.000';
        const obp = pa > 0 ? ((h + bb) / pa).toFixed(3).replace(/^0/, '') : '.000';
        const slg = ab > 0 ? (((h - d2 - d3 - hr) + d2 * 2 + d3 * 3 + hr * 4) / ab).toFixed(3).replace(/^0/, '') : '.000';
        const ops = (parseFloat(obp) + parseFloat(slg)).toFixed(3).replace(/^0/, '');
        return { games: g, pa, ab, h, d2, d3, hr, rbi, r, bb, k, sb, avg, obp, slg, ops };
    };

    // 通算投手成績の計算
    const getPitchingStats = (pId) => {
        let outs = 0, er = 0, r = 0, h = 0, hr = 0, bb = 0, k = 0, w = 0, l = 0, sv = 0, hld = 0, g = 0;
        pitchingResults.forEach(res => {
            const resId = String(typeof res.player === 'object' ? res.player.id : (res.player || res.pitcher));
            if (resId === String(pId)) {
                g++;
                const ip = Number(res.innings_pitched || res.ip || 0);
                outs += Math.floor(ip) * 3 + Math.round((ip % 1) * 10);
                er += Number(res.earned_runs || 0);
                r += Number(res.runs_allowed || 0);
                h += Number(res.hits_allowed || 0) + Number(res.hits_allowed_right || 0) + Number(res.hits_allowed_left || 0);
                hr += Number(res.home_runs_allowed || 0);
                bb += Number(res.walks_allowed || 0) + Number(res.walks_allowed_right || 0) + Number(res.walks_allowed_left || 0);
                k += Number(res.strikeouts || 0) + Number(res.strikeouts_right || 0) + Number(res.strikeouts_left || 0);
                w += Number(res.wins || 0);
                l += Number(res.losses || 0);
                sv += Number(res.saves || 0);
                hld += Number(res.holds || 0);
            }
        });
        const era = outs > 0 ? ((er * 27) / outs).toFixed(2) : '0.00';
        const whip = outs > 0 ? (((h + bb) * 3) / outs).toFixed(2) : '0.00';
        const ipStr = outs % 3 === 0 ? String(outs / 3) : `${Math.floor(outs / 3)}.${outs % 3}`;
        return { games: g, outs, ip: ipStr, er, r, h, hr, bb, k, w, l, sv, hld, era, whip };
    };

    if (retiredPlayers.length === 0) {
        return (
            <div className="w-full pb-20 font-sans bg-slate-50 min-h-screen">
                <div className="bg-slate-800 text-white overflow-hidden shadow-md border-b border-slate-600">
                    <div className="px-4 md:px-6 py-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                        <h2 className="text-xl md:text-2xl font-black tracking-widest flex items-center gap-2"><span>🎓</span> 退団選手記録</h2>
                    </div>
                </div>
                <div className="p-12 text-center text-slate-500 font-bold mt-10">現在、退団登録された選手はいません。</div>
            </div>
        );
    }

    const bStats = selectedPlayer ? getBattingStats(selectedPlayer.id) : null;
    const pStats = selectedPlayer ? getPitchingStats(selectedPlayer.id) : null;

    return (
        <div className="w-full pb-20 font-sans bg-slate-50 min-h-screen">
            <div className="bg-slate-800 text-white overflow-hidden shadow-md border-b border-slate-600">
                <div className="px-4 md:px-6 py-6 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-slate-500 rounded-full mix-blend-screen filter blur-[80px] opacity-20 pointer-events-none"></div>
                    <h2 className="text-xl md:text-2xl font-black tracking-widest flex items-center gap-3 relative z-10">
                        <span>🎓</span> 退団選手記録 <span className="text-xs font-normal text-slate-300 ml-2">(歴代記録)</span>
                    </h2>
                    <p className="text-[10px] text-slate-300 mt-2 relative z-10">チームに貢献した退団選手の通算成績や記録を振り返ります</p>
                </div>
            </div>

            <div className="p-4 md:p-6 flex flex-col lg:flex-row gap-6">
                
                {/* 退団者リスト */}
                <div className="w-full lg:w-1/3 xl:w-1/4">
                    <h3 className="text-sm font-bold text-slate-700 mb-3 border-l-4 border-slate-800 pl-2">退団選手一覧</h3>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
                        <div className="overflow-y-auto flex-1 p-2 space-y-2 hide-scrollbar">
                            {retiredPlayers.map(p => (
                                <div 
                                    key={p.id} 
                                    onClick={() => setSelectedPlayer(p)}
                                    className={`p-3 rounded-lg cursor-pointer transition-all border flex gap-3 items-center ${selectedPlayer?.id === p.id ? 'bg-slate-800 text-white border-slate-800 shadow-md transform scale-[1.02]' : 'bg-white hover:bg-slate-50 border-slate-200'}`}
                                >
                                    <div className={`w-10 h-10 rounded-full overflow-hidden border-2 flex items-center justify-center shrink-0 ${selectedPlayer?.id === p.id ? 'border-slate-500 bg-slate-700' : 'border-slate-200 bg-slate-100'}`}>
                                        {p.photo ? <img src={p.photo} alt="face" className="w-full h-full object-cover" /> : <span className="text-lg">👤</span>}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="font-black text-sm">{p.name}</span>
                                        <span className={`text-[9px] font-bold mt-0.5 ${selectedPlayer?.id === p.id ? 'text-slate-300' : 'text-slate-500'}`}>
                                            退団日: {p.retirementDate.replace(/-/g, '/')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 詳細・通算成績エリア */}
                <div className="w-full lg:w-2/3 xl:w-3/4 flex flex-col gap-6">
                    {selectedPlayer && (
                        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6 relative overflow-hidden animate-fade-in">
                            <div className="absolute -top-10 -right-10 w-40 h-40 bg-slate-100 rounded-full blur-3xl"></div>
                            
                            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start border-b border-dashed border-slate-200 pb-6 relative z-10">
                                <div className="w-32 h-32 rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm bg-slate-50 flex items-center justify-center shrink-0">
                                    {selectedPlayer.photo ? <img src={selectedPlayer.photo} alt="face" className="w-full h-full object-cover" /> : <span className="text-5xl text-slate-300">👤</span>}
                                </div>
                                <div className="flex-1 text-center sm:text-left w-full">
                                    <div className="bg-slate-800 text-white px-3 py-1 rounded text-[10px] font-bold inline-block mb-3">
                                        最終所属: {selectedPlayer.retirementDate.substring(0, 4)}年
                                    </div>
                                    <h2 className="text-3xl font-black text-slate-800 mb-2">{selectedPlayer.name} <span className="text-xl text-slate-400 font-normal">#{selectedPlayer.number || '-'}</span></h2>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs font-bold text-slate-500 mb-4">
                                        <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{selectedPlayer.position}</span>
                                        <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{selectedPlayer.batting_hand}</span>
                                        <span className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{selectedPlayer.height || '-'}cm / {selectedPlayer.weight || '-'}kg</span>
                                    </div>
                                    <p className="text-[10px] text-slate-400">退団日: {selectedPlayer.retirementDate.replace(/-/g, '/')} （システム登録ID: {selectedPlayer.id}）</p>
                                </div>
                            </div>

                            <div className="pt-6 relative z-10">
                                <div className="flex gap-4 border-b border-slate-300 mb-6">
                                    <button onClick={() => setActiveTab('batting')} className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'batting' ? 'border-b-4 border-slate-800 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>通算 打撃成績</button>
                                    <button onClick={() => setActiveTab('pitching')} className={`pb-2 text-sm font-bold transition-colors ${activeTab === 'pitching' ? 'border-b-4 border-slate-800 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}>通算 投手成績</button>
                                </div>

                                {activeTab === 'batting' && (
                                    <div className="animate-fade-in">
                                        <div className="grid grid-cols-2 md:grid-cols-7 gap-y-6 gap-x-2 text-center mb-6">
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算打率</p><p className="text-3xl font-black text-slate-800">{bStats.avg}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算試合</p><p className="text-3xl font-black text-slate-700">{bStats.games}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算打席</p><p className="text-3xl font-black text-slate-700">{bStats.pa}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算安打</p><p className="text-3xl font-black text-slate-700">{bStats.h}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算本塁打</p><p className="text-3xl font-black text-slate-700">{bStats.hr}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算打点</p><p className="text-3xl font-black text-slate-700">{bStats.rbi}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算OPS</p><p className="text-3xl font-black text-slate-800">{bStats.ops}</p></div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-4 md:grid-cols-8 gap-y-4 gap-x-2 text-center">
                                            <div><p className="text-[9px] text-slate-500">打数</p><p className="text-sm font-bold text-slate-700">{bStats.ab}</p></div>
                                            <div><p className="text-[9px] text-slate-500">得点</p><p className="text-sm font-bold text-slate-700">{bStats.r}</p></div>
                                            <div><p className="text-[9px] text-slate-500">二塁打</p><p className="text-sm font-bold text-slate-700">{bStats.d2}</p></div>
                                            <div><p className="text-[9px] text-slate-500">三塁打</p><p className="text-sm font-bold text-slate-700">{bStats.d3}</p></div>
                                            <div><p className="text-[9px] text-slate-500">四死球</p><p className="text-sm font-bold text-slate-700">{bStats.bb}</p></div>
                                            <div><p className="text-[9px] text-slate-500">三振</p><p className="text-sm font-bold text-slate-700">{bStats.k}</p></div>
                                            <div><p className="text-[9px] text-slate-500">盗塁</p><p className="text-sm font-bold text-slate-700">{bStats.sb}</p></div>
                                            <div><p className="text-[9px] text-slate-500">出塁率</p><p className="text-sm font-bold text-slate-700">{bStats.obp}</p></div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'pitching' && (
                                    <div className="animate-fade-in">
                                        <div className="grid grid-cols-2 md:grid-cols-6 gap-y-6 gap-x-2 text-center mb-6">
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算防御率</p><p className="text-3xl font-black text-slate-800">{pStats.era}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算登板</p><p className="text-3xl font-black text-slate-700">{pStats.games}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算投球回</p><p className="text-3xl font-black text-slate-700">{pStats.ip}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算勝利</p><p className="text-3xl font-black text-slate-700">{pStats.w}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算奪三振</p><p className="text-3xl font-black text-slate-700">{pStats.k}</p></div>
                                            <div><p className="text-[10px] text-slate-400 mb-1">通算WHIP</p><p className="text-3xl font-black text-slate-800">{pStats.whip}</p></div>
                                        </div>
                                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-4 md:grid-cols-8 gap-y-4 gap-x-2 text-center">
                                            <div><p className="text-[9px] text-slate-500">敗戦</p><p className="text-sm font-bold text-slate-700">{pStats.l}</p></div>
                                            <div><p className="text-[9px] text-slate-500">セーブ</p><p className="text-sm font-bold text-slate-700">{pStats.sv}</p></div>
                                            <div><p className="text-[9px] text-slate-500">ホールド</p><p className="text-sm font-bold text-slate-700">{pStats.hld}</p></div>
                                            <div><p className="text-[9px] text-slate-500">被安打</p><p className="text-sm font-bold text-slate-700">{pStats.h}</p></div>
                                            <div><p className="text-[9px] text-slate-500">被本塁打</p><p className="text-sm font-bold text-slate-700">{pStats.hr}</p></div>
                                            <div><p className="text-[9px] text-slate-500">与四死球</p><p className="text-sm font-bold text-slate-700">{pStats.bb}</p></div>
                                            <div><p className="text-[9px] text-slate-500">失点</p><p className="text-sm font-bold text-slate-700">{pStats.r}</p></div>
                                            <div><p className="text-[9px] text-slate-500">自責点</p><p className="text-sm font-bold text-slate-700">{pStats.er}</p></div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}