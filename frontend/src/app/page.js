"use client";

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Swal from 'sweetalert2';
import ScoreboardModal from '../components/ScoreboardModal';
import Dashboard from '../components/Dashboard';
import PlayerAnalytics from '../components/PlayerAnalytics';
import MobileInput from '../components/MobileInput';
import PhysicalData from '../components/PhysicalData';
import BattingData from '../components/BattingData';
import PitchingData from '../components/PitchingData';
import Login from '../components/Login';
import Settings from '../components/Settings';
import RetiredPlayers from '../components/RetiredPlayers';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(''); 
  const [userName, setUserName] = useState('');
  
  const [linkedPlayerId, setLinkedPlayerId] = useState(null);

  const [viewMode, setViewMode] = useState('admin'); 
  const [activeMenu, setActiveMenu] = useState('サマリーダッシュボード'); 
  const [selectedPlayer, setSelectedPlayer] = useState(null); 

  const [settingsTab, setSettingsTab] = useState('system'); 

  const [teamName, setTeamName] = useState('読み込み中...');
  const [teamLogo, setTeamLogo] = useState(null);
  const [settingTeamName, setSettingTeamName] = useState('');
  
  const [seasonStartMonth, setSeasonStartMonth] = useState('4');
  const [seasonStartDay, setSeasonStartDay] = useState('1');
  const [seasonEndMonth, setSeasonEndMonth] = useState('3');
  const [seasonEndDay, setSeasonEndDay] = useState('31');

  const [isSavingTeam, setIsSavingTeam] = useState(false);

  const [teamId, setTeamId] = useState(null);
  const [playersData, setPlayersData] = useState([]);
  const [gamesData, setGamesData] = useState([]);
  const [dbStatus, setDbStatus] = useState('connecting');

  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [newGame, setNewGame] = useState({ date: '', opponent: '', game_type: '公式戦', location: '', status: '予定' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isPlayerModalOpen, setIsPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  
  const [playerForm, setPlayerForm] = useState({ 
      number: '', name: '', birth_date: '', height: '', weight: '', position: '投手', batting_hand: '右投右打', photo: '', retirementDate: '' 
  });
  const [isPlayerSubmitting, setIsPlayerSubmitting] = useState(false);

  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null); 
  const [gameTab, setGameTab] = useState('batting'); 
  
  const [gameBattingResults, setGameBattingResults] = useState([]); 
  const [gamePitchingResults, setGamePitchingResults] = useState([]); 
  
  const [allBattingResults, setAllBattingResults] = useState([]);
  const [allPitchingResults, setAllPitchingResults] = useState([]);

  const [atBatRecords, setAtBatRecords] = useState([]);
  const [pitchRecords, setPitchRecords] = useState([]);

  const fileInputRef = useRef(null);
  const [uploadType, setUploadType] = useState('batting'); 
  const [isUploading, setIsUploading] = useState(false);

  const [isMobileInputOpen, setIsMobileInputOpen] = useState(false);
  const [mobileHistoryLogs, setMobileHistoryLogs] = useState([]);
  const [isLogsLoaded, setIsLogsLoaded] = useState(false); 

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  
  const [mustChangePassword, setMustChangePassword] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const themeColor = { primary: 'bg-[#0b1c3a]', primaryText: 'text-[#0b1c3a]', navBg: 'bg-blue-900' };

  const isFutureGame = selectedGame ? new Date(selectedGame.date).setHours(0,0,0,0) > new Date().setHours(0,0,0,0) : false;

  const sortPlayersList = (list) => {
      return [...list].sort((a, b) => {
          const aIsRetired = a.retirementDate && new Date(a.retirementDate) <= today;
          const bIsRetired = b.retirementDate && new Date(b.retirementDate) <= today;
          if (aIsRetired && !bIsRetired) return 1;
          if (!aIsRetired && bIsRetired) return -1;
          return 0;
      });
  };

  // ★復刻：通信失敗時にデモデータ（山田太郎など）を表示する
  const fetchPlayers = () => fetch('http://127.0.0.1:8000/api/players/')
    .then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
    })
    .then(data => setPlayersData(sortPlayersList(data)))
    .catch(() => {
        setPlayersData(sortPlayersList([
            { id: 1, number: '10', name: '山田 太郎', position: '投手', batting_hand: '右投右打', birth_date: '2008-04-12', height: 178, weight: 72, photo: '', retirementDate: null },
            { id: 2, number: '5', name: '佐藤 次郎', position: '内野手', batting_hand: '右投左打', birth_date: '2008-08-20', height: 170, weight: 65, photo: '', retirementDate: null },
            { id: 3, number: '1', name: '鈴木 三郎', position: '外野手', batting_hand: '左投左打', birth_date: '2009-01-05', height: 182, weight: 80, photo: '', retirementDate: null },
            { id: 4, number: '17', name: '松坂 大輔', position: '投手', batting_hand: '右投右打', birth_date: '1980-09-13', height: 183, weight: 93, retirementDate: '2025-12-31', photo: '' },
            { id: 5, number: '6', name: '櫻庭樹士', position: '内野手', batting_hand: '右投左打', birth_date: '2008-05-15', height: 175, weight: 70, photo: '', retirementDate: null }
        ]));
    });
  
  const fetchGames = () => fetch('http://127.0.0.1:8000/api/games/')
    .then(res => {
        if (!res.ok) throw new Error('API Error');
        return res.json();
    })
    .then(data => setGamesData(data.sort((a, b) => new Date(b.date) - new Date(a.date))))
    .catch(() => {
        setGamesData([
            { id: 1, date: '2026-08-30', opponent: 'ヤマハ発動機', game_type: '公式戦', location: '浜松球場', status: '予定', my_score: null, op_score: null },
            { id: 2, date: '2026-08-09', opponent: '静岡高校', game_type: '練習試合', location: '草薙球場', status: '試合終了', my_score: 9, op_score: 9, line_score: { is_batting_first: true, my_team: [1,0,2,0,0,3,0,2,1], op_team: [0,2,0,1,0,0,4,1,1] } }
        ]);
    });

  const fetchExcelResults = async (gameId) => {
      try {
          const resBat = await fetch('http://127.0.0.1:8000/api/excel-batting/');
          if (resBat.ok) setGameBattingResults((await resBat.json()).filter(r => String(r.game) === String(gameId)));
          const resPit = await fetch('http://127.0.0.1:8000/api/excel-pitching/');
          if (resPit.ok) setGamePitchingResults((await resPit.json()).filter(r => String(r.game) === String(gameId)));
      } catch (err) { }
  };

  const fetchAllResults = async () => {
      try {
          const resBat = await fetch('http://127.0.0.1:8000/api/excel-batting/');
          if (resBat.ok) setAllBattingResults(await resBat.json());
          
          const resPit = await fetch('http://127.0.0.1:8000/api/excel-pitching/');
          if (resPit.ok) setAllPitchingResults(await resPit.json());

          const resAb = await fetch('http://127.0.0.1:8000/api/at-bats/');
          if (resAb.ok) setAtBatRecords(await resAb.json());

          const resPitch = await fetch('http://127.0.0.1:8000/api/pitches/');
          if (resPitch.ok) setPitchRecords(await resPitch.json());

      } catch (err) { 
          console.warn("分析データの取得に失敗しました (デモ環境)"); 
      }
  };

  useEffect(() => {
    const savedLogo = localStorage.getItem('logistars_team_logo');
    if (savedLogo) setTeamLogo(savedLogo);
    const savedName = localStorage.getItem('logistars_team_name');
    
    setSeasonStartMonth(localStorage.getItem('logistars_season_start_month') || '4');
    setSeasonStartDay(localStorage.getItem('logistars_season_start_day') || '1');
    setSeasonEndMonth(localStorage.getItem('logistars_season_end_month') || '3');
    setSeasonEndDay(localStorage.getItem('logistars_season_end_day') || '31');

    fetch('http://127.0.0.1:8000/api/teams/')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        if (data.length > 0) { 
            setTeamName(savedName || data[0].name); 
            setSettingTeamName(savedName || data[0].name);
            setTeamId(data[0].id); 
            setDbStatus('connected'); 
        } else { 
            setTeamName(savedName || 'チーム未登録'); 
            setSettingTeamName(savedName || 'チーム未登録');
            setDbStatus('connected'); 
        }
      }).catch(() => { 
          // ★復刻：デモ環境の場合はチーム名を変更し、ステータスをエラー（デモモード）にする
          setTeamName(savedName || 'LOGISTARS (デモ環境)'); 
          setSettingTeamName(savedName || 'LOGISTARS (デモ環境)');
          setDbStatus('error'); 
      });
      
    fetchPlayers();
    fetchGames();
    fetchAllResults(); 

    const savedLogs = localStorage.getItem('logistars_mobile_logs');
    if (savedLogs) {
        try { setMobileHistoryLogs(JSON.parse(savedLogs)); } catch (e) { console.error("履歴の復元に失敗", e); }
    }
    setIsLogsLoaded(true);
  }, []);

  useEffect(() => {
      if (isLogsLoaded) {
          localStorage.setItem('logistars_mobile_logs', JSON.stringify(mobileHistoryLogs));
      }
  }, [mobileHistoryLogs, isLogsLoaded]);

  const activePlayersData = useMemo(() => {
      if (userRole === 'player') {
          return playersData.filter(p => !p.retirementDate || new Date(p.retirementDate) > today);
      }
      return playersData; 
  }, [playersData, userRole]);

  const currentPlayer = useMemo(() => {
      return activePlayersData.find(p => String(p.id) === String(linkedPlayerId)) || null;
  }, [activePlayersData, linkedPlayerId]);

  const resolveId = (val) => {
      if (!val) return null;
      if (typeof val === 'object' && val.id) return String(val.id);
      const str = String(val).replace(/[\s\u3000]+/g, '');
      let m = activePlayersData.find(p => String(p.id) === str);
      if (m) return String(m.id);
      const nm = str.match(/#(\d+)/);
      if (nm) { m = activePlayersData.find(p => String(p.number) === nm[1]); if (m) return String(m.id); }
      m = activePlayersData.find(p => p.name && str.includes(p.name.replace(/[\s\u3000]+/g, '')));
      return m ? String(m.id) : str;
  };

  const unifiedGameBattingStats = useMemo(() => {
      if (!selectedGame) return [];
      const agg = {};
      
      gameBattingResults.forEach(r => {
          const pId = resolveId(r.player); if (!pId) return;
          if (!agg[pId]) agg[pId] = { id: pId, pa:0, ab:0, r:0, h:0, d2:0, d3:0, hr:0, rbi:0, sb:0, bb:0, hbp:0, k:0, sh:0, sf:0, dp:0, order: r.batting_order, pos: r.position };
          agg[pId].pa += r.plate_appearances||0; agg[pId].ab += r.at_bats||0; agg[pId].r += r.runs||0;
          agg[pId].h += r.hits||0; agg[pId].d2 += r.doubles||0; agg[pId].d3 += r.triples||0; agg[pId].hr += r.home_runs||0;
          agg[pId].rbi += r.rbi||0; agg[pId].sb += r.steals||0; agg[pId].bb += r.walks||0; agg[pId].k += r.strikeouts||0;
      });

      const processMobile = (log) => {
          const pId = resolveId(log.batterId || log.batter || log.playerId); if (!pId) return;
          if (!agg[pId]) agg[pId] = { id: pId, pa:0, ab:0, r:0, h:0, d2:0, d3:0, hr:0, rbi:0, sb:0, bb:0, hbp:0, k:0, sh:0, sf:0, dp:0, order: '-', pos: '-' };
          const res = String(log.result || log.battingResult || log.shortResult || '');
          if (!res || res === '-') return;

          agg[pId].pa += 1;
          if (['四球','敬遠'].some(v=>res.includes(v))) { agg[pId].bb += 1; }
          else if (res.includes('死球')) { agg[pId].hbp += 1; }
          else if (res.includes('犠打') || res.includes('バント')) { agg[pId].sh += 1; }
          else if (res.includes('犠飛')) { agg[pId].sf += 1; }
          else {
              agg[pId].ab += 1;
              if (['安打','二塁打','三塁打','本塁打','ヒット'].some(v=>res.includes(v))) {
                  agg[pId].h += 1;
                  if (res.includes('二塁打') || res.includes('ツーベース')) agg[pId].d2 += 1;
                  if (res.includes('三塁打') || res.includes('スリーベース')) agg[pId].d3 += 1;
                  if (res.includes('本塁打') || res.includes('ホームラン')) agg[pId].hr += 1;
              }
              if (['三振','空振り','見逃し'].some(v=>res.includes(v))) agg[pId].k += 1;
              if (res.includes('併殺')) agg[pId].dp += 1;
          }
          agg[pId].r += log.runs || 0;
          agg[pId].rbi += log.rbi || 0;
          agg[pId].sb += log.steals || 0;
      };

      atBatRecords.filter(ab => String(ab.game) === String(selectedGame.id)).forEach(processMobile);
      mobileHistoryLogs.filter(log => log.type === 'batting' && String(log.game) === String(selectedGame.id)).forEach(processMobile);

      return Object.values(agg);
  }, [selectedGame, gameBattingResults, atBatRecords, mobileHistoryLogs, activePlayersData]);

  const handleLogoChange = (e) => {
      const file = e.target.files[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => { setTeamLogo(reader.result); };
          reader.readAsDataURL(file);
      }
  };

  const handleSaveTeamInfo = async () => {
      setIsSavingTeam(true);
      if (teamLogo) localStorage.setItem('logistars_team_logo', teamLogo);
      else localStorage.removeItem('logistars_team_logo');
      
      localStorage.setItem('logistars_team_name', settingTeamName);
      localStorage.setItem('logistars_season_start_month', seasonStartMonth);
      localStorage.setItem('logistars_season_start_day', seasonStartDay);
      localStorage.setItem('logistars_season_end_month', seasonEndMonth);
      localStorage.setItem('logistars_season_end_day', seasonEndDay);
      
      setTeamName(settingTeamName);

      setTimeout(() => {
          setIsSavingTeam(false);
          Swal.fire('保存完了', 'チーム情報を更新しました。', 'success').then(() => window.location.reload());
      }, 600);
  };

  const handleClearCache = () => {
      Swal.fire({
          title: 'キャッシュを削除しますか？', text: "スマホで入力した未同期のテストデータ等が全て消去されます。", icon: 'warning',
          showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: 'はい、削除します', cancelButtonText: 'キャンセル'
      }).then((result) => {
          if (result.isConfirmed) {
              localStorage.removeItem('logistars_mobile_logs'); setMobileHistoryLogs([]);
              Swal.fire('削除完了', 'スマホ入力のキャッシュデータを全削除しました。', 'success').then(() => window.location.reload());
          }
      });
  };

  const openNewPlayerModal = () => { 
      setEditingPlayer(null); 
      setPlayerForm({ number: '', name: '', birth_date: '', height: '', weight: '', position: '投手', batting_hand: '右投右打', photo: '', retirementDate: '' }); 
      setIsPlayerModalOpen(true); 
  };
  
  const openEditPlayerModal = (player) => { 
      setEditingPlayer(player); 
      setPlayerForm({ 
          number: player.number !== null && player.number !== undefined ? player.number : '', 
          name: player.name || '', 
          birth_date: player.birth_date || '', 
          height: player.height || '', 
          weight: player.weight || '', 
          position: player.position || '投手', 
          batting_hand: player.batting_hand || '右投右打', 
          photo: player.photo || '',
          retirementDate: player.retirementDate ? String(player.retirementDate).substring(0, 10) : ''
      }); 
      setIsPlayerModalOpen(true); 
  };

  const handleSavePlayer = async (e) => {
      if (e && e.preventDefault) e.preventDefault();
      if (!playerForm.name || playerForm.name.trim() === '') { Swal.fire('入力エラー', '選手名は必須です', 'warning'); return; }

      // ★復刻：デモ環境時は画面上（Reactステート）だけで仮想保存する
      if (dbStatus === 'error') {
          if (editingPlayer) { setPlayersData(sortPlayersList(playersData.map(p => p.id === editingPlayer.id ? { ...p, ...playerForm } : p))); } 
          else { setPlayersData(sortPlayersList([...playersData, { id: Date.now(), ...playerForm }])); }
          setIsPlayerModalOpen(false); Swal.fire('保存完了', 'デモ環境で保存しました', 'success'); return;
      }
      
      if (!teamId) { Swal.fire('エラー', 'チームが読み込まれていないか、APIに接続できません', 'error'); return; }
      
      setIsPlayerSubmitting(true);
      const url = editingPlayer ? `http://127.0.0.1:8000/api/players/${editingPlayer.id}/` : 'http://127.0.0.1:8000/api/players/';
      const method = editingPlayer ? 'PATCH' : 'POST';
      
      const payload = { ...playerForm, team: teamId };
      if (payload.number === '') payload.number = null;
      if (payload.birth_date === '') payload.birth_date = null;
      if (payload.height === '') payload.height = null;
      if (payload.weight === '') payload.weight = null;
      if (payload.retirementDate === '') payload.retirementDate = null;
      
      if (!payload.photo || (typeof payload.photo === 'string' && !payload.photo.startsWith('data:'))) { delete payload.photo; }

      try {
          const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          if (res.ok) { 
              setIsPlayerModalOpen(false); 
              fetchPlayers(); 
              Swal.fire({ title: editingPlayer ? '更新完了' : '登録完了', icon: 'success', timer: 1500, showConfirmButton: false }); 
          } else { 
              const errData = await res.json(); 
              console.error(errData); 
              Swal.fire('保存エラー', 'データの形式に誤りがあるか、通信に失敗しました。', 'error'); 
          }
      } catch (err) { Swal.fire('通信エラー', 'サーバーに接続できません', 'error'); } 
      finally { setIsPlayerSubmitting(false); }
  };

  const handleRetirePlayer = (player) => { 
      Swal.fire({ title: `${player.name} 選手の退団処理`, input: 'date', showCancelButton: true, confirmButtonText: '退団を設定する' }).then(async (res) => { 
          if(res.isConfirmed) { 
              // ★復刻：デモ環境の仮想保存
              if (dbStatus === 'error') {
                  setPlayersData(sortPlayersList(playersData.map(p => p.id === player.id ? { ...p, retirementDate: res.value } : p)));
                  return;
              }
              try {
                  const req = await fetch(`http://127.0.0.1:8000/api/players/${player.id}/`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({retirementDate:res.value})}); 
                  if (req.ok) { fetchPlayers(); } else { Swal.fire('エラー', '通信に失敗しました', 'error'); }
              } catch(e) { Swal.fire('エラー', 'サーバーに接続できません', 'error'); }
          } 
      }); 
  };

  const handleCancelRetire = (player) => { 
      Swal.fire({ title: '退団の取り消し', showCancelButton: true, confirmButtonText: '復帰させる' }).then(async (res) => { 
          if(res.isConfirmed) { 
              // ★復刻：デモ環境の仮想保存
              if (dbStatus === 'error') {
                  setPlayersData(sortPlayersList(playersData.map(p => p.id === player.id ? { ...p, retirementDate: null } : p)));
                  return;
              }
              try {
                  const req = await fetch(`http://127.0.0.1:8000/api/players/${player.id}/`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body:JSON.stringify({retirementDate:null})}); 
                  if (req.ok) { fetchPlayers(); } else { Swal.fire('エラー', '通信に失敗しました', 'error'); }
              } catch(e) { Swal.fire('エラー', 'サーバーに接続できません', 'error'); }
          } 
      }); 
  };

  const openNewGameModal = () => {
      setEditingGame(null); setNewGame({ date: '', opponent: '', game_type: '公式戦', location: '', status: '予定' }); setIsGameModalOpen(true);
  };

  const openEditGameModal = (game) => {
      setEditingGame(game); setNewGame({ date: game.date, opponent: game.opponent, game_type: game.game_type, location: game.location || '', status: game.status }); setIsGameModalOpen(true);
  };

  const handleSaveGame = async (e) => {
      e.preventDefault();
      if (!newGame.date || !newGame.opponent) { Swal.fire('入力エラー', '日付と対戦相手は必須です', 'warning'); return; }

      // ★復刻：デモ環境の仮想保存
      if (dbStatus === 'error') {
          if (editingGame) { setGamesData(gamesData.map(g => g.id === editingGame.id ? { ...g, ...newGame } : g)); Swal.fire('更新完了', 'デモ環境で試合を更新しました。', 'success'); } 
          else { setGamesData([{ id: Date.now(), ...newGame, my_score: null, op_score: null }, ...gamesData]); Swal.fire('登録完了', 'デモ環境で試合を追加しました。', 'success'); }
          setIsGameModalOpen(false); return; 
      }

      setIsSubmitting(true);
      const url = editingGame ? `http://127.0.0.1:8000/api/games/${editingGame.id}/` : 'http://127.0.0.1:8000/api/games/';
      const method = editingGame ? 'PATCH' : 'POST';

      try { 
          const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...newGame, team: teamId }) }); 
          if (res.ok) { setIsGameModalOpen(false); fetchGames(); Swal.fire({title: editingGame ? '更新完了' : '登録完了', icon: 'success', timer: 1500, showConfirmButton: false}); } 
          else { Swal.fire('エラー', '試合の保存に失敗しました。API接続を確認してください', 'error'); }
      } catch (err) { Swal.fire('通信エラー', 'サーバーに接続できません', 'error'); } 
      finally { setIsSubmitting(false); }
  };

  const handleDeleteGame = (game) => {
      Swal.fire({
          title: '本当に削除しますか？', text: "この試合のスコアや取込データも全て消去されます。", icon: 'warning',
          showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: '削除する', cancelButtonText: 'キャンセル'
      }).then(async (result) => {
          if (result.isConfirmed) {
              // ★復刻：デモ環境の仮想削除
              if (dbStatus === 'error') {
                  setGamesData(gamesData.filter(g => g.id !== game.id));
                  const newLogs = mobileHistoryLogs.filter(log => String(log.game) !== String(game.id) && String(log.gameId) !== String(game.id));
                  setMobileHistoryLogs(newLogs);
                  Swal.fire('削除完了', 'デモ環境の試合を削除しました。', 'success'); return;
              }
              try {
                  const res = await fetch(`http://127.0.0.1:8000/api/games/${game.id}/`, { method: 'DELETE' });
                  if (res.ok) { fetchGames(); fetchAllResults(); Swal.fire('削除完了', '試合を削除しました。', 'success'); } 
                  else { Swal.fire('エラー', '削除に失敗しました', 'error'); }
              } catch(e) { Swal.fire('通信エラー', 'サーバーに接続できません', 'error'); }
          }
      });
  };

  const handleSaveScore = async (scoreData) => {
      // ★復刻：デモ環境の仮想保存
      if (dbStatus === 'error') {
          const updatedGame = { ...selectedGame, my_score: scoreData.my_score, op_score: scoreData.op_score, status: scoreData.status, line_score: scoreData.line_score };
          setGamesData(gamesData.map(g => g.id === selectedGame.id ? updatedGame : g));
          setSelectedGame(updatedGame); setIsScoreModalOpen(false); Swal.fire('スコア更新', 'デモ環境でスコアを更新しました。', 'success'); return;
      }
      try {
          const res = await fetch(`http://127.0.0.1:8000/api/games/${selectedGame.id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scoreData) });
          if (res.ok) { 
              const updatedGame = await res.json(); 
              setIsScoreModalOpen(false); 
              setSelectedGame(updatedGame); 
              fetchGames(); 
          } else { Swal.fire('エラー', '保存に失敗しました', 'error'); }
      } catch (err) { Swal.fire('エラー', '通信に失敗しました', 'error'); }
  };
  const handleExcelUpload = async (e) => {
      const file = e.target.files[0];
      if (!file || !selectedGame) return;
      
      setIsUploading(true);
      const formData = new FormData(); formData.append('file', file); formData.append('type', uploadType);
      try {
          const res = await fetch(`http://127.0.0.1:8000/api/games/${selectedGame.id}/upload-excel/`, { method: 'POST', body: formData });
          const data = await res.json();
          if (res.ok) { Swal.fire({ title: '一括取込 成功！', text: data.message, icon: 'success' }); fetchExcelResults(selectedGame.id); fetchAllResults(); } 
          else { Swal.fire({ title: '取込エラー', text: data.error || '通信に失敗しました', icon: 'error' }); }
      } catch (error) { Swal.fire({ title: '取込エラー', text: '通信に失敗しました', icon: 'error' }); } 
      finally { setIsUploading(false); e.target.value = ''; }
  };
  const triggerFileInput = (type) => { setUploadType(type); if (fileInputRef.current) fileInputRef.current.click(); };
  const openGameDetail = (game) => { setSelectedGame(game); fetchExcelResults(game.id); };

  const downloadTemplate = (type) => {
      let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; 
      if (type === 'batting') csvContent += "背番号,打順,位置,選手名,打席,打数,得点,安打,二塁打,三塁打,本塁打,打点,盗塁,盗刺,犠打,犠飛,四球,死球,三振,併殺打,失策,塁打数\n6,1,中,櫻庭樹士,4,3,1,2,0,0,0,1,1,0,0,0,1,0,0,0,0,2\n"; 
      else csvContent += "背番号,選手名,登板,イニング,アウト,犠アウト,ゴロo,フライo,奪三振右,奪三振左,その他o,打席右,打席左,打数右,打数左,被安打右,被安打左,被本塁打,与四球右,与四球左,与死球右,与死球左,暴投,ボーク,失点,自責点,勝ち,負け,セーブ,ホールド,先発,初球S,投球数\n17,松坂 大輔,1,1,3,0,0,1,2,0,0,2,1,2,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17\n"; 
      const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); link.setAttribute("download", `ロジスターズ_${type === 'batting' ? '打撃' : '投手'}フォーマット.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleLogin = (role, name) => {
      setUserRole(role);
      setUserName(name);
      setIsLoggedIn(true);

      if (typeof window !== 'undefined') {
          const savedUsers = JSON.parse(localStorage.getItem('logistars_users') || '[]');
          const currentUser = savedUsers.find(u => u.username === name || u.email === name);
          if (currentUser) {
              if (currentUser.linkedPlayerId) {
                  setLinkedPlayerId(currentUser.linkedPlayerId);
              }
              if (currentUser.mustChangePassword) {
                  setMustChangePassword(true);
                  setIsPasswordModalOpen(true);
              } else {
                  setMustChangePassword(false);
              }
          }
      }

      if (role === 'player') {
          setActiveMenu('選手ポータル');
      } else {
          setActiveMenu('サマリーダッシュボード');
      }
  };

  const handleLogout = () => {
      setIsLoggedIn(false);
      setUserRole('');
      setUserName('');
      setLinkedPlayerId(null);
      setMustChangePassword(false);
      setActiveMenu('サマリーダッシュボード');
      setSelectedGame(null);
      setIsMobileInputOpen(false);
  };

  const handlePasswordUpdate = () => {
      if (!passwordForm.current || !passwordForm.new) { 
          Swal.fire('エラー', '入力されていない項目があります', 'error'); 
          return; 
      }
      if (passwordForm.new.length < 6) {
          Swal.fire('エラー', '新しいパスワードは6文字以上で入力してください', 'error');
          return;
      }
      if (passwordForm.new !== passwordForm.confirm) { 
          Swal.fire('エラー', '新しいパスワードが一致しません', 'error'); 
          return; 
      }
      
      const savedUsers = JSON.parse(localStorage.getItem('logistars_users') || '[]');
      const userIndex = savedUsers.findIndex(u => u.username === userName || u.email === userName);
      
      if (userIndex !== -1) {
          if (savedUsers[userIndex].password !== passwordForm.current) {
              Swal.fire('エラー', '現在のパスワードが間違っています', 'error');
              return;
          }
          
          savedUsers[userIndex].password = passwordForm.new;
          savedUsers[userIndex].mustChangePassword = false; 
          localStorage.setItem('logistars_users', JSON.stringify(savedUsers));

          Swal.fire('変更完了', 'パスワードを設定しました！', 'success').then(() => {
              setIsPasswordModalOpen(false);
              setMustChangePassword(false);
              setPasswordForm({ current: '', new: '', confirm: '' });
          });
      }
  };

  // メニュー一覧（退団選手記録を追加）
  const menuItems = userRole === 'player' 
    ? [
        { name: '選手ポータル', icon: '🏠', short: 'ホーム' },
        { name: '打撃データ', icon: '🏏', short: '打撃' },
        { name: '投手データ', icon: '⚾', short: '投手' },
        { name: '身体能力データ', icon: '🏃', short: '身体能力' }
      ]
    : userRole === 'executive'
    ? [
        { name: 'サマリーダッシュボード', icon: '📊', short: 'サマリー' },
        { name: '試合管理', icon: '⚾', short: '試合管理' },
        { name: '打撃データ', icon: '🏏', short: '打撃' },
        { name: '投手データ', icon: '⚾', short: '投手' },
        { name: '身体能力データ', icon: '🏃', short: '身体能力' },
        { name: '選手マスタ', icon: '👤', short: '選手' }
      ]
    : [
        { name: 'サマリーダッシュボード', icon: '📊', short: 'サマリー' },
        { name: '試合管理', icon: '⚾', short: '試合管理' },
        { name: '打撃データ', icon: '🏏', short: '打撃' },
        { name: '投手データ', icon: '⚾', short: '投手' },
        { name: '身体能力データ', icon: '🏃', short: '身体能力' },
        { name: '選手マスタ', icon: '👤', short: '選手' },
        { name: '設定', icon: '⚙️', short: '設定' },
        { name: '退団選手記録', icon: '🎓', short: '退団者' } // ★追加
    ];

  const renderPlayerPortal = () => (
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in w-full">
          <div className="bg-[#0b1c3a] text-white p-6 md:p-8 rounded-2xl shadow-lg bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-[80px] opacity-20 animate-pulse"></div>
              <div className="relative z-10">
                  <h2 className="text-2xl md:text-3xl font-black mb-2 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-blue-300">WELCOME, PLAYER</h2>
                  <p className="text-blue-200 text-sm font-bold">LOGISTARS データマネジメントシステムへようこそ。</p>
              </div>
          </div>
          
          <h3 className="text-lg font-black text-slate-700 border-l-4 border-blue-600 pl-3">メインメニュー</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col h-full relative overflow-hidden group hover:border-blue-300 transition-colors duration-300">
                  <div className="text-5xl mb-4 transform group-hover:scale-110 origin-left transition-transform duration-300">📱</div>
                  <h3 className="text-xl font-black text-[#0b1c3a] mb-2 tracking-wide">試合データを入力する</h3>
                  <p className="text-xs font-bold text-slate-500 mb-6 flex-1 leading-relaxed">
                      バックネット裏での投球1球ずつの記録や、試合後の自分の打席結果を入力します。
                  </p>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative z-10">
                      <p className="text-[10px] font-bold text-slate-400 mb-2">入力する試合を選択（直近3件）</p>
                      <div className="space-y-2">
                          {gamesData.slice(0, 3).map(game => (
                              <div key={game.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200 shadow-sm hover:border-blue-400 transition-colors">
                                  <div>
                                      <span className="text-[9px] text-slate-400 block font-bold">{game.date}</span>
                                      <span className="text-xs font-bold text-[#0b1c3a] truncate max-w-[150px] inline-block">vs {game.opponent}</span>
                                  </div>
                                  <button onClick={() => { setSelectedGame(game); setIsMobileInputOpen(true); }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-blue-700 transition-transform active:scale-95 shadow-sm">
                                      入力画面へ
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>

              <div 
                  onClick={() => setActiveMenu('打撃データ')}
                  className="bg-gradient-to-br from-[#0b1c3a] via-[#112a57] to-[#1e3a8a] text-white rounded-2xl p-6 shadow-lg shadow-blue-900/20 cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-blue-500/40 border border-blue-500/30 flex flex-col h-full relative overflow-hidden group"
              >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full filter blur-2xl transform translate-x-10 -translate-y-10 group-hover:bg-cyan-400/30 transition-colors duration-500"></div>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 pointer-events-none"></div>
                  <div className="absolute top-0 left-[-100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg] group-hover:animate-[shine_1s_ease-in-out]"></div>

                  <div className="relative z-10 flex flex-col h-full">
                      <div className="text-5xl mb-4 group-hover:scale-110 transition-transform origin-left duration-300 drop-shadow-md">📊</div>
                      <h3 className="text-xl font-black mb-2 tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-cyan-200">自分の成績を分析する</h3>
                      <p className="text-xs text-blue-100 font-bold flex-1 leading-relaxed opacity-90 tracking-wide">
                          蓄積された打撃・投手データから、自分の強みや課題を見つけ出します。タップして分析画面へ進んでください。
                      </p>
                      <div className="mt-6 flex items-center text-xs font-bold text-cyan-300 group-hover:text-cyan-200 transition-colors tracking-widest">
                          タップして進む <span className="ml-2 text-lg transform group-hover:translate-x-3 transition-transform duration-300">→</span>
                      </div>
                  </div>
              </div>
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-200">
              <button onClick={() => setIsPasswordModalOpen(true)} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors">
                  <span className="text-base">🔑</span> パスワードを変更する
              </button>
          </div>

          <style jsx>{`@keyframes shine { 100% { left: 200%; } }`}</style>
      </div>
  );

  if (!isLoggedIn) {
      return <Login onLogin={handleLogin} teamName={teamName} teamLogo={teamLogo} players={playersData} />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans text-slate-800">
      
      {isPlayerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in max-h-[95vh] overflow-y-auto">
                <div className="bg-[#0b1c3a] text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold text-sm">{editingPlayer ? '選手情報の編集' : '新規選手の登録'}</h3>
                    <button onClick={() => setIsPlayerModalOpen(false)} className="text-xl hover:text-red-300 transition-colors">&times;</button>
                </div>
                <form onSubmit={handleSavePlayer} className="p-5 md:p-6 space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="md:w-1/3">
                            <label className="block text-xs font-bold text-slate-600 mb-1">背番号</label>
                            <input type="number" value={playerForm.number} onChange={e => setPlayerForm({...playerForm, number: e.target.value})} className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none transition-colors" placeholder="例: 10" />
                        </div>
                        <div className="md:w-2/3">
                            <label className="block text-xs font-bold text-slate-600 mb-1">選手名 <span className="text-red-500">*</span></label>
                            <input type="text" value={playerForm.name} onChange={e => setPlayerForm({...playerForm, name: e.target.value})} required className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none transition-colors" placeholder="例: 山田 太郎" />
                        </div>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1">ポジション</label>
                            <select value={playerForm.position} onChange={e => setPlayerForm({...playerForm, position: e.target.value})} className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none bg-white transition-colors cursor-pointer">
                                <option value="投手">投手</option><option value="捕手">捕手</option><option value="内野手">内野手</option><option value="外野手">外野手</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1">投打</label>
                            <select value={playerForm.batting_hand} onChange={e => setPlayerForm({...playerForm, batting_hand: e.target.value})} className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none bg-white transition-colors cursor-pointer">
                                <option value="右投右打">右投右打</option><option value="右投左打">右投左打</option><option value="右投両打">右投両打</option><option value="左投左打">左投左打</option><option value="左投右打">左投右打</option><option value="左投両打">左投両打</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">生年月日</label>
                        <input type="date" value={playerForm.birth_date} onChange={e => setPlayerForm({...playerForm, birth_date: e.target.value})} className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none transition-colors cursor-pointer" />
                    </div>
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1">身長 (cm)</label>
                            <input type="number" step="0.1" value={playerForm.height} onChange={e => setPlayerForm({...playerForm, height: e.target.value})} className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none transition-colors" placeholder="例: 178" />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-slate-600 mb-1">体重 (kg)</label>
                            <input type="number" step="0.1" value={playerForm.weight} onChange={e => setPlayerForm({...playerForm, weight: e.target.value})} className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none transition-colors" placeholder="例: 75" />
                        </div>
                    </div>

                    <div className="bg-red-50 border border-red-200 rounded p-4 mt-2">
                        <label className="block text-xs font-bold text-red-600 mb-2 flex items-center gap-1">
                            🚪 退団設定 <span className="font-normal text-slate-500">(未来の日付なら「退団予定」になります)</span>
                        </label>
                        <input type="date" value={playerForm.retirementDate || ''} onChange={e => setPlayerForm({...playerForm, retirementDate: e.target.value})} className="w-full border border-red-300 rounded px-3 py-2 text-sm focus:border-red-500 outline-none transition-colors cursor-pointer" />
                        <p className="text-[10px] text-red-400 mt-1">※空欄にすると現役（復帰）扱いになります</p>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsPlayerModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 border border-slate-300 rounded-lg py-2.5 text-sm font-bold hover:bg-slate-200 transition-colors">キャンセル</button>
                        <button type="submit" disabled={isPlayerSubmitting} className="flex-1 bg-[#0b1c3a] text-white rounded-lg py-2.5 text-sm font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors shadow-sm">{isPlayerSubmitting ? '保存中...' : '保存する'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {isGameModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                <div className="bg-[#0b1c3a] text-white px-4 py-3 flex justify-between items-center">
                    <h3 className="font-bold">{editingGame ? '試合情報の編集' : '新規試合の追加'}</h3>
                    <button onClick={() => setIsGameModalOpen(false)} className="text-xl hover:text-red-300 transition-colors">&times;</button>
                </div>
                <form onSubmit={handleSaveGame} className="p-6 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">試合日 <span className="text-red-500">*</span></label>
                        <input type="date" value={newGame.date} onChange={e => setNewGame({...newGame, date: e.target.value})} required className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none transition-colors cursor-pointer" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">対戦相手 <span className="text-red-500">*</span></label>
                        <input type="text" value={newGame.opponent} onChange={e => setNewGame({...newGame, opponent: e.target.value})} required className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none transition-colors" placeholder="例: ヤマハ発動機" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">試合種別</label>
                            <select value={newGame.game_type} onChange={e => setNewGame({...newGame, game_type: e.target.value})} className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none bg-white transition-colors cursor-pointer">
                                <option value="公式戦">公式戦</option><option value="練習試合">練習試合</option><option value="紅白戦">紅白戦</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-600 mb-1">ステータス</label>
                            <select value={newGame.status} onChange={e => setNewGame({...newGame, status: e.target.value})} className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none bg-white transition-colors cursor-pointer">
                                <option value="予定">予定</option><option value="試合中">試合中</option><option value="試合終了">試合終了</option><option value="中止">中止</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">場所</label>
                        <input type="text" value={newGame.location} onChange={e => setNewGame({...newGame, location: e.target.value})} className="w-full border rounded px-3 py-2 text-sm focus:border-[#0b1c3a] outline-none transition-colors" placeholder="例: 浜松球場" />
                    </div>
                    <div className="pt-4 flex gap-3">
                        <button type="button" onClick={() => setIsGameModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 border border-slate-300 rounded py-2 text-sm font-bold hover:bg-slate-200 transition-colors">キャンセル</button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 bg-[#0b1c3a] text-white rounded py-2 text-sm font-bold hover:bg-blue-900 disabled:opacity-50 transition-colors shadow-sm">{isSubmitting ? '保存中...' : '保存する'}</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {isScoreModalOpen && selectedGame && (
          <ScoreboardModal isOpen={isScoreModalOpen} game={selectedGame} teamName={teamName} onClose={() => setIsScoreModalOpen(false)} onSave={handleSaveScore} />
      )}

      {isMobileInputOpen && selectedGame ? (
          // 【ここを書き換えてください！】
<MobileInput game={selectedGame} players={activePlayersData} teamName={teamName} historyLogs={mobileHistoryLogs} setHistoryLogs={setMobileHistoryLogs} pitchingResults={gamePitchingResults} onBack={() => { setIsMobileInputOpen(false); setSelectedGame(null); }} loggedInPlayerId={linkedPlayerId} />
      ) : (
        <>
          <header className="bg-white text-slate-800 shrink-0 border-b border-slate-200 relative z-20 w-full">
            <div className="w-full px-4 md:px-6 h-14 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`h-8 w-8 ${teamLogo ? 'bg-transparent' : themeColor.primary} rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md overflow-hidden border border-slate-200`}>
                    {teamLogo ? <img src={teamLogo} alt="Team Logo" className="w-full h-full object-cover" /> : 'LS'}
                </div>
                <div>
                  <h1 className="font-bold text-lg tracking-widest leading-none text-slate-800">{teamName}</h1>
                  {dbStatus === 'connected' ? <span className="text-[10px] text-green-600 font-bold">● データベース接続中</span> : <span className="text-[10px] text-amber-500 font-bold">⚡ デモモード稼働中</span>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                  <span className="text-[10px] md:text-xs font-bold text-slate-500 hidden sm:inline">{userName}でログイン中</span>
                  <button onClick={handleLogout} className="text-[10px] bg-slate-100 border border-slate-300 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-md font-bold transition-colors shadow-sm">ログアウト</button>
              </div>
            </div>
          </header>

          <nav className={`${themeColor.navBg} border-b border-slate-700 shadow-sm sticky top-0 z-10 hidden md:block w-full`}>
            <div className="w-full px-6 h-10 flex items-center gap-6 overflow-x-auto whitespace-nowrap hide-scrollbar">
              {menuItems.map((menu) => (
                <button key={menu.name} onClick={() => { setActiveMenu(menu.name); setSelectedGame(null); setSelectedPlayer(null); }} className={`h-full px-2 border-b-4 font-bold text-xs transition-colors ${activeMenu === menu.name && !selectedGame && !selectedPlayer ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>{menu.name}</button>
              ))}
            </div>
          </nav>

          <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 z-50 flex justify-between items-center px-1 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)] h-16">
              {menuItems.map((menu) => {
                  const isActive = activeMenu === menu.name && !selectedGame && !selectedPlayer;
                  return (
                      <button key={menu.name} onClick={() => { setActiveMenu(menu.name); setSelectedGame(null); setSelectedPlayer(null); window.scrollTo(0,0); }} className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${isActive ? 'text-[#0b1c3a]' : 'text-slate-400'}`}>
                          <span className={`text-xl ${isActive ? 'scale-110 transition-transform' : ''}`}>{menu.icon}</span>
                          <span className={`text-[8px] font-bold ${isActive ? 'text-[#0b1c3a]' : 'text-slate-400'}`}>{menu.short}</span>
                      </button>
                  );
              })}
          </nav>

          <main className="flex-1 w-full overflow-x-hidden relative pb-20 md:pb-10">
            <input type="file" ref={fileInputRef} onChange={handleExcelUpload} accept=".xlsx, .xls, .csv" className="hidden" />

            {activeMenu === '選手ポータル' && userRole === 'player' && renderPlayerPortal()}

            {activeMenu === 'サマリーダッシュボード' && <div className="p-0 md:p-6"><Dashboard teamName={teamName} games={gamesData} /></div>}
            
            {activeMenu === '打撃データ' && <BattingData players={playersData} allResults={allBattingResults} atBatRecords={atBatRecords} games={gamesData} userRole={userRole} linkedPlayerId={linkedPlayerId} currentPlayer={currentPlayer} />}
            {activeMenu === '投手データ' && <PitchingData players={playersData} allResults={allPitchingResults} pitchRecords={pitchRecords} atBatRecords={atBatRecords} games={gamesData} userRole={userRole} linkedPlayerId={linkedPlayerId} currentPlayer={currentPlayer} />}
            
            {activeMenu === '身体能力データ' && <PhysicalData players={playersData} userRole={userRole} linkedPlayerId={linkedPlayerId} />}

            {/* 退団選手記録 */}
            {activeMenu === '退団選手記録' && <RetiredPlayers players={playersData} battingResults={allBattingResults} pitchingResults={allPitchingResults} games={gamesData} />}

            {/* 設定画面 (adminのみ) */}
            {activeMenu === '設定' && userRole === 'admin' && (
              <div className="w-full animate-fade-in pb-20 font-sans">
                <div className="bg-[#0b1c3a] text-white overflow-hidden shadow-md border-b border-blue-500">
                    <div className="px-4 md:px-6 py-4 border-b border-[#1e3a8a] flex flex-col md:flex-row md:justify-between md:items-end bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] gap-4">
                        <div>
                            <h2 className="text-xl md:text-2xl font-black tracking-widest flex items-center gap-2">
                                <span>⚙️</span> システム設定 <span className="text-xs md:text-sm font-bold text-blue-200 ml-2">({settingsTab === 'system' ? '基本・システム設定' : '権限・アカウント管理'})</span>
                            </h2>
                            <p className="text-[9px] md:text-[10px] text-blue-100 mt-2 tracking-wide">
                                チーム情報や年度の管理、メンバーのアカウント・権限設定を行います
                            </p>
                        </div>
                    </div>
                    <div className="flex px-2 overflow-x-auto whitespace-nowrap hide-scrollbar text-xs font-bold bg-[#08152c]">
                        <button onClick={() => setSettingsTab('system')} className={`px-4 py-3 border-b-4 transition-colors ${settingsTab === 'system' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>基本・システム設定</button>
                        <button onClick={() => setSettingsTab('account')} className={`px-4 py-3 border-b-4 transition-colors ${settingsTab === 'account' ? 'border-white text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>権限・アカウント管理</button>
                    </div>
                </div>

                <div className="p-4 md:p-6 bg-slate-50 min-h-screen border-b border-slate-200 shadow-sm">
                    {settingsTab === 'system' && (
                        <div className="space-y-6 w-full max-w-4xl mx-auto animate-fade-in">
                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-700 border-l-4 border-[#0b1c3a] pl-2 mb-6">基本・年度設定</h3>
                                <div className="flex flex-col md:flex-row gap-8 items-start">
                                    <div className="flex flex-col items-center gap-2 shrink-0">
                                        <div className="relative w-32 h-32 rounded-full border-4 border-slate-100 shadow-md overflow-hidden bg-slate-50 flex items-center justify-center group">
                                            {teamLogo ? (
                                                <img src={teamLogo} alt="Team Logo" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-4xl text-slate-300">🛡️</span>
                                            )}
                                            <label className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                                <span className="text-2xl mb-1">📷</span>
                                                <span className="text-[10px] font-bold">画像を変更</span>
                                                <input type="file" accept="image/jpeg, image/png, image/gif, image/webp" className="hidden" onChange={handleLogoChange} />
                                            </label>
                                        </div>
                                        <div className="text-center mt-1">
                                            <p className="text-[9px] text-slate-500 font-bold">対応: JPG / PNG / GIF</p>
                                            <p className="text-[9px] text-slate-400">推奨サイズ: 200×200px</p>
                                        </div>
                                        {teamLogo && (
                                            <button onClick={() => {setTeamLogo(null); localStorage.removeItem('logistars_team_logo');}} className="text-[10px] text-red-500 font-bold hover:underline bg-red-50 px-3 py-1 rounded-full mt-1 transition-colors hover:bg-red-100">🗑️ ロゴを削除</button>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 w-full space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-600 mb-1">チーム名</label>
                                            <input type="text" value={settingTeamName} onChange={e => setSettingTeamName(e.target.value)} className="w-full border border-slate-300 rounded-lg px-4 py-2 text-sm focus:border-[#0b1c3a] outline-none shadow-sm transition-shadow focus:ring-2 focus:ring-blue-100" placeholder="チーム名を入力" />
                                        </div>
                                        
                                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg">
                                            <label className="block text-xs font-bold text-[#0b1c3a] mb-2">
                                                年度の期間設定 <span className="font-normal text-blue-600 ml-1 block sm:inline mt-1 sm:mt-0">※設定した期間に基づいて「◯◯年度」が自動集計されます</span>
                                            </label>
                                            <div className="flex flex-wrap items-center gap-3">
                                                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded p-1 shadow-sm">
                                                    <span className="text-[10px] text-slate-500 font-bold px-2">開始日</span>
                                                    <select value={seasonStartMonth} onChange={e=>setSeasonStartMonth(e.target.value)} className="outline-none text-sm font-bold w-12 text-center">
                                                        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                                    </select>
                                                    <span className="text-xs text-slate-500">月</span>
                                                    <select value={seasonStartDay} onChange={e=>setSeasonStartDay(e.target.value)} className="outline-none text-sm font-bold w-12 text-center">
                                                        {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                                    </select>
                                                    <span className="text-xs text-slate-500 pr-2">日</span>
                                                </div>
                                                <span className="font-bold text-slate-400">〜</span>
                                                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded p-1 shadow-sm">
                                                    <span className="text-[10px] text-slate-500 font-bold px-2">終了日</span>
                                                    <select value={seasonEndMonth} onChange={e=>setSeasonEndMonth(e.target.value)} className="outline-none text-sm font-bold w-12 text-center">
                                                        {[...Array(12)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                                    </select>
                                                    <span className="text-xs text-slate-500">月</span>
                                                    <select value={seasonEndDay} onChange={e=>setSeasonEndDay(e.target.value)} className="outline-none text-sm font-bold w-12 text-center">
                                                        {[...Array(31)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                                    </select>
                                                    <span className="text-xs text-slate-500 pr-2">日</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-2">
                                            <button onClick={handleSaveTeamInfo} disabled={isSavingTeam} className="bg-[#0b1c3a] hover:bg-blue-900 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm transition-colors text-sm flex items-center gap-2 w-full md:w-auto justify-center">
                                                {isSavingTeam ? '保存中...' : '💾 チーム情報を保存'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-6">
                                <h3 className="text-sm font-bold text-slate-700 border-l-4 border-red-500 pl-2 mb-4">データクリーニング (キャッシュ削除)</h3>
                                <div className="bg-red-50 border border-red-100 rounded-lg p-5">
                                    <p className="text-xs text-red-600 mb-4 leading-relaxed font-bold">
                                        ブラウザに残っている「スマホ入力のテストデータ（未同期）」を全て消去します。<br/>
                                        ダミーデータを一掃して画面を綺麗にしたい場合や、表示に異常がある場合に実行してください。
                                    </p>
                                    <button onClick={handleClearCache} className="bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 font-bold py-2 px-6 rounded-lg shadow-sm transition-colors text-xs flex items-center gap-2">
                                        <span>🗑️</span> キャッシュデータを全削除する
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {settingsTab === 'account' && (
                        <div className="w-full max-w-5xl mx-auto mt-4">
                            <Settings players={playersData} />
                        </div>
                    )}
                </div>
              </div>
            )}

            {/* 選手マスタ画面 */}
            {activeMenu === '選手マスタ' && (
              <div className="p-4 md:p-6 animate-fade-in w-full">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm">
                  <div className="bg-[#0b1c3a] px-6 py-4 flex justify-between items-center rounded-t-lg border-b border-blue-900 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                    <div><h2 className="font-bold text-lg text-white">登録選手一覧</h2></div>
                    {userRole === 'admin' && (
                        <button onClick={openNewPlayerModal} className="relative flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white border border-cyan-400/30 rounded-lg text-xs font-black transition-all duration-300 shadow-[0_4px_15px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5 group overflow-hidden">
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                            <span className="relative z-10 text-base leading-none">＋</span>
                            <span className="relative z-10 tracking-widest">新規選手を登録</span>
                        </button>
                    )}
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-center">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200 text-xs">
                        <tr>
                            <th className="py-3">背番号</th>
                            <th className="text-left pl-4">選手名</th>
                            <th>ポジション</th>
                            <th>投打</th>
                            {userRole === 'admin' && <th>アクション</th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {playersData.map(p => {
                          const isRetired = p.retirementDate && new Date(p.retirementDate) <= today;
                          const isRetiringSoon = p.retirementDate && new Date(p.retirementDate) > today;
                          return (
                            <tr key={p.id} className={`hover:bg-slate-50 transition-colors ${p.retirementDate ? 'bg-slate-50 opacity-70' : ''}`}>
                              <td className="py-3 font-bold text-lg text-[#0b1c3a]">{p.number || '-'}</td>
                              <td className="py-3 font-bold text-slate-800 text-left pl-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden border border-slate-300 flex items-center justify-center shrink-0 shadow-sm">
                                          {p.photo ? <img src={p.photo} alt={p.name} className="w-full h-full object-cover" /> : <span className="text-sm text-slate-400">👤</span>}
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2">
                                          <span>{p.name}</span>
                                          {isRetired && <span className="bg-slate-500 text-white text-[10px] px-2 py-0.5 rounded shadow-sm">退団済</span>}
                                          {isRetiringSoon && <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded shadow-sm">退団予定</span>}
                                      </div>
                                  </div>
                              </td>
                              <td className="py-3 text-slate-600">{p.position || '-'}</td>
                              <td className="py-3 text-slate-600">{p.batting_hand || '-'}</td>
                              
                              {userRole === 'admin' && (
                                  <td className="py-3 flex justify-center gap-2">
                                      <button onClick={() => openEditPlayerModal(p)} className="bg-slate-50 text-slate-700 border border-slate-300 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-slate-100 transition shadow-sm flex items-center gap-1">✏️ 編集</button>
                                      {p.retirementDate ? (
                                          <button onClick={() => handleCancelRetire(p)} className="bg-white text-slate-500 border border-slate-300 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-slate-100 transition shadow-sm flex items-center gap-1">↩ 復帰</button>
                                      ) : (
                                          <button onClick={() => handleRetirePlayer(p)} className="bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded text-[10px] font-bold hover:bg-red-100 transition shadow-sm flex items-center gap-1">🚪 退団</button>
                                      )}
                                  </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 試合一覧 */}
            {activeMenu === '試合管理' && !selectedGame && (
              <div className="p-4 md:p-6 animate-fade-in space-y-4 w-full">
                <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-4">
                    <div className="bg-[#0b1c3a] px-6 py-4 flex justify-between items-center rounded-t-xl border-b border-blue-900 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                      <div><h2 className="text-xl font-bold text-white flex items-center gap-2">試合・スケジュール管理</h2></div>
                      
                      {userRole === 'admin' && (
                          <button onClick={openNewGameModal} className="relative flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white border border-cyan-400/30 rounded-lg text-xs font-black transition-all duration-300 shadow-[0_4px_15px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5 group overflow-hidden">
                              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                              <span className="relative z-10 text-base leading-none">＋</span>
                              <span className="relative z-10 tracking-widest">新規試合(予定)を追加</span>
                          </button>
                      )}
                    </div>
                    {gamesData.length === 0 ? (
                        <div className="p-12 text-center text-slate-500">試合が登録されていません。</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 text-xs">
                                    <tr>
                                        <th className="px-4 py-3">試合日</th><th className="px-4 py-3">種別</th><th className="px-4 py-3">対戦相手</th>
                                        <th className="px-4 py-3 text-center">スコア</th><th className="px-4 py-3">場所</th><th className="px-4 py-3 text-center">状態</th>
                                        <th className="px-4 py-3 text-center">アクション</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {gamesData.map((game) => {
                                        const isFuture = new Date(game.date).setHours(0,0,0,0) > new Date().setHours(0,0,0,0);
                                        const scoreText = (game.my_score !== null && game.op_score !== null) 
                                            ? <span className="font-bold text-[#0b1c3a]">{game.my_score} - {game.op_score}</span> : <span className="text-slate-400">-</span>;
                                        return (
                                            <tr key={game.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-3 font-bold text-slate-800">{game.date}</td>
                                                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded text-[10px] font-bold ${game.game_type === '公式戦' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>{game.game_type}</span></td>
                                                <td className="px-4 py-3 font-bold text-[#0b1c3a]">{game.opponent}</td>
                                                <td className="px-4 py-3 text-center text-lg">{scoreText}</td>
                                                <td className="px-4 py-3 text-xs text-slate-600">{game.location || '-'}</td>
                                                <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-xs font-bold ${game.status === '試合終了' ? 'bg-green-100 text-green-700' : game.status === '中止' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>{game.status}</span></td>
                                                
                                                <td className="px-4 py-3 text-center">
                                                    <div className="grid grid-cols-2 gap-2 w-[160px] mx-auto">
                                                        <button onClick={() => openGameDetail(game)} className="flex items-center justify-center gap-1 text-[10px] bg-[#0b1c3a] text-white px-2 py-2 rounded-md font-bold hover:bg-blue-800 transition-all shadow-sm">
                                                            📊 詳細
                                                        </button>

                                                        {userRole !== 'executive' && (
                                                            !isFuture ? (
                                                                <button onClick={() => { setSelectedGame(game); setIsMobileInputOpen(true); }} className="flex items-center justify-center gap-1 text-[10px] bg-[#10b981] text-white px-2 py-2 rounded-md font-bold hover:bg-emerald-600 transition-all shadow-sm">
                                                                    📱 入力
                                                                </button>
                                                            ) : (
                                                                <button disabled className="flex items-center justify-center gap-1 text-[10px] bg-slate-200 text-slate-400 px-2 py-2 rounded-md font-bold cursor-not-allowed border border-slate-300">
                                                                    🔒 予定
                                                                </button>
                                                            )
                                                        )}

                                                        {userRole === 'admin' && (
                                                            <>
                                                                <button onClick={() => openEditGameModal(game)} className="flex items-center justify-center gap-1 text-[10px] bg-white text-slate-600 border border-slate-300 px-2 py-2 rounded-md font-bold hover:bg-slate-100 transition-all shadow-sm">
                                                                    ✏️ 編集
                                                                </button>
                                                                <button onClick={() => handleDeleteGame(game)} className="flex items-center justify-center gap-1 text-[10px] bg-red-50 text-red-500 border border-red-200 px-2 py-2 rounded-md font-bold hover:bg-red-100 transition-all shadow-sm">
                                                                    🗑️ 削除
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
              </div>
            )}

            {/* 試合詳細・データ管理 */}
            {activeMenu === '試合管理' && selectedGame && (
                <div className="p-4 md:p-6 animate-fade-in space-y-4 w-full">
                    <div className="flex items-center text-xs font-bold text-slate-500 mb-2">
                        <span className="cursor-pointer hover:underline" onClick={() => setSelectedGame(null)}>試合管理</span><span className="mx-2">&gt;</span><span className={themeColor.primaryText}>試合詳細・データ</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between relative overflow-hidden gap-4">
                        <div className="absolute top-0 left-0 w-2 h-full bg-[#0b1c3a]"></div>
                        <div className="pl-4 w-full">
                            <div className="flex justify-between items-start">
                                <div>
                                    <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold mb-1 inline-block">{selectedGame.game_type}</span>
                                    <h2 className="text-xl md:text-3xl font-bold text-[#0b1c3a] mb-2 flex items-center gap-2 md:gap-4 flex-wrap">
                                        <span>{teamName}</span><span className="text-slate-400 font-normal whitespace-nowrap">{selectedGame.my_score !== null ? <strong className="text-[#0b1c3a]">{selectedGame.my_score}</strong> : '-'} <span className="text-base md:text-xl mx-1 md:mx-2">-</span> {selectedGame.op_score !== null ? <strong className="text-[#0b1c3a]">{selectedGame.op_score}</strong> : '-'}</span><span>{selectedGame.opponent}</span>
                                    </h2>
                                    <p className="text-xs text-slate-600 font-bold">{selectedGame.date} ＠{selectedGame.location || '未定'}</p>
                                </div>
                                {userRole === 'admin' && (
                                    <div className="text-right shrink-0">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold mb-3 inline-block ${selectedGame.status === '試合終了' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>{selectedGame.status}</span><br/>
                                        <button onClick={() => setIsScoreModalOpen(true)} className="bg-white border-2 border-slate-300 hover:border-[#0b1c3a] text-slate-700 hover:text-[#0b1c3a] px-3 py-1.5 rounded text-[10px] md:text-xs font-bold transition shadow-sm hidden md:inline-block">
                                            ✏️ スコアボードを入力
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        {userRole === 'admin' && (
                            <button onClick={() => setIsScoreModalOpen(true)} className="w-full bg-white border-2 border-slate-300 text-slate-700 py-2 rounded text-xs font-bold md:hidden shadow-sm">
                                ✏️ スコアボードを入力
                            </button>
                        )}
                    </div>
                    
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm mt-6">
                        <div className="flex border-b border-slate-200 bg-slate-50 rounded-t-xl px-2 md:px-4 pt-2 overflow-x-auto hide-scrollbar">
                            {['打撃成績', '投手成績'].map(tab => {
                                const map = {'打撃成績': 'batting', '投手成績': 'pitching'};
                                return (<button key={tab} onClick={() => setGameTab(map[tab])} className={`px-4 md:px-6 py-3 font-bold text-xs md:text-sm border-b-2 transition-colors whitespace-nowrap ${gameTab === map[tab] ? 'border-[#0b1c3a] text-[#0b1c3a] bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{tab}</button>)
                            })}
                        </div>
                        <div className="p-4 md:p-6">
                            {isFutureGame && (
                                <div className="p-12 text-center bg-slate-50 border border-slate-200 rounded-lg">
                                    <span className="text-4xl mb-3 block">🔒</span>
                                    <h3 className="text-lg font-bold text-slate-700 mb-2">まだ試合日が到来していません</h3>
                                </div>
                            )}

                            {!isFutureGame && gameTab === 'batting' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-2 mb-4 gap-2">
                                        <div><h3 className="font-bold text-slate-800 border-l-4 border-[#0b1c3a] pl-2 text-sm md:text-base">打撃成績の管理</h3></div>
                                        {userRole === 'admin' && (
                                            <div className="flex gap-2 items-center w-full md:w-auto justify-end">
                                                <button onClick={() => downloadTemplate('batting')} className="text-[10px] text-blue-600 hover:underline mr-2 flex items-center gap-1 hidden md:flex"><span>📥</span> フォーマットDL</button>
                                                <button onClick={() => triggerFileInput('batting')} disabled={isUploading} className="w-full md:w-auto justify-center bg-white border border-blue-300 text-blue-700 px-4 py-1.5 rounded text-xs font-bold shadow-sm hover:bg-blue-50 flex items-center gap-1 disabled:opacity-50"><span>{isUploading ? '送信中...' : '📄 Excel一括取込'}</span></button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto border border-slate-200 rounded hide-scrollbar">
                                        <table className="w-full text-center text-xs md:text-sm whitespace-nowrap">
                                            <thead className="bg-slate-100 text-slate-600 text-[10px] md:text-xs border-b border-slate-200">
                                                <tr><th className="py-2 px-3">背番号</th><th className="py-2 px-3">位置</th><th className="py-2 px-3 text-left">選手名</th><th className="py-2 px-3">打席</th><th className="py-2 px-3">打数</th><th className="py-2 px-3">得点</th><th className="py-2 px-3 bg-yellow-50">安打</th><th className="py-2 px-3">二塁打</th><th className="py-2 px-3">三塁打</th><th className="py-2 px-3 bg-red-50">本塁打</th><th className="py-2 px-3 font-bold text-blue-700">打点</th><th className="py-2 px-3">盗塁</th><th className="py-2 px-3">四球</th><th className="py-2 px-3">三振</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {unifiedGameBattingStats.length === 0 ? (
                                                    <tr><td colSpan="14" className="py-8 text-slate-400">右上の「Excel一括取込」または「スマホ入力」でデータを登録してください。</td></tr>
                                                ) : (
                                                    unifiedGameBattingStats.map((r, i) => {
                                                        const p = playersData.find(pl => String(pl.id) === String(r.id)) || {};
                                                        if (r.pa === 0) return null;
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50">
                                                                <td className="py-2 px-3 font-bold text-[#0b1c3a]">{p.number || '-'}</td>
                                                                <td className="py-2 px-3 text-[10px] md:text-xs">{r.pos || '-'}</td>
                                                                <td className="py-2 px-3 font-bold text-left text-[#0b1c3a]">{p.name || '不明'}</td>
                                                                <td className="py-2 px-3">{r.pa}</td><td className="py-2 px-3">{r.ab}</td><td className="py-2 px-3">{r.r}</td>
                                                                <td className="py-2 px-3 font-bold bg-yellow-50/30">{r.h}</td><td className="py-2 px-3">{r.d2}</td><td className="py-2 px-3">{r.d3}</td>
                                                                <td className="py-2 px-3 font-bold bg-red-50/30">{r.hr}</td><td className="py-2 px-3 font-bold text-blue-700">{r.rbi}</td>
                                                                <td className="py-2 px-3">{r.sb}</td><td className="py-2 px-3">{r.bb}</td><td className="py-2 px-3 text-red-600">{r.k}</td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {!isFutureGame && gameTab === 'pitching' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-slate-200 pb-2 mb-4 gap-2">
                                        <div><h3 className="font-bold text-slate-800 border-l-4 border-[#0b1c3a] pl-2 text-sm md:text-base">投手成績の管理</h3></div>
                                        {userRole === 'admin' && (
                                            <div className="flex gap-2 items-center w-full md:w-auto justify-end">
                                                <button onClick={() => downloadTemplate('pitching')} className="text-[10px] text-blue-600 hover:underline mr-2 flex items-center gap-1 hidden md:flex"><span>📥</span> フォーマットDL</button>
                                                <button onClick={() => triggerFileInput('pitching')} disabled={isUploading} className="w-full md:w-auto justify-center bg-white border border-blue-300 text-blue-700 px-4 py-1.5 rounded text-xs font-bold shadow-sm hover:bg-blue-50 flex items-center gap-1 disabled:opacity-50"><span>{isUploading ? '送信中...' : '📄 Excel一括取込'}</span></button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="overflow-x-auto border border-slate-200 rounded hide-scrollbar">
                                        <table className="w-full text-center text-xs md:text-sm whitespace-nowrap">
                                            <thead className="bg-slate-100 text-slate-600 text-[10px] md:text-xs border-b border-slate-200">
                                                <tr><th className="py-2 px-3">背番号</th><th className="py-2 px-3 text-left">選手名</th><th className="py-2 px-3">登板</th><th className="py-2 px-3">イニング</th><th className="py-2 px-3">投球数</th><th className="py-2 px-3">被安打(右)</th><th className="py-2 px-3">被安打(左)</th><th className="py-2 px-3 text-blue-600">奪三振(右)</th><th className="py-2 px-3 text-blue-600">奪三振(左)</th><th className="py-2 px-3 bg-red-50">失点</th><th className="py-2 px-3 bg-red-50">自責点</th></tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {gamePitchingResults.length === 0 ? (
                                                    <tr><td colSpan="11" className="py-8 text-slate-400">右上の「Excel一括取込」から ファイルを選択してください。</td></tr>
                                                ) : (
                                                    gamePitchingResults.map((r, i) => {
                                                        const p = playersData.find(pl => String(pl.id) === String(r.player)) || {};
                                                        return (
                                                            <tr key={i} className="hover:bg-slate-50">
                                                                <td className="py-2 px-3 font-bold text-[#0b1c3a]">{p.number || '-'}</td>
                                                                <td className="py-2 px-3 font-bold text-left text-[#0b1c3a]">{p.name || '不明'}</td>
                                                                <td className="py-2 px-3">{r.appearances}</td><td className="py-2 px-3 font-bold">{r.innings_pitched}</td><td className="py-2 px-3">{r.pitch_count}</td>
                                                                <td className="py-2 px-3">{r.hits_allowed_right}</td><td className="py-2 px-3">{r.hits_allowed_left}</td>
                                                                <td className="py-2 px-3 text-blue-600">{r.strikeouts_right}</td><td className="py-2 px-3 text-blue-600">{r.strikeouts_left}</td>
                                                                <td className="py-2 px-3 font-bold text-red-600 bg-red-50/30">{r.runs_allowed}</td><td className="py-2 px-3 font-bold text-red-600 bg-red-50/30">{r.earned_runs}</td>
                                                            </tr>
                                                        );
                                                    })
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

          </main>
        </>
      )}

      {/* ★ パスワード変更モーダル（強制設定時は閉じられないように制御） */}
      {isPasswordModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
                  <div className="bg-[#0b1c3a] px-5 py-4 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                      <h3 className="text-white font-bold text-sm tracking-widest flex items-center gap-2">
                          <span>🔑</span> {mustChangePassword ? '初期パスワードの設定' : 'パスワード変更'}
                      </h3>
                      {/* 強制変更時は ✕ボタンを非表示にする */}
                      {!mustChangePassword && (
                          <button onClick={() => setIsPasswordModalOpen(false)} className="text-blue-200 hover:text-white font-black">✕</button>
                      )}
                  </div>
                  <div className="p-6 space-y-5">
                      {mustChangePassword && (
                          <div className="bg-red-50 border border-red-200 rounded p-3 text-[10px] text-red-600 font-bold mb-4">
                              セキュリティのため、管理者が設定した初期(仮)パスワードから、あなた専用の新しいパスワードに変更してください。
                          </div>
                      )}
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 mb-1 block">現在のパスワード</label>
                          <input type="password" value={passwordForm.current} onChange={e => setPasswordForm({...passwordForm, current: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder="入力してください" />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 mb-1 block">新しいパスワード</label>
                          <input type="password" value={passwordForm.new} onChange={e => setPasswordForm({...passwordForm, new: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder="6文字以上で入力" />
                      </div>
                      <div>
                          <label className="text-[10px] font-bold text-slate-500 mb-1 block">新しいパスワード (確認用)</label>
                          <input type="password" value={passwordForm.confirm} onChange={e => setPasswordForm({...passwordForm, confirm: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 bg-slate-50 focus:bg-white transition-colors" placeholder="もう一度入力" />
                      </div>
                  </div>
                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                      {/* 強制変更時は キャンセルボタンを非表示にする */}
                      {!mustChangePassword && (
                          <button onClick={() => setIsPasswordModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 shadow-sm transition-colors">キャンセル</button>
                      )}
                      <button onClick={handlePasswordUpdate} className="px-5 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-colors">
                          {mustChangePassword ? '設定して開始する' : '更新する'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}