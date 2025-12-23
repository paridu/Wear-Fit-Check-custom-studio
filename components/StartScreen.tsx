
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon, Wand2Icon, CheckCircleIcon, ChevronRightIcon } from './icons';
import { Compare } from './ui/compare';
import { generateModelImage, removeBackground } from '../services/geminiService';
import Spinner from './Spinner';
import { getFriendlyErrorMessage } from '../lib/utils';

interface StartScreenProps {
  onModelFinalized: (modelUrl: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({ onModelFinalized }) => {
  const [userImageUrl, setUserImageUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [processedUserImageUrl, setProcessedUserImageUrl] = useState<string | null>(null);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
        setError('กรุณาเลือกไฟล์รูปภาพ');
        return;
    }
    const reader = new FileReader();
    reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        setUserImageUrl(dataUrl);
        setOriginalFile(file);
        setProcessedUserImageUrl(null);
        setGeneratedModelUrl(null);
        setError(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) handleFileSelect(e.target.files[0]);
  };

  const handleRemoveBackground = async () => {
    const source = userImageUrl || originalFile;
    if (!source) return;

    setIsRemovingBg(true);
    setError(null);
    try {
        const result = await removeBackground(source);
        setProcessedUserImageUrl(result);
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'ลบพื้นหลังไม่สำเร็จ'));
    } finally {
        setIsRemovingBg(false);
    }
  };

  const handleGenerateModel = async () => {
    // Prefer using the string Data URL (processed or original) to avoid File reading issues
    const source = processedUserImageUrl || userImageUrl || originalFile;
    if (!source) return;

    setIsGenerating(true);
    setError(null);
    try {
        const result = await generateModelImage(source);
        setGeneratedModelUrl(result);
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'สร้างโมเดลไม่สำเร็จ'));
    } finally {
        setIsGenerating(false);
    }
  };

  const reset = () => {
    setUserImageUrl(null);
    setOriginalFile(null);
    setProcessedUserImageUrl(null);
    setGeneratedModelUrl(null);
    setIsGenerating(false);
    setIsRemovingBg(false);
    setError(null);
  };

  const isWorking = isRemovingBg || isGenerating;

  return (
    <AnimatePresence mode="wait">
      {!userImageUrl ? (
        <motion.div
          key="uploader"
          className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 py-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
        >
          <div className="lg:w-1/2 text-center lg:text-left">
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 mb-8 text-[11px] font-bold tracking-widest uppercase bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100"
            >
              <Wand2Icon className="w-3 h-3" /> AI Fashion Studio by tongservo
            </motion.div>
            <h1 className="text-6xl md:text-7xl font-serif font-bold text-gray-900 leading-[1.1] mb-6">
              เปลี่ยนลุค <br /> <span className="text-indigo-600 italic">ให้สมบูรณ์แบบ</span>
            </h1>
            <p className="text-xl text-gray-500 mb-10 leading-relaxed font-light max-w-lg mx-auto lg:mx-0">
              สัมผัสประสบการณ์ห้องลองชุดเสมือนจริงที่แม่นยำที่สุด 
              สร้างโมเดลเต็มตัว 9:16 จากรูปถ่ายของคุณเอง
            </p>
            
            <div className="flex flex-col items-center lg:items-start gap-6">
              <label htmlFor="image-upload-start" className="w-full sm:w-auto px-12 py-5 text-lg font-bold text-white bg-gray-900 rounded-2xl cursor-pointer hover:bg-gray-800 transition-all shadow-2xl hover:-translate-y-1 active:scale-95 flex items-center justify-center group">
                <UploadCloudIcon className="w-6 h-6 mr-3 group-hover:animate-bounce" />
                อัปโหลดรูปภาพของคุณ
              </label>
              <input id="image-upload-start" type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              <div className="flex items-center gap-6 text-gray-400 text-xs">
                  <span className="flex items-center gap-1.5"><CheckCircleIcon className="w-4 h-4 text-green-500"/> Full Body 9:16</span>
                  <span className="flex items-center gap-1.5"><CheckCircleIcon className="w-4 h-4 text-green-500"/> Photorealistic AI</span>
              </div>
            </div>
          </div>
          
          <div className="w-full lg:w-[420px] relative">
            <div className="absolute -inset-10 bg-indigo-50/50 rounded-full blur-3xl -z-10 opacity-60"></div>
            <Compare
              firstImage="https://images.unsplash.com/photo-1610030469983-98e550d6193c?q=80&w=800&auto=format&fit=crop"
              secondImage="https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop"
              className="w-full aspect-[9/16] rounded-[2.5rem] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] border-[12px] border-white"
              autoplay={true}
              slideMode="hover"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="compare"
          className="w-full max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-center gap-12 lg:gap-20 py-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="md:w-1/2 text-center md:text-left">
            <h2 className="text-5xl font-serif font-bold text-gray-900 mb-4">
              {generatedModelUrl ? "โมเดลของคุณพร้อมแล้ว" : "ตรวจสอบรูปของคุณ"}
            </h2>
            <p className="text-lg text-gray-500 font-light mb-10">
              {generatedModelUrl 
                ? "AI ได้สร้างนายแบบ/นางแบบที่มีสัดส่วน 9:16 จากโครงสร้างเดิมของคุณ"
                : "แนะนำให้ 'ลบพื้นหลัง' ก่อนเพื่อให้ได้ผลลัพธ์ที่เนียนที่สุด"}
            </p>
            
            {(isRemovingBg || isGenerating) && (
              <div className="bg-indigo-50 p-8 rounded-3xl border border-indigo-100 mb-8">
                <div className="flex items-center gap-4 mb-4">
                  <Spinner className="w-6 h-6 border-indigo-600" />
                  <span className="text-xl font-bold text-indigo-900">
                    {isRemovingBg ? "กำลังลบพื้นหลัง..." : "กำลังเนรมิตโมเดล..."}
                  </span>
                </div>
                <div className="w-full bg-indigo-200/30 h-1.5 rounded-full overflow-hidden">
                    <motion.div className="bg-indigo-600 h-full" initial={{ width: "0%" }} animate={{ width: "95%" }} transition={{ duration: 15 }} />
                </div>
              </div>
            )}

            {!isWorking && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                {generatedModelUrl ? (
                  <>
                    <button onClick={reset} className="px-8 py-4 font-bold text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all">เปลี่ยนรูป</button>
                    <button onClick={() => onModelFinalized(generatedModelUrl)} className="px-10 py-4 font-bold text-white bg-indigo-600 rounded-2xl shadow-xl hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center justify-center gap-2">
                      เข้าสู่ห้องลองชุด <ChevronRightIcon className="w-5 h-5"/>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={reset} className="px-8 py-4 font-bold text-gray-500">ยกเลิก</button>
                    <button onClick={handleRemoveBackground} disabled={!!processedUserImageUrl} className="px-8 py-4 font-bold text-indigo-600 border-2 border-indigo-600 rounded-2xl hover:bg-indigo-50 disabled:opacity-50">ลบพื้นหลัง</button>
                    <button onClick={handleGenerateModel} className="px-10 py-4 font-bold text-white bg-gray-900 rounded-2xl shadow-xl hover:bg-gray-800 flex items-center gap-2">สร้างโมเดล AI</button>
                  </>
                )}
              </div>
            )}
            {error && <p className="text-red-500 mt-6 font-bold">{error}</p>}
          </div>

          <div className="md:w-1/2 flex justify-center">
             <Compare
                firstImage={userImageUrl}
                secondImage={generatedModelUrl || processedUserImageUrl || userImageUrl}
                className="w-[300px] h-[533px] sm:w-[360px] sm:h-[640px] rounded-[3rem] shadow-2xl border-[12px] border-white"
                slideMode="drag"
              />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartScreen;
    