
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import type { WardrobeItem } from '../types';
import { UploadCloudIcon, CheckCircleIcon } from './icons';

interface WardrobePanelProps {
  onGarmentSelect: (garmentFile: File, garmentInfo: WardrobeItem) => void;
  activeGarmentIds: string[];
  isLoading: boolean;
  wardrobe: WardrobeItem[];
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

const WardrobePanel: React.FC<WardrobePanelProps> = ({ onGarmentSelect, activeGarmentIds, isLoading, wardrobe }) => {
    const [error, setError] = useState<string | null>(null);

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

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
                category: 'clothing' // Default to clothing for uploads
            };
            onGarmentSelect(file, customGarmentInfo);
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
                        className="relative aspect-square border rounded-lg overflow-hidden transition-all duration-200 group disabled:opacity-60"
                    >
                        <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <p className="text-white text-xs font-bold text-center p-1">{item.name}</p>
                        </div>
                        {isActive && (
                            <div className="absolute inset-0 bg-gray-900/70 flex items-center justify-center">
                                <CheckCircleIcon className="w-8 h-8 text-white" />
                            </div>
                        )}
                    </button>
                );
            })}
            {items === clothing && (
                <label htmlFor="custom-garment-upload" className={`relative aspect-square border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-gray-500 transition-colors ${isLoading ? 'cursor-not-allowed bg-gray-100' : 'hover:border-gray-400 cursor-pointer'}`}>
                    <UploadCloudIcon className="w-6 h-6 mb-1"/>
                    <span className="text-xs text-center">อัปโหลด</span>
                    <input id="custom-garment-upload" type="file" className="hidden" accept="image/*" onChange={handleFileChange} disabled={isLoading}/>
                </label>
            )}
        </div>
    );

    const clothing = wardrobe.filter(i => i.category === 'clothing');
    const accessories = wardrobe.filter(i => i.category === 'accessory');

  return (
    <div className="pt-6 border-t border-gray-400/50 space-y-6">
        <div>
            <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">เสื้อผ้า</h2>
            {renderGrid(clothing)}
        </div>
        
        {accessories.length > 0 && (
            <div>
                <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-3">เครื่องประดับ</h2>
                {renderGrid(accessories)}
            </div>
        )}

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
};

export default WardrobePanel;
