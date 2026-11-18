import React, { useState, useEffect } from 'react';

export default function ScoreboardModal({ isOpen, onClose, game, teamName, onSave }) {
    const [scoreStatus, setScoreStatus] = useState('試合終了');
    const [isBattingFirst, setIsBattingFirst] = useState(false); // false = 後攻(下)
    const [lineScore, setLineScore] = useState({
        my_team: Array(9).fill(''),
        op_team: Array(9).fill('')
    });

    useEffect(() => {
        if (isOpen && game) {
            const defaultLine = { my_team: Array(9).fill(''), op_team: Array(9).fill('') };
            // DBの line_score にデータがあれば復元
            setLineScore(game.line_score?.my_team ? game.line_score : defaultLine);
            setScoreStatus(game.status || '予定');
            // DBに先攻後攻の記録があれば復元
            setIsBattingFirst(game.line_score?.is_batting_first || false);
        }
    }, [isOpen, game]);

    if (!isOpen) return null;

    // スコアの自動計算
    const calculateTotal = (arr) => arr.reduce((sum, val) => {
        if (String(val).toUpperCase() === 'X') return sum;
        const num = parseInt(val, 10);
        return sum + (isNaN(num) ? 0 : num);
    }, 0);

    const myTotalScore = calculateTotal(lineScore.my_team);
    const opTotalScore = calculateTotal(lineScore.op_team);

    // 入力更新
    const updateLineScore = (team, index, value) => {
        const newVal = value.slice(0, 2); // 2文字まで
        setLineScore(prev => ({ ...prev, [team]: prev[team].map((v, i) => i === index ? newVal : v) }));
    };

    // 保存ボタンを押したときの処理
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            my_score: myTotalScore,
            op_score: opTotalScore,
            status: scoreStatus,
            // JSONの中に is_batting_first の情報も一緒に保存する
            line_score: { ...lineScore, is_batting_first: isBattingFirst }
        });
    };

    // スコアの1行分を描画する関数（先攻後攻の入れ替えに便利）
    const renderRow = (teamKey, name, totalScore) => (
        <div className="flex mb-4 items-center">
            <div className="w-32 font-bold truncate pr-2 text-slate-300 pl-2">{name}</div>
            {lineScore[teamKey].map((val, i) => (
                <input
                    key={i}
                    value={val}
                    onChange={(e) => updateLineScore(teamKey, i, e.target.value)}
                    className="w-10 h-10 text-center bg-slate-900 border border-slate-700 rounded text-yellow-400 focus:bg-slate-800 focus:outline-none focus:border-yellow-500 mx-px text-xl font-bold transition-colors"
                />
            ))}
            <div className="w-12 text-center font-bold text-red-500 text-2xl ml-2">{totalScore}</div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm">
            <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-700">
                <div className="bg-slate-900 text-slate-300 px-4 py-3 flex justify-between items-center border-b border-slate-700">
                    <h3 className="font-bold text-sm tracking-wider flex items-center gap-4">
                        SCOREBOARD INPUT
                        {/* ★ 追加: 先攻・後攻 切り替えトグルボタン */}
                        <button 
                            type="button" 
                            onClick={() => setIsBattingFirst(!isBattingFirst)} 
                            className="bg-slate-700 hover:bg-slate-600 text-xs px-3 py-1 rounded-full text-white transition-colors flex items-center gap-1 border border-slate-600"
                        >
                            🔄 {isBattingFirst ? '自チーム: 先攻 (上)' : '自チーム: 後攻 (下)'}
                        </button>
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white font-bold text-xl leading-none">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="bg-slate-950 rounded-lg p-5 font-mono text-white shadow-inner mb-6 border border-slate-800">
                        <div className="flex border-b-2 border-slate-800 pb-3 mb-3 text-slate-500 text-sm">
                            <div className="w-32 font-bold text-left tracking-widest pl-2">TEAM</div>
                            {Array(9).fill(0).map((_, i) => <div key={i} className="w-10 text-center">{i+1}</div>)}
                            <div className="w-12 text-center font-bold text-red-500 ml-2">R</div>
                        </div>
                        
                        {/* isBattingFirst の状態によって、上と下の描画順を切り替える */}
                        {isBattingFirst ? (
                            <>
                                {renderRow('my_team', teamName, myTotalScore)}
                                {renderRow('op_team', game.opponent, opTotalScore)}
                            </>
                        ) : (
                            <>
                                {renderRow('op_team', game.opponent, opTotalScore)}
                                {renderRow('my_team', teamName, myTotalScore)}
                            </>
                        )}
                    </div>

                    <div className="flex justify-between items-center">
                        <div className="w-1/3">
                            <label className="block text-xs font-bold text-slate-400 mb-1">試合の進行状況</label>
                            <select value={scoreStatus} onChange={(e) => setScoreStatus(e.target.value)} className="w-full bg-slate-700 border border-slate-600 text-white rounded px-3 py-2 text-sm font-bold focus:outline-none focus:border-blue-500">
                                <option value="予定">試合前（予定）</option>
                                <option value="試合終了">試合終了</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-bold transition shadow-sm">キャンセル</button>
                            <button type="submit" className="px-8 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-bold transition shadow-md">
                                スコアを確定
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}