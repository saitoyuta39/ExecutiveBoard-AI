'use client';

import { useState, useEffect, useRef } from 'react';
import { getProfiles, startDiscussion, summarize } from '@/lib/api';
import Link from 'next/link';

interface Profile {
  id: string;
  name: string;
  description: string;
}

interface DiscussionMessage {
  speaker: string;
  profile_id: string;
  content: string;
  isThinking?: boolean;
}

export default function DiscussionPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [topic, setTopic] = useState('');
  const [profileA, setProfileA] = useState('');
  const [profileB, setProfileB] = useState('');
  const [history, setHistory] = useState<DiscussionMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProfiles() {
      const data = await getProfiles();
      setProfiles(data);
      if (data.length >= 2) {
        setProfileA(data[0].id);
        setProfileB(data[1].id);
      }
    }
    fetchProfiles();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleStart = async () => {
    if (!topic.trim() || !profileA || !profileB || isLoading) return;

    setHistory([]);
    setSummary(null);
    setHasStarted(true);
    await runDiscussionTurns(6, []);
  };

  const runDiscussionTurns = async (numTurns: number, startHistory: DiscussionMessage[]) => {
    setIsLoading(true);
    let currentHistory = [...startHistory];

    try {
      for (let i = 0; i < numTurns; i++) {
        // Determine who is thinking based on total message count in history
        const isTurnA = currentHistory.length % 2 === 0;
        const thinkingProfileId = isTurnA ? profileA : profileB;
        const thinkingProfileName = profiles.find(p => p.id === thinkingProfileId)?.name || '';

        // Add thinking message
        const thinkingMessage: DiscussionMessage = {
          speaker: thinkingProfileName,
          profile_id: thinkingProfileId,
          content: '',
          isThinking: true
        };
        setHistory([...currentHistory, thinkingMessage]);

        // Small delay for realism
        await new Promise(r => setTimeout(r, 800));

        // Call API
        const response = await startDiscussion(topic, profileA, profileB, currentHistory.map(m => ({
          speaker: m.speaker,
          profile_id: m.profile_id,
          content: m.content
        })));

        // Update history with actual response
        const newMessage: DiscussionMessage = {
          speaker: response.speaker,
          profile_id: response.profile_id,
          content: response.content,
          isThinking: false
        };
        currentHistory = [...currentHistory, newMessage];
        setHistory(currentHistory);

        // Wait a bit before next turn so user can read
        if (i < numTurns - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (isLoading || isSummarizing) return;
    await runDiscussionTurns(4, history);
  };

  const handleSummarize = async () => {
    if (!topic || history.length === 0 || isSummarizing) return;

    setIsSummarizing(true);
    try {
      const response = await summarize(topic, history);
      setSummary(response.content);
    } catch (error) {
      console.error(error);
      alert('要約の生成に失敗しました');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b p-4 flex items-center justify-between">
        <Link href="/" className="text-gray-600 hover:text-gray-900 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          戻る
        </Link>
        <h1 className="text-xl font-bold text-gray-800">ディスカッションモード</h1>
        <div className="w-20"></div> {/* Spacer */}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Configuration */}
        <aside className="w-96 bg-white border-r p-6 overflow-y-auto hidden lg:block">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-6">議論の設定</h2>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">議論のテーマ</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="例: サブスクリプション型コーヒーサービスの実現可能性について"
                className="w-full border rounded-xl p-3 h-32 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-800"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">AI経営者 A</label>
                {profileA && (
                  <div className="group relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none">
                      {profiles.find(p => p.id === profileA)?.description}
                    </div>
                  </div>
                )}
              </div>
              <select
                value={profileA}
                onChange={(e) => setProfileA(e.target.value)}
                className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-800"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-center">
              <div className="bg-purple-100 text-purple-600 px-3 py-1 rounded-full text-xs font-bold">VS</div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">AI経営者 B</label>
                {profileB && (
                  <div className="group relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute right-0 top-full mt-1 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none">
                      {profiles.find(p => p.id === profileB)?.description}
                    </div>
                  </div>
                )}
              </div>
              <select
                value={profileB}
                onChange={(e) => setProfileB(e.target.value)}
                className="w-full border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-purple-500 bg-gray-50 text-gray-800"
              >
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleStart}
              disabled={isLoading || !topic.trim()}
              className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {isLoading ? '議論中...' : '議論を開始する'}
            </button>
          </div>
        </aside>

        {/* Discussion Area */}
        <main className="flex-1 flex flex-col bg-gray-100">
          {!hasStarted ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
              <div className="bg-purple-100 p-6 rounded-full mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">議論の舞台へようこそ</h2>
              <p className="text-gray-500 max-w-md">左側のメニューからテーマと議論を行う経営者を選択してください。異なる視点がぶつかり合うことで、新しい発見が生まれます。</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-8 space-y-8">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 mb-8">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">現在の議論テーマ</h3>
                <p className="text-xl font-semibold text-gray-800">{topic}</p>
              </div>

              {history.map((msg, i) => (
                <div key={i} className={`flex flex-col ${msg.profile_id === profileA ? 'items-start' : 'items-end'}`}>
                  <div className={`max-w-[85%] p-6 rounded-2xl shadow-sm ${
                    msg.profile_id === profileA
                      ? 'bg-white border-l-4 border-blue-500 rounded-tl-none'
                      : 'bg-white border-r-4 border-purple-500 rounded-tr-none'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                        msg.profile_id === profileA ? 'bg-blue-500' : 'bg-purple-500'
                      }`}>
                        {msg.speaker[0]}
                      </div>
                      <span className="font-bold text-gray-800">{msg.speaker}</span>
                    </div>
                    {msg.isThinking ? (
                      <div className="flex gap-1 py-2">
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    ) : (
                      <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">{msg.content}</div>
                    )}
                  </div>
                </div>
              ))}

              {/* Removing the old general loading indicator since we now have per-message loading */}
              {history.length > 0 && !isLoading && (
                <div className="flex flex-col items-center gap-4 py-8">
                  <div className="flex gap-4">
                    <button
                      onClick={handleContinue}
                      disabled={isLoading || isSummarizing}
                      className="flex items-center gap-2 bg-white border-2 border-blue-500 text-blue-600 px-6 py-3 rounded-full font-bold hover:bg-blue-50 transition-all shadow-md disabled:opacity-50"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      議論を続ける（+2往復）
                    </button>

                    <button
                      onClick={handleSummarize}
                      disabled={isSummarizing || isLoading}
                      className="flex items-center gap-2 bg-white border-2 border-purple-500 text-purple-600 px-6 py-3 rounded-full font-bold hover:bg-purple-50 transition-all shadow-md disabled:opacity-50"
                    >
                      {isSummarizing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                          議事録を作成中...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          議論を要約して議事録を作成
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {summary && (
                <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-purple-100 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-3 mb-6 border-b pb-4">
                    <div className="bg-purple-600 p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800">議論の議事録</h2>
                  </div>
                  <div className="prose prose-purple max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {summary}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

