import React, { useState, useMemo, useEffect } from 'react';
import Swal from 'sweetalert2';

const API_BASE = 'https://logistars-backend.onrender.com/api';

const CATEGORIES = [
    {
        id: 1, title: 'スピード・アジリティ',
        items: [
            { key: 'sprint_30m', label: '30m走', unit: '秒', reverseGoodBad: true },
            { key: 'back_run_10m', label: 'バック走10m', unit: '秒', reverseGoodBad: true },
            { key: 'side_steps', label: '反復横跳び (20秒)', unit: '回', reverseGoodBad: false }
        ]
    },
    {
        id: 2, title: '筋力',
        items: [
            { key: 'squat', label: 'スクワット (MAX)', unit: 'kg', reverseGoodBad: false },
            { key: 'deadlift', label: 'デッドリフト (MAX)', unit: 'kg', reverseGoodBad: false },
            { key: 'grip_r', label: '握力 (右)', unit: 'kg', reverseGoodBad: false },
            { key: 'grip_l', label: '握力 (左)', unit: 'kg', reverseGoodBad: false }
        ]
    },
    {
        id: 3, title: 'ジャンプ・パワー',
        items: [
            { key: 'vertical_jump', label: '垂直跳び (最高到達点)', unit: 'cm', reverseGoodBad: false },
            { key: 'broad_jump', label: '立ち幅跳び', unit: 'cm', reverseGoodBad: false },
            { key: 'triple_jump', label: '立ち3段跳び', unit: 'm', reverseGoodBad: false },
            { key: 'med_ball', label: 'メディシンボール投げ (3kg)', unit: 'm', reverseGoodBad: false }
        ]
    },
    {
        id: 4, title: 'スローイング・スイング',
        items: [
            { key: 'throw_dist', label: '遠投 (ボール)', unit: 'm', reverseGoodBad: false },
            { key: 'ball_speed', label: '球速', unit: 'km/h', reverseGoodBad: false },
            { key: 'pitching_spin', label: '投球回転数', unit: 'rpm', reverseGoodBad: false },
            { key: 'batting_speed', label: '打球速度', unit: 'km/h', reverseGoodBad: false },
            { key: 'swing_speed', label: 'スイングスピード', unit: 'km/h', reverseGoodBad: false }
        ]
    },
    {
        id: 5, title: '体格・体組成',
        items: [
            { key: 'height', label: '身長', unit: 'cm', reverseGoodBad: false },
            { key: 'weight', label: '体重', unit: 'kg', reverseGoodBad: false },
            { key: 'body_fat', label: '体脂肪率', unit: '%', reverseGoodBad: true },
            { key: 'muscle_mass', label: '筋肉量', unit: 'kg', reverseGoodBad: false },
            { key: 'visceral_fat', label: '内臓脂肪', unit: 'Lv', reverseGoodBad: true },
            { key: 'basal_metabolism', label: '基礎代謝', unit: 'kcal', reverseGoodBad: false }
        ]
    },
    {
        id: 6, title: 'その他',
        items: [
            { key: 'sleep_time', label: '睡眠時間', unit: '時間', reverseGoodBad: false }
        ]
    }
];

export default function PhysicalData({ players = [], userRole = 'admin', linkedPlayerId = null }) {
    const [viewMode, setViewMode] = useState('dashboard'); 
    
    const roleStr = String(userRole || '').trim().toLowerCase();
    const isPlayerRole = roleStr === 'player' || roleStr === '一般選手' || roleStr === '選手';

    const [playersMode, setPlayersMode] = useState('active_only');
    const [sortConfig, setSortConfig] = useState({ key: 'number', direction: 'asc' });

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

    const shouldIncludePlayer = (playerIdStr) => {
        const active = checkIsActive(playerIdStr);
        if (playersMode === 'active_only') return active;
        if (playersMode === 'retired_only') return !active;
        return true;
    };

    const calcAge = (birthDateStr) => {
        if (!birthDateStr) return '-';
        const today = new Date();
        const birthDate = new Date(birthDateStr);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const calcBMI = (h, w) => {
        if (!h || !w) return '-';
        const heightM = h / 100;
        return (w / (heightM * heightM)).toFixed(1);
    };

    const displayPlayers = useMemo(() => {
        return players
            .filter(p => shouldIncludePlayer(p.id))
            .map(p => {
                const isActive = checkIsActive(p.id);
                let displayName = p.name || '不明';
                if (!isActive && !displayName.includes('(退団)')) {
                    displayName += ' (退団)';
                }
                const age = calcAge(p.birth_date);
                const bmi = calcBMI(p.height, p.weight);
                
                return {
                    ...p,
                    displayName,
                    isRetired: !isActive,
                    ageVal: age === '-' ? 0 : age,
                    bmiVal: bmi === '-' ? 0 : parseFloat(bmi),
                    heightVal: p.height || 0,
                    weightVal: p.weight || 0,
                    numVal: p.number ? parseInt(p.number, 10) : 999
                };
            })
            .sort((a, b) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];
                
                if (sortConfig.key === 'age') { aVal = a.ageVal; bVal = b.ageVal; }
                else if (sortConfig.key === 'height') { aVal = a.heightVal; bVal = b.heightVal; }
                else if (sortConfig.key === 'weight') { aVal = a.weightVal; bVal = b.weightVal; }
                else if (sortConfig.key === 'bmi') { aVal = a.bmiVal; bVal = b.bmiVal; }
                else if (sortConfig.key === 'number') { aVal = a.numVal; bVal = b.numVal; }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
    }, [players, playersMode, sortConfig]);

    const initialPlayerId = isPlayerRole && linkedPlayerId ? String(linkedPlayerId) : (displayPlayers.length > 0 ? String(displayPlayers[0].id) : '');
    const [selectedPlayerId, setSelectedPlayerId] = useState(initialPlayerId);
    
    useEffect(() => {
        if (selectedPlayerId && shouldIncludePlayer(selectedPlayerId)) return;
        
        if (isPlayerRole && linkedPlayerId) {
            setSelectedPlayerId(String(linkedPlayerId));
        } else if (displayPlayers && displayPlayers.length > 0) {
            setSelectedPlayerId(String(displayPlayers[0].id));
        } else {
            setSelectedPlayerId('');
        }
    }, [displayPlayers, selectedPlayerId, isPlayerRole, linkedPlayerId, playersMode]);

    // ★ データベース（Render）から身体能力データを取得する
    const [records, setRecords] = useState([]);

    const fetchPhysicalRecords = async () => {
        try {
            const res = await fetch(`${API_BASE}/physical-records/`);
            if (res.ok) {
                const data = await res.json();
                const formatted = data.map(item => ({
                    ...(item.measurements || {}),
                    id: item.id,
                    playerId: String(item.playerId),
                    date: item.date,
                    measurer: item.measurer || '',
                    memo: item.memo || ''
                }));
                setRecords(formatted);
            }
        } catch (err) {
            console.error('身体能力データの取得失敗:', err);
        }
    };

    useEffect(() => {
        fetchPhysicalRecords();
    }, []);
    
    const [editingRecordId, setEditingRecordId] = useState(null); 
    const [formData, setFormData] = useState({});
    const [memo, setMemo] = useState('');
    const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0]);
    const [measurer, setMeasurer] = useState('山岸コーチ');

    const [filterMode, setFilterMode] = useState('year');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [activeCategory, setActiveCategory] = useState(null);

    const getSeasonYear = (dateString) => {
        if (!dateString) return new Date().getFullYear();
        const seasonStartMonth = typeof window !== 'undefined' ? parseInt(localStorage.getItem('logistars_season_start_month') || '4', 10) : 4;
        const d = new Date(dateString);
        return d.getMonth() + 1 >= seasonStartMonth ? d.getFullYear() : d.getFullYear() - 1;
    };

    const availableYears = useMemo(() => {
        const years = new Set();
        records.forEach(r => {
            if (r.date) years.add(getSeasonYear(r.date));
        });
        const sortedYears = Array.from(years).sort((a, b) => b - a); 
        if (sortedYears.length === 0) return [getSeasonYear(new Date())];
        return sortedYears;
    }, [records]);

    const [selectedYear, setSelectedYear] = useState(availableYears[0]);
    useEffect(() => { 
        if (!availableYears.includes(selectedYear)) setSelectedYear(availableYears[0]); 
    }, [availableYears, selectedYear]);

    const targetPlayer = useMemo(() => {
        if (!displayPlayers || displayPlayers.length === 0) return { id: '', name: '未登録', displayName: '未登録', number: '-', position: '-', batting_hand: '-', photo: '', height: '', weight: '', birth_date: '' };
        return displayPlayers.find(p => String(p.id) === String(selectedPlayerId)) || displayPlayers[0];
    }, [displayPlayers, selectedPlayerId]);

    const targetRecords = useMemo(() => {
        return records
            .filter(r => String(r.playerId) === String(targetPlayer.id))
            .filter(r => {
                if (!r.date) return false;
                if (filterMode === 'year') {
                    return getSeasonYear(r.date) === selectedYear;
                } else {
                    if (startDate && new Date(r.date) < new Date(startDate)) return false;
                    if (endDate) {
                        const end = new Date(endDate);
                        end.setHours(23, 59, 59, 999);
                        if (new Date(r.date) > end) return false;
                    }
                    return true;
                }
            })
            .sort((a,b) => new Date(b.date) - new Date(a.date));
    }, [records, targetPlayer.id, filterMode, selectedYear, startDate, endDate]);

    const latest = targetRecords[0] || {};
    const previous = targetRecords[1] || {};

    const getBestRecord = (key, reverse) => {
        const vals = targetRecords.map(r => parseFloat(r[key])).filter(v => !isNaN(v));
        if (vals.length === 0) return '-';
        return reverse ? Math.min(...vals) : Math.max(...vals);
    };

    const renderDiff = (latestVal, prevVal, reverseGoodBad) => {
        if (latestVal === undefined || prevVal === undefined || latestVal === '' || prevVal === '') return <span className="text-slate-400">-</span>;
        const diff = parseFloat(latestVal) - parseFloat(prevVal);
        if (diff === 0) return <span className="text-slate-400 font-bold">±0</span>;
        
        const isGood = reverseGoodBad ? diff < 0 : diff > 0;
        const colorClass = isGood ? 'text-green-600' : 'text-red-500';
        const sign = diff > 0 ? '+' : '';
        const icon = diff > 0 ? '↑' : '↓';
        
        return <span className={`${colorClass} font-bold`}>{sign}{diff.toFixed(diff % 1 === 0 ? 0 : 2)} <span className="text-[10px]">{icon}</span></span>;
    };

    const openNewInput = () => {
        setFormData({
            height: targetPlayer.height || '',
            weight: targetPlayer.weight || ''
        });
        setMemo('');
        setInputDate(new Date().toISOString().split('T')[0]);
        setMeasurer('山岸コーチ');
        setEditingRecordId(null);
        setViewMode('input');
    };

    const openEditInput = (record) => {
        setFormData(record);
        setMemo(record.memo || '');
        setInputDate(record.date || new Date().toISOString().split('T')[0]);
        setMeasurer(record.measurer || '');
        setEditingRecordId(record.id);
        setViewMode('input');
    };

    const handleInputChange = (key, value) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    // ★ データベース（Render）へ身体能力データを保存・更新する
    const handleSave = async () => {
        if (!targetPlayer.id) {
            Swal.fire('エラー', '選手が選択されていません', 'error');
            return;
        }
        const { id, playerId, date, measurer: m, memo: mem, ...cleanMeasurements } = formData;
        const payload = {
            playerId: parseInt(targetPlayer.id, 10),
            date: inputDate,
            measurer: measurer,
            memo: memo,
            measurements: cleanMeasurements
        };

        try {
            const url = editingRecordId ? `${API_BASE}/physical-records/${editingRecordId}/` : `${API_BASE}/physical-records/`;
            const method = editingRecordId ? 'PATCH' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                await fetchPhysicalRecords();
                Swal.fire({ title: editingRecordId ? '更新完了' : '保存完了', text: '身体能力データをデータベースに保存しました。', icon: 'success', timer: 1500, showConfirmButton: false });
                setViewMode('dashboard');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
                Swal.fire('エラー', '保存に失敗しました', 'error');
            }
        } catch (err) {
            Swal.fire('通信エラー', 'サーバーに接続できません', 'error');
        }
    };

    // ★ データベース（Render）から身体能力データを削除する
    const handleDelete = (id) => {
        Swal.fire({
            title: '記録の削除', text: 'この測定記録をデータベースから削除しますか？', icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: '削除'
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    const res = await fetch(`${API_BASE}/physical-records/${id}/`, { method: 'DELETE' });
                    if (res.ok) {
                        await fetchPhysicalRecords();
                        Swal.fire('削除完了', '記録を削除しました。', 'success');
                    }
                } catch (e) {
                    Swal.fire('通信エラー', '削除に失敗しました', 'error');
                }
            }
        });
    };

    const requestSort = (key) => {
        let direction = 'desc';
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc';
        }
        if (key === 'number') {
            direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
        }
        setSortConfig({ key, direction });
    };

    const getSortIcon = (key) => {
        if (sortConfig.key !== key) return '↕';
        return sortConfig.direction === 'asc' ? '↑' : '↓';
    };

    const FilterControls = () => (
        <div className="flex flex-col md:flex-row items-center gap-3 bg-white/5 p-2 rounded-xl border border-white/10 backdrop-blur-md shadow-inner justify-center w-full md:w-auto">
            <div className="flex bg-black/50 rounded-lg p-1 shrink-0 w-full md:w-auto">
                <button 
                    onClick={() => setFilterMode('year')}
                    className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${filterMode === 'year' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    年度
                </button>
                <button 
                    onClick={() => setFilterMode('custom')}
                    className={`flex-1 md:flex-none px-4 py-1.5 rounded-md text-xs font-bold transition-all duration-300 ${filterMode === 'custom' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    期間指定
                </button>
            </div>
            <div className="flex items-center justify-center">
                {filterMode === 'year' ? (
                    <select 
                        value={selectedYear} 
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="bg-black/40 text-cyan-100 border border-cyan-500/30 rounded-lg px-4 py-1.5 text-xs font-bold outline-none focus:border-cyan-400 cursor-pointer shadow-inner text-center w-32"
                    >
                        {availableYears.map(y => <option key={y} value={y}>{y}年度</option>)}
                    </select>
                ) : (
                    <div className="flex items-center gap-2">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-black/40 text-cyan-100 border border-cyan-500/30 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-cyan-400 cursor-pointer shadow-inner"/>
                        <span className="text-cyan-500 font-bold text-xs">〜</span>
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-black/40 text-cyan-100 border border-cyan-500/30 rounded-lg px-2 py-1.5 text-[10px] font-bold outline-none focus:border-cyan-400 cursor-pointer shadow-inner"/>
                    </div>
                )}
            </div>
        </div>
    );

    const renderTable = (cat) => (
        <div 
            key={cat.id}
            className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 w-full cursor-pointer hover:shadow-md hover:border-blue-300 transition-all duration-300 transform hover:-translate-y-1 group relative overflow-hidden"
            onClick={() => setActiveCategory(cat)}
        >
            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity text-blue-500 text-xs font-bold flex items-center gap-1">
                詳細を見る <span className="text-lg">→</span>
            </div>
            <h3 className="text-[11px] font-bold text-slate-700 border-l-4 border-[#0b1c3a] pl-2 mb-4 flex items-center gap-2">
                <span className="bg-[#0b1c3a] text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px]">{cat.id}</span>
                {cat.title}
            </h3>
            <div className="overflow-x-auto pointer-events-none">
                <table className="w-full text-[10px] text-center whitespace-nowrap">
                    <thead className="text-slate-400 border-b border-dashed border-slate-300">
                        <tr>
                            <th className="py-2 text-left font-normal">測定項目</th>
                            <th className="py-2 font-normal">最新記録</th>
                            <th className="py-2 font-normal">前回記録</th>
                            <th className="py-2 font-normal">過去最高</th>
                            <th className="py-2 font-normal">前回比</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-slate-100">
                        {cat.items.map(item => {
                            const valL = latest[item.key];
                            const valP = previous[item.key];
                            const best = getBestRecord(item.key, item.reverseGoodBad);
                            return (
                                <tr key={item.key} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-2 text-left font-bold text-slate-700">{item.label}</td>
                                    <td className="py-2 font-bold text-[#0b1c3a]">{valL !== undefined && valL !== '' ? valL : '-'} <span className="text-[8px] text-slate-400 font-normal">{item.unit}</span></td>
                                    <td className="py-2 text-slate-500">{valP !== undefined && valP !== '' ? valP : '-'} <span className="text-[8px] font-normal">{item.unit}</span></td>
                                    <td className="py-2 text-slate-700 font-bold">{best} <span className="text-[8px] text-slate-400 font-normal">{item.unit}</span></td>
                                    <td className="py-2">{renderDiff(valL, valP, item.reverseGoodBad)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const SvgLineChart = () => {
        const chartData = [...targetRecords].reverse();
        if (chartData.length === 0) return <div className="text-center text-slate-400 text-xs py-10">データがありません</div>;

        const w = 800; const h = 220; const padding = { top: 20, right: 40, bottom: 30, left: 40 };
        const innerW = w - padding.left - padding.right;
        const innerH = h - padding.top - padding.bottom;
        
        const lines = [
            { key: 'vertical_jump', color: '#ef4444', label: '垂直跳び' },
            { key: 'broad_jump', color: '#3b82f6', label: '立ち幅跳び' },
            { key: 'sprint_30m', color: '#10b981', label: '30m走' },
            { key: 'back_run_10m', color: '#f59e0b', label: 'バック走10m' },
            { key: 'side_steps', color: '#8b5cf6', label: '反復横跳び' }
        ];

        const yTicks = [0, 60, 120, 180, 240, 300];
        const maxY = 300; 
        const getY = (val) => padding.top + innerH - (val / maxY) * innerH;
        const getX = (idx) => padding.left + (idx * (innerW / (chartData.length - 1 || 1)));

        return (
            <div className="w-full overflow-x-auto hide-scrollbar">
                <div className="min-w-[600px]">
                    <div className="flex flex-wrap gap-4 text-[9px] font-bold mb-2 ml-10">
                        {lines.map((l, i) => (
                            <span key={i} className="flex items-center gap-1"><span style={{color: l.color}}>●</span> {l.label}</span>
                        ))}
                    </div>
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto drop-shadow-sm bg-slate-50/50 rounded-lg border border-slate-100">
                        {yTicks.map(val => {
                            const y = getY(val);
                            return (
                                <g key={`grid-${val}`}>
                                    <line x1={padding.left} y1={y} x2={w - padding.right} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                                    <text x={padding.left - 10} y={y + 3} textAnchor="end" fill="#94a3b8" fontSize="10">{val}</text>
                                </g>
                            );
                        })}
                        {chartData.map((d, i) => {
                            const x = getX(i);
                            return (
                                <g key={`x-${i}`}>
                                    <line x1={x} y1={padding.top} x2={x} y2={h - padding.bottom} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                                    <text x={x} y={h - 10} textAnchor="middle" fill="#64748b" fontSize="10" fontWeight="bold">{d.date.replace(/-/g, '/')}</text>
                                </g>
                            );
                        })}
                        {lines.map(line => {
                            const points = chartData.map((d, i) => `${getX(i)},${getY(parseFloat(d[line.key]) || 0)}`).join(' ');
                            return (
                                <g key={line.key}>
                                    <polyline points={points} fill="none" stroke={line.color} strokeWidth="2" />
                                    {chartData.map((d, i) => (
                                        <circle key={i} cx={getX(i)} cy={getY(parseFloat(d[line.key]) || 0)} r="3.5" fill="white" stroke={line.color} strokeWidth="2" />
                                    ))}
                                </g>
                            );
                        })}
                    </svg>
                </div>
            </div>
        );
    };

    if (activeCategory) {
        const historyData = targetRecords.slice(0, 12);
        
        return (
            <div className="fixed inset-0 bg-slate-900/60 z-[200] flex flex-col items-center justify-center p-2 md:p-6 backdrop-blur-sm animate-fade-in">
                <div className="bg-white w-full max-w-6xl h-[95vh] md:h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                    
                    <div className="bg-[#0b1c3a] px-4 md:px-6 py-4 border-b border-[#1e3a8a] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 relative">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-screen filter blur-[80px] opacity-10 animate-pulse pointer-events-none"></div>
                        <div className="flex items-center gap-3 w-full md:w-auto relative z-10">
                            <button onClick={() => setActiveCategory(null)} className="text-cyan-300 hover:text-white transition-colors font-bold text-lg p-1">◀</button>
                            <div>
                                <h2 className="text-lg md:text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300 flex items-center gap-2">
                                    <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{activeCategory.id}</span>
                                    {activeCategory.title} 詳細履歴
                                </h2>
                                <p className="text-[10px] text-cyan-200/70 mt-1">{targetPlayer.displayName || targetPlayer.name} #{targetPlayer.number}</p>
                            </div>
                        </div>
                        
                        <div className="w-full md:w-auto relative z-10">
                            <FilterControls />
                        </div>
                    </div>

                    <div className="p-4 md:p-6 flex-1 overflow-auto bg-slate-50">
                        {historyData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                                <span className="text-4xl mb-3">📊</span>
                                <p className="font-bold text-sm">指定期間の測定データがありません</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="overflow-x-auto hide-scrollbar">
                                    <table className="w-full text-sm text-center whitespace-nowrap">
                                        <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                            <tr>
                                                <th className="py-3 px-4 text-left border-r border-slate-200 bg-white sticky left-0 z-10 w-48 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                    測定項目
                                                </th>
                                                {historyData.map((r, idx) => (
                                                    <th key={idx} className="py-3 px-6 border-r border-slate-200 min-w-[120px]">
                                                        <div className="text-xs text-slate-400 font-normal mb-1">{idx === 0 ? '最新' : `${idx}回前`}</div>
                                                        <div className="text-[#0b1c3a]">{r.date.replace(/-/g, '/')}</div>
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {activeCategory.items.map(item => (
                                                <tr key={item.key} className="hover:bg-slate-50 transition-colors">
                                                    <td className="py-4 px-4 text-left font-bold text-slate-800 border-r border-slate-200 bg-white sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                                                        <div className="flex items-center justify-between">
                                                            <span>{item.label}</span>
                                                            <span className="text-[10px] text-slate-400 font-normal ml-2">{item.unit}</span>
                                                        </div>
                                                    </td>
                                                    {historyData.map((r, idx) => {
                                                        const val = r[item.key];
                                                        const hasVal = val !== undefined && val !== null && val !== '';
                                                        
                                                        let diffElement = null;
                                                        if (hasVal && idx < historyData.length - 1) {
                                                            const prevVal = historyData[idx + 1][item.key];
                                                            const hasPrev = prevVal !== undefined && prevVal !== null && prevVal !== '';
                                                            if (hasPrev) {
                                                                const diff = parseFloat(val) - parseFloat(prevVal);
                                                                if (diff !== 0) {
                                                                    const isGood = item.reverseGoodBad ? diff < 0 : diff > 0;
                                                                    const color = isGood ? 'text-green-600' : 'text-red-500';
                                                                    const sign = diff > 0 ? '+' : '';
                                                                    const icon = diff > 0 ? '↑' : '↓';
                                                                    diffElement = <span className={`text-[10px] ml-2 ${color}`}>{sign}{diff.toFixed(diff % 1 === 0 ? 0 : 2)}{icon}</span>;
                                                                } else {
                                                                    diffElement = <span className="text-[10px] ml-2 text-slate-300">±0</span>;
                                                                }
                                                            }
                                                        }

                                                        return (
                                                            <td key={idx} className="py-4 px-6 border-r border-slate-100">
                                                                {hasVal ? (
                                                                    <div className="flex items-center justify-center font-black text-[#0b1c3a] text-lg">
                                                                        {val} {diffElement}
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-300">-</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                        <div className="mt-4 text-right">
                            <button onClick={() => setActiveCategory(null)} className="bg-slate-200 text-slate-700 px-6 py-2 rounded-lg font-bold hover:bg-slate-300 transition-colors">
                                閉じる
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (viewMode === 'dashboard') {
        return (
            <div className="w-full pb-20 font-sans">
                <div className="bg-[#0b1c3a] text-white overflow-hidden shadow-lg border-b border-blue-900 mb-6 relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500 rounded-full mix-blend-screen filter blur-[80px] opacity-10 animate-pulse pointer-events-none"></div>
                    <div className="px-4 md:px-6 py-4 md:py-5 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] flex flex-col lg:flex-row lg:justify-between lg:items-center gap-5 relative z-10">
                        <div>
                            <h2 className="text-xl md:text-2xl font-black tracking-widest flex items-center gap-3 text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-300">
                                <span>🏃‍♂️</span> 身体能力データ
                            </h2>
                            <p className="text-[9px] md:text-[10px] text-cyan-200/70 mt-1.5 tracking-wide uppercase">Physical & Performance Analytics</p>
                        </div>
                        <div className="flex flex-col md:flex-row gap-4 items-center justify-end w-full lg:w-auto">
                            <FilterControls />
                            
                            {!isPlayerRole && (
                                <div className="flex items-center md:ml-2 border-l border-white/20 pl-4">
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

                            {userRole === 'admin' && (
                                <button onClick={openNewInput} className="relative flex items-center gap-1.5 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white border border-cyan-400/30 rounded-xl text-xs font-black transition-all duration-300 shadow-[0_4px_15px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5 group overflow-hidden shrink-0 w-full md:w-auto justify-center">
                                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                                    <span className="relative z-10 text-base leading-none">＋</span>
                                    <span className="relative z-10 tracking-widest">測定結果を追加</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 md:p-6 bg-slate-50 min-h-screen border-x border-b border-slate-200 shadow-sm space-y-4">
                    
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl flex flex-col xl:flex-row p-6 gap-8 relative overflow-hidden">
                        <div className="flex gap-5 xl:w-[320px] xl:border-r border-dashed border-slate-300 xl:pr-8">
                            <div className="w-24 h-28 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0 shadow-sm flex items-center justify-center">
                                {targetPlayer.photo ? <img src={targetPlayer.photo} alt="face" className="w-full h-full object-cover" /> : <span className="text-4xl text-slate-300">👤</span>}
                            </div>
                            <div className="flex flex-col justify-center w-full">
                                <select 
                                    value={selectedPlayerId} 
                                    onChange={e => setSelectedPlayerId(e.target.value)} 
                                    className="text-xl font-black text-[#0b1c3a] outline-none border-b border-slate-300 bg-transparent w-full mb-2 pb-1 cursor-pointer"
                                >
                                    {displayPlayers.map(p => (
                                        <option 
                                            key={p.id} 
                                            value={p.id}
                                            className={p.isRetired ? "text-slate-400 font-normal" : "text-black"}
                                        >
                                            {p.displayName}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex items-center gap-3 text-xs font-bold text-slate-700 mb-2">
                                    <span className="text-2xl pr-3 border-r border-slate-300">{targetPlayer.number}</span>
                                    <div className="flex flex-col text-[10px] text-slate-500 font-normal">
                                        <span>{targetPlayer.position}登録</span>
                                        <span>{targetPlayer.batting_hand}</span>
                                    </div>
                                </div>
                                <div className="text-[9px] text-slate-400 space-y-1">
                                    <div className="flex justify-between border-b border-slate-100 pb-0.5"><span className="w-12">生年月日</span><span className="text-slate-600 font-bold">{targetPlayer.birth_date ? `${targetPlayer.birth_date.replace(/-/g,'/')} (${calcAge(targetPlayer.birth_date)}歳)` : '未登録'}</span></div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1">
                            <h3 className="text-xs font-bold text-slate-700 mb-4 flex items-center gap-2">
                                測定サマリー 
                                <span className="text-[9px] font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                    {filterMode === 'year' ? `${selectedYear}年度` : `${startDate || '設定なし'} 〜 ${endDate || '設定なし'}`}
                                </span>
                                <span className="text-[9px] text-blue-500 font-bold ml-auto">(最新測定日: {latest.date || '-'})</span>
                            </h3>
                            
                            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-5 gap-y-4 gap-x-2">
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center bg-blue-50/30"><p className="text-[9px] text-slate-500 mb-1">身長</p><p className="text-lg font-black text-[#0b1c3a]">{latest.height || targetPlayer.height || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">cm</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center bg-blue-50/30"><p className="text-[9px] text-slate-500 mb-1">体重</p><p className="text-lg font-black text-[#0b1c3a]">{latest.weight || targetPlayer.weight || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">kg</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center bg-blue-50/30"><p className="text-[9px] text-slate-500 mb-1">BMI</p><p className="text-lg font-black text-blue-700">{calcBMI(latest.height || targetPlayer.height, latest.weight || targetPlayer.weight)}</p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center bg-blue-50/30"><p className="text-[9px] text-slate-500 mb-1">体脂肪率</p><p className="text-lg font-black text-blue-700">{latest.body_fat || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">%</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center bg-blue-50/30"><p className="text-[9px] text-slate-500 mb-1">筋肉量</p><p className="text-lg font-black text-blue-700">{latest.muscle_mass || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">kg</span></p></div>
                                
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">垂直跳び</p><p className="text-lg font-black text-[#0b1c3a]">{latest.vertical_jump || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">cm</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">立ち幅跳び</p><p className="text-lg font-black text-[#0b1c3a]">{latest.broad_jump || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">cm</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">30m走</p><p className="text-lg font-black text-[#0b1c3a]">{latest.sprint_30m || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">秒</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">バック走10m</p><p className="text-lg font-black text-[#0b1c3a]">{latest.back_run_10m || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">秒</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">反復横跳び</p><p className="text-lg font-black text-[#0b1c3a]">{latest.side_steps || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">回</span></p></div>
                                
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">スクワット</p><p className="text-lg font-black text-[#0b1c3a]">{latest.squat || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">kg</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">デッドリフト</p><p className="text-lg font-black text-[#0b1c3a]">{latest.deadlift || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">kg</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">メディシンボール</p><p className="text-lg font-black text-[#0b1c3a]">{latest.med_ball || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">m</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">握力 (右)</p><p className="text-lg font-black text-[#0b1c3a]">{latest.grip_r || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">kg</span></p></div>
                                <div className="border border-dashed border-slate-200 rounded p-2 text-center"><p className="text-[9px] text-slate-500 mb-1">握力 (左)</p><p className="text-lg font-black text-[#0b1c3a]">{latest.grip_l || '-'}<span className="text-[9px] ml-0.5 text-slate-400 font-normal">kg</span></p></div>
                            </div>
                            <p className="text-[9px] text-slate-400 mt-2 text-right">※ 前回測定日 ({previous.date || '-'}) 比較</p>
                        </div>
                    </div>

                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xs font-bold text-slate-700 border-l-4 border-[#0b1c3a] pl-2">身体能力推移グラフ</h3>
                        </div>
                        <SvgLineChart />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {CATEGORIES.map((cat) => (
                            <React.Fragment key={cat.id}>
                                {renderTable(cat)}
                            </React.Fragment>
                        ))}
                        
                        <div className="bg-white border border-slate-200 rounded-lg shadow-sm p-4 w-full md:col-span-2 xl:col-span-3 flex flex-col">
                            <h3 className="text-[11px] font-bold text-slate-700 border-l-4 border-[#0b1c3a] pl-2 mb-4">直近の測定履歴</h3>
                            {targetRecords.length === 0 ? (
                                <div className="text-center text-slate-400 text-xs py-10 my-auto">測定データがありません</div>
                            ) : (
                                <div className="overflow-x-auto hide-scrollbar flex-1">
                                    <table className="w-full text-[10px] text-center whitespace-nowrap">
                                        <thead className="text-slate-400 border-b border-dashed border-slate-300 bg-slate-50">
                                            <tr>
                                                <th className="py-2 text-left font-normal px-2 rounded-tl">測定日</th>
                                                <th className="py-2 font-normal px-2">垂直跳び</th>
                                                <th className="py-2 font-normal px-2">立ち幅跳び</th>
                                                <th className="py-2 font-normal px-2 text-blue-600">30m走</th>
                                                <th className="py-2 font-normal px-2 text-orange-500">バック走10m</th>
                                                <th className="py-2 font-normal px-2 text-purple-500">反復横跳び</th>
                                                {userRole === 'admin' && <th className="py-2 font-normal px-2 rounded-tr">操作</th>}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-dashed divide-slate-100">
                                            {targetRecords.map((r, i) => (
                                                <tr key={i} className="hover:bg-slate-50">
                                                    <td className="py-2.5 text-left font-bold text-slate-600 px-2">{r.date.replace(/-/g, '/')}</td>
                                                    <td className="py-2.5 px-2 font-bold">{r.vertical_jump || '-'}</td>
                                                    <td className="py-2.5 px-2 font-bold">{r.broad_jump || '-'}</td>
                                                    <td className="py-2.5 px-2 font-bold text-blue-600">{r.sprint_30m || '-'}</td>
                                                    <td className="py-2.5 px-2 font-bold text-orange-500">{r.back_run_10m || '-'}</td>
                                                    <td className="py-2.5 px-2 font-bold text-purple-500">{r.side_steps || '-'}</td>
                                                    {userRole === 'admin' && (
                                                        <td className="py-2.5 px-2 flex justify-center gap-1">
                                                            <button onClick={() => openEditInput(r)} className="text-[9px] text-blue-600 border border-blue-200 bg-blue-50 rounded px-1.5 py-0.5 hover:bg-blue-100">編集</button>
                                                            <button onClick={() => handleDelete(r.id)} className="text-[9px] text-red-500 border border-red-200 bg-red-50 rounded px-1.5 py-0.5 hover:bg-red-100">削除</button>
                                                        </td>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#f8f9fa] min-h-screen pb-12 animate-fade-in relative z-50">
            
            <div className="bg-[#0b1c3a] px-4 md:px-8 py-4 flex flex-col md:flex-row justify-between items-center shadow-lg border-b border-blue-900 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] gap-4 sticky top-0 z-20">
                <div className="flex items-center w-full md:w-auto">
                    <button onClick={() => setViewMode('dashboard')} className="text-blue-300 hover:text-white transition-colors font-bold flex items-center gap-1 mr-4">
                        ◀ <span className="hidden sm:inline">戻る</span>
                    </button>
                    <h2 className="text-lg md:text-xl font-bold text-white flex items-center gap-2 tracking-widest">
                        {editingRecordId ? '身体能力データの編集' : '新規測定結果の追加'}
                    </h2>
                </div>
                
                <div className="flex items-center justify-end w-full md:w-auto gap-6">
                    <button onClick={handleSave} className="relative flex items-center gap-1.5 px-8 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white border border-cyan-400/30 rounded-lg text-sm font-black transition-all duration-300 shadow-[0_4px_15px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5 group overflow-hidden whitespace-nowrap">
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                        <span className="relative z-10">💾 {editingRecordId ? '更新する' : '保存する'}</span>
                    </button>
                </div>
            </div>

            <div className="px-4 md:px-6 pt-6 max-w-[1400px] mx-auto">
                <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col md:flex-row gap-6 items-center shadow-sm mb-6 relative">
                    <div className="absolute top-4 right-4">
                        <select value={selectedPlayerId} onChange={(e) => setSelectedPlayerId(e.target.value)} className="border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-bold text-blue-700 outline-none focus:border-blue-500 bg-blue-50/50 shadow-sm cursor-pointer">
                            {displayPlayers.map(p => (
                                <option 
                                    key={p.id} 
                                    value={p.id}
                                    className={p.isRetired ? "text-slate-400 font-normal" : "text-black"}
                                >
                                    #{p.number} {p.displayName}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="w-24 h-28 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0 shadow-sm flex items-center justify-center">
                        {targetPlayer.photo ? <img src={targetPlayer.photo} alt="face" className="w-full h-full object-cover" /> : <span className="text-xs text-slate-400 font-bold">NO IMAGE</span>}
                    </div>
                    
                    <div className="flex-1 w-full grid grid-cols-2 md:grid-cols-4 gap-6 pt-2">
                        <div className="col-span-2 md:col-span-4 border-b border-slate-100 pb-3 mb-2">
                            <h2 className="text-2xl font-black text-[#0b1c3a] mb-1 flex items-end gap-2">
                                {targetPlayer.displayName || targetPlayer.name} <span className="text-slate-400 font-normal text-lg">#{targetPlayer.number}</span>
                            </h2>
                            <p className="text-slate-500 font-bold text-sm">{targetPlayer.position} / {targetPlayer.batting_hand}</p>
                        </div>
                        <div><p className="text-[10px] text-slate-400 mb-1">生年月日</p><p className="font-bold text-slate-700 text-sm">{targetPlayer.birth_date ? `${targetPlayer.birth_date.replace(/-/g,'/')} (${calcAge(targetPlayer.birth_date)}歳)` : '未登録'}</p></div>
                        <div><p className="text-[10px] text-slate-400 mb-1">利き腕 / 打席</p><p className="font-bold text-slate-700 text-sm">{targetPlayer.batting_hand}</p></div>
                        <div><p className="text-[10px] text-slate-400 mb-1">ポジション</p><p className="font-bold text-slate-700 text-sm">{targetPlayer.position}</p></div>
                        <div>
                            <p className="text-[10px] font-bold text-red-500 mb-1 flex items-center gap-1">測定日 <span className="text-red-500">*</span></p>
                            <input type="date" value={inputDate} onChange={e=>setInputDate(e.target.value)} className="border-b-2 border-slate-300 outline-none focus:border-[#0b1c3a] text-slate-700 w-full font-bold bg-transparent pb-1" />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {CATEGORIES.map((cat) => (
                        <div key={cat.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                            <h3 className="bg-slate-50 border-b border-slate-200 px-5 py-3 text-sm font-black text-[#0b1c3a] flex items-center gap-2">
                                <span className="bg-[#0b1c3a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{cat.id}</span> {cat.title}
                            </h3>
                            <div className="p-5">
                                <table className="w-full text-xs text-center whitespace-nowrap">
                                    <thead className="text-slate-400 border-b border-slate-100">
                                        <tr><th className="py-2 text-left font-normal">種目</th><th className="py-2 font-normal w-24">測定値</th><th className="py-2 font-normal w-12">単位</th><th className="py-2 font-normal text-slate-300">前回値</th></tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {cat.items.map((item) => (
                                            <tr key={item.key}>
                                                <td className="py-3.5 text-left font-bold text-slate-700">{item.label}</td>
                                                <td className="py-3.5">
                                                    <input 
                                                        type="number" step="0.1"
                                                        value={formData[item.key] || ''} 
                                                        onChange={(e) => handleInputChange(item.key, e.target.value)}
                                                        className="w-20 border border-slate-300 rounded-lg px-2 py-2 text-center outline-none focus:border-[#0b1c3a] font-black text-[#0b1c3a] bg-slate-50 focus:bg-white transition-colors" 
                                                    />
                                                </td>
                                                <td className="py-3.5 text-slate-500">{item.unit}</td>
                                                <td className="py-3.5 text-slate-300 font-mono">{previous[item.key] || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}

                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden md:col-span-2 xl:col-span-3">
                        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
                            <h3 className="font-black text-[#0b1c3a] text-sm flex items-center gap-2">
                                <span className="bg-[#0b1c3a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">✎</span> 過去のケガ・備考
                            </h3>
                        </div>
                        <div className="p-5">
                            <textarea 
                                value={memo} 
                                onChange={e => setMemo(e.target.value)} 
                                placeholder="過去のケガの履歴や、現在の痛み・違和感などを入力してください"
                                className="w-full border-2 border-slate-200 rounded-xl p-4 text-sm outline-none focus:border-[#0b1c3a] bg-slate-50 resize-none h-32 transition-colors font-bold text-slate-700"
                            ></textarea>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}