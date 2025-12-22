
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UploadCloudIcon, Wand2Icon } from './icons';
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
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  const handleRemoveBackground = async () => {
    if (!userImageUrl || !originalFile) return;
    setIsRemovingBg(true);
    setError(null);
    try {
        const result = await removeBackground(originalFile);
        setProcessedUserImageUrl(result);
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'ลบพื้นหลังไม่สำเร็จ'));
    } finally {
        setIsRemovingBg(false);
    }
  };

  const handleGenerateModel = async () => {
    const source = processedUserImageUrl || originalFile;
    if (!source) return;

    setIsGenerating(true);
    setError(null);
    try {
        const result = await generateModelImage(source);
        setGeneratedModelUrl(result);
    } catch (err) {
        setError(getFriendlyErrorMessage(err, 'สร้างนางแบบ/นายแบบไม่สำเร็จ'));
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

  const screenVariants = {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
  };

  const isWorking = isRemovingBg || isGenerating;

  return (
    <AnimatePresence mode="wait">
      {!userImageUrl ? (
        <motion.div
          key="uploader"
          className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="lg:w-1/2 flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="max-w-lg">
              <h1 className="text-5xl md:text-6xl font-serif font-bold text-gray-900 leading-tight">
                สร้างนางแบบเสมือนจริงในสไตล์คุณ
              </h1>
              <p className="mt-4 text-lg text-gray-600">
                เคยสงสัยไหมว่าชุดนี้จะเข้ากับคุณไหม? ไม่ต้องเดาอีกต่อไป เพียงอัปโหลดรูปภาพของคุณ แล้ว AI จะสร้างโมเดลส่วนตัวให้คุณลองชุดได้ทันที
              </p>
              <hr className="my-8 border-gray-200" />
              <div className="flex flex-col items-center lg:items-start w-full gap-3">
                <label htmlFor="image-upload-start" className="w-full relative flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-gray-900 rounded-md cursor-pointer group hover:bg-gray-700 transition-colors">
                  <UploadCloudIcon className="w-5 h-5 mr-3" />
                  อัปโหลดรูปภาพของคุณ
                </label>
                <input id="image-upload-start" type="file" className="hidden" accept="image/png, image/jpeg, image/webp, image/avif, image/heic, image/heif" onChange={handleFileChange} />
                <p className="text-gray-500 text-sm">เลือกรูปภาพที่เห็นเต็มตัวและชัดเจน เพื่อผลลัพธ์ที่ดีที่สุด</p>
                <p className="text-gray-500 text-xs mt-1">การอัปโหลดรูปภาพแสดงว่าคุณยอมรับข้อตกลงในการใช้งานอย่างสร้างสรรค์และรับผิดชอบ</p>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
            </div>
          </div>
          <div className="w-full lg:w-1/2 flex flex-col items-center justify-center">
            <Compare
              firstImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon.jpg"
              secondImage="https://storage.googleapis.com/gemini-95-icons/asr-tryon-model.png"
              slideMode="drag"
              className="w-full max-w-sm aspect-[2/3] rounded-2xl bg-gray-200"
            />
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="compare"
          className="w-full max-w-6xl mx-auto h-full flex flex-col md:flex-row items-center justify-center gap-8 md:gap-12"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="md:w-1/2 flex-shrink-0 flex flex-col items-center md:items-start">
            <div className="text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 leading-tight">
                {generatedModelUrl ? "นางแบบ/นายแบบของคุณ" : "ปรับปรุงรูปภาพ"}
              </h1>
              <p className="mt-2 text-md text-gray-600">
                {generatedModelUrl 
                  ? "เลื่อนแถบเพื่อดูการเปลี่ยนแปลงของคุณให้เป็นนางแบบมืออาชีพ"
                  : "ตรวจสอบรูปภาพของคุณด้านล่าง คุณสามารถลบพื้นหลังออกเพื่อผลลัพธ์ที่ดียิ่งขึ้น"}
              </p>
            </div>
            
            {(isRemovingBg || isGenerating) && (
              <div className="flex items-center gap-3 text-lg text-gray-700 font-serif mt-6">
                <Spinner />
                <span>{isRemovingBg ? "กำลังลบพื้นหลัง..." : "กำลังสร้างโมเดลของคุณ..."}</span>
              </div>
            )}

            {error && 
              <div className="text-center md:text-left text-red-600 max-w-md mt-6">
                <p className="font-bold">ดำเนินการไม่สำเร็จ</p>
                <p className="text-sm mb-4">{error}</p>
                <button onClick={reset} className="text-sm font-semibold text-gray-700 hover:underline">ลองใหม่อีกครั้ง</button>
              </div>
            }
            
            <AnimatePresence>
              {!isWorking && !error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.5 }}
                  className="flex flex-col sm:flex-row items-center gap-4 mt-8 w-full"
                >
                  {generatedModelUrl ? (
                    <>
                      <button 
                        onClick={reset}
                        className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-700 bg-gray-200 rounded-md cursor-pointer hover:bg-gray-300 transition-colors"
                      >
                        เปลี่ยนรูปภาพ
                      </button>
                      <button 
                        onClick={() => onModelFinalized(generatedModelUrl)}
                        className="w-full sm:w-auto relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-gray-900 rounded-md cursor-pointer group hover:bg-gray-700 transition-colors"
                      >
                        ไปที่การแต่งตัว &rarr;
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={reset}
                        className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-700 bg-gray-200 rounded-md cursor-pointer hover:bg-gray-300 transition-colors"
                      >
                        ยกเลิก
                      </button>
                      {!processedUserImageUrl && (
                        <button 
                            onClick={handleRemoveBackground}
                            className="w-full sm:w-auto px-6 py-3 text-base font-semibold text-gray-800 border-2 border-gray-900 rounded-md cursor-pointer hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Wand2Icon className="w-4 h-4" />
                            ลบพื้นหลัง
                        </button>
                      )}
                      <button 
                        onClick={handleGenerateModel}
                        className="w-full sm:w-auto relative inline-flex items-center justify-center px-8 py-3 text-base font-semibold text-white bg-gray-900 rounded-md cursor-pointer group hover:bg-gray-700 transition-colors"
                      >
                        สร้างโมเดล &rarr;
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="md:w-1/2 w-full flex items-center justify-center">
            <div 
              className={`relative rounded-[1.25rem] transition-all duration-700 ease-in-out ${isWorking ? 'border border-gray-300 animate-pulse' : 'border border-transparent'}`}
            >
              <Compare
                firstImage={userImageUrl}
                secondImage={generatedModelUrl || processedUserImageUrl || userImageUrl}
                slideMode="drag"
                className="w-[280px] h-[420px] sm:w-[320px] sm:h-[480px] lg:w-[400px] lg:h-[600px] rounded-2xl bg-gray-200"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StartScreen;
