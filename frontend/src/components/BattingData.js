import React, { useState, useMemo, useEffect } from 'react';

export default function BattingData({ players = [], allResults = [], atBatRecords = [], games = [], userRole = 'admin', linkedPlayerId = null, currentPlayer = null }) {
    
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
        if (isPlayerRole && currentPlayer && currentPlayer.position !== '投手') {
            return 'individual';
        }
        return 'team';
    }); 
    
    const [selectedPlayerId, setSelectedPlayerId] = useState(() => {
        if (isPlayerRole && currentPlayer) return String(currentPlayer.id);
        const validPlayers = players.filter(p => shouldIncludePlayer(p.id));
        return validPlayers.length > 0 ? String(validPlayers[0].id) : '';
    });

    useEffect(() => {
        // 現在選択中の選手がモード変更により対象外になった場合、自動で切り替える
        if (selectedPlayerId && shouldIncludePlayer(selectedPlayerId)) return;
        
        if (isPlayerRole && currentPlayer) {
            setSelectedPlayerId(String(currentPlayer.id));
        } else {
            const validPlayers = players.filter(p => shouldIncludePlayer(p.id));
            if (validPlayers.length > 0) {
                setSelectedPlayerId(String(validPlayers[0].id));
            } else {
                setSelectedPlayerId('');
            }
        }
    }, [players, selectedPlayerId, isPlayerRole, currentPlayer, playersMode]);

    const [sortKey, setSortKey] = useState('ops');
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
        if (sortedYears.length === 0) return [getSeasonYear(new Date())];
        return sortedYears;
    }, [games]);

    const [selectedYear, setSelectedYear] = useState(availableYears[0]);

    useEffect(() => {
        if (!availableYears.includes(selectedYear)) setSelectedYear(availableYears[0]);
    }, [availableYears, selectedYear]);

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
            if (val.playerId !== undefined) return String(val.playerId).trim();
            if (val.name) val = val.name;
        }
        const str = String(val).trim();
        if (!str) return '';
        
        let m = players.find(p => String(p.id) === str);
        if (m) return String(m.id);
        m = players.find(p => String(p.number) === str);
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

    const filteredResults = useMemo(() => {
        const gameIds = new Set(filteredGames.map(g => String(g.id)));
        return allResults.filter(r => {
            const gId = getSafeId(r.game || r.game_id || r.gameId);
            if (!gId || !gameIds.has(gId)) return false;
            
            const pId = resolveId(r.player);
            return shouldIncludePlayer(pId);
        });
    }, [allResults, filteredGames, players, playersMode]);

    const filteredLocalBattingLogs = useMemo(() => {
        const gameIds = new Set(filteredGames.map(g => String(g.id)));
        return localLogs
            .filter(log => log.type === 'batting' || !log.type)
            .map(log => {
                let gId = getSafeId(log.game || log.gameId || log.game_id);
                const pId = resolveId(log.batterId || log.playerId || log.batter || log.player);
                
                if (!gId || gId === 'local' || !gameIds.has(gId)) {
                    if (pId) {
                        const matchResult = filteredResults.find(r => resolveId(r.player) === pId);
                        if (matchResult) gId = getSafeId(matchResult.game);
                    }
                    if (!gId || gId === 'local' || !gameIds.has(gId)) {
                        const pastGames = filteredGames.filter(g => new Date(g.date) <= new Date());
                        if (pastGames.length > 0) gId = String(pastGames[0].id);
                    }
                }
                return { ...log, resolvedGameId: gId };
            })
            .filter(log => log.resolvedGameId && gameIds.has(log.resolvedGameId))
            .map(log => ({
                id: `local-${log.id}`,
                game: log.resolvedGameId,
                batter: resolveId(log.batterId || log.playerId || log.batter || log.player),
                result: String(log.shortResult || log.result || log.outType || ''),
                direction: String(log.direction || log.batDirection || log.rawData?.batDirection || ''),
                runner_state: String(log.runner || log.runnerState || log.rawData?.runnerState || 'ランナーなし'),
                pitch_type: String(log.pitchType || log.pitch_type || log.pitch || log.rawData?.batPitchType || '不明').trim(),
                balls: getNum(log, 'balls', 'b'),
                strikes: getNum(log, 'strikes', 's'),
                runs: getNum(log, 'runs', 'r'),
                rbi: getNum(log, 'rbi'),
                steals: getNum(log, 'steals', 'sb'),
                pitcherHand: log.pitcherHand || log.rawData?.pitcherHand 
            }))
            .filter(log => shouldIncludePlayer(log.batter));
    }, [localLogs, filteredGames, filteredResults, players, playersMode]);

    const isRealAtBats = filteredLocalBattingLogs.length > 0;

    const baseStats = useMemo(() => {
        const agg = {};
        
        players.forEach(p => {
            const pId = String(p.id);
            agg[pId] = {
                playerId: pId, games: 0, plateAppearances: 0, atBats: 0, hits: 0,
                doubles: 0, triples: 0, hr: 0, rbi: 0, runs: 0, walks: 0, 
                strikeouts: 0, steals: 0, caughtStealing: 0, sacBunts: 0, sacFlies: 0, hbp: 0, dp: 0, uniqueGames: new Set()
            };
        });

        filteredResults.forEach(r => {
            const pId = resolveId(r.player);
            if (!pId) return;

            if (!agg[pId]) {
                agg[pId] = { playerId: pId, games: 0, plateAppearances: 0, atBats: 0, hits: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, runs: 0, walks: 0, strikeouts: 0, steals: 0, caughtStealing: 0, sacBunts: 0, sacFlies: 0, hbp: 0, dp: 0, uniqueGames: new Set() };
            }
            const stat = agg[pId];
            const gId = getSafeId(r.game);
            if (gId) stat.uniqueGames.add(gId);
            
            stat.plateAppearances += getNum(r, 'plate_appearances', 'plateAppearances', 'pa');
            stat.atBats += getNum(r, 'at_bats', 'atBats', 'ab');
            stat.hits += getNum(r, 'hits', 'h');
            stat.doubles += getNum(r, 'doubles', 'd2', 'twoBases');
            stat.triples += getNum(r, 'triples', 'd3', 'threeBases');
            stat.hr += getNum(r, 'home_runs', 'homeRuns', 'hr');
            stat.rbi += getNum(r, 'rbi');
            stat.runs += getNum(r, 'runs', 'r');
            stat.walks += getNum(r, 'walks', 'bb');
            stat.strikeouts += getNum(r, 'strikeouts', 'so', 'k');
            stat.steals += getNum(r, 'steals', 'sb');
            stat.caughtStealing += getNum(r, 'caught_stealing', 'caughtStealing', 'cs'); 
            stat.sacBunts += getNum(r, 'sacrifice_bunts', 'sacBunts', 'sh');
            stat.sacFlies += getNum(r, 'sacrifice_flies', 'sacFlies', 'sf');
            stat.hbp += getNum(r, 'hit_by_pitch', 'hbp');
            stat.dp += getNum(r, 'double_plays', 'doublePlays', 'dp');
        });

        Object.values(agg).forEach(p => { p.games = p.uniqueGames.size; });
        return Object.values(agg);
    }, [filteredResults, players]);

    const teamTotal = useMemo(() => {
        const total = baseStats.reduce((acc, curr) => {
            ['plateAppearances','atBats','hits','doubles','triples','hr','rbi','runs','walks','strikeouts','steals','caughtStealing','sacBunts','sacFlies','hbp','dp'].forEach(k => { acc[k] += curr[k] || 0; });
            return acc;
        }, { plateAppearances: 0, atBats: 0, hits: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, runs: 0, walks: 0, strikeouts: 0, steals: 0, caughtStealing: 0, sacBunts: 0, sacFlies: 0, hbp: 0, dp: 0 });
        
        const allUniqueGames = new Set();
        filteredResults.forEach(r => { if(r.game) allUniqueGames.add(getSafeId(r.game)); });
        
        total.games = allUniqueGames.size;
        return total;
    }, [baseStats, filteredResults]);

    const calcAvg = (h, ab) => ab > 0 ? (h / ab).toFixed(3).replace(/^0/, '') : '.000';
    const calcObp = (h, w, hbp, pa) => pa > 0 ? ((h + w + hbp) / pa).toFixed(3).replace(/^0/, '') : '.000';
    const calcSlg = (h, d, t, hr, ab) => ab > 0 ? (((h - d - t - hr) + d * 2 + t * 3 + hr * 4) / ab).toFixed(3).replace(/^0/, '') : '.000';
    const calcOps = (obp, slg) => (parseFloat(obp) + parseFloat(slg)).toFixed(3).replace(/^0/, '');

    const teamAvg = calcAvg(teamTotal.hits, teamTotal.atBats);
    const teamObp = calcObp(teamTotal.hits, teamTotal.walks, teamTotal.hbp, teamTotal.plateAppearances);
    const teamSlg = calcSlg(teamTotal.hits, teamTotal.doubles, teamTotal.triples, teamTotal.hr, teamTotal.atBats);
    const teamOps = calcOps(teamObp, teamSlg);
    const runsPerGame = teamTotal.games > 0 ? (teamTotal.runs / teamTotal.games).toFixed(2) : '0.00';

    // ★ 唯一の analyzedStats （重複定義エラー解消）
    const analyzedStats = useMemo(() => {
        if (baseStats.length === 0) return [];
        return baseStats
            .filter(stat => shouldIncludePlayer(stat.playerId))
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

                const avg = calcAvg(stat.hits, stat.atBats);
                const obp = calcObp(stat.hits, stat.walks, stat.hbp, stat.plateAppearances);
                const slg = calcSlg(stat.hits, stat.doubles, stat.triples, stat.hr, stat.atBats);
                const ops = calcOps(obp, slg);
                const totalSteals = (stat.steals || 0) + (stat.caughtStealing || 0);
                const sbPct = totalSteals > 0 ? ((stat.steals / totalSteals) * 100).toFixed(1) + '%' : '-';

                return { ...stat, player, avg, obp, slg, ops, sbPct };
            }).sort((a, b) => parseFloat(b[sortKey] || b.ops) - parseFloat(a[sortKey] || a.ops));
    }, [baseStats, players, sortKey, playersMode]);

    const targetAtBats = useMemo(() => {
        const normalize = (ab) => ({
            id: ab.id,
            game: getSafeId(ab.game),
            batter: resolveId(ab.batter || ab.player || ab.batterId),
            result: String(ab.result || ab.outType || ab.shortResult || ''),
            direction: String(ab.direction || ab.batDirection || ab.rawData?.batDirection || ''),
            runner_state: String(ab.runner_state || ab.runner || ab.rawData?.runnerState || 'ランナーなし'),
            pitch_type: String(ab.pitch_type || ab.pitchType || ab.pitch || ab.rawData?.batPitchType || '不明').trim(),
            balls: getNum(ab, 'balls', 'b'),
            strikes: getNum(ab, 'strikes', 's'),
            pitcherHand: String(ab.pitcherHand || ab.pitcher_hand || ab.rawData?.pitcherHand || '') 
        });
        
        const finalRecords = filteredLocalBattingLogs.map(normalize);

        if (activeTab === 'individual' && selectedPlayerId) {
            return finalRecords.filter(ab => ab.batter === String(selectedPlayerId));
        }
        return finalRecords;
    }, [filteredLocalBattingLogs, activeTab, selectedPlayerId, players]);

    const directionStats = useMemo(() => {
        let left = 0, center = 0, right = 0, grounder = 0, total = 0;
        targetAtBats.forEach(ab => {
            const res = ab.result;
            if (res.includes('ゴロ') || res.includes('併殺')) { grounder++; total++; return; }
            if (!ab.direction) return;
            total++;
            if (['レフト線', '左翼手方向', '左中間', '三塁線', '三塁手', '遊撃手', '三遊間'].some(v => ab.direction.includes(v))) left++;
            else if (['中堅手方向', '投手', '二遊間', '捕手'].some(v => ab.direction.includes(v))) center++;
            else right++;
        });
        return { 
            left, center, right, grounder, total,
            leftPct: total > 0 ? ((left / total) * 100).toFixed(1) : '0.0',
            centerPct: total > 0 ? ((center / total) * 100).toFixed(1) : '0.0',
            rightPct: total > 0 ? ((right / total) * 100).toFixed(1) : '0.0',
            grounderPct: total > 0 ? ((grounder / total) * 100).toFixed(1) : '0.0',
        };
    }, [targetAtBats]);

    const resultStats = useMemo(() => {
        let hits = 0, bb = 0, hr = 0, outs = 0;
        targetAtBats.forEach(log => {
            const res = log.result;
            if (!res || res === '-') return;
            
            if (res.includes('本塁打') || res.includes('ホームラン')) hr++;
            else if (['安打','二塁打','三塁打','ヒット', 'バント安打', 'ツーベース', 'スリーベース'].some(v=>res.includes(v))) hits++;
            else if (['四球','死球','敬遠'].some(v=>res.includes(v))) bb++;
            else outs++;
        });

        return [
            { label: '安打', value: hits, color: '#10b981' },
            { label: '四死球', value: bb, color: '#3b82f6' },
            { label: '本塁打', value: hr, color: '#0ea5e9' },
            { label: 'アウト', value: outs, color: '#94a3b8' }
        ];
    }, [targetAtBats]);

    const outBreakdown = useMemo(() => {
        let k = 0, fly = 0, ground = 0, liner = 0, other = 0, total = 0;
        targetAtBats.forEach(ab => {
            const res = ab.result;
            const isOut = ['内野ゴロ', '内野フライ', '外野フライ', '三振', '見逃し', '空振り', '犠牲フライ', '犠牲バント', '併殺打', 'ライナー', 'エラー', '守備妨害'].some(val => res.includes(val));
            if (!isOut) return;
            total++;
            if (['三振', '見逃し', '空振り'].some(val => res.includes(val))) k++;
            else if (['フライ', '犠飛', '飛'].some(val => res.includes(val))) fly++;
            else if (['ゴロ', '併殺', 'バント'].some(val => res.includes(val))) ground++;
            else if (['ライナー', '直'].some(val => res.includes(val))) liner++;
            else other++;
        });
        return {
            k: { count: k, pct: total > 0 ? ((k / total) * 100).toFixed(1) : '0.0' },
            fly: { count: fly, pct: total > 0 ? ((fly / total) * 100).toFixed(1) : '0.0' },
            ground: { count: ground, pct: total > 0 ? ((ground / total) * 100).toFixed(1) : '0.0' },
            liner: { count: liner, pct: total > 0 ? ((liner / total) * 100).toFixed(1) : '0.0' },
            other: { count: other, pct: total > 0 ? ((other / total) * 100).toFixed(1) : '0.0' },
            total
        };
    }, [targetAtBats]);

    const pitchTypeBreakdown = useMemo(() => {
        const stats = {};
        targetAtBats.forEach(ab => {
            let pt = ab.pitch_type === '' || ab.pitch_type === 'undefined' || ab.pitch_type === 'null' ? '不明' : ab.pitch_type;
            if (!stats[pt]) {
                stats[pt] = { atBats: 0, hits: 0 };
            }
            const res = ab.result;
            
            const isHit = ['安打', '二塁打', '三塁打', '本塁打', 'ヒット', 'ツーベース', 'スリーベース', 'バント安打'].some(v => res.includes(v));
            const isWalkOrSac = ['四球', '死球', '犠飛', '犠牲バント', '敬遠', '犠打', 'バント'].some(v => res.includes(v));
            
            if (!isWalkOrSac && res && res !== '-') {
                stats[pt].atBats += 1;
                if (isHit) {
                    stats[pt].hits += 1;
                }
            }
        });
        return Object.entries(stats)
            .filter(([type, data]) => data.atBats > 0)
            .map(([type, data]) => ({
                type, atBats: data.atBats, hits: data.hits,
                avg: data.atBats > 0 ? (data.hits / data.atBats).toFixed(3).replace(/^0/, '') : '.000'
            })).sort((a, b) => b.atBats - a.atBats);
    }, [targetAtBats]);

    const runnerStats = useMemo(() => {
        const stats = {};
        targetAtBats.forEach(ab => {
            let state = String(ab.runner_state || 'ランナーなし');
            if (state.includes('2塁') || state.includes('3塁') || state === '満塁') state = '得点圏'; 
            if (!stats[state]) {
                stats[state] = { pa: 0, atBats: 0, hits: 0, walks: 0 };
            }
            
            const res = ab.result;
            const isHit = ['安打', '二塁打', '三塁打', '本塁打', 'ヒット', 'バント安打', 'ツーベース', 'スリーベース'].some(v => res.includes(v));
            const isWalk = ['四球', '死球', '敬遠'].some(v => res.includes(v));
            const isSac = ['犠飛', '犠牲バント', '犠打'].some(v => res.includes(v));

            stats[state].pa += 1;
            if (isWalk) {
                stats[state].walks += 1;
            }
            if (!isWalk && !isSac && res && res !== '-') {
                stats[state].atBats += 1;
                if (isHit) {
                    stats[state].hits += 1;
                }
            }
        });
        return Object.entries(stats).map(([state, data]) => ({
            state, atBats: data.atBats, hits: data.hits,
            avg: data.atBats > 0 ? (data.hits / data.atBats).toFixed(3).replace(/^0/, '') : '.000',
            obp: data.pa > 0 ? ((data.hits + data.walks) / data.pa).toFixed(3).replace(/^0/, '') : '.000'
        })).sort((a, b) => b.atBats - a.atBats);
    }, [targetAtBats]);

    const currentRispAvg = useMemo(() => {
        const rispStat = runnerStats.find(s => s.state === '得点圏');
        return rispStat ? rispStat.avg : '-';
    }, [runnerStats]);

    const vsHandStats = useMemo(() => {
        const stats = { '左': { ab: 0, hits: 0 }, '右': { ab: 0, hits: 0 } };
        targetAtBats.forEach(ab => {
            const pHand = ab.pitcherHand; 
            if (pHand === '左' || pHand === '右') {
                const res = ab.result;
                const isHit = ['安打', '二塁打', '三塁打', '本塁打', 'ヒット', 'ツーベース', 'スリーベース'].some(v => res.includes(v));
                const isWalkOrSac = ['四球', '死球', '犠飛', '犠牲バント', '敬遠', '犠打'].some(v => res.includes(v));
                if (!isWalkOrSac && res && res !== '-') {
                    stats[pHand].ab += 1;
                    if (isHit) stats[pHand].hits += 1;
                }
            }
        });
        return {
            left: stats['左'].ab > 0 ? calcAvg(stats['左'].hits, stats['左'].ab) : '-',
            right: stats['右'].ab > 0 ? calcAvg(stats['右'].hits, stats['右'].ab) : '-'
        };
    }, [targetAtBats]);

    const countStats = useMemo(() => {
        const stats = { '0-0': {ab:0,h:0}, '1-0 / 0-1': {ab:0,h:0}, '1-1': {ab:0,h:0}, '追い込まれ': {ab:0,h:0}, 'フルカウント': {ab:0,h:0} };
        targetAtBats.forEach(ab => {
            const b = getNum(ab, 'balls', 'b'); const s = getNum(ab, 'strikes', 's');
            const res = ab.result;
            if (!res || res === '-') return;
            const isHit = ['安打','二塁打','三塁打','本塁打','ヒット'].some(v=>res.includes(v));
            const isAb = !['四球','死球','犠飛','犠打','バント','敬遠'].some(v=>res.includes(v));
            
            let key = '0-0';
            if (b===3 && s===2) key = 'フルカウント';
            else if (s === 2) key = '追い込まれ';
            else if (b===1 && s===1) key = '1-1';
            else if ((b===1 && s===0) || (b===0 && s===1)) key = '1-0 / 0-1';

            if (isAb && stats[key]) { stats[key].ab += 1; if (isHit) stats[key].h += 1; }
        });
        return Object.entries(stats).filter(([k, v]) => v.ab > 0).map(([k, v]) => ({ count: k, atBats: v.ab, hits: v.h, avg: calcAvg(v.h, v.ab) }));
    }, [targetAtBats]);

    const gameLogs = useMemo(() => {
        const logs = {};
        let resultsForLog = filteredResults || [];
        if (activeTab === 'individual' && selectedPlayerId) {
            resultsForLog = resultsForLog.filter(r => resolveId(r.player) === String(selectedPlayerId));
        }

        resultsForLog.forEach(r => {
            const gameObj = filteredGames.find(g => String(g.id) === getSafeId(r.game));
            if (!gameObj) return;
            const date = gameObj.date;
            if (!logs[date]) {
                logs[date] = { 
                    date, opponent: gameObj.opponent, score: `${gameObj.my_score ?? '-'}-${gameObj.op_score ?? '-'}`, 
                    pa: 0, atBats: 0, hits: 0, hr: 0, rbi: 0, runs: 0, walks: 0, strikeouts: 0, steals: 0 
                };
            }
            logs[date].pa += getNum(r, 'plate_appearances', 'pa');
            logs[date].atBats += getNum(r, 'at_bats', 'ab');
            logs[date].hits += getNum(r, 'hits', 'h');
            logs[date].hr += getNum(r, 'home_runs', 'hr');
            logs[date].rbi += getNum(r, 'rbi');
            logs[date].runs += getNum(r, 'runs', 'r');
            logs[date].walks += getNum(r, 'walks', 'bb') + getNum(r, 'hit_by_pitch', 'hbp');
            logs[date].strikeouts += getNum(r, 'strikeouts', 'so', 'k');
            logs[date].steals += getNum(r, 'steals', 'sb');
        });

        return Object.values(logs).map(l => ({...l, avg: calcAvg(l.hits, l.atBats)})).sort((a, b) => new Date(b.date) - new Date(a.date)); 
    }, [filteredResults, filteredGames, activeTab, selectedPlayerId]);

    const monthlyStats = useMemo(() => {
        const months = {};
        
        const addStats = (gameId, dateStr, isPa, isAb, isHit, isWalk, isHbp, isD2, isD3, isHr) => {
            const d = new Date(dateStr);
            const m = d.getMonth() + 1; 
            if(!months[m]) {
                months[m] = { month: m, games: new Set(), atBats: 0, hits: 0, pa: 0, walks: 0, hbp: 0, doubles: 0, triples: 0, hr: 0 };
            }
            if(gameId) months[m].games.add(String(gameId));
            months[m].pa += isPa || 0; 
            months[m].atBats += isAb || 0; 
            months[m].hits += isHit || 0; 
            months[m].walks += isWalk || 0; 
            months[m].hbp += isHbp || 0;
            months[m].doubles += isD2 || 0; 
            months[m].triples += isD3 || 0; 
            months[m].hr += isHr || 0;
        };

        filteredResults.forEach(r => {
            const g = filteredGames.find(game => String(game.id) === getSafeId(r.game));
            if(g && g.date) addStats(g.id, g.date, getNum(r, 'plate_appearances', 'pa'), getNum(r, 'at_bats', 'ab'), getNum(r, 'hits', 'h'), getNum(r, 'walks', 'bb'), getNum(r, 'hit_by_pitch', 'hbp'), getNum(r, 'doubles', 'd2'), getNum(r, 'triples', 'd3'), getNum(r, 'home_runs', 'hr'));
        });
        
        return Object.values(months).sort((a, b) => {
            const seasonStartMonth = typeof window !== 'undefined' ? parseInt(localStorage.getItem('logistars_season_start_month') || '4', 10) : 4;
            const am = a.month >= seasonStartMonth ? a.month - 12 : a.month;
            const bm = b.month >= seasonStartMonth ? b.month - 12 : b.month;
            return am - bm;
        });
    }, [filteredResults, filteredGames]);

    const yearlyTrend = useMemo(() => {
        const trend = {};
        allResults.forEach(r => {
            const g = games.find(game => String(game.id) === getSafeId(r.game));
            if(!g || !g.date) return;
            const y = getSeasonYear(g.date);
            
            if(!trend[y]) trend[y] = { year: y, atBats: 0, hits: 0, hr: 0, rbi: 0 };
            trend[y].atBats += getNum(r, 'at_bats', 'ab'); 
            trend[y].hits += getNum(r, 'hits', 'h'); 
            trend[y].hr += getNum(r, 'home_runs', 'hr'); 
            trend[y].rbi += getNum(r, 'rbi');
        });
        return Object.values(trend).sort((a, b) => a.year - b.year);
    }, [allResults, games]);

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

    const sourceLabel = (text) => (
        <span className="text-[8px] font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-2 border border-slate-200 align-middle whitespace-nowrap">
            {text}
        </span>
    );

    const ProgressBar = ({ label, pct }) => (
        <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-bold text-slate-600 w-12">{label}</span>
            <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-slate-300 h-full rounded-full" style={{ width: `${pct}%` }}></div>
            </div>
            <span className="text-[10px] text-slate-500 w-8 text-right">{pct}%</span>
        </div>
    );

    const SvgDonut = ({ items, totalStr }) => {
        let total = items.reduce((s, item) => s + item.value, 0);
        if (total === 0) total = 1; 
        let cumulativePercent = 0;
        const circ = 100.53; 
        
        return (
            <div className="relative w-24 h-24 mx-auto flex-shrink-0">
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
                    <span className="text-[8px] text-slate-500 font-bold">合計</span>
                    <span className="text-sm font-black text-[#0b1c3a] leading-tight">{totalStr}<span className="text-[8px] font-normal ml-0.5">打席</span></span>
                </div>
            </div>
        );
    };

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
        if (baseStats.length === 0) {
            return <div className="p-12 text-center text-slate-500 font-bold">該当期間の打撃データがありません。<br/><span className="text-xs font-normal">画面右上の「Excel一括取込」から試合データを登録してください。</span></div>;
        }

        const donutTotal = resultStats.reduce((s,i)=>s+i.value,0);

        return (
            <div className="space-y-6 animate-fade-in text-sm text-slate-800">
                <div id="section-summary" className="bg-white p-6 border border-slate-200 shadow-sm rounded-xl relative">
                    <h3 className="text-xs font-bold text-slate-600 mb-6 border-l-4 border-blue-500 pl-2">
                        打撃成績サマリー <span className="text-[10px] font-normal text-slate-400">({periodLabel})</span> {sourceLabel('Excelデータ')}
                    </h3>
                    
                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 text-center">
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">試合数</span><span className="text-3xl font-black">{teamTotal.games}<span className="text-xs ml-1 font-bold text-slate-400">試合</span></span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">打数</span><span className="text-3xl font-black">{teamTotal.atBats}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">得点</span><span className="text-3xl font-black">{teamTotal.runs}</span><span className="text-[9px] text-slate-400 mt-1">(1試合平均 {runsPerGame})</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">安打</span><span className="text-3xl font-black text-blue-600">{teamTotal.hits}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">本塁打</span><span className="text-3xl font-black text-red-600">{teamTotal.hr}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-500 font-bold mb-1">打点</span><span className="text-3xl font-black text-blue-600">{teamTotal.rbi}</span></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6 text-center">
                        <div className="flex flex-col border border-slate-100 py-3 rounded-lg"><span className="text-[10px] text-slate-500 font-bold mb-1">打率</span><span className="text-2xl font-black">{teamAvg}</span></div>
                        <div className="flex flex-col border border-slate-100 py-3 rounded-lg"><span className="text-[10px] text-slate-500 font-bold mb-1">出塁率</span><span className="text-2xl font-black">{teamObp}</span></div>
                        <div className="flex flex-col border border-slate-100 py-3 rounded-lg"><span className="text-[10px] text-slate-500 font-bold mb-1">長打率</span><span className="text-2xl font-black">{teamSlg}</span></div>
                        <div className="flex flex-col border border-slate-100 py-3 rounded-lg bg-slate-50"><span className="text-[10px] text-slate-500 font-bold mb-1">OPS</span><span className="text-2xl font-black text-[#0b1c3a]">{teamOps}</span></div>
                        <div className="flex flex-col border border-slate-100 py-3 rounded-lg"><span className="text-[10px] text-slate-500 font-bold mb-1">得点圏打率</span><span className="text-2xl font-black">{currentRispAvg}</span></div>
                        <div className="flex flex-col border border-slate-100 py-3 rounded-lg"><span className="text-[10px] text-slate-500 font-bold mb-1">盗塁</span><span className="text-2xl font-black">{teamTotal.steals}</span></div>
                    </div>

                    <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center pt-4 border-t border-dashed border-slate-200">
                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">犠打</span><span className="text-xl font-bold">{teamTotal.sacBunts}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">犠飛</span><span className="text-xl font-bold">{teamTotal.sacFlies}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">四球</span><span className="text-xl font-bold">{teamTotal.walks}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">死球</span><span className="text-xl font-bold">{teamTotal.hbp}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">三振</span><span className="text-xl font-bold">{teamTotal.strikeouts}</span></div>
                        <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">併殺打</span><span className="text-xl font-bold">{teamTotal.dp}</span></div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div id="section-direction" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-6 flex items-center">打球方向割合 {sourceLabel('スマホ入力データ')}</h3>
                        <div className="space-y-4 pr-2">
                            <ProgressBar label="左方向" pct={directionStats.leftPct} />
                            <ProgressBar label="中方向" pct={directionStats.centerPct} />
                            <ProgressBar label="右方向" pct={directionStats.rightPct} />
                            <ProgressBar label="内野ゴロ" pct={directionStats.grounderPct} />
                        </div>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl flex flex-col justify-center col-span-1 lg:col-span-1 relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-6 flex items-center">打撃結果内訳 {sourceLabel('スマホ入力データ')}</h3>
                        {donutTotal === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4 my-auto">データなし</p>
                        ) : (
                            <div className="flex items-center justify-between px-2 gap-4 w-full">
                                <SvgDonut items={resultStats} totalStr={donutTotal} />
                                <div className="text-[9px] text-slate-600 space-y-2 flex-1 pl-2">
                                    {resultStats.map((r,i) => (
                                        <div key={i} className="flex justify-between items-center"><span className="font-bold flex items-center gap-1" style={{color: r.color}}><span className="text-[6px]">■</span> {r.label}</span><span className="font-bold text-slate-800">{r.value}</span></div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div id="section-outStats" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-4 flex items-center">凡退内訳 {sourceLabel('スマホ入力データ')}</h3>
                        {outBreakdown.total === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">データなし</p>
                        ) : (
                            <table className="w-full text-[10px] text-left whitespace-nowrap">
                                <thead className="text-slate-400 border-b border-dashed border-slate-200">
                                    <tr><th className="py-1.5 font-normal">凡退内容</th><th className="py-1.5 font-normal text-right">回数</th><th className="py-1.5 font-normal text-right pl-4">割合</th></tr>
                                </thead>
                                <tbody className="divide-y divide-dashed divide-slate-100">
                                    <tr><td className="py-2.5 font-bold text-slate-700">三振</td><td className="py-2.5 text-right font-bold">{outBreakdown.k.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.k.pct}%</td></tr>
                                    <tr><td className="py-2.5 font-bold text-slate-700">フライアウト</td><td className="py-2.5 text-right font-bold">{outBreakdown.fly.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.fly.pct}%</td></tr>
                                    <tr><td className="py-2.5 font-bold text-slate-700">ゴロ / 併殺</td><td className="py-2.5 text-right font-bold">{outBreakdown.ground.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.ground.pct}%</td></tr>
                                    <tr><td className="py-2.5 font-bold text-slate-700">ライナー</td><td className="py-2.5 text-right font-bold">{outBreakdown.liner.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.liner.pct}%</td></tr>
                                    <tr><td className="py-2.5 font-bold text-slate-700">その他</td><td className="py-2.5 text-right font-bold">{outBreakdown.other.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.other.pct}%</td></tr>
                                </tbody>
                                <tfoot className="border-t border-slate-300">
                                    <tr><td className="py-2.5 font-black text-[#0b1c3a]">合計</td><td className="py-2.5 text-right font-black">{outBreakdown.total}</td><td className="py-2.5 text-right font-black pl-4">100%</td></tr>
                                </tfoot>
                            </table>
                        )}
                    </div>

                    <div id="section-pitchType" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-4 flex items-center">球種別成績 {sourceLabel('スマホ入力データ')}</h3>
                        {pitchTypeBreakdown.length === 0 ? (
                            <p className="text-[10px] text-slate-400 text-center py-6">データなし</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] text-center whitespace-nowrap">
                                    <thead className="text-slate-400 border-b border-dashed border-slate-200">
                                        <tr><th className="py-1.5 font-normal text-left">球種</th><th className="py-1.5 font-normal">打数</th><th className="py-1.5 font-normal">安打</th><th className="py-1.5 font-normal">打率</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-dashed divide-slate-100">
                                        {pitchTypeBreakdown.slice(0, 6).map((pt, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-2.5 font-bold text-slate-700 text-left">{pt.type}</td>
                                                <td className="py-2.5">{pt.ab}</td>
                                                <td className="py-2.5 font-bold text-blue-600">{pt.hits}</td>
                                                <td className="py-2.5 font-black text-[#0b1c3a]">{pt.avg}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                    <div id="section-gameLogs" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 flex items-center">試合別打撃成績 <span className="font-normal text-slate-400 ml-1">(自動集計)</span> {sourceLabel('Excelデータ')}</h3>
                            {gameLogs.length > 5 && (
                                <button onClick={() => setShowAllGameLogsTeam(!showAllGameLogsTeam)} className="text-[9px] border border-slate-300 rounded px-3 py-1 font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                                    {showAllGameLogsTeam ? '閉じる' : 'すべて見る'}
                                </button>
                            )}
                        </div>
                        {gameLogs.length === 0 ? <p className="text-[10px] text-slate-400 text-center py-6">データなし</p> : (
                            <div className="overflow-x-auto hide-scrollbar">
                                <table className="w-full text-[10px] text-center whitespace-nowrap">
                                    <thead className="text-slate-400 border-b border-dashed border-slate-200">
                                        <tr>
                                            <th className="py-2 font-normal text-left">日付</th><th className="py-2 font-normal text-left">対戦相手</th><th>スコア</th><th>打席</th><th>打数</th><th>安打</th><th>本塁打</th><th>打点</th><th>得点</th><th>四球</th><th>三振</th><th>打率</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dashed divide-slate-100">
                                        {(showAllGameLogsTeam ? gameLogs : gameLogs.slice(0, 5)).map((g, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-2.5 font-bold text-slate-700 text-left">{g.date.substring(5).replace('-','/')}</td>
                                                <td className="py-2.5 font-bold text-[#0b1c3a] text-left">{g.opponent}</td>
                                                <td className="text-blue-600 font-bold">{g.score}</td>
                                                <td>{g.pa}</td><td>{g.atBats}</td><td className="font-bold text-[#0b1c3a]">{g.hits}</td><td className="text-red-600">{g.hr}</td><td className="text-blue-700 font-bold">{g.rbi}</td><td>{g.runs}</td><td>{g.walks}</td><td>{g.strikeouts}</td><td className="font-bold text-[#0b1c3a]">{calcAvg(g.hits, g.atBats)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    
                    <div id="section-situation" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-4 flex items-center">状況別打撃成績 {sourceLabel('スマホ入力データ')}</h3>
                        {runnerStats.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4 my-auto">データなし</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] text-center whitespace-nowrap">
                                    <thead className="text-slate-400 border-b border-dashed border-slate-200">
                                        <tr><th className="py-1.5 font-normal text-left">状況</th><th className="py-1.5 font-normal">打数</th><th className="py-1.5 font-normal">安打</th><th className="py-1.5 font-normal">打率</th><th className="py-1.5 font-normal">出塁率</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-dashed divide-slate-100">
                                        {runnerStats.filter(s => s.state === '得点圏').map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 font-bold text-slate-700 text-left">{r.state}</td>
                                                <td className="py-3">{r.atBats}</td>
                                                <td className="py-3 font-bold text-blue-600">{r.hits}</td>
                                                <td className="py-3 font-black text-[#0b1c3a]">{r.avg}</td>
                                                <td className="py-3 font-bold">{r.obp}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-blue-500 pl-2">長打の内訳 {sourceLabel('Excelデータ')}</h3>
                        <table className="w-full text-[10px] text-center mt-2">
                            <thead className="border-b border-slate-200 text-slate-400"><tr><th className="text-left py-1">種類</th><th>本数</th><th>割合(安打比)</th></tr></thead>
                            <tbody className="divide-y divide-dashed divide-slate-100">
                                <tr><td className="text-left py-1.5 font-bold text-slate-600">二塁打</td><td className="font-bold text-[#0b1c3a]">{teamTotal.doubles}</td><td>{teamTotal.hits > 0 ? ((teamTotal.doubles / teamTotal.hits) * 100).toFixed(1) + '%' : '-'}</td></tr>
                                <tr><td className="text-left py-1.5 font-bold text-slate-600">三塁打</td><td className="font-bold text-[#0b1c3a]">{teamTotal.triples}</td><td>{teamTotal.hits > 0 ? ((teamTotal.triples / teamTotal.hits) * 100).toFixed(1) + '%' : '-'}</td></tr>
                                <tr><td className="text-left py-1.5 font-bold text-slate-600">本塁打</td><td className="font-bold text-red-600">{teamTotal.hr}</td><td>{teamTotal.hits > 0 ? ((teamTotal.hr / teamTotal.hits) * 100).toFixed(1) + '%' : '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm relative lg:col-span-2">
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-blue-500 pl-2">月別打撃成績 {sourceLabel('Excelデータ')}</h3>
                        {monthlyStats.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">データなし</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] text-center mt-2 whitespace-nowrap">
                                    <thead className="border-b border-slate-200 text-slate-400"><tr><th className="text-left py-1">月</th><th>試合</th><th>打席</th><th>打数</th><th>安打</th><th>本塁打</th><th>四死球</th><th>打率</th></tr></thead>
                                    <tbody className="divide-y divide-dashed divide-slate-100">
                                        {monthlyStats.map(m => (
                                            <tr key={m.month}>
                                                <td className="text-left py-1 font-bold text-slate-600">{m.month}月</td>
                                                <td>{m.games?.size || 0}</td><td>{m.pa}</td><td>{m.atBats}</td><td className="font-bold text-[#0b1c3a]">{m.hits}</td><td className="text-red-600">{m.hr}</td><td>{m.walks + m.hbp}</td>
                                                <td className="font-bold text-[#0b1c3a]">{calcAvg(m.hits, m.atBats)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-blue-500 pl-2">年度推移 <span className="text-[8px] font-normal text-slate-400">(打率)</span> {sourceLabel('Excelデータ')}</h3>
                        {yearlyTrend.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">データなし</p>
                        ) : (
                            <table className="w-full text-[10px] text-center mt-2">
                                <thead className="border-b border-slate-200 text-slate-400"><tr><th className="text-left py-1">年度</th><th>打数</th><th>安打</th><th>打率</th></tr></thead>
                                <tbody className="divide-y divide-dashed divide-slate-100">
                                    {yearlyTrend.map(y => (
                                        <tr key={y.year}>
                                            <td className="text-left py-1 font-bold text-slate-600">{y.year}年度</td>
                                            <td>{y.atBats}</td><td>{y.hits}</td><td className="font-bold text-[#0b1c3a]">{calcAvg(y.hits, y.atBats)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const renderRanking = () => {
        if (analyzedStats.length === 0) {
            return <div className="p-12 text-center text-slate-500 font-bold">該当期間の打撃データがありません。<br/><span className="text-xs font-normal">画面右上の「Excel一括取込」から試合データを登録してください。</span></div>;
        }

        const itemsPerPage = 15;
        const totalPages = Math.max(1, Math.ceil(analyzedStats.length / itemsPerPage));
        const paginatedStats = analyzedStats.slice((rankingPage - 1) * itemsPerPage, rankingPage * itemsPerPage);

        return (
            <div className="space-y-4 animate-fade-in text-sm text-slate-800">
                <div className="bg-white p-6 border border-slate-200 shadow-sm rounded-lg">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-base font-bold text-[#0b1c3a] flex items-center">打撃ランキング <span className="text-[10px] text-slate-500 font-normal ml-2">({periodLabel})</span> {sourceLabel('Excelデータ')}</h2>
                            <p className="text-[10px] text-slate-400 mt-1">選手の打撃成績を各指標でランキング表示します</p>
                        </div>
                        <select className="text-[10px] border border-slate-300 rounded px-2 py-1 outline-none text-slate-600 bg-white cursor-pointer">
                            <option>規定打席以上</option>
                            <option>全選手</option>
                        </select>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-dashed border-slate-200">
                        {['OPS', '打率', 'HR', '打点', '得点', '安打', '出塁率(OBP)', '長打率(SLG)', '盗塁', '打席'].map(key => {
                            const mKey = key === 'HR' ? 'hr' : key === '出塁率(OBP)' ? 'obp' : key === '長打率(SLG)' ? 'slg' : key === '打点' ? 'rbi' : key === '得点' ? 'runs' : key === '安打' ? 'hits' : key === '打率' ? 'avg' : key === '打席' ? 'plateAppearances' : 'ops';
                            return (
                                <button 
                                    key={key} 
                                    onClick={() => setSortKey(mKey)}
                                    className={`px-6 py-2 rounded text-[10px] font-bold border transition-colors shadow-sm ${sortKey === mKey ? 'bg-[#0b1c3a] text-white border-[#0b1c3a]' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
                                >
                                    {key}
                                </button>
                            )
                        })}
                    </div>

                    <div className="bg-white border border-slate-200 rounded-lg overflow-x-auto shadow-sm">
                        <table className="w-full text-center text-xs whitespace-nowrap">
                            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[10px]">
                                <tr>
                                    <th className="py-4 px-2 border-r border-slate-200">順位</th><th className="py-4 px-4 text-left border-r border-slate-200">選手名</th>
                                    <th className="py-4 px-3">試合</th><th className="py-4 px-3">打席</th><th className="py-4 px-3 border-r border-slate-200">打数</th>
                                    <th className="py-4 px-3 border-r border-dashed border-slate-200 text-blue-700 font-bold">打率</th>
                                    <th className="py-4 px-3">安打</th><th className="py-4 px-3">本塁打</th><th className="py-4 px-3">打点</th>
                                    <th className="py-4 px-3 border-r border-slate-200">得点</th><th className="py-4 px-3">四球</th><th className="py-4 px-3">三振</th><th className="py-4 px-3 border-r border-slate-200">盗塁</th>
                                    <th className="py-4 px-3 text-blue-600">打率</th><th className="py-4 px-3 text-blue-600">出塁率 (OBP)</th><th className="py-4 px-3 text-blue-600">長打率 (SLG)</th><th className="py-4 px-3 font-bold text-[#0b1c3a] bg-blue-50/50">OPS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {paginatedStats.map((stat, idx) => {
                                    const realIndex = (rankingPage - 1) * itemsPerPage + idx;
                                    return (
                                    <tr key={stat.playerId} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-3 px-2 border-r border-slate-100">
                                            <span className={`w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold mx-auto ${realIndex === 0 ? 'bg-yellow-400 text-white shadow-sm' : realIndex === 1 ? 'bg-slate-300 text-white shadow-sm' : realIndex === 2 ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-500'}`}>
                                                {realIndex + 1}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-left font-bold text-slate-700 border-r border-slate-100 cursor-pointer hover:text-blue-600 hover:underline" onClick={() => {setSelectedPlayerId(stat.playerId); setActiveTab('individual');}}>
                                            <span className={stat.player.isRetired ? "text-slate-400 font-normal" : ""}>{stat.player.displayName}</span>
                                        </td>
                                        <td className="py-3 px-3 text-slate-500">{stat.games}</td>
                                        <td className="py-3 px-3 text-slate-500">{stat.plateAppearances}</td>
                                        <td className="py-3 px-3 text-slate-500 border-r border-slate-100">{stat.atBats}</td>
                                        <td className={`py-3 px-3 ${sortKey === 'avg' ? 'font-bold bg-blue-50/50 text-[#0b1c3a]' : 'text-blue-600 font-bold'}`}>{stat.avg}</td>
                                        <td className={`py-3 px-3 ${sortKey === 'hits' ? 'font-bold bg-blue-50/50 text-[#0b1c3a]' : 'font-bold text-slate-700'}`}>{stat.hits}</td>
                                        <td className={`py-3 px-3 ${sortKey === 'hr' ? 'font-bold bg-blue-50/50 text-[#0b1c3a]' : 'font-bold text-red-500'}`}>{stat.hr}</td>
                                        <td className={`py-3 px-3 ${sortKey === 'rbi' ? 'font-bold bg-blue-50/50 text-[#0b1c3a]' : 'font-bold text-blue-600'}`}>{stat.rbi}</td>
                                        <td className={`py-3 px-3 border-r border-slate-100 ${sortKey === 'runs' ? 'font-bold bg-blue-50/50 text-[#0b1c3a]' : 'text-slate-600'}`}>{stat.runs}</td>
                                        <td className="py-3 px-3 text-slate-500">{stat.walks + stat.hbp}</td>
                                        <td className="py-3 px-3 text-slate-500">{stat.k}</td>
                                        <td className="py-3 px-3 text-slate-500 border-r border-slate-100">{stat.steals}</td>
                                        <td className={`py-3 px-3 ${sortKey === 'avg' ? 'font-bold bg-blue-50/50 text-[#0b1c3a]' : 'text-blue-600 font-bold'}`}>{stat.avg}</td>
                                        <td className={`py-3 px-3 ${sortKey === 'obp' ? 'font-bold bg-blue-50/50 text-[#0b1c3a]' : 'text-blue-600 font-bold'}`}>{stat.obp}</td>
                                        <td className={`py-3 px-3 ${sortKey === 'slg' ? 'font-bold bg-blue-50/50 text-[#0b1c3a]' : 'text-blue-600 font-bold'}`}>{stat.slg}</td>
                                        <td className={`py-3 px-3 font-bold text-red-600 ${sortKey === 'ops' ? 'bg-red-50' : 'bg-blue-50/30'}`}>{stat.ops}</td>
                                    </tr>
                                )})}
                            </tbody>
                        </table>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] text-slate-400">※ 規定打席: チーム試合数 × 3.1</p>
                        <div className="flex gap-1 text-[10px]">
                            <button onClick={() => setRankingPage(Math.max(1, rankingPage - 1))} className="border border-slate-300 rounded px-2 py-1 hover:bg-slate-50">&lt;</button>
                            {[...Array(totalPages)].map((_, i) => (
                                <button key={i} onClick={() => setRankingPage(i + 1)} className={`border rounded px-2 py-1 ${rankingPage === i + 1 ? 'border-[#0b1c3a] bg-[#0b1c3a] text-white shadow-sm' : 'border-slate-300 hover:bg-slate-50 bg-white'}`}>
                                    {i + 1}
                                </button>
                            ))}
                            <button onClick={() => setRankingPage(Math.min(totalPages, rankingPage + 1))} className="border border-slate-300 rounded px-2 py-1 hover:bg-slate-50 bg-white">&gt;</button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderIndividual = () => {
        if (analyzedStats.length === 0) {
            return <div className="p-12 text-center text-slate-500 font-bold">該当期間の打撃データがありません。<br/><span className="text-xs font-normal">画面右上の「Excel一括取込」から試合データを登録してください。</span></div>;
        }

        const pStat = analyzedStats.find(s => String(s.playerId) === String(selectedPlayerId)) || analyzedStats[0];
        if (!pStat) return null;

        const donutTotal = resultStats.reduce((s,i)=>s+i.value,0);

        return (
            <div className="space-y-4 animate-fade-in text-slate-800">
                <div id="section-summary" className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col lg:flex-row gap-8 shadow-sm">
                    <div className="flex gap-4 lg:w-1/3 lg:border-r border-b lg:border-b-0 border-dashed border-slate-300 pb-4 lg:pb-0 lg:pr-8">
                        <div className="w-24 h-28 bg-slate-200 rounded-lg overflow-hidden shrink-0 border border-slate-200 shadow-sm flex items-center justify-center">
                            {pStat.player.photo ? <img src={pStat.player.photo} alt="face" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-4xl text-slate-400 bg-slate-100">👤</div>}
                        </div>
                        <div className="flex flex-col justify-center w-full">
                            <select 
                                value={selectedPlayerId} 
                                onChange={e => setSelectedPlayerId(e.target.value)}
                                className="text-2xl font-black text-[#0b1c3a] outline-none border-b-2 border-blue-500 bg-transparent w-full mb-3 cursor-pointer pb-1"
                            >
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
                            <div className="flex items-center gap-3 text-xs font-bold text-[#0b1c3a] mb-4">
                                <span className="text-3xl pr-3 border-r border-slate-300">{pStat.player.number}</span>
                                <div className="flex flex-col text-[10px] text-slate-500 font-normal">
                                    <span>{pStat.player.position} / {pStat.player.batting_hand}</span>
                                    <span className="font-bold text-blue-600 mt-0.5 flex items-center gap-1">LOGISTARS</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-y-2 text-[9px] text-slate-500">
                                <div>生年月日<br/><span className="text-slate-800 font-bold text-[11px]">{pStat.player.birth_date || '-'}</span></div>
                                <div>身長 / 体重<br/><span className="text-slate-800 font-bold text-[11px]">{pStat.player.height || '-'}cm / {pStat.player.weight || '-'}kg</span></div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[11px] font-bold text-slate-600 border-l-4 border-blue-500 pl-2">個人打撃サマリー <span className="font-normal text-slate-400">({periodLabel})</span> {sourceLabel('Excelデータ')}</h3>
                        </div>
                        
                        <div className="grid grid-cols-4 md:grid-cols-8 gap-y-4 gap-x-2 text-center border-b border-dashed border-slate-200 pb-4 mb-4">
                            <div><span className="text-[10px] text-slate-400 block mb-1">打率</span><span className="text-xl font-black text-[#0b1c3a]">{pStat.avg}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">試合</span><span className="text-xl font-black">{pStat.games}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">打席</span><span className="text-xl font-black">{pStat.plateAppearances}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">打数</span><span className="text-xl font-black">{pStat.atBats}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">安打</span><span className="text-xl font-black text-red-600">{pStat.hits}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">二塁打</span><span className="text-xl font-black">{pStat.doubles}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">三塁打</span><span className="text-xl font-bold">{pStat.triples}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">本塁打</span><span className="text-xl font-black text-red-600">{pStat.hr}</span></div>
                        </div>

                        <div className="grid grid-cols-4 md:grid-cols-8 gap-y-4 gap-x-2 text-center border-b border-dashed border-slate-200 pb-4 mb-4">
                            <div><span className="text-[10px] text-slate-400 block mb-1">塁打</span><span className="text-lg font-bold">{pStat.hits + pStat.doubles + (pStat.triples*2) + (pStat.hr*3)}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">打点</span><span className="text-lg font-bold">{pStat.rbi}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">得点</span><span className="text-lg font-bold">{pStat.runs}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">三振</span><span className="text-lg font-bold">{pStat.strikeouts}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">四球</span><span className="text-lg font-bold">{pStat.walks}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">死球</span><span className="text-lg font-bold">{pStat.hbp}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">犠打</span><span className="text-lg font-bold">{pStat.sacBunts}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">出塁率</span><span className="text-xl font-black text-blue-600">{pStat.obp}</span></div>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-7 gap-2 text-center">
                            <div><span className="text-[10px] text-slate-400 block mb-1">長打率</span><span className="text-lg font-bold">{pStat.slg}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">OPS</span><span className="text-xl font-black text-red-600">{pStat.ops}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">盗塁</span><span className="text-lg font-bold">{pStat.steals}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">盗塁成功率</span><span className="text-lg font-bold">{pStat.sbPct || '-'}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">得点圏打率</span><span className="text-lg font-bold">{currentRispAvg}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">対左打率</span><span className="text-lg font-bold">{vsHandStats.left}</span></div>
                            <div><span className="text-[10px] text-slate-400 block mb-1">対右打率</span><span className="text-lg font-bold">{vsHandStats.right}</span></div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                    <div id="section-direction" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-6 flex items-center">打球方向割合 {sourceLabel('スマホ入力データ')}</h3>
                        <div className="space-y-4 pr-2">
                            <ProgressBar label="左方向" pct={directionStats.leftPct} />
                            <ProgressBar label="中方向" pct={directionStats.centerPct} />
                            <ProgressBar label="右方向" pct={directionStats.rightPct} />
                            <ProgressBar label="内野ゴロ" pct={directionStats.grounderPct} />
                        </div>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl flex flex-col justify-center col-span-1 lg:col-span-1 relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-6 flex items-center">打撃結果内訳 {sourceLabel('スマホ入力データ')}</h3>
                        {donutTotal === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4 my-auto">データなし</p>
                        ) : (
                            <div className="flex items-center justify-between px-2 gap-4 w-full">
                                <SvgDonut items={resultStats} totalStr={donutTotal} />
                                <div className="text-[9px] text-slate-600 space-y-2 flex-1 pl-2">
                                    {resultStats.map((r,i) => (
                                        <div key={i} className="flex justify-between items-center"><span className="font-bold flex items-center gap-1" style={{color: r.color}}><span className="text-[6px]">■</span> {r.label}</span><span className="font-bold text-slate-800">{r.value}</span></div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div id="section-outStats" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-4 flex items-center">凡退内訳 {sourceLabel('スマホ入力データ')}</h3>
                        {outBreakdown.total === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">データなし</p>
                        ) : (
                            <table className="w-full text-[10px] text-left whitespace-nowrap">
                                <thead className="text-slate-400 border-b border-dashed border-slate-200">
                                    <tr><th className="py-1.5 font-normal">凡退内容</th><th className="py-1.5 font-normal text-right">回数</th><th className="py-1.5 font-normal text-right pl-4">割合</th></tr>
                                </thead>
                                <tbody className="divide-y divide-dashed divide-slate-100">
                                    <tr><td className="py-2.5 font-bold text-slate-700">三振</td><td className="py-2.5 text-right font-bold">{outBreakdown.k.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.k.pct}%</td></tr>
                                    <tr><td className="py-2.5 font-bold text-slate-700">フライアウト</td><td className="py-2.5 text-right font-bold">{outBreakdown.fly.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.fly.pct}%</td></tr>
                                    <tr><td className="py-2.5 font-bold text-slate-700">ゴロ / 併殺</td><td className="py-2.5 text-right font-bold">{outBreakdown.ground.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.ground.pct}%</td></tr>
                                    <tr><td className="py-2.5 font-bold text-slate-700">ライナー</td><td className="py-2.5 text-right font-bold">{outBreakdown.liner.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.liner.pct}%</td></tr>
                                    <tr><td className="py-2.5 font-bold text-slate-700">その他</td><td className="py-2.5 text-right font-bold">{outBreakdown.other.count}</td><td className="py-2.5 text-right text-slate-500 pl-4">{outBreakdown.other.pct}%</td></tr>
                                </tbody>
                                <tfoot className="border-t border-slate-300">
                                    <tr><td className="py-2.5 font-black text-[#0b1c3a]">合計</td><td className="py-2.5 text-right font-black">{outBreakdown.total}</td><td className="py-2.5 text-right font-black pl-4">100%</td></tr>
                                </tfoot>
                            </table>
                        )}
                    </div>

                    <div id="section-pitchType" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-4 flex items-center">球種別成績 {sourceLabel('スマホ入力データ')}</h3>
                        {pitchTypeBreakdown.length === 0 ? (
                            <p className="text-[10px] text-slate-400 text-center py-6">データなし</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] text-center whitespace-nowrap">
                                    <thead className="text-slate-400 border-b border-dashed border-slate-200">
                                        <tr><th className="py-1.5 font-normal text-left">球種</th><th className="py-1.5 font-normal">打数</th><th className="py-1.5 font-normal">安打</th><th className="py-1.5 font-normal">打率</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-dashed divide-slate-100">
                                        {pitchTypeBreakdown.slice(0, 6).map((pt, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-2.5 font-bold text-slate-700 text-left">{pt.type}</td>
                                                <td className="py-2.5">{pt.ab}</td>
                                                <td className="py-2.5 font-bold text-blue-600">{pt.hits}</td>
                                                <td className="py-2.5 font-black text-[#0b1c3a]">{pt.avg}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
                    <div id="section-gameLogs" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 flex items-center">試合別打撃成績 <span className="font-normal text-slate-400 ml-1">(自動集計)</span> {sourceLabel('Excelデータ')}</h3>
                            {gameLogs.length > 5 && (
                                <button onClick={() => setShowAllGameLogsIndiv(!showAllGameLogsIndiv)} className="text-[9px] border border-slate-300 rounded px-3 py-1 font-bold text-slate-500 hover:bg-slate-50 transition-colors">
                                    {showAllGameLogsIndiv ? '閉じる' : 'すべて見る'}
                                </button>
                            )}
                        </div>
                        {gameLogs.length === 0 ? <p className="text-[10px] text-slate-400 text-center py-6">データなし</p> : (
                            <div className="overflow-x-auto hide-scrollbar">
                                <table className="w-full text-[10px] text-center whitespace-nowrap">
                                    <thead className="text-slate-400 border-b border-dashed border-slate-200">
                                        <tr>
                                            <th className="py-2 font-normal text-left">日付</th><th className="py-2 font-normal text-left">対戦相手</th><th>スコア</th><th>打席</th><th>打数</th><th>安打</th><th>本塁打</th><th>打点</th><th>得点</th><th>四球</th><th>三振</th><th>打率</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-dashed divide-slate-100">
                                        {(showAllGameLogsIndiv ? gameLogs : gameLogs.slice(0, 5)).map((g, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-2.5 font-bold text-slate-700 text-left">{g.date.substring(5).replace('-','/')}</td>
                                                <td className="py-2.5 font-bold text-[#0b1c3a] text-left">{g.opponent}</td>
                                                <td className="text-blue-600 font-bold">{g.score}</td>
                                                <td>{g.pa}</td><td>{g.atBats}</td><td className="font-bold text-[#0b1c3a]">{g.hits}</td><td className="text-red-600">{g.hr}</td><td className="text-blue-700 font-bold">{g.rbi}</td><td>{g.runs}</td><td>{g.walks}</td><td>{g.strikeouts}</td><td className="font-bold text-[#0b1c3a]">{calcAvg(g.hits, g.atBats)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    
                    <div id="section-situation" className="bg-white p-4 border border-slate-200 shadow-sm rounded-xl relative">
                        {!isRealAtBats && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl"><span className="bg-[#0b1c3a] text-white text-[10px] px-2 py-1 rounded shadow">スマホ入力待ち</span></div>}
                        <h3 className="text-[10px] font-bold text-slate-700 border-l-4 border-blue-600 pl-2 mb-4 flex items-center">状況別打撃成績 {sourceLabel('スマホ入力データ')}</h3>
                        {runnerStats.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4 my-auto">データなし</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] text-center whitespace-nowrap">
                                    <thead className="text-slate-400 border-b border-dashed border-slate-200">
                                        <tr><th className="py-1.5 font-normal text-left">状況</th><th className="py-1.5 font-normal">打数</th><th className="py-1.5 font-normal">安打</th><th className="py-1.5 font-normal">打率</th><th className="py-1.5 font-normal">出塁率</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-dashed divide-slate-100">
                                        {runnerStats.filter(s => s.state === '得点圏').map((r, i) => (
                                            <tr key={i} className="hover:bg-slate-50 transition-colors">
                                                <td className="py-3 font-bold text-slate-700 text-left">{r.state}</td>
                                                <td className="py-3">{r.atBats}</td>
                                                <td className="py-3 font-bold text-blue-600">{r.hits}</td>
                                                <td className="py-3 font-black text-[#0b1c3a]">{r.avg}</td>
                                                <td className="py-3 font-bold">{r.obp}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-blue-500 pl-2">長打の内訳 {sourceLabel('Excelデータ')}</h3>
                        <table className="w-full text-[10px] text-center mt-2">
                            <thead className="border-b border-slate-200 text-slate-400"><tr><th className="text-left py-1">種類</th><th>本数</th><th>割合(安打比)</th></tr></thead>
                            <tbody className="divide-y divide-dashed divide-slate-100">
                                <tr><td className="text-left py-1.5 font-bold text-slate-600">二塁打</td><td className="font-bold text-[#0b1c3a]">{pStat.doubles}</td><td>{pStat.hits > 0 ? ((pStat.doubles / pStat.hits) * 100).toFixed(1) + '%' : '-'}</td></tr>
                                <tr><td className="text-left py-1.5 font-bold text-slate-600">三塁打</td><td className="font-bold text-[#0b1c3a]">{pStat.triples}</td><td>{pStat.hits > 0 ? ((pStat.triples / pStat.hits) * 100).toFixed(1) + '%' : '-'}</td></tr>
                                <tr><td className="text-left py-1.5 font-bold text-slate-600">本塁打</td><td className="font-bold text-red-600">{pStat.hr}</td><td>{pStat.hits > 0 ? ((pStat.hr / pStat.hits) * 100).toFixed(1) + '%' : '-'}</td></tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm relative lg:col-span-2">
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-blue-500 pl-2">月別打撃成績 {sourceLabel('Excelデータ')}</h3>
                        {monthlyStats.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">データなし</p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-[10px] text-center mt-2 whitespace-nowrap">
                                    <thead className="border-b border-slate-200 text-slate-400"><tr><th className="text-left py-1">月</th><th>試合</th><th>打席</th><th>打数</th><th>安打</th><th>本塁打</th><th>四死球</th><th>打率</th></tr></thead>
                                    <tbody className="divide-y divide-dashed divide-slate-100">
                                        {monthlyStats.map(m => (
                                            <tr key={m.month}>
                                                <td className="text-left py-1 font-bold text-slate-600">{m.month}月</td>
                                                <td>{m.games?.size || 0}</td><td>{m.pa}</td><td>{m.atBats}</td><td className="font-bold text-[#0b1c3a]">{m.hits}</td><td className="text-red-600">{m.hr}</td><td>{m.walks + m.hbp}</td>
                                                <td className="font-bold text-[#0b1c3a]">{calcAvg(m.hits, m.atBats)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <div className="bg-white p-4 border border-slate-200 rounded-lg shadow-sm">
                        <h3 className="text-[10px] font-bold text-slate-600 mb-2 border-l-4 border-blue-500 pl-2">年度推移 <span className="text-[8px] font-normal text-slate-400">(打率)</span> {sourceLabel('Excelデータ')}</h3>
                        {yearlyTrend.length === 0 ? (
                            <p className="text-xs text-slate-400 text-center py-4">データなし</p>
                        ) : (
                            <table className="w-full text-[10px] text-center mt-2">
                                <thead className="border-b border-slate-200 text-slate-400"><tr><th className="text-left py-1">年度</th><th>打数</th><th>安打</th><th>打率</th></tr></thead>
                                <tbody className="divide-y divide-dashed divide-slate-100">
                                    {yearlyTrend.map(y => (
                                        <tr key={y.year}>
                                            <td className="text-left py-1 font-bold text-slate-600">{y.year}年度</td>
                                            <td>{y.atBats}</td><td>{y.hits}</td><td className="font-bold text-[#0b1c3a]">{calcAvg(y.hits, y.atBats)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>
        );
    };

    return (
        <div className="w-full pb-20 font-sans">
            <div className="bg-[#0b1c3a] text-white overflow-hidden shadow-md border-b border-blue-500">
                <div className="px-4 md:px-6 py-4 border-b border-blue-900 flex flex-col lg:flex-row lg:justify-between lg:items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] gap-4">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black tracking-widest flex items-center gap-2">
                            <span>🏏</span> 打撃データ 
                            <span className="text-xs md:text-sm font-bold text-blue-200 ml-2">({activeTab === 'team' ? 'チーム成績' : activeTab === 'ranking' ? '打撃ランキング' : '個人詳細・記録分析'})</span>
                        </h2>
                        <p className="text-[9px] md:text-[10px] text-blue-100 mt-2">チーム全体の試合・選手・成績データを一元管理し、チームの勝利をデータで支える</p>
                    </div>
                    
                    <div className="flex w-full lg:w-auto justify-end mt-2 lg:mt-0">
                        <FilterControls />
                    </div>
                </div>
                <div className="flex px-2 overflow-x-auto whitespace-nowrap hide-scrollbar text-xs font-bold bg-[#08152c]">
                    <button onClick={() => {setActiveTab('team'); setActiveSubTab('summary');}} className={`px-4 py-3 border-b-4 transition-colors ${activeTab === 'team' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white'}`}>サマリー</button>
                    <button onClick={() => {setActiveTab('ranking'); setActiveSubTab('summary');}} className={`px-4 py-3 border-b-4 transition-colors ${activeTab === 'ranking' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white'}`}>打撃ランキング</button>
                    <button onClick={() => {setActiveTab('individual'); setActiveSubTab('summary');}} className={`px-4 py-3 border-b-4 transition-colors ${activeTab === 'individual' ? 'border-white text-white' : 'border-transparent text-blue-200 hover:text-white'}`}>個人データ分析</button>
                </div>
            </div>

            <div className="p-4 md:p-6 bg-slate-50 min-h-screen border-b border-slate-200 shadow-sm">
                
                {activeTab !== 'ranking' && (
                <div className="flex px-2 mb-6 overflow-x-auto whitespace-nowrap hide-scrollbar text-[11px] font-bold border-b border-slate-300 gap-2">
                    <button onClick={() => scrollToSection('summary')} className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === 'summary' ? 'border-[#0b1c3a] text-[#0b1c3a]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>サマリー</button>
                    <button onClick={() => scrollToSection('gameLogs')} className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === 'gameLogs' ? 'border-[#0b1c3a] text-[#0b1c3a]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>試合別</button>
                    <button onClick={() => scrollToSection('direction')} className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === 'direction' ? 'border-[#0b1c3a] text-[#0b1c3a]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>打球方向・結果</button>
                    <button onClick={() => scrollToSection('outStats')} className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === 'outStats' ? 'border-[#0b1c3a] text-[#0b1c3a]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>凡退内訳</button>
                    <button onClick={() => scrollToSection('pitchType')} className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === 'pitchType' ? 'border-[#0b1c3a] text-[#0b1c3a]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>球種別成績</button>
                    <button onClick={() => scrollToSection('situation')} className={`px-4 py-2 border-b-2 transition-colors ${activeSubTab === 'situation' ? 'border-[#0b1c3a] text-[#0b1c3a]' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>状況・カウント別</button>
                </div>
                )}
                
                {activeTab === 'team' && renderTeam()}
                {activeTab === 'ranking' && renderRanking()}
                {activeTab === 'individual' && renderIndividual()}
            </div>
        </div>
    );
}