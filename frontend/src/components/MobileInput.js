import React, { useState, useEffect, useMemo } from 'react';
import Swal from 'sweetalert2';

// ★修正：propsに loggedInPlayerId を追加しました
export default function MobileInput({ game, players, teamName, historyLogs, setHistoryLogs, pitchingResults = [], onBack, loggedInPlayerId }) {
    const [entryMode, setEntryMode] = useState('pitching');
    const [targetPlayerId, setTargetPlayerId] = useState('');
    const [editingLogId, setEditingLogId] = useState(null);
    const [showAllHistory, setShowAllHistory] = useState(false);

    // スマホ用履歴アコーディオンの開閉状態
    const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false);

    // ★追加・修正：親から loggedInPlayerId が渡ってきたら自動選択し、さらにポジションで入力タブを自動切り替え
    useEffect(() => {
        if (loggedInPlayerId) {
            // IDをセット
            setTargetPlayerId(prev => prev ? prev : String(loggedInPlayerId));
            
            // 選手のポジションを調べて、初期タブを自動切り替え
            const playerInfo = players.find(p => String(p.id) === String(loggedInPlayerId));
            if (playerInfo) {
                if (playerInfo.position && playerInfo.position.includes('投手')) {
                    setEntryMode('pitching'); // 投手なら「投手用入力」
                } else {
                    setEntryMode('batting');  // 投手以外なら「打撃用入力」
                }
            }
        }
    }, [loggedInPlayerId, players]);

    const [inning, setInning] = useState('1');
    const [half, setHalf] = useState('表');
    const [outs, setOuts] = useState('0アウト');
    const [runnerState, setRunnerState] = useState('ランナーなし');
    const [balls, setBalls] = useState('0');
    const [strikes, setStrikes] = useState('0');

    const [atBatNumber, setAtBatNumber] = useState('1打席目');
    const [batPitchType, setBatPitchType] = useState('ストレート');
    const [batCustomPitch, setBatCustomPitch] = useState('');
    const [batCourse, setBatCourse] = useState(null);
    const [batResult, setBatResult] = useState('安打');
    const [batCustomResult, setBatCustomResult] = useState('');
    const [batDirection, setBatDirection] = useState('');
    const [batRemarks, setBatRemarks] = useState('');

    const [currentBatterName, setCurrentBatterName] = useState('');
    const [pitchType, setPitchType] = useState('ストレート');
    const [pitchCustomPitch, setPitchCustomPitch] = useState('');
    const [pitchSpeed, setPitchSpeed] = useState('');
    const [pitchCourse, setPitchCourse] = useState(null);
    const [pitchResult, setPitchResult] = useState('ボール');
    const [pitchCustomResult, setPitchCustomResult] = useState('');
    const [pitchDirection, setPitchDirection] = useState('');
    const [pitchRemarks, setPitchRemarks] = useState('');

    const pitchTypes = ['ストレート', 'ツーシーム', 'スライダー', 'カーブ', 'チェンジアップ', 'フォーク', 'カットボール', 'シュート', 'シンカー', 'その他'];
    const runnerStatesList = ['ランナーなし', 'ランナー1塁', 'ランナー2塁', 'ランナー3塁', 'ランナー1・2塁', 'ランナー1・3塁', 'ランナー2・3塁', '満塁'];
    
    const batHitDirections = ['投手', '捕手', '一塁手', '二塁手', '三塁手', '遊撃手', '三塁線', '三遊間', '二遊間', '一二塁間', '一塁線', 'レフト線', '左翼手方向', '左中間', '中堅手方向', '右中間', '右翼手方向', 'ライト線'];

    const batResultsData = [
        { name: '安打', icon: '↗️' }, { name: '二塁打', icon: '🏃' }, { name: '三塁打', icon: '🏃‍♂️' }, { name: '本塁打', icon: '🎇' },
        { name: '内野ゴロ', icon: '↘️' }, { name: '内野フライ', icon: '⤴️' }, { name: '外野フライ', icon: '🦅' }, { name: '三振', icon: '❌' },
        { name: '四球', icon: '🚶' }, { name: '死球', icon: '🩹' }, { name: '犠牲フライ', icon: '🏏' }, { name: '犠牲バント', icon: '🥢' },
        { name: 'バント安打', icon: '🏃' }, { name: 'エラー', icon: '⚠️' }, { name: '打撃妨害', icon: '🛑' }, { name: 'その他', icon: '⚙️' }
    ];

    const pitchResultsData = [
        { name: '空振り', icon: '🏌️' }, { name: '見逃し', icon: '🧍' }, { name: 'ファウル', icon: '↗️' }, { name: 'ファウル(バント)', icon: '↗' },
        { name: 'ボール', icon: '⚾' }, { name: '四球', icon: '🚶' }, { name: '死球', icon: '🩹' }, { name: '打撃妨害', icon: '🛑' },
        { name: 'ヒット', icon: '🏃' }, { name: '二塁打', icon: '🏃🏃' }, { name: '三塁打', icon: '🏃🏃🏃' }, { name: '本塁打', icon: '🎇' },
        { name: 'ゴロ(内野)', icon: '↘️' }, { name: 'ゴロ(外野)', icon: '↘️' }, { name: 'フライ', icon: '⤴️' }, { name: 'ライナー', icon: '➡️' },
        { name: 'エラー', icon: '⚠️' }, { name: '牽制アウト', icon: '🔙' },
        { name: '犠牲フライ', icon: '⤴' }, { name: '犠牲バント', icon: '🏏' }, { name: 'バント成功', icon: '⭕' }, { name: 'バント失敗', icon: '❌' },
        { name: 'その他', icon: '⚙️' }
    ];

    const getResultStyle = (res) => {
        if (!res) return 'text-slate-700 bg-slate-100 border-slate-300';
        if (res.includes('安') || res.includes('ヒット') || res.includes('二塁打') || res.includes('三塁打') || res.includes('本塁打')) return 'text-red-600 bg-red-50 border-red-300 font-bold';
        if (res.includes('四球') || res.includes('死球') || res.includes('ボーク')) return 'text-blue-600 bg-blue-50 border-blue-300 font-bold';
        if (res.includes('三振') || res.includes('空振り') || res.includes('見逃し') || res.includes('牽制アウト')) return 'text-purple-700 bg-purple-50 border-purple-300 font-bold';
        if (res.includes('ファウル')) return 'text-amber-700 bg-amber-50 border-amber-300 font-bold';
        if (res.includes('エラー')) return 'text-orange-600 bg-orange-50 border-orange-300 font-bold';
        if (res === 'ボール') return 'text-emerald-700 bg-emerald-50 border-emerald-300 font-bold';
        return 'text-slate-700 bg-slate-100 border-slate-300 font-bold';
    };

    const activePlayers = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return players.filter(p => !p.retirementDate || new Date(p.retirementDate) > today);
    }, [players]);

    const pitcherPlayers = useMemo(() => {
        return activePlayers.filter(p => p.position && p.position.includes('投手'));
    }, [activePlayers]);

    const excelPitchData = useMemo(() => {
        if (entryMode !== 'pitching' || !targetPlayerId) return null;
        const targetPlayer = players.find(p => String(p.id) === String(targetPlayerId));
        return pitchingResults.find(r => {
            if (String(r.player) === String(targetPlayerId)) return true;
            if (targetPlayer && r.name && r.name.replace(/[\s\u3000]+/g, '') === targetPlayer.name.replace(/[\s\u3000]+/g, '')) return true;
            return false;
        });
    }, [pitchingResults, targetPlayerId, entryMode, players]);

    const restoreLatestState = (logs) => {
        const targetLogs = logs.filter(l => l.playerId === targetPlayerId && l.type === entryMode);
        if (targetLogs.length > 0) {
            const latest = targetLogs[0];
            if (latest.nextState) {
                setOuts(latest.nextState.outs); setRunnerState(latest.nextState.runnerState);
                setBalls(latest.nextState.balls); setStrikes(latest.nextState.strikes);
                if (entryMode === 'pitching') {
                    setInning(latest.nextState.inning); setHalf(latest.nextState.half); setCurrentBatterName(latest.nextState.currentBatterName);
                } else {
                    setAtBatNumber(latest.nextState.atBatNumber);
                    if (latest.nextState.inning) setInning(latest.nextState.inning);
                    if (latest.nextState.half) setHalf(latest.nextState.half);
                }
            }
        } else {
            setOuts('0アウト'); setRunnerState('ランナーなし'); setBalls('0'); setStrikes('0');
            if (entryMode === 'pitching') {
                if (excelPitchData && excelPitchData.innings_pitched) {
                    const ipInt = Math.floor(parseFloat(excelPitchData.innings_pitched));
                    setInning(String(ipInt + 1));
                } else { setInning('1'); }
                setHalf('表'); setCurrentBatterName('');
            } else {
                setAtBatNumber('1打席目');
                setInning('1'); setHalf('表');
            }
        }
    };

    useEffect(() => { if (targetPlayerId) restoreLatestState(historyLogs); }, [targetPlayerId, entryMode]); 

    const handleClear = () => {
        setBatCourse(null); setBatResult('安打'); setBatCustomResult(''); setBatDirection(''); setBatRemarks(''); setBatCustomPitch('');
        setPitchCustomPitch(''); setPitchSpeed(''); setPitchCourse(null); setPitchResult('ボール'); setPitchCustomResult(''); setPitchDirection(''); setPitchRemarks('');
        setEditingLogId(null);
    };

    const calculateNextRunner = (currentRunner, result) => {
        if (result.includes('本塁打')) return 'ランナーなし';
        if (result.includes('三塁打')) return 'ランナー3塁';
        if (result.includes('二塁打')) return 'ランナー2塁';
        if (['ヒット', '安打', '四球', '死球', '打撃妨害', 'バント安打', 'エラー'].includes(result)) {
            switch(currentRunner) {
                case 'ランナーなし': return 'ランナー1塁'; case 'ランナー1塁': return 'ランナー1・2塁'; case 'ランナー2塁': return 'ランナー1・3塁';
                case 'ランナー3塁': return 'ランナー1塁'; case 'ランナー1・2塁': return '満塁'; case 'ランナー1・3塁': return 'ランナー1・2塁';
                case 'ランナー2・3塁': return 'ランナー1・3塁'; case '満塁': return '満塁'; default: return currentRunner;
            }
        }
        return currentRunner;
    };

    const handleSave = (e) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!targetPlayerId) { Swal.fire({ title: 'エラー', text: '対象選手を選択してください。', icon: 'warning', confirmButtonColor: '#d33' }); return; }

        const pitchName = entryMode === 'batting' ? (batPitchType === 'その他' ? (batCustomPitch || 'その他') : batPitchType) : (pitchType === 'その他' ? (pitchCustomPitch || 'その他') : pitchType);
        const resName = entryMode === 'batting' ? (batResult === 'その他' ? (batCustomResult || 'その他') : batResult) : (pitchResult === 'その他' ? (pitchCustomResult || 'その他') : pitchResult);
        const dirName = entryMode === 'batting' ? batDirection : pitchDirection;
        const finalResName = resName || '不明';

        let nextB = parseInt(balls, 10); let nextS = parseInt(strikes, 10); let nextO = parseInt(outs.replace('アウト',''), 10);
        let nextI = inning; let nextH = half; let nextR = runnerState; let nextBatter = currentBatterName; let nextAtBat = atBatNumber;

        if (entryMode === 'pitching') {
            let isAtBatFinished = false; let calcResultForRunner = finalResName;
            if (finalResName === 'ボール') { nextB += 1; if (nextB >= 4) { isAtBatFinished = true; calcResultForRunner = '四球'; } } 
            else if (finalResName === '空振り' || finalResName === '見逃し' || finalResName === '三振') { nextS += 1; if (nextS >= 3) { isAtBatFinished = true; nextO += 1; } } 
            else if (finalResName === 'ファウル' || finalResName === 'ファウル(バント)') { if (nextS < 2) nextS += 1; } 
            else if (['四球', '死球', '打撃妨害'].includes(finalResName)) { isAtBatFinished = true; } 
            else if (finalResName === '牽制アウト') { 
                nextO += 1; 
            } 
            else { 
                isAtBatFinished = true; 
                if (['ゴロ(内野)', 'ゴロ(外野)', 'フライ', 'ライナー', '犠牲フライ', '犠牲バント', 'バント失敗'].includes(finalResName)) nextO += 1; 
                if (finalResName === 'エラー') calcResultForRunner = '安打';
            }

            if (isAtBatFinished) { nextB = 0; nextS = 0; nextBatter = ''; nextR = calculateNextRunner(nextR, calcResultForRunner); }
            if (nextO >= 3) { nextO = 0; nextR = 'ランナーなし'; nextI = String(parseInt(inning, 10) + 1); nextB = 0; nextS = 0; }
        } else {
            let nAb = parseInt(atBatNumber.replace('打席目',''), 10); nAb = isNaN(nAb) ? 6 : nAb + 1; if (nAb > 6) nAb = 6;
            nextAtBat = nAb === 6 ? '6打席目以上' : `${nAb}打席目`;
            if (['内野ゴロ', '内野フライ', '外野フライ', '三振', '犠牲フライ', '犠牲バント'].includes(finalResName)) nextO += 1;
            nextR = calculateNextRunner(nextR, finalResName);
            if (nextO >= 3) { nextO = 0; nextR = 'ランナーなし'; }
        }

        const calculatedNextState = { balls: String(nextB), strikes: String(nextS), outs: `${nextO}アウト`, runnerState: nextR, inning: nextI, half: nextH, currentBatterName: nextBatter, atBatNumber: nextAtBat };
        const newLog = {
            id: editingLogId || Date.now(), gameId: game.id, game: game.id, playerId: targetPlayerId, type: entryMode,
            atBat: entryMode === 'batting' ? `${inning}回${half} ${atBatNumber}` : `${inning}回${half} vs ${currentBatterName||'不明'}`,
            situation: `${outs} ${runnerState} ${balls}-${strikes} ${pitchName}`,
            result: `${finalResName} ${dirName ? `(${dirName})` : ''}`, shortResult: finalResName, date: new Date().toLocaleDateString('ja-JP'),
            rawData: { outs, runnerState, balls, strikes, atBatNumber, batPitchType, batCustomPitch, batCourse, batResult, batCustomResult, batDirection, batRemarks, inning, half, currentBatterName, pitchType, pitchCustomPitch, pitchSpeed, pitchCourse, pitchResult, pitchCustomResult, pitchDirection, pitchRemarks },
            nextState: calculatedNextState 
        };

        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true,
        });

        if (editingLogId) {
            setHistoryLogs(prev => prev.map(l => l.id === editingLogId ? newLog : l));
            Toast.fire({ icon: 'success', title: '履歴を更新しました' });
            setEditingLogId(null); handleClear();
        } else {
            setHistoryLogs(prev => [newLog, ...prev]);
            Toast.fire({ icon: 'success', title: '記録が追加されました' });
            setBalls(calculatedNextState.balls); setStrikes(calculatedNextState.strikes); setOuts(calculatedNextState.outs); setRunnerState(calculatedNextState.runnerState);
            if (entryMode === 'pitching') { setInning(calculatedNextState.inning); setHalf(calculatedNextState.half); setCurrentBatterName(calculatedNextState.currentBatterName); } 
            else { 
                setAtBatNumber(calculatedNextState.atBatNumber); 
                setInning(calculatedNextState.inning); 
                setHalf(calculatedNextState.half); 
            }
            setBatCourse(null); setPitchCourse(null); setPitchSpeed(''); setBatCustomPitch(''); setPitchCustomPitch(''); setBatCustomResult(''); setPitchCustomResult(''); setBatDirection(''); setPitchDirection(''); 
        }
    };

    const handleDeleteHistory = (id) => {
        Swal.fire({ title: '履歴の削除', text: 'この記録を削除してもよろしいですか？', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: '削除', cancelButtonText: 'キャンセル' }).then((result) => {
            if (result.isConfirmed) {
                const newLogs = historyLogs.filter(log => log.id !== id);
                setHistoryLogs(newLogs);
                if (editingLogId === id) setEditingLogId(null);
                restoreLatestState(newLogs); 
                Swal.fire('削除完了', '履歴から削除しました。', 'success');
            }
        });
    };

    const handleEditHistory = (log) => {
        setEditingLogId(log.id); const rd = log.rawData;
        setOuts(rd.outs); setRunnerState(rd.runnerState); setBalls(rd.balls); setStrikes(rd.strikes);
        if (rd.inning) setInning(rd.inning);
        if (rd.half) setHalf(rd.half);

        if (log.type === 'batting') {
            setAtBatNumber(rd.atBatNumber); setBatPitchType(rd.batPitchType); setBatCustomPitch(rd.batCustomPitch);
            setBatCourse(rd.batCourse); setBatResult(rd.batResult); setBatCustomResult(rd.batCustomResult); setBatDirection(rd.batDirection); setBatRemarks(rd.batRemarks);
        } else {
            setCurrentBatterName(rd.currentBatterName || '');
            setPitchType(rd.pitchType); setPitchCustomPitch(rd.pitchCustomPitch); setPitchSpeed(rd.pitchSpeed); setPitchCourse(rd.pitchCourse); setPitchResult(rd.pitchResult); setPitchCustomResult(rd.pitchCustomResult); setPitchDirection(rd.pitchDirection); setPitchRemarks(rd.pitchRemarks);
        }
    };

    const ButtonGrid = ({ items, selected, onSelect, minW = '65px' }) => (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${minW}, 1fr))`, gap: '6px' }} className="w-full">
            {items.map(item => {
                const val = typeof item === 'string' ? item : item.name;
                const isSelected = selected === val;
                return (
                    <button key={val} type="button" onClick={() => onSelect(isSelected ? '' : val)} className={`py-1.5 px-0.5 rounded-lg border flex flex-col items-center justify-center transition-colors w-full min-h-[44px] shadow-sm ${isSelected ? 'bg-[#0b1c3a] text-white border-[#0b1c3a]' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'}`}>
                        {typeof item === 'object' && <span className="text-sm lg:text-base leading-none mb-0.5">{item.icon}</span>}
                        <span className="text-[10px] lg:text-xs font-bold leading-tight text-center w-full" style={{ wordBreak: 'keep-all' }}>{val}</span>
                    </button>
                );
            })}
        </div>
    );

    const StrikeZone = ({ selectedCourse, onSelectCourse }) => {
        const gridCells = [10, 11, 12, 13, 14, 15, 1, 2, 3, 16, 17, 4, 5, 6, 18, 19, 7, 8, 9, 20, 21, 22, 23, 24, 25];
        return (
            <div className="flex flex-col items-center w-full max-w-[160px] lg:max-w-[220px]">
                <div className="flex text-[9px] lg:text-[11px] text-slate-500 mb-1 w-full justify-between px-2"><span>イン</span><span className="opacity-50 text-[8px] lg:text-[10px]">(捕手視点)</span><span>アウト</span></div>
                <div className="flex items-center w-full">
                    <div className="flex flex-col text-[9px] lg:text-[11px] text-slate-500 justify-between h-[140px] lg:h-[220px] py-4 pr-1.5 font-bold"><span>高</span><span>中</span><span>低</span></div>
                    <div className="relative flex-1 aspect-square w-full">
                        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] border-2 border-slate-700 pointer-events-none z-10 rounded-sm" />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gridTemplateRows: 'repeat(5, 1fr)' }} className="w-full h-full bg-slate-50 border border-slate-300 shadow-inner rounded-xl overflow-hidden">
                            {gridCells.map(num => {
                                const isStrike = num >= 1 && num <= 9; const isSelected = selectedCourse === num;
                                return (
                                    <button key={num} type="button" onClick={() => onSelectCourse(selectedCourse === num ? null : num)} className="border border-slate-200 flex items-center justify-center transition-colors hover:bg-slate-200 p-0">
                                        <div className={`w-5 h-5 lg:w-9 lg:h-9 rounded-full flex items-center justify-center text-[9px] lg:text-sm font-bold transition-all shadow-sm ${isSelected && isStrike ? 'bg-[#0b1c3a] text-white scale-110' : ''} ${isSelected && !isStrike ? 'bg-green-600 text-white scale-110' : ''} ${!isSelected && isStrike ? 'text-slate-700 bg-white border border-slate-300' : ''} ${!isSelected && !isStrike ? 'text-slate-400 bg-slate-100 border border-slate-200' : ''}`}>
                                            {num}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <button onClick={() => onSelectCourse(selectedCourse === 'コース不明' ? null : 'コース不明')} className={`mt-2 lg:mt-3 w-full py-1.5 lg:py-2.5 border border-slate-300 rounded-lg text-xs font-bold transition-colors shadow-sm ${selectedCourse === 'コース不明' ? 'bg-[#0b1c3a] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>コース不明</button>
            </div>
        );
    };

    const displayLogs = historyLogs.filter(log => log.playerId === targetPlayerId && log.type === entryMode && String(log.game) === String(game.id));
    const visibleLogs = showAllHistory ? displayLogs : displayLogs.slice(0, 8);
    const selectedPlayerName = players.find(p => p.id.toString() === targetPlayerId)?.name || '';

    const basePitchCount = excelPitchData ? (parseInt(excelPitchData.pitch_count, 10) || 0) : 0;
    const baseHits = excelPitchData ? ((parseInt(excelPitchData.hits_allowed_right, 10) || 0) + (parseInt(excelPitchData.hits_allowed_left, 10) || 0) || parseInt(excelPitchData.hits_allowed, 10) || 0) : 0;
    const baseK = excelPitchData ? ((parseInt(excelPitchData.strikeouts_right, 10) || 0) + (parseInt(excelPitchData.strikeouts_left, 10) || 0) || parseInt(excelPitchData.strikeouts, 10) || 0) : 0;
    const baseBB = excelPitchData ? ((parseInt(excelPitchData.walks_allowed_right, 10) || 0) + (parseInt(excelPitchData.walks_allowed_left, 10) || 0) || parseInt(excelPitchData.walks_allowed, 10) || 0) : 0;

    const currentPitchCount = displayLogs.length + basePitchCount;
    const currentHits = displayLogs.filter(l => ['ヒット', '安打', '二塁打', '三塁打', '本塁打'].includes(l.shortResult)).length + baseHits;
    const currentK = displayLogs.filter(l => ['空振り', '見逃し', '三振'].includes(l.shortResult)).length + baseK;
    const currentBB = displayLogs.filter(l => ['四球', '死球'].includes(l.shortResult)).length + baseBB;

    const hasRunner1 = ['ランナー1塁', 'ランナー1・2塁', 'ランナー1・3塁', '満塁'].includes(runnerState);
    const hasRunner2 = ['ランナー2塁', 'ランナー1・2塁', 'ランナー2・3塁', '満塁'].includes(runnerState);
    const hasRunner3 = ['ランナー3塁', 'ランナー1・3塁', 'ランナー2・3塁', '満塁'].includes(runnerState);

    // 履歴アイテムを共通で描画する関数
    const renderLogItem = (log) => (
        <div key={log.id} className={`border rounded-lg p-2 text-[10px] flex justify-between items-center shadow-sm bg-white transition-colors ${editingLogId === log.id ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}>
            <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1 mb-1.5">
                    <span className="font-black text-[#0b1c3a] text-[10px] lg:text-xs truncate">{log.atBat}</span>
                    <div className="flex gap-1 ml-auto">
                        <button onClick={() => handleEditHistory(log)} className="text-[9px] text-blue-600 hover:bg-blue-100 px-1 py-0.5 rounded font-bold">編集</button>
                        <button onClick={() => handleDeleteHistory(log.id)} className="text-[9px] text-red-500 hover:bg-red-100 px-1 py-0.5 rounded font-bold">削除</button>
                    </div>
                </div>
                <p className="text-slate-500 text-[8px] truncate font-bold">{log.situation}</p>
            </div>
            <div className="shrink-0 w-14 lg:w-16 text-center flex flex-col items-center">
                <span className={`font-black border px-1 py-1 rounded text-[8px] lg:text-[9px] block w-full truncate shadow-sm ${getResultStyle(log.shortResult)}`}>{log.shortResult}</span>
            </div>
        </div>
    );
    const renderPitchingForm = () => (
        <div className="flex flex-col h-full bg-slate-100 overflow-hidden w-full relative">
            <div className="bg-white px-2 lg:px-4 py-2 flex flex-wrap justify-between items-center shadow-sm z-10 border-b border-slate-200 shrink-0 gap-y-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] lg:text-xs font-bold text-slate-500 whitespace-nowrap">現在の投手</span>
                    <select value={targetPlayerId} onChange={(e) => {setTargetPlayerId(e.target.value); setEditingLogId(null);}} className="border border-blue-300 rounded px-2 py-1.5 lg:px-3 text-xs lg:text-sm font-bold text-blue-700 outline-none focus:border-blue-500 max-w-[140px] sm:max-w-[200px] bg-blue-50/50 shadow-sm cursor-pointer">
                        <option value="">-- 選択 --</option>
                        {/* ★ ここで pitcherPlayers (退団者除外リスト) を使用 */}
                        {pitcherPlayers.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                    </select>
                </div>
                <div className="flex flex-wrap gap-3 sm:gap-6 lg:gap-8 items-center">
                    <div className="flex items-center gap-1 sm:border-r border-slate-200 sm:pr-4 lg:pr-8">
                        <span className="text-[10px] text-slate-400 font-bold mr-1 hidden sm:inline">イニング</span>
                        <select value={inning} onChange={e=>setInning(e.target.value)} className="font-black text-[#0b1c3a] text-lg sm:text-xl lg:text-2xl bg-transparent outline-none appearance-none cursor-pointer">
                            {[1,2,3,4,5,6,7,8,9,10,11,12].map(n=><option key={n} value={n}>{n}回</option>)}
                        </select>
                        <select value={half} onChange={e=>setHalf(e.target.value)} className="font-bold text-slate-600 text-xs sm:text-sm lg:text-base bg-transparent outline-none appearance-none ml-1 cursor-pointer">
                            <option>表</option><option>裏</option>
                        </select>
                    </div>
                    <div className="flex gap-3 sm:gap-4 lg:gap-6 items-center">
                        <div className="flex flex-col items-center"><span className="text-[9px] lg:text-[10px] text-slate-400 font-bold">球数</span><span className="text-lg sm:text-xl lg:text-2xl font-black text-[#0b1c3a] leading-none mt-0.5">{currentPitchCount}</span></div>
                        <div className="flex flex-col items-center"><span className="text-[9px] lg:text-[10px] text-slate-400 font-bold">被安打</span><span className="text-lg sm:text-xl lg:text-2xl font-black text-slate-700 leading-none mt-0.5">{currentHits}</span></div>
                        <div className="flex flex-col items-center"><span className="text-[9px] lg:text-[10px] text-slate-400 font-bold">奪三振</span><span className="text-lg sm:text-xl lg:text-2xl font-black text-blue-600 leading-none mt-0.5">{currentK}</span></div>
                        <div className="flex flex-col items-center"><span className="text-[9px] lg:text-[10px] text-slate-400 font-bold">与四死</span><span className="text-lg sm:text-xl lg:text-2xl font-black text-red-600 leading-none mt-0.5">{currentBB}</span></div>
                    </div>
                </div>
            </div>

            {/* ★修正：iPadで左右に並ぶ構造。スマホでは縦並び */}
            <div className={`flex flex-col lg:flex-row flex-1 overflow-hidden w-full ${!targetPlayerId ? 'opacity-40 pointer-events-none' : ''}`}>
                
                {/* ★修正：h-fullとlg:overflow-hiddenを外し、中身の高さに応じて自然に全体がスクロールするようにしました */}
                <div className="flex-1 overflow-y-auto p-2 lg:p-4 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 items-center">
                    <div className="w-full max-w-[1200px] flex flex-col gap-3 lg:gap-4">
                        
                        <div className="bg-white p-2 sm:p-3 lg:p-5 rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center shrink-0 gap-y-3">
                            <div className="flex flex-col w-1/3 sm:w-[25%] lg:w-[20%]">
                                <span className="text-[9px] text-slate-500 font-bold mb-1 ml-1">現在の打者</span>
                                <input type="text" value={currentBatterName} onChange={e=>setCurrentBatterName(e.target.value)} placeholder="例: 1番 山田" className="border-b-2 border-slate-300 px-1 py-1 text-sm lg:text-base font-bold text-[#0b1c3a] outline-none w-full bg-slate-50 rounded-t focus:border-[#0b1c3a] transition-colors" />
                            </div>
                            <div className="flex items-center justify-evenly w-2/3 sm:w-[35%] lg:w-[35%] gap-2">
                                <div className="flex flex-col items-center cursor-pointer group" onClick={() => { let o = parseInt(outs.replace('アウト','')); setOuts(((o + 1) % 3) + 'アウト'); }}>
                                    <span className="text-[9px] text-slate-500 font-bold mb-1 group-hover:text-blue-500 transition-colors">アウト <span className="text-[8px] font-normal hidden sm:inline">(タップ)</span></span>
                                    <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#0b1c3a]">{outs.replace('アウト','')}</span>
                                </div>
                                <div className="flex flex-col items-center cursor-pointer group" onClick={() => { const nextIndex = (runnerStatesList.indexOf(runnerState) + 1) % runnerStatesList.length; setRunnerState(runnerStatesList[nextIndex]); }}>
                                    <span className="text-[9px] text-slate-500 font-bold mb-1 sm:mb-2 group-hover:text-blue-500 transition-colors">ランナー <span className="text-[8px] font-normal hidden sm:inline">(タップ)</span></span>
                                    <div className="relative w-6 h-6 sm:w-8 sm:h-8 lg:w-12 lg:h-12 transform rotate-45 border-2 border-slate-400 bg-white">
                                        {hasRunner2 && <div className="absolute top-0 left-0 w-2.5 h-2.5 lg:w-4 lg:h-4 -mt-1.5 -ml-1.5 lg:-mt-2 lg:-ml-2 rounded-full bg-emerald-500 shadow-sm"></div>}
                                        {hasRunner3 && <div className="absolute bottom-0 left-0 w-2.5 h-2.5 lg:w-4 lg:h-4 -mb-1.5 -ml-1.5 lg:-mb-2 lg:-ml-2 rounded-full bg-emerald-500 shadow-sm"></div>}
                                        {hasRunner1 && <div className="absolute top-0 right-0 w-2.5 h-2.5 lg:w-4 lg:h-4 -mt-1.5 -mr-1.5 lg:-mt-2 lg:-mr-2 rounded-full bg-emerald-500 shadow-sm"></div>}
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col items-center w-full sm:w-[40%] lg:w-[30%] sm:border-l border-slate-200 sm:pl-4 mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0">
                                <span className="text-[10px] text-slate-500 font-bold mb-2 hidden sm:block">カウント状況</span>
                                <div className="flex items-center gap-6 sm:gap-4 lg:gap-8 justify-center sm:justify-start w-full">
                                    <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setBalls(String((parseInt(balls) + 1) % 4))}>
                                        <span className="font-black text-green-600 text-lg sm:text-xl lg:text-3xl">B</span>
                                        <div className="flex gap-1.5">{[1,2,3].map(n => <div key={n} className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 rounded-full border-2 border-green-600 ${parseInt(balls) >= n ? 'bg-green-500' : 'bg-transparent'}`}></div>)}</div>
                                    </div>
                                    <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setStrikes(String((parseInt(strikes) + 1) % 3))}>
                                        <span className="font-black text-yellow-500 text-lg sm:text-xl lg:text-3xl">S</span>
                                        <div className="flex gap-1.5">{[1,2].map(n => <div key={n} className={`w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 rounded-full border-2 border-yellow-500 ${parseInt(strikes) >= n ? 'bg-yellow-400' : 'bg-transparent'}`}></div>)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ★修正：overflow-hiddenとmin-h-0を外しました。これで途中で切れません */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4 w-full">
                            {/* 左：球種とコース */}
                            <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                <div className="p-3 border-b border-slate-100 shrink-0">
                                    <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-2"><span className="bg-[#0b1c3a] text-white rounded-full w-4 h-4 lg:w-5 lg:h-5 inline-flex items-center justify-center text-[10px] lg:text-xs mr-1">1</span> 球種</h3>
                                    <ButtonGrid items={pitchTypes} selected={pitchType} onSelect={setPitchType} minW="55px" />
                                    {pitchType === 'その他' && <input type="text" placeholder="球種名を入力..." value={pitchCustomPitch} onChange={e=>setPitchCustomPitch(e.target.value)} className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#0b1c3a] bg-blue-50/50" />}
                                </div>
                                
                                <div className="p-3 lg:p-4 flex flex-col bg-slate-50 relative">
                                    <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-2 shrink-0"><span className="bg-[#0b1c3a] text-white rounded-full w-4 h-4 lg:w-5 lg:h-5 inline-flex items-center justify-center text-[10px] lg:text-xs mr-1">2</span> コースと球速 <span className="text-[9px] font-normal text-slate-400 ml-1">(見逃し・空振り時も入力)</span></h3>
                                    <div className="flex-1 flex flex-col lg:flex-row justify-center items-center gap-3 lg:gap-8 w-full shrink-0 py-2">
                                        <StrikeZone selectedCourse={pitchCourse} onSelectCourse={setPitchCourse} />
                                        
                                        <div className="flex flex-row lg:flex-col items-center justify-center gap-3 lg:gap-2 bg-white px-3 lg:px-6 py-3 lg:py-8 rounded-xl border border-slate-200 shadow-sm w-full lg:w-auto lg:min-w-[160px]">
                                            <span className="text-[10px] lg:text-xs font-bold text-slate-500 lg:mb-2">球速</span>
                                            <div className="flex items-end border-b-2 lg:border-b-4 border-[#0b1c3a] pb-1 w-20 lg:w-32 justify-center">
                                                <input type="number" value={pitchSpeed} onChange={e=>setPitchSpeed(e.target.value)} className="w-12 lg:w-24 text-xl lg:text-4xl font-black text-center outline-none text-[#0b1c3a] bg-transparent" placeholder="-" />
                                                <span className="text-[9px] lg:text-xs font-bold text-slate-400 mb-0.5 lg:mb-1.5">km/h</span>
                                            </div>
                                            <button onClick={()=>setPitchSpeed('')} className="text-[10px] lg:text-xs bg-slate-100 hover:bg-slate-200 text-slate-500 px-4 py-1.5 lg:px-6 lg:py-2 rounded-lg font-bold transition-colors lg:mt-4 w-auto lg:w-full whitespace-nowrap">クリア</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 右：結果と備考 */}
                            <div className="bg-white rounded-xl lg:rounded-2xl shadow-sm border border-slate-200 flex flex-col">
                                {/* ★修正：右側のカードの中身も overflow-hidden や -y-auto を外しました */}
                                <div className="p-3 lg:p-4 flex flex-col gap-4">
                                    <div>
                                        <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-2"><span className="bg-[#0b1c3a] text-white rounded-full w-4 h-4 lg:w-5 lg:h-5 inline-flex items-center justify-center text-[10px] lg:text-xs mr-1">3</span> 投球結果</h3>
                                        <ButtonGrid items={pitchResultsData} selected={pitchResult} onSelect={setPitchResult} minW="60px" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-2">打球方向 <span className="text-[9px] font-normal text-slate-400 ml-1">(任意)</span></h3>
                                        <ButtonGrid items={batHitDirections} selected={pitchDirection} onSelect={setPitchDirection} minW="50px" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-1"><span className="bg-[#0b1c3a] text-white rounded-full w-4 h-4 lg:w-5 lg:h-5 inline-flex items-center justify-center text-[10px] lg:text-xs mr-1">4</span> 備考 <span className="text-[9px] font-normal text-slate-400 ml-1">(任意)</span></h3>
                                        <input type="text" value={pitchRemarks} onChange={e=>setPitchRemarks(e.target.value)} placeholder="特記事項（例：ワンバウンド 等）" className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 lg:py-3 text-xs outline-none focus:border-[#0b1c3a] bg-slate-50" />
                                    </div>
                                </div>
                                
                                {/* ★iPad用：保存ボタン (スマホでは隠す) */}
                                <div className="hidden lg:flex p-3 lg:p-4 border-t border-slate-100 bg-slate-50 gap-2 justify-end mt-auto shrink-0 rounded-b-xl lg:rounded-b-2xl">
                                    {!editingLogId && <button onClick={handleClear} className="bg-white border border-slate-300 text-slate-600 px-4 lg:px-5 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 shadow-sm whitespace-nowrap">クリア</button>}
                                    <button onClick={handleSave} className={`${editingLogId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0c4a34] hover:bg-[#083324]'} text-white px-6 lg:px-8 py-2.5 lg:py-3 rounded-lg text-sm lg:text-base font-black shadow-md transition-transform transform active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap`}>
                                        <span>{editingLogId ? '✏️ 履歴を更新' : '💾 記録を保存する'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* ★スマホ用：一番下までスクロールした時に、固定ボタンに隠れないための透明なつっかえ棒（余白） */}
                    <div className="h-40 w-full lg:hidden shrink-0"></div>
                </div>

                {/* ★iPad/PC用：右側の履歴パネル (スマホでは隠す) */}
                <div className="hidden lg:flex w-[260px] xl:w-[280px] bg-white border-l border-slate-300 flex-col shrink-0 z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.05)] h-full">
                    <div className="p-3 lg:p-4 border-b border-slate-200 bg-slate-50 shrink-0 flex justify-between items-center">
                        <h4 className="text-xs lg:text-sm font-bold text-[#0b1c3a] border-l-4 border-[#0b1c3a] pl-2">{selectedPlayerName ? `${selectedPlayerName}の投球履歴` : '投球履歴'} ({displayLogs.length}件)</h4>
                        {!editingLogId && <button onClick={handleClear} className="text-[10px] bg-white border border-slate-300 px-2 py-1 sm:px-3 sm:py-1.5 rounded text-slate-600 hover:bg-slate-100 font-bold shadow-sm">クリア</button>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 lg:p-3 hide-scrollbar bg-slate-50/50">
                        {displayLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                <span className="text-3xl lg:text-4xl mb-2">📋</span>
                                <p className="text-[10px] font-bold">まだ履歴がありません</p>
                            </div>
                        ) : (
                            <div className="space-y-2 pb-20 lg:pb-0">
                                {visibleLogs.map(renderLogItem)}
                            </div>
                        )}
                        {displayLogs.length > 8 && (
                            <button onClick={() => setShowAllHistory(!showAllHistory)} className="w-full mt-2 text-[10px] font-bold text-blue-700 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-sm mb-20 lg:mb-2">
                                {showAllHistory ? '直近のみ表示に戻す' : 'すべての履歴を展開する'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    const renderBattingForm = () => (
        <div className="flex flex-col h-full bg-slate-100 overflow-hidden w-full relative">
            <div className="bg-blue-50 px-2 sm:px-4 py-2 flex flex-wrap justify-between items-center shadow-sm z-10 border-b border-blue-200 shrink-0 min-h-[50px] gap-2">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] lg:text-xs font-bold text-slate-500 whitespace-nowrap">現在の打者</span>
                    <select value={targetPlayerId} onChange={(e) => {setTargetPlayerId(e.target.value); setEditingLogId(null);}} className="border border-blue-300 rounded px-2 py-1.5 lg:px-3 text-xs lg:text-sm font-bold text-blue-700 outline-none focus:border-blue-500 max-w-[130px] sm:max-w-[200px] bg-white shadow-sm cursor-pointer">
                        <option value="">-- 選択 --</option>
                        {/* ★ ここで activePlayers (退団者除外リスト) を使用 */}
                        {activePlayers.map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                    </select>
                </div>
                
                <div className="flex items-center gap-1 pr-1">
                    <span className="text-[10px] text-slate-400 font-bold mr-1 hidden sm:inline">イニング</span>
                    <select value={inning} onChange={e=>setInning(e.target.value)} className="font-black text-[#0b1c3a] text-lg sm:text-xl bg-transparent outline-none appearance-none cursor-pointer">
                        {[1,2,3,4,5,6,7,8,9,10,11,12].map(n=><option key={n} value={n}>{n}回</option>)}
                    </select>
                    <select value={half} onChange={e=>setHalf(e.target.value)} className="font-bold text-slate-600 text-xs sm:text-sm bg-transparent outline-none appearance-none ml-1 cursor-pointer">
                        <option>表</option><option>裏</option>
                    </select>
                </div>
            </div>

            {/* ★修正：iPadで左右に並ぶよう構造を修正 */}
            <div className={`flex flex-col lg:flex-row flex-1 overflow-hidden w-full ${!targetPlayerId ? 'opacity-40 pointer-events-none' : ''}`}>
                
                {/* ★修正：h-fullとlg:overflow-hiddenを外し、縦幅が足りない時は画面全体でスクロールできるようにしました */}
                <div className="flex-1 overflow-y-auto p-2 lg:p-4 flex flex-col bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-slate-50 items-center">
                    <div className="w-full max-w-[1000px] flex flex-col gap-3 lg:gap-4">
                        
                        <div className="bg-white p-2 sm:p-3 lg:p-4 w-full rounded-xl shadow-sm border border-slate-200 flex flex-wrap justify-between items-center shrink-0 mb-3 lg:mb-4 gap-y-3">
                            <div className="flex w-full sm:w-auto justify-between sm:justify-start gap-4 sm:gap-8 items-center border-b sm:border-b-0 border-slate-100 pb-2 sm:pb-0">
                                <div className="flex flex-col w-[30%] sm:w-[120px]">
                                    <span className="text-[9px] text-slate-500 font-bold mb-1 ml-1">打席</span>
                                    <select value={atBatNumber} onChange={e=>setAtBatNumber(e.target.value)} className="border-b-2 border-slate-300 px-1 py-1 text-sm lg:text-base font-bold text-[#0b1c3a] outline-none w-full bg-slate-50 rounded-t focus:border-[#0b1c3a] transition-colors cursor-pointer text-center">
                                        {['1打席目', '2打席目', '3打席目', '4打席目', '5打席目', '6打席目以上'].map(n=><option key={n} value={n}>{n}</option>)}
                                    </select>
                                </div>
                                <div className="flex flex-col items-center w-[30%] sm:w-auto cursor-pointer group" onClick={() => { let o = parseInt(outs.replace('アウト','')); setOuts(((o + 1) % 3) + 'アウト'); }}>
                                    <span className="text-[9px] text-slate-500 font-bold mb-1 group-hover:text-blue-500 transition-colors">アウト <span className="text-[8px] font-normal hidden sm:inline">(タップ)</span></span>
                                    <span className="text-2xl sm:text-3xl font-black text-[#0b1c3a]">{outs.replace('アウト','')}</span>
                                </div>
                                <div className="flex flex-col items-center w-[30%] sm:w-auto cursor-pointer group" onClick={() => { const nextIndex = (runnerStatesList.indexOf(runnerState) + 1) % runnerStatesList.length; setRunnerState(runnerStatesList[nextIndex]); }}>
                                    <span className="text-[9px] text-slate-500 font-bold mb-1 sm:mb-2 group-hover:text-blue-500 transition-colors">ランナー <span className="text-[8px] font-normal hidden sm:inline">(タップ)</span></span>
                                    <div className="relative w-6 h-6 sm:w-8 sm:h-8 transform rotate-45 border-2 border-slate-400 bg-white">
                                        {hasRunner2 && <div className="absolute top-0 left-0 w-2.5 h-2.5 sm:w-3 sm:h-3 -mt-1.5 -ml-1.5 rounded-full bg-emerald-500 shadow-sm"></div>}
                                        {hasRunner3 && <div className="absolute bottom-0 left-0 w-2.5 h-2.5 sm:w-3 sm:h-3 -mb-1.5 -ml-1.5 rounded-full bg-emerald-500 shadow-sm"></div>}
                                        {hasRunner1 && <div className="absolute top-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 -mt-1.5 -mr-1.5 rounded-full bg-emerald-500 shadow-sm"></div>}
                                    </div>
                                </div>
                            </div>

                            <div className="flex w-full sm:w-auto flex-col items-center sm:items-start sm:border-l border-slate-200 sm:pl-6 pt-1 sm:pt-0">
                                <span className="text-[10px] text-slate-500 font-bold mb-2 hidden sm:block">カウント状況</span>
                                <div className="flex items-center gap-6 sm:gap-8 w-full justify-center sm:justify-start">
                                    <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setBalls(String((parseInt(balls) + 1) % 4))}>
                                        <span className="font-black text-green-600 text-xl lg:text-3xl">B</span>
                                        <div className="flex gap-1.5">{[1,2,3].map(n => <div key={n} className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-green-600 ${parseInt(balls) >= n ? 'bg-green-500' : 'bg-transparent'}`}></div>)}</div>
                                    </div>
                                    <div className="flex items-center gap-1.5 cursor-pointer group" onClick={() => setStrikes(String((parseInt(strikes) + 1) % 3))}>
                                        <span className="font-black text-yellow-500 text-xl lg:text-3xl">S</span>
                                        <div className="flex gap-1.5">{[1,2].map(n => <div key={n} className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full border-2 border-yellow-500 ${parseInt(strikes) >= n ? 'bg-yellow-400' : 'bg-transparent'}`}></div>)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ★修正：overflow-hiddenとmin-h-0を外しました。 */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 w-full">
                            
                            {/* 左：球種とコース */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                                <div className="p-2 sm:p-3 border-b border-slate-100 shrink-0">
                                    <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-2"><span className="bg-[#0b1c3a] text-white rounded-full w-4 h-4 lg:w-5 lg:h-5 inline-flex items-center justify-center text-[10px] lg:text-xs mr-1">1</span> 球種 <span className="text-[9px] font-normal text-slate-400 ml-1">(投手が投げた球)</span></h3>
                                    <ButtonGrid items={pitchTypes} selected={batPitchType} onSelect={setBatPitchType} minW="55px" />
                                    {batPitchType === 'その他' && (
                                        <input type="text" value={batCustomPitch} onChange={e => setBatCustomPitch(e.target.value)} placeholder="球種名を入力..." className="mt-2 w-full border border-slate-300 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#0b1c3a] bg-blue-50/50"/>
                                    )}
                                </div>

                                {/* ★修正：コース不明ボタンが見えるように overflow-y-auto を追加 */}
                                <div className="p-2 sm:p-3 flex-1 flex flex-col bg-slate-50 relative overflow-y-auto hide-scrollbar min-h-[250px]">
                                    <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-2 shrink-0"><span className="bg-[#0b1c3a] text-white rounded-full w-4 h-4 lg:w-5 lg:h-5 inline-flex items-center justify-center text-[10px] lg:text-xs mr-1">2</span> コース <span className="text-[10px] font-normal text-slate-400 ml-1">(見逃し・空振り時も入力)</span></h3>
                                    <div className="flex-1 flex items-center justify-center bg-white p-2 rounded-xl border border-slate-200 shadow-sm shrink-0 py-2">
                                        <StrikeZone selectedCourse={batCourse} onSelectCourse={setBatCourse} />
                                    </div>
                                </div>
                            </div>

                            {/* 右：結果と備考 */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
                                {/* ★修正：overflow-y-auto を外して、カードが自然に下まで伸びるようにしました */}
                                <div className="p-2 sm:p-3 flex flex-col gap-3">
                                    <div>
                                        <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-2"><span className="bg-[#0b1c3a] text-white rounded-full w-4 h-4 lg:w-5 lg:h-5 inline-flex items-center justify-center text-[10px] lg:text-xs mr-1">3</span> 打撃結果</h3>
                                        <ButtonGrid items={batResultsData} selected={batResult} onSelect={setBatResult} minW="60px" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-2">打球方向</h3>
                                        <ButtonGrid items={batHitDirections} selected={batDirection} onSelect={setBatDirection} minW="50px" />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-[#0b1c3a] text-xs lg:text-sm mb-1"><span className="bg-[#0b1c3a] text-white rounded-full w-4 h-4 lg:w-5 lg:h-5 inline-flex items-center justify-center text-[10px] lg:text-xs mr-1">4</span> 備考 <span className="text-[9px] font-normal text-slate-400 ml-1">(任意)</span></h3>
                                        <input type="text" value={batRemarks} onChange={e=>setBatRemarks(e.target.value)} placeholder="特記事項（例：詰まった等）" className="w-full border-2 border-slate-200 rounded-lg px-3 py-2 sm:py-3 text-sm outline-none focus:border-[#0b1c3a] bg-slate-50 transition-colors" />
                                    </div>
                                </div>
                                
                                {/* ★iPad用：保存ボタン (スマホでは隠す) */}
                                <div className="hidden lg:flex p-2 sm:p-3 border-t border-slate-100 bg-slate-50 gap-2 justify-end mt-auto shrink-0 rounded-b-xl">
                                    {!editingLogId && <button onClick={handleClear} className="bg-white border border-slate-300 text-slate-600 px-4 sm:px-5 py-2 rounded-lg text-xs font-bold hover:bg-slate-100 shadow-sm whitespace-nowrap">クリア</button>}
                                    <button onClick={handleSave} className={`${editingLogId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0c4a34] hover:bg-[#083324]'} text-white px-6 sm:px-8 py-2.5 sm:py-3 rounded-lg text-sm font-black shadow-md transition-transform transform active:scale-95 flex items-center justify-center gap-1.5 whitespace-nowrap`}>
                                        <span>{editingLogId ? '✏️ 履歴を更新' : '💾 記録を保存する'}</span>
                                    </button>
                                </div>
                            </div>
                            
                        </div>
                    </div>
                    {/* ★スマホ用：一番下までスクロールした時に、固定ボタンに隠れないための透明なつっかえ棒（余白） */}
                    <div className="h-40 w-full lg:hidden shrink-0"></div>
                </div>

                {/* ★iPad/PC用：右側の履歴パネル (スマホでは隠す) */}
                <div className="hidden lg:flex w-[260px] xl:w-[280px] bg-white border-l border-slate-300 flex-col shrink-0 z-20 shadow-[-4px_0_15px_rgba(0,0,0,0.05)] h-full">
                    <div className="p-3 lg:p-4 border-b border-slate-200 bg-slate-50 shrink-0 flex justify-between items-center">
                        <h4 className="text-xs lg:text-sm font-bold text-[#0b1c3a] border-l-4 border-[#0b1c3a] pl-2">{selectedPlayerName ? `${selectedPlayerName}の履歴` : '履歴'} ({displayLogs.length}件)</h4>
                        {!editingLogId && <button onClick={handleClear} className="text-[10px] bg-white border border-slate-300 px-2 py-1 sm:px-3 sm:py-1.5 rounded text-slate-600 hover:bg-slate-100 font-bold shadow-sm">クリア</button>}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 lg:p-3 hide-scrollbar bg-slate-50/50">
                        {displayLogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-60">
                                <span className="text-3xl lg:text-4xl mb-2">📋</span>
                                <p className="text-[10px] font-bold">まだ履歴がありません</p>
                            </div>
                        ) : (
                            <div className="space-y-2 pb-20 lg:pb-0">
                                {visibleLogs.map(renderLogItem)}
                            </div>
                        )}
                        {displayLogs.length > 8 && (
                            <button onClick={() => setShowAllHistory(!showAllHistory)} className="w-full mt-2 text-[10px] font-bold text-blue-700 py-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shadow-sm mb-20 lg:mb-2">
                                {showAllHistory ? '直近のみ表示に戻す' : 'すべての履歴を展開'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col w-full h-[100dvh] overflow-hidden animate-fade-in font-sans">
            {/* 全体共通ヘッダー */}
            <div className="bg-[#0b1c3a] text-white px-2 sm:px-4 py-2 flex flex-wrap justify-between items-center shadow-md z-20 shrink-0 min-h-[50px] border-b border-blue-900 gap-y-2">
                <div className="flex items-center gap-2 sm:gap-4 lg:gap-8">
                    <span className="font-bold italic text-base lg:text-xl tracking-widest hidden sm:inline">LOGISTARS</span>
                    <div className="flex bg-[#1e3a8a] rounded-full p-1 border border-slate-600 shadow-inner">
                        <button onClick={() => {setEntryMode('pitching'); setTargetPlayerId(''); handleClear();}} className={`px-3 sm:px-4 lg:px-5 py-1 text-[10px] lg:text-xs font-bold rounded-full transition-colors ${entryMode === 'pitching' ? 'bg-white text-[#0b1c3a] shadow-sm' : 'text-slate-300 hover:text-white'}`}>投手用入力</button>
                        <button onClick={() => {setEntryMode('batting'); setTargetPlayerId(''); handleClear();}} className={`px-3 sm:px-4 lg:px-5 py-1 text-[10px] lg:text-xs font-bold rounded-full transition-colors ${entryMode === 'batting' ? 'bg-white text-[#0b1c3a] shadow-sm' : 'text-slate-300 hover:text-white'}`}>打撃用入力</button>
                    </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 text-[10px] lg:text-xs font-bold">
                    <div className="flex items-center gap-1 sm:gap-2">
                        <span className="text-slate-300 hidden sm:inline">現在の{entryMode === 'pitching' ? '投手' : '打者'}:</span>
                        <select value={targetPlayerId} onChange={(e) => {setTargetPlayerId(e.target.value); setEditingLogId(null);}} className="border-2 border-blue-400 rounded-lg px-1 sm:px-2 py-1 lg:px-3 lg:py-1.5 text-xs lg:text-sm font-bold text-[#0b1c3a] outline-none focus:border-white min-w-[100px] sm:min-w-[120px] lg:min-w-[140px] bg-white cursor-pointer shadow-sm">
                            <option value="">-- 選手を選択 --</option>
                            {(entryMode === 'pitching' ? pitcherPlayers : activePlayers).map(p => <option key={p.id} value={p.id}>#{p.number} {p.name}</option>)}
                        </select>
                    </div>
                    <button onClick={onBack} className="text-white bg-red-500 hover:bg-red-600 rounded-lg px-2 sm:px-3 py-1 lg:px-4 lg:py-1.5 ml-1 sm:ml-2 font-bold shadow-sm transition-colors border border-red-700">終了</button>
                </div>
            </div>
            
            <div className={`flex-1 relative flex flex-col w-full overflow-hidden bg-slate-50 transition-opacity duration-300 ${!targetPlayerId ? 'opacity-20 pointer-events-none filter blur-sm' : ''}`}>
                {entryMode === 'batting' ? renderBattingForm() : renderPitchingForm()}
            </div>

            {/* 選手未選択時のオーバーレイ */}
            {!targetPlayerId && (
                <div className="absolute inset-0 top-[60px] z-50 flex items-center justify-center bg-slate-900/30 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white text-[#0b1c3a] px-6 sm:px-8 py-5 sm:py-6 lg:px-10 lg:py-8 rounded-2xl shadow-2xl flex flex-col items-center gap-3 sm:gap-4 border-2 border-blue-500 transform scale-105 mx-4 text-center">
                        <span className="text-3xl sm:text-4xl lg:text-5xl">👤</span>
                        <span className="text-sm sm:text-base lg:text-lg font-black tracking-wide">右上のメニューから選手を選択してください</span>
                        <span className="text-[9px] sm:text-[10px] lg:text-xs text-slate-500 font-bold">({entryMode === 'pitching' ? '投手' : '打者'}の入力モードが選択されています)</span>
                    </div>
                </div>
            )}

            {/* ★スマホ用：画面下部のアコーディオン＆保存ボタン (iPad/PCでは非表示) */}
            {targetPlayerId && (
                <div className="lg:hidden fixed bottom-0 left-0 w-full bg-white rounded-t-3xl shadow-[0_-10px_20px_rgba(0,0,0,0.15)] border-t border-slate-200 z-[150] flex flex-col transition-all duration-300">
                    <div className="flex flex-col bg-slate-50 rounded-t-3xl overflow-hidden">
                        <button onClick={() => setIsMobileHistoryOpen(!isMobileHistoryOpen)} className="w-full py-3.5 px-5 flex justify-between items-center bg-white border-b border-slate-200 active:bg-slate-50 transition-colors z-10 shadow-[0_4px_10px_rgba(0,0,0,0.02)]">
                            <span className="flex items-center gap-2 text-xs font-black text-[#0b1c3a]">🕒 履歴 <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[10px]">{displayLogs.length}件</span></span>
                            <span className={`text-slate-400 text-xs font-bold transform transition-transform duration-300 ${isMobileHistoryOpen ? 'rotate-180' : ''}`}>▼ 開く</span>
                        </button>
                        <div className={`transition-all duration-300 ease-in-out ${isMobileHistoryOpen ? 'max-h-[40vh] overflow-y-auto' : 'max-h-0'} bg-slate-100 hide-scrollbar`}>
                            <div className="p-4 space-y-2">
                                {displayLogs.length === 0 ? (
                                    <div className="text-center text-slate-400 text-xs py-4 font-bold">まだ記録がありません</div>
                                ) : (
                                    visibleLogs.map(renderLogItem)
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="p-3 bg-white shrink-0 flex gap-2" style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
                        {!editingLogId && <button onClick={handleClear} className="w-[80px] bg-slate-100 text-slate-600 rounded-xl font-bold text-xs border border-slate-200 active:bg-slate-200 transition-colors">クリア</button>}
                        <button onClick={handleSave} className={`flex-1 ${editingLogId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-[#0c4a34] hover:bg-[#083324]'} text-white py-3.5 rounded-xl font-black text-sm shadow-md active:scale-95 transition-transform flex justify-center items-center gap-2`}>
                            <span>{editingLogId ? '✏️ 履歴を更新' : '📝 この内容で記録する'}</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}