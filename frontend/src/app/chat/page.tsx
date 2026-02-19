'use client';

import { useState, useEffect, useRef } from 'react';
import { getProfiles, chat, summarize } from '@/lib/api';
import Link from 'next/link';

interface Profile {
  id: string;
  name: string;
  description: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchProfiles() {
      const data = await getProfiles();
      setProfiles(data);
      if (data.length > 0) setSelectedProfileId(data[0].id);
    }
    fetchProfiles();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !selectedProfileId || isLoading) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chat(selectedProfileId, newMessages);
      setMessages([...newMessages, { role: 'assistant', content: response.content }]);
    } catch (error) {
      console.error(error);
      alert('エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSummarize = async () => {
    if (messages.length === 0 || isSummarizing) return;

    setIsSummarizing(true);
    try {
      // For chat mode, we use a generic topic or the first user message
      const topic = messages.find(m => m.role === 'user')?.content.substring(0, 50) + '...' || '壁打ちの相談';
      const response = await summarize(topic, messages.map(m => ({
        speaker: m.role === 'user' ? 'あなた' : selectedProfile?.name || '経営者',
        profile_id: m.role === 'user' ? 'user' : selectedProfileId,
        content: m.content
      })));
      setSummary(response.content);
    } catch (error) {
      console.error(error);
      alert('要約の生成に失敗しました');
    } finally {
      setIsSummarizing(false);
    }
  };

  const selectedProfile = profiles.find(p => p.id === selectedProfileId);

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
        <h1 className="text-xl font-bold text-gray-800">壁打ちモード</h1>
        <div className="w-20"></div> {/* Spacer */}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Profile Selection */}
        <aside className="w-80 bg-white border-r p-6 overflow-y-auto hidden md:block">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">経営者プロファイル</h2>
          <div className="space-y-4">
            {Array.isArray(profiles) && profiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => {
                  setSelectedProfileId(profile.id);
                  setMessages([]);
                  setSummary(null);
                }}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  selectedProfileId === profile.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-bold text-gray-800">{profile.name}</div>
                  <div className="group relative">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400 hover:text-gray-600 cursor-help" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="absolute right-0 top-full mt-2 hidden group-hover:block w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-xl z-50 pointer-events-none">
                      {profile.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex-1 flex flex-col relative">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && selectedProfile && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <div className="bg-blue-100 p-4 rounded-full mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-800">{selectedProfile.name}との壁打ち</h3>
                <p className="max-w-xs mt-2">事業アイデアや悩みを入力してください。経営者の視点で鋭くフィードバックします。</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-tl-none'
                }`}>
                  <div className="text-xs mb-1 opacity-70 font-semibold">
                    {msg.role === 'user' ? 'あなた' : selectedProfile?.name}
                  </div>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white text-gray-400 p-4 rounded-2xl shadow-sm border border-gray-100 rounded-tl-none animate-pulse">
                  考え中...
                </div>
              </div>
            )}

            {messages.length > 0 && !isLoading && !summary && (
              <div className="flex justify-center py-4">
                <button
                  onClick={handleSummarize}
                  disabled={isSummarizing}
                  className="flex items-center gap-2 bg-white border-2 border-blue-500 text-blue-600 px-6 py-3 rounded-full font-bold hover:bg-blue-50 transition-all shadow-md disabled:opacity-50"
                >
                  {isSummarizing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      議事録を作成中...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      相談内容を要約して議事録を作成
                    </>
                  )}
                </button>
              </div>
            )}

            {summary && (
              <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-blue-100 mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center gap-3 mb-6 border-b pb-4">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800">壁打ちの議事録</h2>
                </div>
                <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap">
                  {summary}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t">
            <div className="max-w-4xl mx-auto flex gap-4">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="ここにアイデアや悩みを入力..."
                className="flex-1 resize-none border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
                rows={1}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-blue-600 text-white px-6 py-2 rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                送信
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

