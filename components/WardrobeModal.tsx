
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import type { WardrobeItem } from '../types';
import { UploadCloudIcon, CheckCircleIcon, Wand2Icon } from './icons';
import { generateFashionItem } from '../services/geminiService';
import Spinner from './Spinner';

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
  onAddItemToWardrobe: (item: WardrobeItem) => void;
}

const urlToFile = (url: string, filename: string): Promise<File> => {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.setAttribute('crossOrigin', 'anonymous');
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Could not get canvas context.'));
            ctx.drawImage(image, 0, 0);
            canvas.toBlob((blob) => {
                if (!blob) return reject(new Error('Canvas toBlob failed.'));
                const file = new File([blob], filename, { type: blob.type || 'image/png' });
                resolve(file);
            }, 'image/png');
        };
        image.onerror = (error) => reject(new Error(`Could not load image: ${error}`));
        image.src = url;
    });
};

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe, onAddItemToWardrobe }) => {
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState<string | null>(null);

    const handleGarmentClick = async (item: WardrobeItem) => {
        if (isLoading || activeGarmentIds.includes(item.id)) return;
        setError(null);
        try {
            const file = await urlToFile(item.url, item.name);
            onGarmentSelect(file, item);
        } catch (err) {
            setError('โหลดไอเทมไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, category: 'clothing' | 'accessory') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (!file.type.startsWith('image/')) {
                setError('กรุณาเลือกไฟล์รูปภาพ');
                return;
            }
            const customGarmentInfo: WardrobeItem = {
                id: `custom-${Date.now()}`,
                name: file.name,
                url: URL.createObjectURL(file),
                category
            };
            onGarmentSelect(file, customGarmentInfo);
        }
    };

    const handleAiGenerate = async (category: string, catKey: 'clothing' | 'accessory') => {
        setIsGenerating(category);
        setError(null);
        try {
            const dataUrl = await generateFashionItem(category);
            const newItem: WardrobeItem = {
                id: `ai-${Date.now()}`,
                name: `AI Generated ${category}`,
                url: dataUrl,
                category: catKey
            };
            onAddItemToWardrobe(newItem);
            // โหลดและเลือกทันที
            const file = await urlToFile(dataUrl, newItem.name);
            onGarmentSelect(file, newItem);
        } catch (err) {
            setError('AI ไม่สามารถสร้างรูปภาพได้ในขณะนี้');
        } finally {
            setIsGenerating(null);
        }
    };

    const renderGrid = (items: WardrobeItem[]) => (
        <div className="grid grid-cols-3 gap-3">
            {items.map((item) => {
                const isActive = activeGarmentIds.includes(item.id);
                return (
                    <button
                        key={item.id}
                        onClick={() => handleGarmentClick(item)}
                        disabled={isLoading || isActive}
                        className="relative aspect-square border border-gray-100 rounded-xl overflow-hidden transition-all duration-200 group disabled:opacity-60 bg-white"
                    >
                        <img src={item.url} alt={item.name} className="w-full h-full object-contain p-1" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-[10px] font-bold text-center px-1">{item.name}</p>
                        </div>
                        {isActive && (
                            <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                                <CheckCircleIcon className="w-8 h-8 text-white" />
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );

    const categories = [
        { label: 'เสื้อ (Tops)', prompt: 'stylish designer shirt', key: 'clothing' as const },
        { label: 'กางเกง (Bottoms)', prompt: 'fashionable trousers', key: 'clothing' as const },
        { label: 'รองเท้า (Shoes)', prompt: 'luxury fashion sneakers', key: 'clothing' as const },
        { label: 'หมวก (Headwear)', prompt: 'fashionable cap', key: 'accessory' as const },
        { label: 'เครื่องประดับ (Accessories)', prompt: 'stylish designer bag', key: 'accessory' as const },
    ];

  return (
    <div className="flex flex-col gap-8 pb-10">
        <section className="bg-gradient-to-br from-indigo-50 to-white p-5 rounded-2xl border border-indigo-100 shadow-sm">
            <h2 className="text-lg font-serif font-bold text-indigo-900 mb-4 flex items-center gap-2">
                <Wand2Icon className="w-5 h-5" />
                Fashion Studio (AI Generate)
            </h2>
            <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                    <div key={cat.label} className="flex gap-1 items-center">
                        <button 
                            onClick={() => handleAiGenerate(cat.prompt, cat.key)}
                            disabled={!!isGenerating || isLoading}
                            className="text-[11px] font-bold px-3 py-1.5 bg-white border border-indigo-200 text-indigo-600 rounded-full hover:bg-indigo-600 hover:text-white transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                            {isGenerating === cat.prompt ? <Spinner className="w-3 h-3 border-indigo-400" /> : <Wand2Icon className="w-3 h-3" />}
                            {cat.label.split(' ')[0]}
                        </button>
                        <label className="cursor-pointer p-1.5 bg-gray-100 rounded-full hover:bg-gray-200" title={`อัปโหลด ${cat.label}`}>
                            <UploadCloudIcon className="w-3.5 h-3.5 text-gray-600" />
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, cat.key)} disabled={isLoading} />
                        </label>
                    </div>
                ))}
            </div>
            {error && <p className="text-red-500 text-xs mt-3">{error}</p>}
        </section>

        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">ไอเทมในคอลเลกชัน</h2>
                {renderGrid(wardrobe)}
            </div>
        </div>
    </div>
  );
};

export default WardrobePanel;
