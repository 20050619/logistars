import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

export default function Settings({ players = [] }) {
    const [users, setUsers] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('logistars_users');
            if (saved) return JSON.parse(saved);
        }
        return [];
    });

    useEffect(() => {
        if (users.length > 0) {
            localStorage.setItem('logistars_users', JSON.stringify(users));
        }
    }, [users]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState(null);

    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'player',
        linkedPlayerId: '',
        isActive: true
    });

    const roles = {
        'admin': { label: '管理者', color: 'bg-red-100 text-red-700 border-red-200' },
        'executive': { label: '役員者', color: 'bg-purple-100 text-purple-700 border-purple-200' },
        'player': { label: '一般選手', color: 'bg-blue-100 text-blue-700 border-blue-200' }
    };

    const sortedPlayers = [...players].sort((a, b) => {
        const today = new Date(); today.setHours(0,0,0,0);
        const aIsRetired = a.retirementDate && new Date(a.retirementDate) <= today;
        const bIsRetired = b.retirementDate && new Date(b.retirementDate) <= today;
        if (aIsRetired && !bIsRetired) return 1;
        if (!aIsRetired && bIsRetired) return -1;
        return 0;
    });

    const handleOpenModal = (user = null) => {
        if (user) {
            setEditingUser(user.id);
            setFormData({ ...user, password: '' });
        } else {
            setEditingUser(null);
            setFormData({ username: '', email: '', password: '', role: 'player', linkedPlayerId: '', isActive: true });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.username) {
            Swal.fire('エラー', 'ユーザーIDを入力してください', 'error');
            return;
        }
        if (!editingUser && !formData.password) {
            Swal.fire('エラー', '初期パスワードを設定してください', 'error');
            return;
        }

        if (editingUser) {
            const originalUser = users.find(u => u.id === editingUser);
            const finalData = formData.password 
                ? { ...formData, password: formData.password, mustChangePassword: true } 
                : { ...formData, password: originalUser.password, mustChangePassword: originalUser.mustChangePassword };
            
            setUsers(prev => prev.map(u => u.id === editingUser ? { ...finalData, id: editingUser } : u));
            Swal.fire({ title: '更新完了', text: 'アカウント情報を更新しました。', icon: 'success', timer: 1500, showConfirmButton: false });
        } else {
            const newUser = { ...formData, id: Date.now(), mustChangePassword: true };
            setUsers(prev => [newUser, ...prev]);
            Swal.fire({ title: '登録完了', text: '新しいアカウントを作成しました。', icon: 'success', timer: 1500, showConfirmButton: false });
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id) => {
        Swal.fire({
            title: 'アカウントの削除',
            text: 'このアカウントを完全に削除しますか？',
            icon: 'warning',
            showCancelButton: true, confirmButtonColor: '#d33', cancelButtonColor: '#3085d6', confirmButtonText: '削除する'
        }).then((result) => {
            if (result.isConfirmed) {
                setUsers(prev => prev.filter(u => u.id !== id));
                Swal.fire('削除完了', 'アカウントを削除しました。', 'success');
            }
        });
    };

    const toggleStatus = (id) => {
        setUsers(prev => prev.map(u => u.id === id ? { ...u, isActive: !u.isActive } : u));
    };

    return (
        <div className="space-y-4 animate-fade-in w-full">
            
            {/* ★新規追加：退団者データの集計設定（基本・システム設定） */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden mt-4">
                <div className="bg-[#0b1c3a] px-6 py-4 border-b border-[#1e3a8a] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                    <h2 className="font-bold text-lg text-white flex items-center gap-2">退団者データの集計設定</h2>
                    <p className="text-[10px] text-blue-200 mt-1 tracking-wide">チーム成績やランキングに退団者を含めるか設定します</p>
                </div>
                <div className="p-6">
                    <p className="text-xs font-bold text-slate-700 mb-2">退団選手の成績反映（管理者・役員向け）</p>
                    <p className="text-[10px] text-slate-500 mb-4">
                        ※「一般選手」でログインしている場合は、この設定に関わらず常に退団者の成績は非表示（除外）となります。
                    </p>
                    <div className="flex items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <input 
                                type="radio" 
                                name="includeRetired" 
                                value="true" 
                                defaultChecked={typeof window !== 'undefined' && localStorage.getItem('logistars_include_retired_stats') === 'true'} 
                                onChange={() => {
                                    localStorage.setItem('logistars_include_retired_stats', 'true');
                                    Swal.fire({title:'設定完了', text:'退団者を含めて集計します。', icon:'success', timer:1500, showConfirmButton:false});
                                }} 
                                className="accent-[#0b1c3a] w-4 h-4" 
                            />
                            <span className="font-bold text-slate-700">含める（反映する）</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer text-xs">
                            <input 
                                type="radio" 
                                name="includeRetired" 
                                value="false" 
                                defaultChecked={typeof window !== 'undefined' && localStorage.getItem('logistars_include_retired_stats') !== 'true'} 
                                onChange={() => {
                                    localStorage.setItem('logistars_include_retired_stats', 'false');
                                    Swal.fire({title:'設定完了', text:'退団者を除外して集計します。', icon:'success', timer:1500, showConfirmButton:false});
                                }} 
                                className="accent-[#0b1c3a] w-4 h-4" 
                            />
                            <span className="font-bold text-slate-700">含めない（除外する）</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* 既存のアカウント一覧 */}
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden mt-4">
                <div className="bg-[#0b1c3a] px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center border-b border-[#1e3a8a] bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] gap-4">
                    <div>
                        <h2 className="font-bold text-lg text-white flex items-center gap-2">登録アカウント一覧</h2>
                        <p className="text-[10px] text-blue-200 mt-1 tracking-wide">※ 選手マスタで退団日を迎えた選手のアカウントは自動的にブロックされます</p>
                    </div>
                    <button onClick={() => handleOpenModal()} className="relative flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white border border-cyan-400/30 rounded-lg text-xs font-black transition-all duration-300 shadow-[0_4px_15px_rgba(6,182,212,0.3)] hover:shadow-[0_6px_20px_rgba(6,182,212,0.5)] transform hover:-translate-y-0.5 group overflow-hidden shrink-0">
                        <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                        <span className="relative z-10 text-base leading-none">＋</span>
                        <span className="relative z-10 tracking-widest">新規アカウント発行</span>
                    </button>
                </div>
                
                <div className="overflow-x-auto hide-scrollbar">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 text-xs font-bold">
                            <tr>
                                <th className="py-3 px-6">ユーザーID / メールアドレス</th>
                                <th className="py-3 px-4">権限 (ロール)</th>
                                <th className="py-3 px-4">紐付け選手データ</th>
                                <th className="py-3 px-4 text-center">ログイン許可</th>
                                <th className="py-3 px-4 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => {
                                const role = roles[user.role];
                                const linkedPlayer = players.find(p => String(p.id) === String(user.linkedPlayerId));
                                
                                // ★追加：退団済みかどうかを判定
                                const today = new Date();
                                today.setHours(0,0,0,0);
                                const isRetired = linkedPlayer && linkedPlayer.retirementDate && new Date(linkedPlayer.retirementDate) <= today;
                                
                                // 退団済みなら強制的に「非アクティブ」として扱う
                                const effectiveIsActive = isRetired ? false : user.isActive;
                                
                                return (
                                    <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${!effectiveIsActive ? 'bg-slate-50/50' : ''}`}>
                                        <td className="py-3 px-6">
                                            <div className="font-bold text-[#0b1c3a]">{user.username}</div>
                                            <div className="text-[10px] text-slate-400">{user.email || '-'}</div>
                                            {user.mustChangePassword && <span className="inline-block mt-1 bg-amber-100 text-amber-700 border border-amber-300 text-[8px] px-1.5 py-0.5 rounded font-bold">初期設定未完了</span>}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold border shadow-sm ${role?.color || ''}`}>
                                                {role?.label || '-'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            {user.role === 'player' ? (
                                                linkedPlayer ? (
                                                    <div className="flex items-center gap-3">
                                                        <span className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center text-[10px] overflow-hidden">
                                                            {linkedPlayer.photo ? <img src={linkedPlayer.photo} alt="P" className="w-full h-full object-cover"/> : <span className="text-slate-300">👤</span>}
                                                        </span>
                                                        <div>
                                                            <span className="font-bold text-slate-700 text-xs">{linkedPlayer.name}</span>
                                                            <span className="text-[9px] text-slate-400 ml-2">#{linkedPlayer.number}</span>
                                                            {/* ★追加：退団済みの警告 */}
                                                            {isRetired && <span className="text-[9px] text-red-500 font-bold ml-2">(退団済)</span>}
                                                        </div>
                                                    </div>
                                                ) : <span className="text-red-500 text-xs font-bold bg-red-50 px-2 py-1 rounded border border-red-200">紐付けなし (未設定)</span>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <button 
                                                onClick={() => !isRetired && toggleStatus(user.id)}
                                                disabled={isRetired}
                                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${effectiveIsActive ? 'bg-emerald-500 shadow-inner' : 'bg-slate-300'} ${isRetired ? 'cursor-not-allowed opacity-60' : ''}`}
                                            >
                                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform ${effectiveIsActive ? 'translate-x-4.5' : 'translate-x-1'}`} />
                                            </button>
                                            <div className={`text-[9px] mt-1 font-bold ${effectiveIsActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {/* ★追加：退団済みの場合は「自動ブロック」と表示 */}
                                                {isRetired ? '自動ブロック' : (effectiveIsActive ? '有効' : 'ブロック')}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => handleOpenModal(user)} className="text-[10px] bg-white border border-slate-300 text-blue-600 px-3 py-1.5 rounded shadow-sm hover:bg-blue-50 font-bold transition-colors">✏️ 編集(再設定)</button>
                                                <button onClick={() => handleDelete(user.id)} className="text-[10px] bg-white border border-slate-300 text-red-500 px-3 py-1.5 rounded shadow-sm hover:bg-red-50 font-bold transition-colors">🗑️ 削除</button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="bg-[#0b1c3a] px-5 py-4 flex justify-between items-center bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                            <h3 className="text-white font-bold text-sm tracking-widest">{editingUser ? 'アカウント情報の編集' : '新規アカウントの発行'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-blue-200 hover:text-white font-black">✕</button>
                        </div>
                        
                        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">ユーザーID <span className="text-red-500">*</span></label>
                                <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} placeholder="ログインに使用するID" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 font-bold text-[#0b1c3a] bg-slate-50 focus:bg-white transition-colors" />
                            </div>
                            
                            <div>
                                <label className="text-[10px] font-bold text-slate-500 mb-1 flex items-center gap-1">初期(仮)パスワード {editingUser ? '' : <span className="text-red-500">*</span>}</label>
                                <input 
                                    type="text" 
                                    value={formData.password} 
                                    onChange={e => setFormData({...formData, password: e.target.value})} 
                                    placeholder={editingUser ? "再設定して変更する場合のみ入力" : "例: logistars1234"} 
                                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-slate-700 bg-slate-50 focus:bg-white transition-colors" 
                                />
                                <p className="text-[9px] text-blue-600 mt-1 font-bold">※ ここでパスワードを設定すると、選手は次回ログイン時に「強制的にパスワード変更」を求められます。</p>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-slate-500 mb-1 block">メールアドレス</label>
                                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="example@logistars.com" className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 text-slate-700 bg-slate-50 focus:bg-white transition-colors" />
                            </div>

                            <div className="pt-2 border-t border-dashed border-slate-200">
                                <label className="text-[10px] font-bold text-slate-500 mb-2 block">権限 (ロール) の割り当て</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <button onClick={() => setFormData({...formData, role: 'admin', linkedPlayerId: ''})} className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center transition-colors text-[10px] font-bold ${formData.role === 'admin' ? 'bg-red-50 border-red-400 text-red-700 ring-1 ring-red-400 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}><span className="text-lg mb-1">👑</span>管理者</button>
                                    <button onClick={() => setFormData({...formData, role: 'executive', linkedPlayerId: ''})} className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center transition-colors text-[10px] font-bold ${formData.role === 'executive' ? 'bg-purple-50 border-purple-400 text-purple-700 ring-1 ring-purple-400 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}><span className="text-lg mb-1">👔</span>役員者</button>
                                    <button onClick={() => setFormData({...formData, role: 'player'})} className={`py-2 px-1 rounded-lg border flex flex-col items-center justify-center transition-colors text-[10px] font-bold ${formData.role === 'player' ? 'bg-blue-50 border-blue-400 text-blue-700 ring-1 ring-blue-400 shadow-inner' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 shadow-sm'}`}><span className="text-lg mb-1">⚾</span>一般選手</button>
                                </div>
                            </div>

                            {formData.role === 'player' && (
                                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in shadow-inner">
                                    <label className="text-[10px] font-bold text-blue-800 mb-1 flex items-center gap-1">紐付ける選手マスタデータ <span className="text-red-500">*</span></label>
                                    <select value={formData.linkedPlayerId} onChange={e => setFormData({...formData, linkedPlayerId: e.target.value})} className="w-full border border-blue-300 rounded px-3 py-2 text-xs font-bold text-[#0b1c3a] outline-none focus:border-blue-500 bg-white shadow-sm mt-1">
                                        <option value="">-- 選手を選択してください --</option>
                                        {sortedPlayers.map(p => {
                                            const isRetired = p.retirementDate && new Date(p.retirementDate) <= new Date();
                                            return (
                                                <option key={p.id} value={p.id} className={isRetired ? 'text-slate-400' : 'text-black'}>
                                                    #{p.number} {p.name} {isRetired ? '(退団済)' : ''}
                                                </option>
                                            )
                                        })}
                                    </select>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 shrink-0">
                            <button onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors shadow-sm">キャンセル</button>
                            <button onClick={handleSave} className="px-6 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-colors flex items-center gap-1">💾 保存する</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}