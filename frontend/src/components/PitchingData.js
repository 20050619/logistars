import React, { useState, useMemo, useEffect } from 'react';

export default function PitchingData({ players = [], allResults = [], pitchRecords = [], games = [], userRole = 'admin', linkedPlayerId = null, currentPlayer = null }) {
    
    // ★徹底的な選手判定
    const roleStr = String(userRole || '').trim().toLowerCase();
    const isPlayerRole = roleStr === 'player' || roleStr === '一般選手' || roleStr === '選手';

    // ★新機能：3つの表示モード（現役のみ / 含む / 退団者のみ）
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

    // ★最強の現役チェック機能
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

    // ★新機能：表示モードに従って選手を含めるか判定
    const shouldIncludePlayer = (playerIdStr) => {
        const active = checkIsActive(playerIdStr);
        if (playersMode === 'active_only') return active;
        if (playersMode === 'retired_only') return !active;
        return true; // include_retired
    };

    const [activeTab, setActiveTab] = useState(() => {
        if (isPlayerRole && currentPlayer && currentPlayer.position && currentPlayer.position.includes('投手')) {
            return 'individual';
        }
        return 'team';
    }); 
    
    const [selectedPlayerId, setSelectedPlayerId] = useState(() => {
        if (isPlayerRole && currentPlayer && currentPlayer.position && currentPlayer.position.includes('投手')) {
            return String(currentPlayer.id);
        }
        const activePitchers = players.filter(p => p.position && p.position.includes('投手') && shouldIncludePlayer(p.id));
        return activePitchers.length > 0 ? String(activePitchers[0].id) : '';
    });

    useEffect(() => {
        if (selectedPlayerId && shouldIncludePlayer(selectedPlayerId)) return;
        
        if (isPlayerRole && currentPlayer && currentPlayer.position && currentPlayer.position.includes('投手')) {
            setSelectedPlayerId(String(currentPlayer.id));
        } else {
            const activePitchers = players.filter(p => p.position && p.position.includes('投手') && shouldIncludePlayer(p.id));
            if (activePitchers.length > 0) {
                setSelectedPlayerId(String(activePitchers[0].id));
            } else {
                setSelectedPlayerId('');
            }
        }
    }, [players, selectedPlayerId, isPlayerRole, currentPlayer, playersMode]);

    const [sortKey, setSortKey] = useState('era');
    const [activeSubTab, setActiveSubTab] = useState('summary');
    const [showAllGameLogsTeam, setShowAllGameLogsTeam] = useState(false);
    const [showAllGameLogsIndiv, setShowAllGameLogsIndiv] = useState(false);
    const [rankingPage, setRankingPage] = useState(1);

    const [filterMode, setFilterMode] = useState('year'); 
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const [localLogs, setLocalLogs] = useState(() => {
        if (typeof window === 'undefined') return [];
        try { return JSON.parse(localStorage.getItem('logistars_mobile_logs')) || []; } 
        catch (e) { return []; }
    });

    useEffect(() => {
        const fetchLatestLogs = () => {
            try {
                const savedString = localStorage.getItem('logistars_mobile_logs');
                if (savedString) {
                    const parsed = JSON.parse(savedString);
                    setLocalLogs(prev => JSON.stringify(prev) !== savedString ? parsed : prev);
                }
            } catch (e) {}
        };
        fetchLatestLogs();
        const intervalId = setInterval(fetchLatestLogs, 1000);
        return () => clearInterval(intervalId);
    }, []);

    const getSeasonYear = (dateString) => {
        const seasonStartMonth = typeof window !== 'undefined' ? parseInt(localStorage.getItem('logistars_season_start_month') || '4', 10) : 4;
        const seasonStartDay = typeof window !== 'undefined' ? parseInt(localStorage.getItem('logistars_season_start_day') || '1', 10) : 1;
        const d = new Date(dateString);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const day = d.getDate();
        if (m < seasonStartMonth || (m === seasonStartMonth && day < seasonStartDay)) {
            return y - 1;
        }
        return y;
    };

    const availableYears = useMemo(() => {
        const years = new Set();
        games.forEach(g => {
            if (g.date) years.add(getSeasonYear(g.date));
        });
        const sortedYears = Array.from(years).sort((a, b) => b - a); 
        return sortedYears.length === 0 ? [getSeasonYear(new Date())] : sortedYears;
    }, [games]);

    const [selectedYear, setSelectedYear] = useState(availableYears[0]);
    useEffect(() => { if (!availableYears.includes(selectedYear)) setSelectedYear(availableYears[0]); }, [availableYears, selectedYear]);

    const filteredGames = useMemo(() => {
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

    const getSafeId = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') return String(val.id || val.pk || '').trim();
        return String(val).trim();
    };

    const resolveId = (val) => {
        if (val === null || val === undefined) return '';
        if (typeof val === 'object') {
            if (val.id !== undefined) return String(val.id).trim();
            if (val.pitcherId !== undefined) return String(val.pitcherId).trim();
            if (val.playerId !== undefined) return String(val.playerId).trim();
            if (val.name) val = val.name;
        }
        const str = String(val).trim();
        if (!str) return '';
        
        let m = players.find(p => String(p.id) === str) || players.find(p => String(p.number) === str);
        if (m) return String(m.id);
        
        const cleanStr = str.replace(/[\s\u3000]+/g, '');
        m = players.find(p => p.name && p.name.replace(/[\s\u3000]+/g, '') === cleanStr);
        if (m) return String(m.id);
        
        const nm = str.match(/#(\d+)/);
        if (nm) { m = players.find(p => String(p.number) === nm[1]); if (m) return String(m.id); }
        return str;
    };

    const getNum = (obj, ...keys) => {
        if (!obj) return 0;
        for (const k of keys) {
            if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') {
                const n = Number(obj[k]);
                if (!isNaN(n)) return n;
            }
        }
        return 0;
    };

    const ipToOuts = (ip) => {
        if (!ip) return 0;
        const num = Number(ip);
        if (isNaN(num)) return 0;
        const intPart = Math.floor(num);
        const decPart = Math.round((num - intPart) * 10);
        return intPart * 3 + decPart;
    };
    const outsToIp = (outs) => {
        if (!outs) return '0.0';
        const intPart = Math.floor(outs / 3);
        const rem = outs % 3;
        return rem === 0 ? String(intPart) : `${intPart}.${rem}`;
    };

    // ★修正：大元のデータから新モードに従って除外・抽出
    const filteredResults = useMemo(() => {
        const gameIds = new Set(filteredGames.map(g => String(g.id)));
        return allResults.filter(r => {
            const gId = getSafeId(r.game || r.game_id || r.gameId);
            if (!gId || !gameIds.has(gId)) return false;
            
            const pId = resolveId(r.player || r.pitcher);
            return shouldIncludePlayer(pId);
        });
    }, [allResults, filteredGames, players, playersMode]);

    const filteredLocalPitchingLogs = useMemo(() => {
        const gameIds = new Set(filteredGames.map(g => String(g.id)));
        const finishedGames = filteredGames.filter(g => g.status === '試合終了' || g.status === 'finished' || g.score || g.my_score);
        
        const allLogs = [...pitchRecords, ...localLogs];
        const uniqueLogsMap = new Map();
        allLogs.forEach(log => { if (log.id) uniqueLogsMap.set(log.id, log); });
        const combinedLogs = Array.from(uniqueLogsMap.values());

        return combinedLogs
            .filter(log => log.type === 'pitching' || log.rawData?.pitchType || log.pitchType)
            .map(log => {
                let gId = getSafeId(log.game || log.gameId || log.game_id);
                const pId = resolveId(log.pitcherId || log.playerId || log.pitcher || log.player);
                if (!gId || gId === 'local' || !gameIds.has(gId)) {
                    if (finishedGames.length > 0) gId = String(finishedGames[0].id);
                }
                return { ...log, resolvedGameId: gId, resolvedPitcherId: pId };
            })
            .filter(log => log.resolvedGameId && gameIds.has(log.resolvedGameId))
            .map(log => {
                const rd = log.rawData || {};
                let rawPt = rd.pitchType || log.pitchType || '不明';
                let pt = String(rawPt).trim();
                if (pt === 'その他') pt = String(rd.pitchCustomPitch || log.pitchCustomPitch || 'その他').trim();

                return {
                    id: `local-${log.id || Math.random()}`,
                    game: log.resolvedGameId,
                    pitcher: log.resolvedPitcherId,
                    result: String(log.shortResult || log.result || rd.pitchResult || rd.outType || ''),
                    direction: String(log.direction || rd.pitchDirection || rd.batDirection || ''),
                    runner_state: String(rd.runnerState || log.runnerState || log.runner || 'ランナーなし'),
                    outs: String(rd.outs || log.outs || '0アウト'),
                    pitch_type: pt,
                    velocity: getNum(rd, 'pitchSpeed') || getNum(log, 'velocity', 'speed') || 0,
                    balls: getNum(rd, 'balls') || getNum(log, 'balls') || 0,
                    strikes: getNum(rd, 'strikes') || getNum(log, 'strikes') || 0,
                    runs: getNum(log, 'runs', 'r') || getNum(rd, 'runs', 'r') || 0,
                    earned_runs: getNum(log, 'earnedRuns', 'er', 'earned_runs') || getNum(rd, 'earnedRuns', 'er') || 0,
                    inning: getNum(rd, 'inning') || getNum(log, 'inning', 'inn') || 1
                };
            })
            .filter(log => {
                return shouldIncludePlayer(log.pitcher);
            });
    }, [localLogs, pitchRecords, filteredGames, players, playersMode]);

    const isRealPitches = filteredLocalPitchingLogs.length > 0;

    const baseStats = useMemo(() => {
        const agg = {};
        
        players.forEach(p => {
            if (p.position && p.position.includes('投手')) {
                const pId = String(p.id);
                agg[pId] = {
                    playerId: pId, games: 0, starts: 0, cg: 0, sho: 0, wins: 0, losses: 0, saves: 0, holds: 0,
                    outs: 0, bf: 0, ab: 0, hits: 0, hr: 0, walks: 0, hbp: 0, strikeouts: 0, runs: 0, earnedRuns: 0, wp: 0, qs: 0, 
                    maxVelocity: 0, sumVelocity: 0, veloCount: 0,
                    hits_right: 0, hits_left: 0, k_right: 0, k_left: 0, bb_right: 0, bb_left: 0, ab_right: 0, ab_left: 0,
                    uniqueGames: new Set(), pitchCount: 0
                };
            }
        });

        filteredResults.forEach(r => {
            const pId = resolveId(r.player || r.pitcher);
            if (!pId) return;

            if (!agg[pId]) {
                agg[pId] = { playerId: pId, games: 0, starts: 0, cg: 0, sho: 0, wins: 0, losses: 0, saves: 0, holds: 0, outs: 0, bf: 0, ab: 0, hits: 0, hr: 0, walks: 0, hbp: 0, strikeouts: 0, runs: 0, earnedRuns: 0, wp: 0, qs: 0, maxVelocity: 0, sumVelocity: 0, veloCount: 0, hits_right: 0, hits_left: 0, k_right: 0, k_left: 0, bb_right: 0, bb_left: 0, ab_right: 0, ab_left: 0, uniqueGames: new Set(), pitchCount: 0 };
            }
            
            const stat = agg[pId];
            const gId = getSafeId(r.game);
            if (gId) { stat.uniqueGames.add(gId); }
            
            stat.outs += ipToOuts(r.innings_pitched || r.ip);
            stat.pitchCount += getNum(r, 'pitch_count', 'pitchCount', '投球数');
            stat.wins += getNum(r, 'wins', 'w', '勝ち');
            stat.losses += getNum(r, 'losses', 'l', '負け');
            stat.saves += getNum(r, 'saves', 'sv', 'セーブ');
            stat.holds += getNum(r, 'holds', 'hld', 'ホールド');
            
            const hR = getNum(r, 'hits_allowed_right', '被安打右');
            const hL = getNum(r, 'hits_allowed_left', '被安打左');
            stat.hits += getNum(r, 'hits_allowed', 'hits', 'h') + hR + hL;
            stat.hits_right += hR; stat.hits_left += hL;

            const kR = getNum(r, 'strikeouts_right', '奪三振右');
            const kL = getNum(r, 'strikeouts_left', '奪三振左');
            stat.strikeouts += getNum(r, 'strikeouts', 'so', 'k') + kR + kL;
            stat.k_right += kR; stat.k_left += kL;

            const bbR = getNum(r, 'walks_allowed_right', '与四球右');
            const bbL = getNum(r, 'walks_allowed_left', '与四球左');
            stat.walks += getNum(r, 'walks_allowed', 'walks', 'bb') + bbR + bbL;
            stat.bb_right += bbR; stat.bb_left += bbL;

            const abR = getNum(r, 'at_bats_right', '打席右', '打数右');
            const abL = getNum(r, 'at_bats_left', '打席左', '打数左');
            stat.ab_right += abR; stat.ab_left += abL;
            stat.ab += getNum(r, 'at_bats', 'ab') + abR + abL;
            stat.bf += getNum(r, 'batters_faced', 'bf') + abR + abL + bbR + bbL;

            stat.hr += getNum(r, 'home_runs_allowed', 'hr', '被本塁打');
            stat.hbp += getNum(r, 'hit_by_pitch', 'hbp', '与死球右') + getNum(r, '与死球左');
            stat.runs += getNum(r, 'runs_allowed', 'runs', 'r', '失点');
            stat.earnedRuns += getNum(r, 'earned_runs', 'er', '自責点');
            stat.starts += getNum(r, 'games_started', 'gs', '先発');
            if (stat.starts > 0 && ipToOuts(r.innings_pitched || r.ip) >= 18 && getNum(r, 'earned_runs', 'er') <= 3) stat.qs += 1;
        });

        Object.values(agg).forEach(p => { p.games = p.uniqueGames.size; });
        return Object.values(agg);
    }, [filteredResults, players]);

    const teamTotal = useMemo(() => {
        const total = baseStats.reduce((acc, curr) => {
            ['outs','bf','ab','hits','hr','walks','hbp','strikeouts','runs','earnedRuns','wins','losses','saves','holds','qs','starts', 'hits_right','hits_left','k_right','k_left','bb_right','bb_left','ab_right','ab_left', 'pitchCount'].forEach(k => { acc[k] += curr[k] || 0; });
            if (curr.maxVelocity > acc.maxVelocity) acc.maxVelocity = curr.maxVelocity;
            acc.sumVelocity += curr.sumVelocity; acc.veloCount += curr.veloCount;
            return acc;
        }, { outs: 0, bf: 0, ab: 0, hits: 0, hr: 0, walks: 0, hbp: 0, strikeouts: 0, runs: 0, earnedRuns: 0, wins: 0, losses: 0, saves: 0, holds: 0, qs: 0, starts: 0, maxVelocity: 0, sumVelocity: 0, veloCount: 0, hits_right: 0, hits_left: 0, k_right: 0, k_left: 0, bb_right: 0, bb_left: 0, ab_right: 0, ab_left: 0, pitchCount: 0 });
        
        const allUniqueGames = new Set();
        filteredResults.forEach(r => { if(r.game) allUniqueGames.add(getSafeId(r.game)); });
        total.games = allUniqueGames.size;
        return total;
    }, [baseStats, filteredResults]);

    const calcEra = (er, outs) => outs > 0 ? ((er * 27) / outs).toFixed(2) : '0.00';
    const calcWhip = (h, bb, outs) => outs > 0 ? (((h + bb) * 3) / outs).toFixed(2) : '0.00';
    const calcK9 = (k, outs) => outs > 0 ? ((k * 27) / outs).toFixed(2) : '0.00';
    const calcBB9 = (bb, outs) => outs > 0 ? ((bb * 27) / outs).toFixed(2) : '0.00';
    const calcBAA = (h, bf, bb, hbp) => (bf - bb - hbp) > 0 ? (h / (bf - bb - hbp)).toFixed(3).replace(/^0/, '') : '.000';
    const calcAvg = (h, ab) => ab > 0 ? (h / ab).toFixed(3).replace(/^0/, '') : '.000';

    const teamEra = calcEra(teamTotal.earnedRuns, teamTotal.outs);
    const teamWhip = calcWhip(teamTotal.hits, teamTotal.walks, teamTotal.outs);
    const teamK9 = calcK9(teamTotal.strikeouts, teamTotal.outs);
    const teamBB9 = calcBB9(teamTotal.walks, teamTotal.outs);
    const teamBAA = calcBAA(teamTotal.hits, teamTotal.bf, teamTotal.walks, teamTotal.hbp);
    const teamIp = outsToIp(teamTotal.outs);
    const teamAvgVelo = teamTotal.veloCount > 0 ? (teamTotal.sumVelocity / teamTotal.veloCount).toFixed(1) : '-';
    const teamMaxVelo = teamTotal.maxVelocity > 0 ? teamTotal.maxVelocity.toFixed(1) : '-';

    // ★修正：新モードに従ってフィルタリングされたベースデータから各数値を算出
    const analyzedStats = useMemo(() => {
        if (baseStats.length === 0) return [];
        
        return baseStats
            .filter(stat => {
                if (!shouldIncludePlayer(stat.playerId)) return false;

                const pObj = players.find(p => String(p.id) === String(stat.playerId));
                const isRegisteredPitcher = pObj && pObj.position && pObj.position.includes('投手');
                if (stat.games === 0 && stat.outs === 0 && !isRegisteredPitcher) {
                    return false;
                }

                return true;
            })
            .map(stat => {
                const active = checkIsActive(stat.playerId);
                const playerObj = players.find(p => String(p.id) === String(stat.playerId));
                const player = playerObj ? { ...playerObj } : { name: '過去のデータ', number: '-' };
                
                if (!active) {
                    player.displayName = player.name.includes('(退団)') ? player.name : `${player.name} (退団)`;
                    player.isRetired = true;
                } else {
                    player.displayName = player.name;
                    player.isRetired = false;
                }

                return {
                    ...stat, player,
                    era: calcEra(stat.earnedRuns, stat.outs),
                    whip: calcWhip(stat.hits, stat.walks, stat.outs),
                    k9: calcK9(stat.strikeouts, stat.outs),
                    bb9: calcBB9(stat.walks, stat.outs),
                    baa: calcBAA(stat.hits, stat.bf, stat.walks, stat.hbp),
                    ip: outsToIp(stat.outs),
                    winPct: (stat.wins + stat.losses) > 0 ? (stat.wins / (stat.wins + stat.losses)).toFixed(3).replace(/^0/, '') : '.000',
                    qsPct: stat.starts > 0 ? ((stat.qs / stat.starts) * 100).toFixed(1) + '%' : '-'
                };
            }).sort((a, b) => {
                const valA = parseFloat(a[sortKey] || 0); const valB = parseFloat(b[sortKey] || 0);
                if (['era', 'whip', 'bb9', 'baa'].includes(sortKey)) {
                    if (a.outs === 0) return 1; if (b.outs === 0) return -1;
                    return valA - valB; 
                }
                return valB - valA; 
            });
    }, [baseStats, players, sortKey, playersMode]);

    const targetPitchLogs = useMemo(() => {
        const records = filteredLocalPitchingLogs;
        if (activeTab === 'individual' && selectedPlayerId) {
            return records.filter(ab => ab.pitcher === String(selectedPlayerId));
        }
        return records;
    }, [filteredLocalPitchingLogs, activeTab, selectedPlayerId]);

    const pitchTypeStats = useMemo(() => {
        const stats = {};
        targetPitchLogs.forEach(p => {
            let pt = String(p.pitch_type || '不明').trim();
            if (pt === '' || pt === 'undefined' || pt === 'null') pt = '不明';
            if (!stats[pt]) stats[pt] = { count: 0, hits: 0, hr: 0, k: 0, bb: 0, ab: 0, totalBases: 0 };
            
            stats[pt].count += 1;
            const res = String(p.result || '');
            const isWalk = ['四球', '死球', '敬遠'].some(v => res.includes(v));
            const isK = ['三振'].some(v => res.includes(v));
            
            if (isK) stats[pt].k += 1;
            if (isWalk) stats[pt].bb += 1;
            if (!isWalk && !res.includes('犠') && res && res !== '-') {
                stats[pt].ab += 1;
                if (['安打','二塁打','三塁打','本塁打','ヒット'].some(v=>res.includes(v))) stats[pt].hits += 1;
                if (res.includes('二塁打')) stats[pt].totalBases += 2;
                else if (res.includes('三塁打')) stats[pt].totalBases += 3;
                else if (res.includes('本塁打')) { stats[pt].totalBases += 4; stats[pt].hr += 1; }
                else if (res.includes('安打') || res.includes('ヒット')) stats[pt].totalBases += 1;
            }
        });
        const totalPitches = targetPitchLogs.length;
        const colors = ['#0c4a34', '#10b981', '#8b5cf6', '#3b82f6', '#f59e0b', '#94a3b8'];
        return Object.entries(stats)
            .map(([type, data], i) => {
                const slg = data.ab > 0 ? (data.totalBases / data.ab) : 0;
                const obp = (data.ab + data.bb) > 0 ? ((data.hits + data.bb) / (data.ab + data.bb)) : 0;
                return {
                    type, count: data.count, hits: data.hits, k: data.k, bb: data.bb, hr: data.hr,
                    pct: totalPitches > 0 ? ((data.count / totalPitches) * 100).toFixed(1) + '%' : '0.0%',
                    baa: data.ab > 0 ? (data.hits / data.ab).toFixed(3).replace(/^0/, '') : '.000',
                    slgAgainst: slg.toFixed(3).replace(/^0/, ''),
                    opsAgainst: (obp + slg).toFixed(3).replace(/^0/, ''),
                    whiff: data.count > 0 ? ((data.k / data.count) * 100).toFixed(1) + '%' : '0.0%',
                    color: colors[i % colors.length]
                };
            }).sort((a, b) => b.count - a.count);
    }, [targetPitchLogs]);

    const velocityStats = useMemo(() => {
        let v150=0, v140=0, v130=0, vUnder=0, total=0;
        let v150h=0, v150ab=0, v140h=0, v140ab=0, v130h=0, v130ab=0, vUnderh=0, vUnderab=0;
        
        targetPitchLogs.forEach(p => {
            const v = p.velocity;
            if (!v || v === 0) return;
            total++;
            const res = String(p.result || '');
            const isAb = !['四球','死球','犠'].some(x=>res.includes(x)) && res && res !== '-';
            const isHit = ['安打','二塁打','三塁打','本塁打','ヒット'].some(x=>res.includes(x));

            if (v >= 150) { v150++; if(isAb){ v150ab++; if(isHit) v150h++; } }
            else if (v >= 140) { v140++; if(isAb){ v140ab++; if(isHit) v140h++; } }
            else if (v >= 130) { v130++; if(isAb){ v130ab++; if(isHit) v130h++; } }
            else { vUnder++; if(isAb){ vUnderab++; if(isHit) vUnderh++; } }
        });

        return [
            { label: '150km/h以上', count: v150, pct: total>0?((v150/total)*100).toFixed(1)+'%':'0.0%', baa: calcAvg(v150h, v150ab), color: '#ef4444' },
            { label: '140〜149km/h', count: v140, pct: total>0?((v140/total)*100).toFixed(1)+'%':'0.0%', baa: calcAvg(v140h, v140ab), color: '#3b82f6' },
            { label: '130〜139km/h', count: v130, pct: total>0?((v130/total)*100).toFixed(1)+'%':'0.0%', baa: calcAvg(v130h, v130ab), color: '#10b981' },
            { label: '130km/h未満', count: vUnder, pct: total>0?((vUnder/total)*100).toFixed(1)+'%':'0.0%', baa: calcAvg(vUnderh, vUnderab), color: '#8b5cf6' }
        ];
    }, [targetPitchLogs]);

    const outStats = useMemo(() => {
        let k = 0, fly = 0, ground = 0, liner = 0, other = 0, total = 0, totalOuts = 0;
        targetPitchLogs.forEach(p => {
            const res = String(p.result || '');
            const isOut = ['内野ゴロ', '内野フライ', '外野フライ', '三振', '見逃し', '空振り', '犠牲フライ', '犠牲バント', '併殺打', 'ライナー', 'エラー', '守備妨害'].some(val => res.includes(val));
            if (!isOut) return;
            total++;
            if (['三振', '見逃し', '空振り'].some(val => res.includes(val))) { k++; totalOuts++; }
            else if (['フライ', '犠飛', '飛'].some(val => res.includes(val))) { fly++; totalOuts++; }
            else if (['ゴロ', '併殺', 'バント', '犠打'].some(val => res.includes(val))) { ground++; totalOuts++; if(res.includes('併殺')) totalOuts++; }
            else if (['ライナー', '直'].some(val => res.includes(val))) { liner++; totalOuts++; }
            else { other++; totalOuts++; }
        });
        return {
            k, fly, ground, liner, other, total, totalOuts,
            kPct: total > 0 ? ((k / total) * 100).toFixed(1) + '%' : '0.0%',
            flyPct: total > 0 ? ((fly / total) * 100).toFixed(1) + '%' : '0.0%',
            groundPct: total > 0 ? ((ground / total) * 100).toFixed(1) : '0.0%',
            linerPct: total > 0 ? ((liner / total) * 100).toFixed(1) : '0.0%'
        };
    }, [targetPitchLogs]);

    const runnerStats = useMemo(() => {
        const stats = { 'ランナーなし': {ab:0, h:0}, 'ランナー1塁': {ab:0, h:0}, 'ランナー2塁': {ab:0, h:0}, 'ランナー3塁': {ab:0, h:0}, '得点圏 (2塁/3塁)': {ab:0, h:0}, '満塁': {ab:0, h:0} };
        targetPitchLogs.forEach(p => {
            let state = String(p.runner_state || 'ランナーなし');
            const res = String(p.result || '');
            const isHit = ['安打', '二塁打', '三塁打', '本塁打', 'ヒット', 'バント安打', 'ツーベース', 'スリーベース'].some(v => res.includes(v));
            const isWalk = ['四球', '死球', '敬遠', '犠'].some(v => res.includes(v));

            if (stats[state]) {
                if (!isWalk && !res.includes('犠') && res && res !== '-') {
                    stats[state].ab++;
                    if(isHit) stats[state].h++;
                }
            }
            if (state.includes('2塁') || state.includes('3塁') || state === '満塁') {
                if (!isWalk && !res.includes('犠') && res && res !== '-') {
                    stats['得点圏 (2塁/3塁)'].ab++;
                    if(isHit) stats['得点圏 (2塁/3塁)'].h++;
                }
            }
        });
        return Object.entries(stats).filter(([k,v])=>v.ab>0).map(([state, data]) => ({ state, atBats: data.ab, hits: data.h, baa: calcAvg(data.h, data.ab) }));
    }, [targetPitchLogs]);

    const outCountStats = useMemo(() => {
        const stats = { '0アウト': {ab:0, h:0}, '1アウト': {ab:0, h:0}, '2アウト': {ab:0, h:0} };
        targetPitchLogs.forEach(p => {
            const rawO = p.outs || '';
            let outNum = rawO.replace(/[^0-2]/g, '');
            if (!outNum) return;
            let key = outNum + 'アウト';
            if (stats[key]) {
                const res = String(p.result || '');
                const isHit = ['安打','二塁打','三塁打','本塁打','ヒット'].some(v=>res.includes(v));
                const isAb = !['四球','死球','犠'].some(v=>res.includes(v)) && res && res !== '-';
                if (isAb) { stats[key].ab++; if(isHit) stats[key].h++; }
            }
        });
        return Object.entries(stats).filter(([k,v])=>v.ab>0).map(([k, v]) => ({ state: k, atBats: v.ab, hits: v.h, baa: calcAvg(v.h, v.ab) }));
    }, [targetPitchLogs]);

    const countStats = useMemo(() => {
        const stats = { '初球': {ab:0,h:0}, '0-1 / 1-0': {ab:0,h:0}, '1-1': {ab:0,h:0}, '追い込まれ (2ストライク)': {ab:0,h:0}, 'フルカウント': {ab:0,h:0} };
        targetPitchLogs.forEach(p => {
            const b = getNum(p, 'balls', 'b'); const s = getNum(p, 'strikes', 's');
            const res = String(p.result || '');
            if (!res || res === '-') return;
            const isHit = ['安打','二塁打','三塁打','本塁打','ヒット'].some(v=>res.includes(v));
            const isAb = !['四球','死球','犠'].some(v=>res.includes(v));
            
            let key = '初球';
            if (b===3 && s===2) key = 'フルカウント';
            else if (s === 2) key = '追い込まれ (2ストライク)';
            else if (b===1 && s===1) key = '1-1';
            else if ((b===1 && s===0) || (b===0 && s===1)) key = '0-1 / 1-0';
            else if (b===0 && s===0) key = '初球';

            if (isAb && stats[key]) { stats[key].ab += 1; if (isHit) stats[key].h += 1; }
        });
        return Object.entries(stats).filter(([k, v]) => v.ab > 0).map(([k, v]) => ({ count: k, atBats: v.ab, hits: v.h, baa: calcAvg(v.h, v.ab) }));
    }, [targetPitchLogs]);

    const inningStats = useMemo(() => {
        const stats = { '1回': {outs:0, er:0, h:0, k:0, bb:0}, '2回': {outs:0, er:0, h:0, k:0, bb:0}, '3回': {outs:0, er:0, h:0, k:0, bb:0}, '4回〜6回': {outs:0, er:0, h:0, k:0, bb:0}, '7回以上': {outs:0, er:0, h:0, k:0, bb:0} };
        targetPitchLogs.forEach(p => {
            const inn = getNum(p, 'inning') || 1;
            let key = '7回以上';
            if (inn === 1) key = '1回'; else if (inn === 2) key = '2回'; else if (inn === 3) key = '3回'; else if (inn >= 4 && inn <= 6) key = '4回〜6回';
            
            const res = String(p.result || '');
            if (res.includes('三振')) { stats[key].outs++; stats[key].k++; }
            else if (['ゴロ', 'フライ', '直', '飛'].some(v=>res.includes(v))) { stats[key].outs++; if(res.includes('併殺')) stats[key].outs++; }
            else if (['安打','二塁打','三塁打','本塁打','ヒット'].some(v=>res.includes(v))) stats[key].h++;
            else if (['四球','敬遠'].some(v=>res.includes(v))) stats[key].bb++;
            
            stats[key].er += getNum(p, 'earned_runs');
        });
        return Object.entries(stats).filter(([k,v])=>v.outs>0||v.h>0||v.bb>0).map(([inn, d]) => ({
            inning: inn, ip: outsToIp(d.outs), era: calcEra(d.er, d.outs), hits: d.h, k: d.k, walks: d.bb, baa: calcAvg(d.h, d.outs)
        }));
    }, [targetPitchLogs]);

    const pitchCountRangeStats = useMemo(() => {
        const ranges = [
            { label: '0〜20球', min: 0, max: 20, outs: 0, er: 0, h: 0, ab: 0 },
            { label: '21〜40球', min: 21, max: 40, outs: 0, er: 0, h: 0, ab: 0 },
            { label: '41〜60球', min: 41, max: 60, outs: 0, er: 0, h: 0, ab: 0 },
            { label: '61球〜', min: 61, max: 999, outs: 0, er: 0, h: 0, ab: 0 }
        ];
        const runningCounts = {};
        const sortedLogs = [...targetPitchLogs].sort((a,b) => a.id - b.id);
        
        sortedLogs.forEach(p => {
            const pKey = `${p.game}_${p.pitcher}`;
            if (!runningCounts[pKey]) runningCounts[pKey] = 0;
            runningCounts[pKey]++;
            const count = runningCounts[pKey];
            
            const range = ranges.find(r => count >= r.min && count <= r.max);
            if (!range) return;

            const res = String(p.result || '');
            if (res.includes('三振')) { range.outs++; range.ab++; }
            else if (['ゴロ', 'フライ', '直', '飛', 'バント'].some(v=>res.includes(v))) { range.outs++; range.ab++; if(res.includes('併殺')) range.outs++; }
            else if (['安打','二塁打','三塁打','本塁打','ヒット'].some(v=>res.includes(v))) { range.h++; range.ab++; }
            else if (!['四球','死球','敬遠'].some(v=>res.includes(v))) { range.ab++; }
            range.er += getNum(p, 'earned_runs');
        });
        
        return ranges.filter(r => r.ab > 0 || r.outs > 0).map(r => ({
            label: r.label, ip: outsToIp(r.outs), era: calcEra(r.er, r.outs), baa: calcAvg(r.h, r.ab)
        }));
    }, [targetPitchLogs]);

    const gameLogs = useMemo(() => {
        const logs = {};
        let resultsForLog = filteredResults || [];
        if (activeTab === 'individual' && selectedPlayerId) resultsForLog = resultsForLog.filter(r => resolveId(r.player || r.pitcher) === String(selectedPlayerId));

        resultsForLog.forEach(r => {
            const gameObj = filteredGames.find(g => String(g.id) === getSafeId(r.game));
            if (!gameObj) return;
            const date = gameObj.date;
            if (!logs[date]) logs[date] = { date, opponent: gameObj.opponent, role: r.games_started > 0 ? '先発' : '救援', ipOuts: 0, hits: 0, runs: 0, er: 0, walks: 0, k: 0, hr: 0 };
            
            logs[date].ipOuts += ipToOuts(r.innings_pitched || r.ip);
            logs[date].hits += getNum(r, 'hits_allowed', 'hits', 'h') + getNum(r, 'hits_allowed_right') + getNum(r, 'hits_allowed_left');
            logs[date].runs += getNum(r, 'runs_allowed', 'runs', 'r');
            logs[date].er += getNum(r, 'earned_runs', 'er');
            logs[date].walks += getNum(r, 'walks_allowed', 'walks', 'bb') + getNum(r, 'walks_allowed_right') + getNum(r, 'walks_allowed_left');
            logs[date].k += getNum(r, 'strikeouts', 'so', 'k') + getNum(r, 'strikeouts_right') + getNum(r, 'strikeouts_left');
            logs[date].hr += getNum(r, 'home_runs_allowed', 'hr');
        });

        return Object.values(logs).map(l => ({...l, ip: outsToIp(l.ipOuts), era: calcEra(l.er, l.ipOuts), whip: calcWhip(l.hits, l.walks, l.ipOuts)})).sort((a, b) => new Date(b.date) - new Date(a.date)); 
    }, [filteredResults, filteredGames, activeTab, selectedPlayerId]);

    const monthlyStats = useMemo(() => {
        const months = {};
        const addStats = (dateStr, er, outs, hits, walks) => {
            const d = new Date(dateStr); const m = d.getMonth() + 1; 
            if(!months[m]) months[m] = { month: m, er: 0, outs: 0, hits: 0, walks: 0 };
            months[m].er += er; months[m].outs += outs; months[m].hits += hits; months[m].walks += walks;
        };

        filteredResults.forEach(r => {
            const g = filteredGames.find(game => String(game.id) === getSafeId(r.game));
            if(g && g.date) addStats(g.date, getNum(r,'earned_runs','er'), ipToOuts(r.innings_pitched||r.ip), getNum(r,'hits_allowed','h')+getNum(r,'hits_allowed_right')+getNum(r,'hits_allowed_left'), getNum(r,'walks_allowed','bb')+getNum(r,'walks_allowed_right')+getNum(r,'walks_allowed_left'));
        });
        
        return Object.values(months).sort((a, b) => {
            const seasonStartMonth = typeof window !== 'undefined' ? parseInt(localStorage.getItem('logistars_season_start_month') || '4', 10) : 4;
            const am = a.month >= seasonStartMonth ? a.month - 12 : a.month;
            const bm = b.month >= seasonStartMonth ? b.month - 12 : b.month;
            return am - bm;
        });
    }, [filteredResults, filteredGames]);

    const scrollToSection = (id) => {
        setActiveSubTab(id);
        if (id === 'ranking') {
            setActiveTab('ranking');
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        const targetId = id === 'scoringPosition' ? 'situation' : id;
        const el = document.getElementById(`section-${targetId}`);
        if (el) {
            const yOffset = -120;
            const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
            window.scrollTo({ top: y, behavior: 'smooth' });
        }
    };

    const periodLabel = filterMode === 'year' ? `${selectedYear}年度` : `${startDate || '設定なし'} 〜 ${endDate || '設定なし'}`;

    const Tbl = ({ h, children }) => (
        <div className="overflow-x-auto">
            <table className="w-full text-[10px] text-center whitespace-nowrap">
                <thead className="border-b border-dashed border-slate-300 text-slate-500">
                    <tr>{h.map((x,i)=><th key={i} className="py-2 px-2 font-normal">{x}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-dashed divide-slate-100">{children}</tbody>
            </table>
        </div>
    );

    const SvgDonut = ({ items, centerText1, centerText2 }) => {
        let total = items.reduce((s, item) => s + item.value, 0);
        if (total === 0) total = 1; 
        let cumulativePercent = 0;
        const circ = 100.53; 
        
        return (
            <div className="relative w-28 h-28 mx-auto flex-shrink-0">
                <svg viewBox="0 0 32 32" className="w-full h-full transform -rotate-90 rounded-full">
                    <circle r="16" cx="16" cy="16" fill="#f1f5f9" />
                    {items.map((item, i) => {
                        if (item.value === 0) return null;
                        const percent = item.value / total;
                        const strokeDasharray = `${percent * circ} ${circ}`;
                        const strokeDashoffset = -cumulativePercent * circ;
                        cumulativePercent += percent;
                        return <circle key={i} r="16" cx="16" cy="16" fill="transparent" stroke={item.color} strokeWidth="32" strokeDasharray={strokeDasharray} strokeDashoffset={strokeDashoffset} />;
                    })}
                    <circle r="10" cx="16" cy="16" fill="white" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[8px] text-slate-500">{centerText1}</span>
                    <span className="text-sm font-bold text-[#0b1c3a]">{centerText2}</span>
                </div>
            </div>
        );
    };

    const MonthlyChart = ({ data }) => {
        if (data.length === 0) return <p className="text-xs text-slate-400 m-auto">データなし</p>;
        const maxVal = Math.max(...data.map(m => Math.max(m.er/(m.outs||1)*27, (m.walks/(m.outs||1)*27))), 5);
        
        return (
            <div className="w-full h-full flex items-end justify-between px-4 pt-4 pb-2 border-b border-slate-300 relative">
                <div className="absolute left-0 top-0 w-full h-full flex flex-col justify-between text-[8px] text-slate-300 pointer-events-none z-0">
                    <div className="border-t border-slate-100 w-full"></div>
                    <div className="border-t border-slate-100 w-full"></div>
                    <div className="border-t border-slate-100 w-full"></div>
                    <div className="border-t border-slate-100 w-full"></div>
                </div>
                {data.map(m => {
                    const era = (m.er/(m.outs||1))*27;
                    const whip = ((m.hits+m.walks)*3)/(m.outs||1);
                    return (
                        <div key={m.month} className="flex flex-col items-center w-8 z-10 group">
                            <div className="flex items-end gap-[1px] h-24 w-full justify-center relative">
                                <div className="w-3 bg-[#0c4a34] rounded-t transition-all" style={{height: `${Math.min(100, (era/maxVal)*100)}%`}}></div>
                                <div className="w-3 bg-red-500 rounded-t transition-all" style={{height: `${Math.min(100, (whip/maxVal)*100)}%`}}></div>
                            </div>
                            <span className="text-[8px] text-slate-500 mt-1">{m.month}月</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    const sourceLabel = (text) => (
        <span className="text-[8px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2 border border-slate-200 align-middle whitespace-nowrap">
            {text}
        </span>
    );

    const FilterControls = () => (
        <div className="flex flex-col md:flex-row items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-md shadow-inner justify-center w-full lg:w-auto">
            <div className="flex bg-black/50 rounded-lg p-1 shrink-0 w-full md:w-auto">
                <button 
                    onClick={() => setFilterMode('year')}
                    className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${filterMode === 'year' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    年度
                </button>
                <button 
                    onClick={() => setFilterMode('custom')}
                    className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${filterMode === 'custom' ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    期間指定
                </button>
            </div>
            <div className="flex items-center justify-center">
                {filterMode === 'year' ? (
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-black/40 text-blue-100 border border-blue-500/30 rounded-lg px-4 py-1.5 text-xs font-bold outline-none focus:border-blue-400 cursor-pointer shadow-inner text-center w-32"
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}年度</option>)}
                    </select>
                ) : (
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-black/40 text-blue-100 border border-blue-500/30 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-blue-400 cursor-pointer shadow-inner"/>
                        <span className="text-blue-500 font-bold text-xs">〜</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-black/40 text-blue-100 border border-blue-500/30 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-blue-400 cursor-pointer shadow-inner"/>
                    </div>
                )}
            </div>

            {/* ★新機能：右上の表示対象ドロップダウン */}
            {!isPlayerRole && (
                <div className="flex items-center md:ml-2 md:border-l md:border-white/20 md:pl-4">
                    <span className="text-[10px] text-blue-200 mr-2 font-bold whitespace-nowrap">表示対象:</span>
                    <select 
                        value={playersMode} 
                        onChange={handlePlayersModeChange}
                        className="bg-white/10 text-white border border-blue-500/50 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-blue-400 cursor-pointer shadow-inner"
                    >
                        <option value="active_only" className="text-slate-800">現役のみ (通常)</option>
                        <option value="include_retired" className="text-slate-800">退団者も含む</option>
                        <option value="retired_only" className="text-slate-800">退団者のみ (専用)</option>
                    </select>
                </div>
            )}
        </div>
    );

    const renderTeam = () => {
        if (baseStats.length === 0) return <div className="p-12 text-center text-slate-500 font-bold">該当期間の投手データがありません。</div>;

        return (
            <div className="space-y-4 animate-fade-in text-sm text-slate-800">
                <div className="bg-white p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row gap-6 rounded-lg">
                    <div className="flex-1">
                        <h3 className="text-xs font-bold text-[#0b1c3a] mb-6 border-l-4 border-[#0c4a34] pl-2 flex items-center">
                            投手成績サマリー <span className="font-normal text-slate-400 ml-1">({periodLabel})</span> {sourceLabel('スコアボード取込データ')}
                        </h3>
                        
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-y-6 gap-x-2 text-center border-b border-dashed border-slate-300 pb-4 mb-4">
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">試合数</span><span className="text-3xl font-black text-[#0c4a34]">{teamTotal.games}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">投球回</span><span className="text-3xl font-black">{teamIp}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">投球数</span><span className="text-3xl font-black">{teamTotal.pitchCount}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">防御率</span><span className="text-3xl font-black text-[#0c4a34]">{teamEra}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">WHIP</span><span className="text-3xl font-black">{teamWhip}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">奪三振</span><span className="text-3xl font-black text-[#0c4a34]">{teamTotal.strikeouts}</span></div>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-6 gap-y-4 gap-x-2 text-center pb-4">
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">K/9</span><span className="text-xl font-black">{teamK9}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">与四球</span><span className="text-xl font-black">{teamTotal.walks}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">被打率</span><span className="text-xl font-black">{teamBAA}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">被本塁打</span><span className="text-xl font-black text-emerald-600">{teamTotal.hr}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">QS率</span><span className="text-xl font-black">{teamTotal.starts > 0 ? ((teamTotal.qs/teamTotal.starts)*100).toFixed(1)+'%' : '-'}</span></div>
                            <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">失点</span><span className="text-xl font-black text-red-600">{teamTotal.runs}</span></div>
                        </div>
                        
                        <div className="flex gap-4 text-[10px] text-slate-500 font-bold pt-2 border-t border-slate-100 mt-2 pt-4">
                            <span>平均球速: <span className="text-sm text-slate-800">{teamAvgVelo} km/h</span></span>
                            <span>最高球速: <span className="text-sm text-slate-800">{teamMaxVelo} km/h</span></span>
                        </div>
                    </div>
                    
                    <div className="lg:w-2/5 border-t lg:border-t-0 lg:border-l border-dashed border-slate-300 pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-center">
                        <h3 className="text-[11px] font-bold text-[#0c4a34] mb-2 text-center">月別投球成績推移 {sourceLabel('Excelデータ')}</h3>
                        <div className="flex-1 mt-2">
                            <MonthlyChart data={monthlyStats} />
                        </div>
                        <div className="flex justify-center gap-4 text-[8px] text-slate-500 mt-3">
                            <span className="flex items-center gap-1"><span className="text-[#0c4a34]">■</span> 防御率</span>
                            <span className="flex items-center gap-1"><span className="text-red-500">■</span> WHIP</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-600 mb-4 border-l-4 border-[#0c4a34] pl-2 flex items-center">
                            球種割合 {sourceLabel('スマホ入力データ')}
                        </h3>
                        {pitchTypeStats.length === 0 ? <p className="text-xs text-slate-400 text-center py-4 my-auto">データなし</p> : (
                            <div className="flex flex-col xl:flex-row items-center gap-4">
                                <SvgDonut items={pitchTypeStats.slice(0,5).map(p=>({value: p.count, color: p.color}))} centerText1="合計" centerText2={targetPitchLogs.length} />
                                <div className="text-[9px] text-slate-600 w-full space-y-1">
                                    {pitchTypeStats.slice(0,5).map((p, i) => (
                                        <div key={i} className="flex justify-between items-center"><span className="font-bold text-slate-800" style={{color: p.color}}>■ {p.type}</span><span>{p.pct}</span></div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-600 mb-4 border-l-4 border-[#0c4a34] pl-2 flex items-center">
                            球速帯割合 {sourceLabel('スマホ入力データ')}
                        </h3>
                        {velocityStats.length === 0 || velocityStats.every(v=>v.count===0) ? <p className="text-xs text-slate-400 text-center py-4 my-auto">データなし</p> : (
                            <div className="flex flex-col xl:flex-row items-center gap-4">
                                <SvgDonut items={velocityStats.map(v=>({value: v.count, color: v.color}))} centerText1="合計" centerText2={targetPitchLogs.filter(p=>p.velocity>0).length} />
                                <div className="text-[9px] text-slate-600 w-full space-y-1">
                                    {velocityStats.map((v, i) => (
                                        <div key={i} className="flex justify-between items-center"><span className="font-bold text-slate-800" style={{color: v.color}}>■ {v.label}</span><span>{v.pct}</span></div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-[#0c4a34] pl-2 flex items-center">
                            イニング別投球成績 {sourceLabel('スマホ入力データ')}
                        </h3>
                        {inningStats.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                            <Tbl h={['イニング', '投球回', '防御率', '被打率', '奪三振']}>
                                {inningStats.map((inn, i) => <tr key={i}><td className="text-left py-1.5 font-bold text-slate-700">{inn.inning}</td><td>{inn.ip}</td><td className="font-bold text-[#0c4a34]">{inn.era}</td><td>{inn.baa}</td><td>{inn.k}</td></tr>)}
                            </Tbl>
                        )}
                    </div>

                    <div className="bg-white p-4 border border-slate-200 shadow-sm flex flex-col items-center rounded-lg relative">
                        <h3 className="text-[10px] font-bold text-slate-600 mb-4 border-l-4 border-[#0c4a34] pl-2 self-start flex items-center">
                            左右打者別成績 {sourceLabel('Excelデータ')}
                        </h3>
                        <table className="w-full text-[10px] text-center whitespace-nowrap">
                            <thead className="border-b border-slate-200 text-slate-400"><tr><th className="text-left py-1"></th><th>対右打者</th><th>対左打者</th></tr></thead>
                            <tbody className="divide-y divide-dashed divide-slate-100">
                                <tr><td className="text-left py-1.5 text-slate-600 font-bold">被打率</td><td className="font-bold text-[#0c4a34]">{calcAvg(teamTotal.hits_right, teamTotal.ab_right)}</td><td>{calcAvg(teamTotal.hits_left, teamTotal.ab_left)}</td></tr>
                                <tr><td className="text-left py-1.5 text-slate-600 font-bold">奪三振</td><td className="font-bold text-[#0c4a34]">{teamTotal.k_right}</td><td>{teamTotal.k_left}</td></tr>
                                <tr><td className="text-left py-1.5 text-slate-600 font-bold">与四球</td><td className="font-bold text-[#0c4a34]">{teamTotal.bb_right}</td><td>{teamTotal.bb_left}</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div id="section-gameLogs" className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg lg:col-span-2">
                        <h3 className="text-[10px] font-bold text-slate-600 border-l-4 border-[#0c4a34] pl-2 mb-2 flex items-center">
                            試合別投球成績 {sourceLabel('Excelデータ')}
                        </h3>
                        {gameLogs.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                            <Tbl h={['日付', '対戦相手', '先/援', '投球回', '防御率', '被安打', '奪三振']}>
                                {(showAllGameLogsTeam ? gameLogs : gameLogs.slice(0, 8)).map((g, i) => (
                                    <tr key={i}>
                                        <td className="text-left py-1.5 font-bold">{g.date.substring(5)}</td><td className="text-left">{g.opponent}</td>
                                        <td>{g.role}</td><td className="font-bold">{g.ip}</td><td className="font-bold text-[#0c4a34]">{g.era}</td>
                                        <td>{g.hits}</td><td>{g.k}</td>
                                    </tr>
                                ))}
                            </Tbl>
                        )}
                        {gameLogs.length > 8 && <div className="mt-2 text-right"><button onClick={() => setShowAllGameLogsTeam(!showAllGameLogsTeam)} className="text-[9px] border border-slate-300 rounded px-3 py-1 font-bold text-slate-500 hover:bg-slate-50">{showAllGameLogsTeam ? '閉じる' : 'すべて見る'}</button></div>}
                    </div>

                    <div id="section-pitchType" className="bg-white p-4 border border-slate-200 shadow-sm lg:col-span-2 rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-[#0c4a34] pl-2 flex items-center">
                            球種別被打成績 <span className="text-[8px] font-normal text-slate-400 ml-1">(全期間)</span> {sourceLabel('スマホ入力データ')}
                        </h3>
                        {pitchTypeStats.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                            <Tbl h={['球種', '投球割合', '被打率', '被長打率', '被OPS', '空振率']}>
                                {pitchTypeStats.map((p, i) => (
                                    <tr key={i}><td className="text-left py-1.5 font-bold text-slate-700">{p.type}</td><td>{p.pct}</td><td className="font-bold text-[#0c4a34]">{p.baa}</td><td>{p.slgAgainst}</td><td className="font-bold">{p.opsAgainst}</td><td>{p.whiff}</td></tr>
                                ))}
                            </Tbl>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderRanking = () => {
        if (analyzedStats.length === 0) return <div className="p-12 text-center text-slate-500 font-bold">該当期間のデータがありません。</div>;
        const iPage = 15;
        const totalPages = Math.max(1, Math.ceil(analyzedStats.length / iPage));
        const paginatedStats = analyzedStats.slice((rankingPage - 1) * iPage, rankingPage * iPage);

        return (
            <div className="space-y-4 animate-fade-in text-sm text-slate-800">
                <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-base font-bold text-[#0b1c3a] flex items-center">投手ランキング <span className="text-[10px] text-slate-500 font-normal ml-2">({periodLabel})</span> {sourceLabel('Excelデータ')}</h2>
                            <p className="text-[10px] text-slate-400 mt-1">投手の各種成績をランキングで表示します</p>
                        </div>
                        <select className="text-[10px] border border-slate-300 rounded px-2 py-1 outline-none text-slate-600 bg-white">
                            <option>規定投球回以上</option>
                            <option>全選手</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-dashed border-slate-200">
                        {['防御率', 'WHIP', '奪三振', 'K/9', '被打率', 'BB/9', '勝利数', '勝率', '投球回', '被本塁打', 'QS率'].map(key => {
                            const mKey = key === '防御率' ? 'era' : key === 'WHIP' ? 'whip' : key === '奪三振' ? 'strikeouts' : key === 'K/9' ? 'k9' : key === '被打率' ? 'baa' : key === 'BB/9' ? 'bb9' : key === '勝利数' ? 'wins' : key === '勝率' ? 'winPct' : key === '投球回' ? 'outs' : key === '被本塁打' ? 'hr' : 'qsPct';
                            return <button key={key} onClick={() => setSortKey(mKey)} className={`px-6 py-2 rounded text-[10px] font-bold border transition-colors shadow-sm ${sortKey === mKey ? 'bg-[#0c4a34] text-white border-[#0c4a34]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}>{key}</button>
                        })}
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-center text-xs whitespace-nowrap">
                            <thead className="text-slate-500 border-b border-dashed border-slate-300 text-[10px]">
                                <tr>
                                    <th className="py-4 px-2 font-normal">順位</th><th className="py-4 px-4 text-left font-normal border-r border-dashed border-slate-200">選手名</th>
                                    <th className="py-4 px-3 font-normal">試合</th><th className="py-4 px-3 font-normal">投球回</th><th className="py-4 px-3 font-normal">投球数</th><th className="py-4 px-3 border-r border-dashed border-slate-200 text-[#0c4a34] font-bold">防御率</th>
                                    <th className="py-4 px-3 font-normal">WHIP</th><th className="py-4 px-3 font-normal">奪三振</th><th className="py-4 px-3 font-normal">K/9</th><th className="py-4 px-3 font-normal">与四球</th>
                                    <th className="py-4 px-3 font-normal">BB/9</th><th className="py-4 px-3 font-normal">被打率</th><th className="py-4 px-3 font-normal">被本塁打</th><th className="py-4 px-3 font-normal">QS率</th><th className="py-4 px-3 font-normal">勝利数</th><th className="py-4 px-3 font-normal">勝率</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dashed divide-slate-100">
                                {paginatedStats.map((stat, idx) => {
                                    const rIdx = (rankingPage - 1) * iPage + idx;
                                    return (
                                    <tr key={stat.playerId} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-2"><span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold mx-auto ${rIdx===0?'bg-yellow-400 text-white shadow-sm':rIdx===1?'bg-slate-300 text-white shadow-sm':rIdx===2?'bg-amber-600 text-white shadow-sm':'text-slate-500'}`}>{rIdx + 1}</span></td>
                                        <td className="py-4 px-4 text-left font-bold text-slate-700 border-r border-dashed border-slate-200 cursor-pointer hover:text-[#0c4a34] hover:underline" onClick={() => {setSelectedPlayerId(stat.playerId); setActiveTab('individual');}}>
                                            <span className={stat.player.isRetired ? "text-slate-400 font-normal" : ""}>{stat.player.displayName}</span>
                                        </td>
                                        <td className="py-4 px-3 text-slate-500">{stat.games}</td><td className="py-4 px-3 font-bold text-slate-700">{stat.ip}</td><td className="py-4 px-3 font-bold text-slate-700">{stat.pitchCount}</td><td className={`py-4 px-3 border-r border-dashed border-slate-200 font-bold text-[#0c4a34] bg-[#0c4a34]/5`}>{stat.era}</td>
                                        <td className="py-4 px-3 text-slate-600">{stat.whip}</td><td className="py-4 px-3 text-slate-600">{stat.strikeouts}</td><td className="py-4 px-3 text-slate-600">{stat.k9}</td><td className="py-4 px-3 text-slate-600">{stat.walks}</td>
                                        <td className="py-4 px-3 text-slate-600">{stat.bb9}</td><td className="py-4 px-3 text-slate-600">{stat.baa}</td><td className="py-4 px-3 text-slate-600">{stat.hr}</td><td className="py-4 px-3 text-slate-600">{stat.qsPct}</td><td className="py-4 px-3 font-bold text-blue-600">{stat.wins}</td><td className="py-4 px-3 text-slate-600">{stat.winPct}</td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center mt-4 text-[10px] text-slate-400">
                        <p>※ 規定投球回: チーム試合数 × 2</p>
                        <div className="flex gap-1">
                            <button onClick={() => setRankingPage(Math.max(1, rankingPage - 1))} className="border rounded px-2 py-1 hover:bg-slate-50">&lt;</button>
                            {[...Array(totalPages)].map((_, i) => <button key={i} onClick={() => setRankingPage(i + 1)} className={`border rounded px-2 py-1 ${rankingPage === i + 1 ? 'border-[#0c4a34] bg-[#0c4a34] text-white' : 'bg-white'}`}>{i + 1}</button>)}
                            <button onClick={() => setRankingPage(Math.min(totalPages, rankingPage + 1))} className="border rounded px-2 py-1 hover:bg-slate-50">&gt;</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderIndividual = () => {
        if (analyzedStats.length === 0) return <div className="p-12 text-center text-slate-500 font-bold">該当期間のデータがありません。</div>;
        const pStat = analyzedStats.find(s => String(s.playerId) === String(selectedPlayerId)) || analyzedStats[0];
        if (!pStat) return null;

        return (
            <div className="space-y-4 animate-fade-in text-slate-800">
                <div id="section-summary" className="bg-[#0b1c3a] text-white rounded-xl p-6 flex flex-col lg:flex-row gap-8 shadow-sm relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] pointer-events-none"></div>
                    <div className="flex gap-4 lg:w-1/3 lg:border-r border-b lg:border-b-0 border-dashed border-slate-600 pb-4 lg:pb-0 lg:pr-8 z-10">
                        <div className="w-24 h-28 bg-slate-200 rounded-lg overflow-hidden shrink-0 shadow-sm">{pStat.player.photo ? <img src={pStat.player.photo} alt="face" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-4xl text-slate-400 bg-slate-100">👤</div>}</div>
                        <div className="flex flex-col justify-center w-full">
                            <select value={selectedPlayerId} onChange={e => setSelectedPlayerId(e.target.value)} className="text-2xl font-black text-white outline-none border-b-2 border-blue-500 bg-transparent w-full mb-3 cursor-pointer pb-1">
                                {analyzedStats.map(s => (
                                    <option 
                                        key={s.playerId} 
                                        value={s.playerId} 
                                        className={s.player.isRetired ? "text-slate-400 font-normal" : "text-black"}
                                    >
                                        {s.player.displayName}
                                    </option>
                                ))}
                            </select>
                            <div className="flex items-center gap-3 text-xs font-bold text-white mb-4"><span className="text-3xl pr-3 border-r border-slate-600">{pStat.player.number}</span><div className="flex flex-col text-[10px] text-slate-300 font-normal"><span>{pStat.player.position} / {pStat.player.batting_hand}</span></div></div>
                        </div>
                    </div>
                    <div className="flex-1 bg-white text-slate-800 rounded-lg p-6 shadow-inner z-10">
                        <h3 className="text-[11px] font-bold text-[#0c4a34] border-l-4 border-[#0c4a34] pl-2 mb-4 flex items-center">個人成績サマリー <span className="font-normal text-slate-400 ml-1">({periodLabel})</span> {sourceLabel('Excelデータ')}</h3>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-y-6 gap-x-2 text-center border-b border-dashed border-slate-200 pb-4 mb-4">
                            <div><span className="text-[10px] text-slate-400 block mb-1">登板</span><span className="text-xl font-black text-[#0b1c3a]">{pStat.games}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">先発</span><span className="text-xl font-black text-[#0b1c3a]">{pStat.starts}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">完投</span><span className="text-xl font-black text-[#0b1c3a]">{pStat.cg}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">完封</span><span className="text-xl font-black text-[#0b1c3a]">{pStat.sho}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">勝利</span><span className="text-xl font-black text-blue-600">{pStat.wins}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">敗戦</span><span className="text-xl font-black text-red-600">{pStat.losses}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">セーブ</span><span className="text-xl font-bold text-emerald-600">{pStat.saves}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">ホールド</span><span className="text-xl font-black text-[#0b1c3a]">{pStat.holds}</span></div>
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-y-4 gap-x-2 text-center border-b border-dashed border-slate-200 pb-4 mb-4">
                            <div><span className="text-[10px] text-slate-400 block mb-1">投球回</span><span className="text-lg font-bold">{pStat.ip}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">投球数</span><span className="text-lg font-bold">{pStat.pitchCount}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">打者</span><span className="text-lg font-bold">{pStat.bf}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">被安打</span><span className="text-lg font-bold">{pStat.hits}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">被本塁打</span><span className="text-lg font-bold text-red-600">{pStat.hr}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">奪三振</span><span className="text-lg font-bold">{pStat.strikeouts}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">与四球</span><span className="text-lg font-bold">{pStat.walks}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">失点</span><span className="text-lg font-bold text-red-600">{pStat.runs}</span></div>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-7 gap-2 text-center">
                            <div><span className="text-[10px] text-slate-400 block mb-1">防御率</span><span className="text-xl font-black text-[#0c4a34]">{pStat.era}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">WHIP</span><span className="text-xl font-black">{pStat.whip}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">奪三振率</span><span className="text-lg font-bold">{pStat.k9}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">与四球率</span><span className="text-lg font-bold">{pStat.bb9}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">被打率</span><span className="text-lg font-bold">{pStat.baa}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">K/BB</span><span className="text-lg font-bold">{pStat.walks > 0 ? (pStat.strikeouts / pStat.walks).toFixed(2) : '-'}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">勝率</span><span className="text-lg font-bold text-blue-600">{pStat.winPct}</span></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                    <div id="section-gameLogs" className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg lg:col-span-2">
                        <h3 className="text-[10px] font-bold text-slate-600 border-l-4 border-[#0c4a34] pl-2 mb-2 flex items-center">
                            試合別投球成績 {sourceLabel('Excelデータ')}
                        </h3>
                        {gameLogs.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                            <Tbl h={['日付', '対戦相手', '先/援', '投球回', '防御率', '被安打', '奪三振']}>
                                {(showAllGameLogsIndiv ? gameLogs : gameLogs.slice(0, 8)).map((g, i) => (
                                    <tr key={i}>
                                        <td className="text-left py-1.5 font-bold">{g.date.substring(5)}</td><td className="text-left text-slate-700">{g.opponent}</td>
                                        <td>{g.role}</td><td className="font-bold">{g.ip}</td><td className="font-bold text-[#0c4a34]">{g.era}</td>
                                        <td>{g.hits}</td><td>{g.k}</td>
                                    </tr>
                                ))}
                            </Tbl>
                        )}
                        {gameLogs.length > 8 && <div className="mt-2 text-right"><button onClick={() => setShowAllGameLogsIndiv(!showAllGameLogsIndiv)} className="text-[9px] border border-slate-300 rounded px-3 py-1 font-bold text-slate-500 hover:bg-slate-50">{showAllGameLogsIndiv ? '閉じる' : 'すべて見る'}</button></div>}
                    </div>

                    <div id="section-pitchType" className="bg-white p-4 border border-slate-200 shadow-sm lg:col-span-2 rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-[#0c4a34] pl-2 flex items-center">
                            球種別被打成績 <span className="text-[8px] font-normal text-slate-400 ml-1">(全期間)</span> {sourceLabel('スマホ入力データ')}
                        </h3>
                        {pitchTypeStats.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                            <Tbl h={['球種', '投球割合', '被打率', '被長打率', '被OPS', '空振率']}>
                                {pitchTypeStats.map((p, i) => (
                                    <tr key={i}><td className="text-left py-1.5 font-bold text-slate-700">{p.type}</td><td>{p.pct}</td><td className="font-bold text-[#0c4a34]">{p.baa}</td><td>{p.slgAgainst}</td><td className="font-bold">{p.opsAgainst}</td><td>{p.whiff}</td></tr>
                                ))}
                            </Tbl>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="bg-white p-4 border border-slate-200 shadow-sm lg:col-span-2 flex flex-col md:flex-row gap-4 rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <div className="flex-1 border-r border-dashed border-slate-200 pr-4">
                            <h3 className="text-[10px] font-bold text-slate-600 mb-4 border-l-4 border-[#0c4a34] pl-2 flex items-center">投球結果内訳 {sourceLabel('スマホ')}</h3>
                            {outStats.total === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                                <Tbl h={['結果', '回数', '割合']}>
                                    <tr><td className="text-left py-1.5 text-slate-600">三振</td><td className="font-bold">{outStats.k}</td><td>{outStats.kPct}</td></tr>
                                    <tr><td className="text-left py-1.5 text-slate-600">内野ゴロ</td><td className="font-bold">{outStats.ground}</td><td>{outStats.groundPct}</td></tr>
                                    <tr><td className="text-left py-1.5 text-slate-600">外野飛</td><td className="font-bold">{outStats.fly}</td><td>{outStats.flyPct}</td></tr>
                                    <tr><td className="text-left py-1.5 text-slate-600">ライナー</td><td className="font-bold">{outStats.liner}</td><td>{outStats.linerPct}</td></tr>
                                    <tr className="font-bold border-t border-dashed border-slate-200"><td className="text-left py-1.5">合計</td><td>{outStats.total}</td><td>100%</td></tr>
                                </Tbl>
                            )}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-[10px] font-bold text-slate-600 mb-4 border-l-4 border-[#0c4a34] pl-2 flex items-center">凡退内訳 {sourceLabel('スマホ')}</h3>
                            {outStats.total === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                                <>
                                <Tbl h={['凡退内容', '回数', '割合']}>
                                    <tr><td className="text-left py-1.5 text-slate-600"><span className="text-[#0c4a34]">■</span> ゴロ</td><td className="font-bold">{outStats.ground}</td><td>{outStats.groundPct}</td></tr>
                                    <tr><td className="text-left py-1.5 text-slate-600"><span className="text-blue-500">■</span> フライ</td><td className="font-bold">{outStats.fly}</td><td>{outStats.flyPct}</td></tr>
                                    <tr><td className="text-left py-1.5 text-slate-600"><span className="text-red-500">■</span> 三振</td><td className="font-bold">{outStats.k}</td><td>{outStats.kPct}</td></tr>
                                </Tbl>
                                <div className="flex justify-center mt-4">
                                    <SvgDonut items={[{value: parseFloat(outStats.groundPct), color: '#0c4a34'}, {value: parseFloat(outStats.flyPct), color: '#3b82f6'}, {value: parseFloat(outStats.kPct), color: '#ef4444'}]} centerText1="内訳" centerText2="" />
                                </div>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-[#0c4a34] pl-2 flex items-center">ランナー状況別被打率 {sourceLabel('スマホ')}</h3>
                        {runnerStats.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                            <Tbl h={['状況', '打数', '被安打', '被打率']}>
                                {runnerStats.map((r, i) => <tr key={i}><td className="text-left py-1.5 font-bold text-slate-700">{r.state}</td><td>{r.atBats}</td><td>{r.hits}</td><td className="font-bold text-[#0c4a34]">{r.baa}</td></tr>)}
                            </Tbl>
                        )}
                    </div>
                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-[#0c4a34] pl-2 flex items-center">アウトカウント別被打率 {sourceLabel('スマホ')}</h3>
                        {outCountStats.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                            <Tbl h={['状況', '打数', '被安打', '被打率']}>
                                {outCountStats.map((r, i) => <tr key={i}><td className="text-left py-1.5 font-bold text-slate-700">{r.state}</td><td>{r.atBats}</td><td>{r.hits}</td><td className="font-bold text-[#0c4a34]">{r.baa}</td></tr>)}
                            </Tbl>
                        )}
                    </div>
                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-[#0c4a34] pl-2 flex items-center">カウント別被打率 {sourceLabel('スマホ')}</h3>
                        {countStats.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                            <Tbl h={['状況', '打数', '被安打', '被打率']}>
                                {countStats.map((c, i) => <tr key={i}><td className="text-left py-1.5 font-bold text-slate-700">{c.count}</td><td>{c.atBats}</td><td>{c.hits}</td><td className="font-bold text-[#0c4a34]">{c.baa}</td></tr>)}
                            </Tbl>
                        )}
                    </div>
                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-lg relative">
                        {!isRealPitches && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-lg"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-[#0c4a34] pl-2 flex items-center">球数区分別被打率 {sourceLabel('スマホ')}</h3>
                        {pitchCountRangeStats.length === 0 ? <p className="text-xs text-slate-400 text-center py-4">データなし</p> : (
                            <Tbl h={['球数帯', '投球回', '被打率']}>
                                {pitchCountRangeStats.map((r, i) => <tr key={i}><td className="text-left py-1.5 font-bold text-slate-700">{r.label}</td><td>{r.ip}</td><td className="font-bold text-[#0c4a34]">{r.baa}</td></tr>)}
                            </Tbl>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full pb-20 font-sans">
            <div className="bg-[#0b1c3a] text-white overflow-hidden shadow-md border-b border-[#0c4a34]">
                <div className="px-4 md:px-6 py-4 border-b border-[#1e3a8a] flex flex-col lg:flex-row lg:justify-between lg:items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black tracking-widest flex items-center gap-3">
                            <span>⚾</span> 投手データ <span className="text-sm font-bold text-blue-200 ml-2">({activeTab === 'team' ? 'チーム成績' : activeTab === 'ranking' ? '投手ランキング' : '個人データ分析'})</span>
                        </h2>
                        <p className="text-[9px] md:text-[10px] text-blue-100 mt-2 tracking-wide">チーム全体の試合・選手・成績データを一元管理し、チームの勝利をデータで支える</p>
                    </div>
                    
                    <div className="flex w-full lg:w-auto justify-end mt-2 lg:mt-0">
                        <FilterControls />
                    </div>
                </div>
                <div className="flex px-2 overflow-x-auto whitespace-nowrap hide-scrollbar text-xs font-bold bg-[#071329]">
                    <button onClick={() => {setActiveTab('team'); setActiveSubTab('summary');}} className={`px-4 py-3 border-b-4 transition-colors ${activeTab === 'team' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>サマリー</button>
                    <button onClick={() => {setActiveTab('ranking'); setActiveSubTab('summary');}} className={`px-4 py-3 border-b-4 transition-colors ${activeTab === 'ranking' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>投手ランキング</button>
                    <button onClick={() => {setActiveTab('individual'); setActiveSubTab('summary');}} className={`px-4 py-3 border-b-4 transition-colors ${activeTab === 'individual' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>個人データ分析</button>
                </div>
            </div>

            <div className="p-4 md:p-6 bg-slate-50 min-h-screen border-b border-slate-200 shadow-sm">
                
                {activeTab !== 'ranking' && (
                <div className="flex px-2 mb-6 overflow-x-auto whitespace-nowrap hide-scrollbar text-[11px] font-bold border-b border-slate-300 gap-6">
                    <button onClick={() => scrollToSection('summary')} className={`pb-3 border-b-[3px] transition-colors ${activeSubTab === 'summary' ? 'border-[#0c4a34] text-[#0c4a34]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>サマリー</button>
                    <button onClick={() => scrollToSection('gameLogs')} className={`pb-3 border-b-[3px] transition-colors ${activeSubTab === 'gameLogs' ? 'border-[#0c4a34] text-[#0c4a34]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>試合別</button>
                    <button onClick={() => scrollToSection('pitchType')} className={`pb-3 border-b-[3px] transition-colors ${activeSubTab === 'pitchType' ? 'border-[#0c4a34] text-[#0c4a34]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>球種別・被打状況</button>
                    <button onClick={() => scrollToSection('inning')} className={`pb-3 border-b-[3px] transition-colors ${activeSubTab === 'inning' ? 'border-[#0c4a34] text-[#0c4a34]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>イニング別</button>
                    <button onClick={() => scrollToSection('vsRL')} className={`pb-3 border-b-[3px] transition-colors ${activeSubTab === 'vsRL' ? 'border-[#0c4a34] text-[#0c4a34]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>左右打者別</button>
                    <button onClick={() => scrollToSection('outStats')} className={`pb-3 border-b-[3px] transition-colors ${activeSubTab === 'outStats' ? 'border-[#0c4a34] text-[#0c4a34]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>投球結果・凡退内訳</button>
                    <button onClick={() => scrollToSection('situation')} className={`pb-3 border-b-[3px] transition-colors ${activeSubTab === 'situation' ? 'border-[#0c4a34] text-[#0c4a34]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>状況別</button>
                </div>
                )}
                
                {activeTab === 'team' && renderTeam()}
                {activeTab === 'ranking' && renderRanking()}
                {activeTab === 'individual' && renderIndividual()}
            </div>
        </div>
    );
}