
import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { ItineraryItem } from './types';
import { getTravelSuggestions } from './services/geminiService';
import PlusIcon from './components/icons/PlusIcon';
import TrashIcon from './components/icons/TrashIcon';
import SparklesIcon from './components/icons/SparklesIcon';
import LoadingSpinner from './components/icons/LoadingSpinner';
import ImportIcon from './components/icons/ImportIcon';
import PencilIcon from './components/icons/PencilIcon';
import CheckIcon from './components/icons/CheckIcon';
import XMarkIcon from './components/icons/XMarkIcon';
import TemplateIcon from './components/icons/TemplateIcon';

// Helper component for displaying or editing a single itinerary item
const ItineraryItemComponent: React.FC<{ 
  item: ItineraryItem; 
  onDelete: (id: string) => void;
  onUpdate: (item: ItineraryItem) => void;
  isEditing: boolean;
  onEditClick: (id: string) => void;
  onCancelClick: () => void;
}> = ({ item, onDelete, onUpdate, isEditing, onEditClick, onCancelClick }) => {
  const [editedTime, setEditedTime] = useState(item.time);
  const [editedActivity, setEditedActivity] = useState(item.activity);
  const [editedUrl, setEditedUrl] = useState(item.url || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editedActivity.trim() === '') return;
    onUpdate({
      ...item,
      time: editedTime,
      activity: editedActivity.trim(),
      url: editedUrl.trim() || undefined,
    });
  };

  if (isEditing) {
    return (
      <li className="p-4 bg-stone-50 rounded-lg shadow-sm border border-stone-200">
        <form onSubmit={handleSave} className="space-y-3">
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <input 
              type="time" 
              value={editedTime}
              onChange={(e) => setEditedTime(e.target.value)}
              className="w-28 p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition bg-white text-stone-900"
              required
              aria-label="Edit activity time"
            />
            <input 
              type="text"
              value={editedActivity}
              onChange={(e) => setEditedActivity(e.target.value)}
              placeholder="例: 美術館に行く"
              className="flex-grow p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition bg-white text-stone-900 placeholder-stone-400"
              required
              aria-label="Edit activity description"
            />
          </div>
           <input 
              type="url"
              value={editedUrl}
              onChange={(e) => setEditedUrl(e.target.value)}
              placeholder="参考URL (任意)"
              className="w-full p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition bg-white text-stone-900 placeholder-stone-400"
              aria-label="Edit activity URL"
            />
          <div className="flex justify-end items-center gap-2">
            <button type="button" onClick={onCancelClick} className="p-2 text-stone-500 hover:text-stone-700 rounded-full hover:bg-stone-200 transition-colors duration-200" aria-label="Cancel edit">
              <XMarkIcon className="w-6 h-6" />
            </button>
            <button type="submit" className="p-2 text-green-600 hover:text-green-800 rounded-full hover:bg-green-100 transition-colors duration-200" aria-label="Save changes">
              <CheckIcon className="w-6 h-6" />
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 border border-stone-200">
      <div className="flex items-center gap-4 flex-grow min-w-0">
        <span className="font-mono text-lg font-semibold text-stone-700">{item.time}</span>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-stone-700 hover:text-stone-900 underline truncate transition-colors duration-200" title={item.activity}>
            {item.activity}
          </a>
        ) : (
          <p className="text-stone-700 truncate" title={item.activity}>{item.activity}</p>
        )}
      </div>
      <div className="flex items-center flex-shrink-0 ml-2">
        <button onClick={() => onEditClick(item.id)} className="p-2 text-stone-400 hover:text-stone-600 rounded-full hover:bg-stone-100 transition-colors duration-200" aria-label={`Edit ${item.activity}`}>
          <PencilIcon className="w-5 h-5" />
        </button>
        <button onClick={() => onDelete(item.id)} className="p-2 text-stone-400 hover:text-red-500 rounded-full hover:bg-red-100 transition-colors duration-200" aria-label={`Delete ${item.activity}`}>
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </li>
  );
};

const App: React.FC = () => {
  const [itinerary, setItinerary] = useState<ItineraryItem[]>([]);
  const [newTime, setNewTime] = useState<string>('10:00');
  const [newActivity, setNewActivity] = useState<string>('');
  const [newUrl, setNewUrl] = useState<string>('');

  const [problem, setProblem] = useState<string>('');
  const [constraints, setConstraints] = useState<string>('');
  const [suggestion, setSuggestion] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importText, setImportText] = useState<string>('');
  
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [suggestionType, setSuggestionType] = useState<'schedule' | 'spots'>('schedule');
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);
  const templateDropdownRef = useRef<HTMLDivElement>(null);

  const constraintTemplates = [
    "[時間]までに[場所]に着く必要があります。",
    "予算は[金額]円以内です。",
    "[場所]だけは絶対に行きたいです。",
    "屋内アクティビティを希望します。",
    "子供も楽しめる場所を希望します。",
  ];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (templateDropdownRef.current && !templateDropdownRef.current.contains(event.target as Node)) {
            setIsTemplateDropdownOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newActivity.trim() === '') return;
    const newItem: ItineraryItem = {
      id: Date.now().toString(),
      time: newTime,
      activity: newActivity.trim(),
      url: newUrl.trim() || undefined,
    };
    const sortedItinerary = [...itinerary, newItem].sort((a, b) => a.time.localeCompare(b.time));
    setItinerary(sortedItinerary);
    setNewActivity('');
    setNewUrl('');
    setIsAdding(false);
  };

  const handleDeleteItem = (id: string) => {
    setItinerary(itinerary.filter(item => item.id !== id));
  };
  
  const handleUpdateItem = (updatedItem: ItineraryItem) => {
    const updatedItinerary = itinerary.map(item =>
      item.id === updatedItem.id ? updatedItem : item
    );
    const sortedItinerary = updatedItinerary.sort((a, b) => a.time.localeCompare(b.time));
    setItinerary(sortedItinerary);
    setEditingItemId(null);
  };

  const handleGetSuggestions = useCallback(async () => {
    if (!problem.trim() && !constraints.trim()) {
      setError('問題点や制約を入力してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setSuggestion('');

    const result = await getTravelSuggestions(itinerary, problem, constraints, suggestionType);
    
    setSuggestion(result);
    setIsLoading(false);
  }, [itinerary, problem, constraints, suggestionType]);

  const handleImport = () => {
    if (!importText.trim()) {
      setIsImporting(false);
      return;
    }

    const lines = importText.trim().split('\n');
    const newItems: ItineraryItem[] = [];
    const timeRegex = /(\d{1,2}:\d{2})/;

    lines.forEach((line, index) => {
      const timeMatch = line.match(timeRegex);
      if (timeMatch && timeMatch[0]) {
        const time = timeMatch[0];
        const [hours, minutes] = time.split(':');
        const normalizedTime = `${hours.padStart(2, '0')}:${minutes.padStart(2, '0')}`;
        
        const activity = line.replace(/^-?\s*(\d{1,2}:\d{2})\s*([〜~-]\s*\d{1,2}:\d{2})?\s*/, '').trim();

        if (activity) {
          newItems.push({
            id: `${Date.now()}-${index}`,
            time: normalizedTime,
            activity,
          });
        }
      }
    });

    if (newItems.length > 0) {
      const combinedItinerary = [...itinerary, ...newItems];
      const sortedItinerary = combinedItinerary.sort((a, b) => a.time.localeCompare(b.time));
      setItinerary(sortedItinerary);
    }
    
    setImportText('');
    setIsImporting(false);
  };


  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <header className="text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight">急な予定変更でも安心！旅プラン<span className="text-stone-700">AI</span></h1>
        <p className="mt-3 text-lg text-stone-600 max-w-2xl mx-auto">突然の雨や電車の遅延でも、AIが最適なプランを再提案します。</p>
      </header>
      
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Panel: Itinerary Manager */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-3">
            <h2 className="text-2xl font-bold text-stone-800">旅行計画</h2>
            <div className="flex items-center gap-2">
              {!isImporting && !isAdding && (
                <>
                  <button
                    onClick={() => setIsImporting(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-stone-500"
                  >
                    <ImportIcon className="w-4 h-4" />
                    <span>インポート</span>
                  </button>
                  <button
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-stone-800 rounded-lg hover:bg-stone-900 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-stone-500"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>追加</span>
                  </button>
                </>
              )}
            </div>
          </div>
          
          {isImporting && (
            <div className="mb-6 p-4 bg-stone-50 rounded-lg">
              <label htmlFor="import-text" className="block text-sm font-medium text-stone-700 mb-2">計画をテキストで貼り付け</label>
              <textarea
                id="import-text"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                rows={8}
                placeholder={
`- 09:40 自宅を出る
- 10:00 石神井公園駅 発
- 11:55〜12:14 北ノ麺 もりうち`
                }
                className="w-full p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition mb-3 bg-white text-stone-900 placeholder-stone-400"
              />
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setIsImporting(false)}
                  className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-100 transition-colors duration-200"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleImport}
                  className="px-4 py-2 text-sm font-medium text-white bg-stone-800 rounded-md hover:bg-stone-900 transition-colors duration-200 shadow-sm"
                >
                  予定に取り込む
                </button>
              </div>
            </div>
          )}

          {isAdding && (
            <div className="mb-6 p-4 bg-stone-50 rounded-lg">
              <form onSubmit={handleAddItem} className="space-y-3">
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                  <input 
                    type="time" 
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-28 p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition bg-white text-stone-900"
                    required
                    aria-label="Activity time"
                  />
                  <input 
                    type="text"
                    value={newActivity}
                    onChange={(e) => setNewActivity(e.target.value)}
                    placeholder="例: 美術館に行く"
                    className="flex-grow p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition bg-white text-stone-900 placeholder-stone-400"
                    required
                    aria-label="Activity description"
                  />
                </div>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="参考URL (任意)"
                  className="w-full p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition bg-white text-stone-900 placeholder-stone-400"
                  aria-label="Activity URL"
                />
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAdding(false)}
                    className="px-4 py-2 text-sm font-medium text-stone-700 bg-white border border-stone-300 rounded-md hover:bg-stone-100 transition-colors duration-200"
                  >
                    キャンセル
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-stone-800 rounded-md hover:bg-stone-900 transition-colors duration-200 shadow-sm"
                  >
                    予定に追加
                  </button>
                </div>
              </form>
            </div>
          )}

          <ul className="space-y-3">
            {itinerary.length > 0 ? (
              itinerary.map(item => <ItineraryItemComponent 
                key={item.id} 
                item={item} 
                onDelete={handleDeleteItem} 
                onUpdate={handleUpdateItem}
                isEditing={item.id === editingItemId}
                onEditClick={setEditingItemId}
                onCancelClick={() => setEditingItemId(null)}
              />)
            ) : (
              <p className="text-center text-stone-500 py-8 bg-stone-100 rounded-lg">旅行の予定を追加してください。</p>
            )}
          </ul>
        </div>

        {/* Right Panel: AI Assistant */}
        <div className="bg-white p-6 rounded-xl shadow-md border border-stone-200">
          <h2 className="text-2xl font-bold text-stone-800 mb-4 border-b border-stone-200 pb-3">AIアシスタント</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="problem" className="text-sm font-medium text-stone-600">直面している問題</label>
                <select
                    value={suggestionType}
                    onChange={(e) => setSuggestionType(e.target.value as 'schedule' | 'spots')}
                    className="text-sm border border-stone-300 rounded-md focus:ring-1 focus:ring-stone-500 focus:border-stone-500 transition bg-white text-stone-900 py-1 pl-2 pr-8"
                    aria-label="提案の種類を選択"
                >
                    <option value="schedule">スケジュールの代替案</option>
                    <option value="spots">代替のおすすめスポット</option>
                </select>
              </div>
              <textarea 
                id="problem" 
                rows={3}
                value={problem}
                onChange={(e) => setProblem(e.target.value)}
                placeholder="例: 急な大雨が降ってきた、乗る予定の電車が30分遅延している"
                className="w-full p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition bg-white text-stone-900 placeholder-stone-400"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="constraints" className="text-sm font-medium text-stone-600">前提条件・要望</label>
                 <div className="relative" ref={templateDropdownRef}>
                    <button
                        onClick={() => setIsTemplateDropdownOpen(prev => !prev)}
                        className="flex items-center gap-1 text-sm font-medium text-stone-600 hover:text-stone-800 transition-colors duration-200"
                        aria-label="テンプレートを挿入"
                    >
                        <TemplateIcon className="w-4 h-4" />
                        <span>テンプレート</span>
                    </button>
                    {isTemplateDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-xl z-10 border border-stone-200">
                            <ul className="py-1">
                                {constraintTemplates.map((template, index) => (
                                    <li key={index}>
                                        <button
                                            onClick={() => {
                                                setConstraints(prev => prev ? `${prev}\n${template}` : template);
                                                setIsTemplateDropdownOpen(false);
                                            }}
                                            className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-stone-100 transition-colors duration-150"
                                        >
                                            {template}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
              </div>
              <textarea 
                id="constraints" 
                rows={3}
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                placeholder="例: 18時までに東京駅に着く必要がある、〇〇だけは絶対に行きたい"
                className="w-full p-2 border border-stone-300 rounded-md focus:ring-2 focus:ring-stone-500 focus:border-stone-500 transition bg-white text-stone-900 placeholder-stone-400"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={handleGetSuggestions}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-stone-800 text-white font-semibold rounded-lg shadow-md hover:bg-stone-900 disabled:bg-stone-500 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-stone-500"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner />
                  <span>提案を生成中...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-5 h-5" />
                  <span>新しいプランを提案してもらう</span>
                </>
              )}
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          </div>

          <div className="mt-6">
            <h3 className="text-lg font-semibold text-stone-700 mb-2">AIからの提案</h3>
            <div className="p-4 bg-stone-100 rounded-lg min-h-[200px] border border-stone-200 text-stone-800 whitespace-pre-wrap leading-relaxed">
              {suggestion || 'ここにAIからの新しい旅行プランが表示されます。'}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
