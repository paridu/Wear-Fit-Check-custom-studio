
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { SavedOutfit } from '../types';
import { Trash2Icon, XIcon } from './icons';
import { motion, AnimatePresence } from 'framer-motion';

interface SavedOutfitsProps {
  outfits: SavedOutfit[];
  onDelete: (id: string) => void;
}

const SavedOutfits: React.FC<SavedOutfitsProps> = ({ outfits, onDelete }) => {
  const [selectedOutfit, setSelectedOutfit] = useState<SavedOutfit | null>(null);

  if (outfits.length === 0) return (
    <div className="mt-8 pt-6 border-t border-gray-400/50">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-4">ชุดที่บันทึกไว้</h2>
      <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded-lg">
        ยังไม่มีชุดที่บันทึกไว้ ลองแต่งตัวแล้วกดปุ่มหัวใจดูสิ!
      </p>
    </div>
  );

  return (
    <div className="mt-8 pt-6 border-t border-gray-400/50">
      <h2 className="text-xl font-serif tracking-wider text-gray-800 mb-4 flex items-center justify-between">
        ชุดที่บันทึกไว้
        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{outfits.length}</span>
      </h2>
      
      <div className="grid grid-cols-2 gap-3">
        {outfits.map((outfit) => (
          <div key={outfit.id} className="relative group rounded-lg overflow-hidden border border-gray-200 bg-white">
            <img 
              src={outfit.imageUrl} 
              alt="Saved Outfit" 
              className="w-full h-32 object-cover cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setSelectedOutfit(outfit)}
            />
            <div className="p-2">
                <p className="text-[10px] text-gray-400 mb-1">
                    {new Date(outfit.timestamp).toLocaleDateString('th-TH')}
                </p>
                <div className="flex flex-wrap gap-1">
                    {outfit.items.slice(0, 2).map(item => (
                        <span key={item.id} className="text-[9px] bg-gray-100 px-1 rounded truncate max-w-[50px]">
                            {item.name}
                        </span>
                    ))}
                    {outfit.items.length > 2 && <span className="text-[9px] text-gray-400">+{outfit.items.length - 2}</span>}
                </div>
            </div>
            <button
              onClick={() => onDelete(outfit.id)}
              className="absolute top-1 right-1 p-1 bg-white/80 backdrop-blur-sm rounded-full text-red-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
              aria-label="ลบชุดที่บันทึกไว้"
            >
              <Trash2Icon className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedOutfit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8"
            onClick={() => setSelectedOutfit(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
                <button 
                  onClick={() => setSelectedOutfit(null)}
                  className="absolute top-4 right-4 p-2 bg-white/50 backdrop-blur-sm rounded-full text-gray-800 hover:bg-white z-10"
                >
                  <XIcon className="w-6 h-6" />
                </button>
                <div className="flex flex-col md:flex-row h-full max-h-[90vh]">
                    <div className="w-full md:w-2/3">
                        <img src={selectedOutfit.imageUrl} alt="Saved Outfit Detail" className="w-full h-full object-contain bg-gray-100" />
                    </div>
                    <div className="w-full md:w-1/3 p-6 flex flex-col bg-white overflow-y-auto">
                        <h3 className="text-xl font-serif font-bold mb-4">รายละเอียดชุด</h3>
                        <p className="text-xs text-gray-400 mb-6">บันทึกเมื่อ: {new Date(selectedOutfit.timestamp).toLocaleString('th-TH')}</p>
                        
                        <div className="space-y-4">
                            <h4 className="text-sm font-bold uppercase tracking-widest text-gray-500">ไอเทมในลุคนี้:</h4>
                            {selectedOutfit.items.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">ไม่มีไอเทมเสริม</p>
                            ) : (
                                selectedOutfit.items.map(item => (
                                    <div key={item.id} className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded overflow-hidden bg-gray-50 border border-gray-100">
                                            <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                        </div>
                                        <span className="text-sm text-gray-700">{item.name}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        
                        <button 
                            onClick={() => setSelectedOutfit(null)}
                            className="mt-auto pt-8 text-center text-sm font-bold text-gray-900 hover:underline"
                        >
                            ปิดหน้าต่างนี้
                        </button>
                    </div>
                </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SavedOutfits;
