import React, { useState, useEffect } from 'react';

const API_BASE = 'https://logistars-backend.onrender.com/api';

export default function Login({ onLogin, teamName, teamLogo, players = [] }) {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dbUsers, setDbUsers] = useState([]);

    useEffect(() => {
        fetch(`${API_BASE}/users/`)
            .then(res => res.ok ? res.json() : [])
            .then(data => setDbUsers(data))
            .catch(err => console.error('ユーザー一覧の取得失敗:', err));
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setIsLoading(true);

        try {
            // 救済措置（バックドア：DBに管理者が0人の時の緊急用）
            if (userId === 'admin' && password === 'admin') {
                onLogin('admin', '復旧用管理者', null);
                setIsLoading(false);
                return;
            }

            // 最新のユーザー一覧をDBから直接取得して照合
            let usersList = dbUsers;
            try {
                const res = await fetch(`${API_BASE}/users/`);
                if (res.ok) {
                    usersList = await res.json();
                    setDbUsers(usersList);
                }
            } catch (e) {}

            const user = usersList.find(u => (u.username === userId || u.email === userId) && u.password === password);

            if (user) {
                let isRetired = false;
                if (user.role === 'player' && user.linkedPlayerId) {
                    const linkedPlayer = players.find(p => String(p.id) === String(user.linkedPlayerId));
                    if (linkedPlayer && linkedPlayer.retirementDate) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        if (new Date(linkedPlayer.retirementDate) <= today) {
                            isRetired = true;
                        }
                    }
                }

                if (!user.isActive || isRetired) {
                    setErrorMsg('ACCESS DENIED - このアカウントは現在ブロックされています');
                } else {
                    onLogin(user.role, user.username, user);
                }
            } else {
                setErrorMsg('ACCESS DENIED - IDまたはパスワードが違います');
            }
        } catch (err) {
            setErrorMsg('サーバーとの通信に失敗しました');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-[100dvh] w-full flex flex-col items-center justify-center relative overflow-hidden bg-[#030816] font-sans selection:bg-cyan-500 selection:text-white">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 pointer-events-none mix-blend-screen"></div>
            <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-600 rounded-full mix-blend-screen filter blur-[120px] opacity-20 animate-pulse duration-10000"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-cyan-500 rounded-full mix-blend-screen filter blur-[100px] opacity-10 animate-pulse duration-7000" style={{ animationDelay: '2s' }}></div>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

            <div className="w-full max-w-[360px] sm:max-w-sm px-5 relative z-10">
                <div className="bg-[#071329]/60 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.8)] p-6 w-full relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-50"></div>
                    <div className="flex flex-col items-center mb-5 relative">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-[#0b1c3a] to-blue-900/50 backdrop-blur-md rounded-2xl flex items-center justify-center mb-3 shadow-[0_0_25px_rgba(6,182,212,0.3)] border border-cyan-500/30 p-1 transform rotate-3 transition-transform duration-500 group-hover:rotate-0">
                            {teamLogo ? (
                                <img src={teamLogo} alt="Team Logo" className="w-full h-full object-cover rounded-xl" />
                            ) : (
                                <span className="text-3xl sm:text-4xl drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]">⚾</span>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-cyan-100 to-slate-400 tracking-[0.2em] text-center drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">LOGISTARS</h1>
                        <p className="text-[8px] sm:text-[9px] text-cyan-300/80 font-bold mt-1 tracking-[0.3em]">ANALYTICS SYSTEM</p>
                        {teamName && teamName !== 'チーム未登録' && (
                            <div className="mt-3 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></div>
                                <p className="text-[9px] font-bold text-emerald-300 tracking-wider">{teamName}</p>
                            </div>
                        )}
                    </div>

                    <form onSubmit={handleLogin} className="space-y-3 sm:space-y-4">
                        <div className="space-y-1 relative">
                            <label className="block text-[8px] sm:text-[9px] font-bold text-cyan-200/70 ml-1 tracking-wider uppercase">User ID or Email</label>
                            <input 
                                type="text" 
                                value={userId} 
                                onChange={(e) => setUserId(e.target.value)} 
                                placeholder="Enter your ID or Email"
                                className="w-full px-3 py-2.5 sm:py-3 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-600 focus:bg-black/60 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all duration-300 text-xs sm:text-sm font-medium shadow-inner"
                                required
                            />
                        </div>
                        <div className="space-y-1 relative">
                            <label className="block text-[8px] sm:text-[9px] font-bold text-cyan-200/70 ml-1 tracking-wider uppercase">Password</label>
                            <input 
                                type="password" 
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                placeholder="Enter your Password"
                                className="w-full px-3 py-2.5 sm:py-3 rounded-xl border border-white/10 bg-black/40 text-white placeholder-slate-600 focus:bg-black/60 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all duration-300 text-xs sm:text-sm font-medium shadow-inner"
                                required
                            />
                        </div>

                        {errorMsg && (
                            <div className="bg-red-900/40 text-red-300 px-3 py-2.5 rounded-xl text-[9px] sm:text-[10px] font-bold text-center border border-red-500/50 tracking-wider shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                                ⚠ {errorMsg}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full mt-4 sm:mt-5 relative inline-flex items-center justify-center py-3 sm:py-3.5 font-black text-white transition-all duration-300 bg-[#071329] border border-cyan-500/50 rounded-xl hover:bg-[#0a1f44] hover:shadow-[0_0_25px_rgba(6,182,212,0.4)] hover:border-cyan-400 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 group overflow-hidden tracking-[0.2em]"
                        >
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-transparent via-transparent to-cyan-600/20 group-hover:to-cyan-500/30 transition-all duration-300"></div>
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-cyan-300/30 to-transparent -translate-x-full group-hover:animate-[shine_1.5s_ease-in-out_infinite] skew-x-[-20deg]"></div>
                            <span className="relative z-10 flex items-center gap-2 text-xs sm:text-sm drop-shadow-md">
                                {isLoading ? (
                                    <span className="animate-spin inline-block w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full"></span>
                                ) : 'SYSTEM ACCESS'}
                            </span>
                        </button>
                    </form>

                    <div className="mt-5 sm:mt-6 pt-4 border-t border-white/10 text-center space-y-1">
                        <p className="text-[7px] sm:text-[8px] text-red-400/80 font-mono tracking-[0.15em] uppercase font-bold flex items-center justify-center gap-1">
                            <span className="text-red-500">⚠</span> UNAUTHORIZED ACCESS OR REPLICATION IS PROHIBITED.
                        </p>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-3 w-full text-center text-[7px] sm:text-[8px] text-slate-500/50 font-bold z-10 tracking-[0.2em]">
                &copy; 2026 LOGISTARS. ALL RIGHTS RESERVED.
            </div>
            <style jsx>{`@keyframes shine { 0% { left: -100%; } 100% { left: 200%; } }`}</style>
        </div>
    );
}