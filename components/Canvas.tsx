
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon, VideoIcon, PlayIcon, HeartIcon, DownloadIcon, XIcon, Settings2Icon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';

export type VideoModelType = 'veo-3.1-fast-generate-preview' | 'veo-3.1-generate-preview';

interface CanvasProps {
  displayImageUrl: string | null;
  onStartOver: () => void;
  isLoading: boolean;
  loadingMessage: string;
  onSelectPose: (index: number) => void;
  poseInstructions: string[];
  currentPoseIndex: number;
  availablePoseKeys: string[];
  videoUrls: string[];
  onGenerateVideo: (model: VideoModelType) => void;
  onSaveOutfit: () => void;
}

const VIDEO_LOADING_MESSAGES = [
  "กำลังจัดเตรียมรันเวย์...",
  "กำลังปรับแต่งการเคลื่อนไหวของเนื้อผ้า...",
  "กำลังจัดแสงไฟในสตูดิโอ...",
  "กำลังประมวลผลวิดีโอระดับภาพยนตร์...",
  "กำลังใส่ฟิลเตอร์แฟชั่น..."
];

const Canvas: React.FC<CanvasProps> = ({ 
  displayImageUrl, 
  onStartOver, 
  isLoading, 
  loadingMessage, 
  onSelectPose, 
  poseInstructions, 
  currentPoseIndex, 
  availablePoseKeys,
  videoUrls,
  onGenerateVideo,
  onSaveOutfit
}) => {
  const [isPoseMenuOpen, setIsPoseMenuOpen] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState<number | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [showVideoSettings, setShowVideoSettings] = useState(false);
  const [selectedVideoModel, setSelectedVideoModel] = useState<VideoModelType>('veo-3.1-fast-generate-preview');
  
  const [downloadFormat, setDownloadFormat] = useState<'png' | 'jpeg'>('png');
  const [downloadQuality, setDownloadQuality] = useState<'high' | 'standard'>('high');
  const [isProcessingDownload, setIsProcessingDownload] = useState(false);
  
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const videoSettingsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isLoading && loadingMessage.includes("วิดีโอ")) {
      interval = setInterval(() => {
        setMessageIndex((prev) => (prev + 1) % VIDEO_LOADING_MESSAGES.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLoading, loadingMessage]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
      if (videoSettingsRef.current && !videoSettingsRef.current.contains(event.target as Node)) {
        setShowVideoSettings(false);
      }
    };
    if (showDownloadMenu || showVideoSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDownloadMenu, showVideoSettings]);
  
  const handlePreviousPose = () => {
    if (isLoading || availablePoseKeys.length <= 1) return;
    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);
    if (currentIndexInAvailable === -1) {
        onSelectPose((currentPoseIndex - 1 + poseInstructions.length) % poseInstructions.length);
        return;
    }
    const prevIndexInAvailable = (currentIndexInAvailable - 1 + availablePoseKeys.length) % availablePoseKeys.length;
    const prevPoseInstruction = availablePoseKeys[prevIndexInAvailable];
    const newGlobalPoseIndex = poseInstructions.indexOf(prevPoseInstruction);
    if (newGlobalPoseIndex !== -1) {
        onSelectPose(newGlobalPoseIndex);
    }
    setActiveVideoIndex(null);
  };

  const handleNextPose = () => {
    if (isLoading) return;
    const currentPoseInstruction = poseInstructions[currentPoseIndex];
    const currentIndexInAvailable = availablePoseKeys.indexOf(currentPoseInstruction);
    if (currentIndexInAvailable === -1 || availablePoseKeys.length === 0) {
        onSelectPose((currentPoseIndex + 1) % poseInstructions.length);
        return;
    }
    const nextIndexInAvailable = currentIndexInAvailable + 1;
    if (nextIndexInAvailable < availablePoseKeys.length) {
        const nextPoseInstruction = availablePoseKeys[nextIndexInAvailable];
        const newGlobalPoseIndex = poseInstructions.indexOf(nextPoseInstruction);
        if (newGlobalPoseIndex !== -1) onSelectPose(newGlobalPoseIndex);
    } else {
        const newGlobalPoseIndex = (currentPoseIndex + 1) % poseInstructions.length;
        onSelectPose(newGlobalPoseIndex);
    }
    setActiveVideoIndex(null);
  };

  const executeDownload = async () => {
    if (!displayImageUrl) return;
    setIsProcessingDownload(true);

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = displayImageUrl;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error("Canvas context error");

      let scale = downloadQuality === 'high' ? 1 : 0.6;
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const mimeType = `image/${downloadFormat}`;
      const dataUrl = canvas.toDataURL(mimeType, downloadFormat === 'jpeg' ? 0.9 : undefined);

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `wear-fit-outfit-${Date.now()}.${downloadFormat}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setShowDownloadMenu(false);
    } catch (err) {
      console.error("Download failed", err);
    } finally {
      setIsProcessingDownload(false);
    }
  };

  const currentDisplayMessage = useMemo(() => {
    if (loadingMessage.includes("วิดีโอ")) return VIDEO_LOADING_MESSAGES[messageIndex];
    return loadingMessage;
  }, [loadingMessage, messageIndex]);
  
  return (
    <div className="w-full h-full flex items-center justify-center p-4 relative animate-zoom-in group">
      <button 
          onClick={onStartOver}
          className="absolute top-4 left-4 z-30 flex items-center justify-center bg-white/60 border border-gray-300/80 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all hover:bg-white hover:border-gray-400 active:scale-95 text-sm backdrop-blur-sm shadow-sm"
      >
          <RotateCcwIcon className="w-4 h-4 mr-2" />
          เริ่มใหม่
      </button>

      {/* Export Group Buttons */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          {!isLoading && displayImageUrl && (
              <div className="relative flex gap-2" ref={downloadMenuRef}>
                  <button 
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center justify-center bg-white/60 border border-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all hover:bg-white hover:border-gray-400 active:scale-95 text-sm backdrop-blur-sm shadow-sm"
                  >
                    <DownloadIcon className="w-4 h-4 mr-2" />
                    ดาวน์โหลดรูป
                  </button>

                  <AnimatePresence>
                    {showDownloadMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-12 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 p-4 z-50 overflow-hidden"
                      >
                        <div className="space-y-4">
                          <div className="flex justify-between items-center border-b pb-2">
                            <h3 className="font-bold text-gray-900 text-sm">ตั้งค่าการดาวน์โหลด</h3>
                            <button onClick={() => setShowDownloadMenu(false)}>
                              <XIcon className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                            </button>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">รูปแบบไฟล์</label>
                            <div className="flex gap-2">
                              {['png', 'jpeg'].map((format) => (
                                <button
                                  key={format}
                                  onClick={() => setDownloadFormat(format as any)}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${downloadFormat === format ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                                >
                                  {format.toUpperCase()}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">ความละเอียด</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setDownloadQuality('high')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${downloadQuality === 'high' ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                              >
                                สูงสุด (HD)
                              </button>
                              <button
                                onClick={() => setDownloadQuality('standard')}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${downloadQuality === 'standard' ? 'bg-gray-900 text-white border-gray-900 shadow-md' : 'bg-white text-gray-600 border-gray-200'}`}
                              >
                                มาตรฐาน
                              </button>
                            </div>
                          </div>
                          <button onClick={executeDownload} disabled={isProcessingDownload} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2">
                            {isProcessingDownload ? <Spinner className="w-4 h-4 border-white/30 border-t-white" /> : <DownloadIcon className="w-4 h-4" />}
                            ดาวน์โหลดตอนนี้
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button 
                    onClick={onSaveOutfit}
                    className="flex items-center justify-center bg-white/60 border border-pink-200 text-pink-600 font-semibold py-2 px-4 rounded-full transition-all hover:bg-pink-50 hover:border-pink-300 active:scale-95 text-sm backdrop-blur-sm shadow-sm"
                  >
                    <HeartIcon className="w-4 h-4 mr-2 fill-pink-500" />
                    บันทึกชุดนี้
                  </button>
              </div>
          )}
      </div>

      {videoUrls.length > 0 && !isLoading && (
        <div className="absolute top-16 right-4 z-30 flex flex-col gap-2">
            <button 
                onClick={() => setActiveVideoIndex(null)}
                className={`px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm border transition-all ${activeVideoIndex === null ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/60 text-gray-700 border-gray-300'}`}
            >
                ภาพนิ่ง
            </button>
            {videoUrls.map((_, i) => (
                <button 
                    key={i}
                    onClick={() => setActiveVideoIndex(i)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold backdrop-blur-sm border transition-all ${activeVideoIndex === i ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/60 text-gray-700 border-gray-300'}`}
                >
                    <PlayIcon className="w-3 h-3" />
                    วิดีโอคลิป {i + 1}
                </button>
            ))}
        </div>
      )}

      <div className="relative w-full h-full flex items-center justify-center">
        {displayImageUrl ? (
          <>
            {activeVideoIndex !== null ? (
                <video
                    key={videoUrls[activeVideoIndex]}
                    src={videoUrls[activeVideoIndex]}
                    autoPlay
                    loop
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
                />
            ) : (
                <img
                    key={displayImageUrl}
                    src={displayImageUrl}
                    alt="Model"
                    className="max-w-full max-h-full object-contain transition-opacity duration-500 animate-fade-in rounded-lg shadow-lg"
                />
            )}
          </>
        ) : (
            <div className="w-[400px] h-[600px] bg-gray-100 border border-gray-200 rounded-lg flex flex-col items-center justify-center">
              <Spinner />
              <p className="text-md font-serif text-gray-600 mt-4">กำลังโหลดนางแบบ...</p>
            </div>
        )}
        
        <AnimatePresence>
          {isLoading && (
              <motion.div
                  className="absolute inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center z-20 rounded-lg"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
              >
                  <Spinner />
                  <motion.p 
                    key={currentDisplayMessage}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-lg font-serif text-gray-700 mt-6 text-center px-8"
                  >
                    {currentDisplayMessage}
                  </motion.p>
                  {loadingMessage.includes("วิดีโอ") && (
                    <p className="text-xs text-gray-500 mt-2 italic">การสร้างวิดีโออาจใช้เวลาประมาณ 1-3 นาที</p>
                  )}
              </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Control bar */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4 transition-all duration-300 w-full px-4">
        {!isLoading && displayImageUrl && (
            <div className="flex items-center gap-2">
                <div className="relative" ref={videoSettingsRef}>
                    <button 
                        onClick={() => setShowVideoSettings(!showVideoSettings)}
                        className="p-3.5 bg-gray-100 text-gray-700 rounded-full shadow-lg hover:bg-gray-200 transition-all border border-gray-300"
                        title="เลือก Video Engine"
                    >
                        <Settings2Icon className="w-6 h-6" />
                    </button>
                    
                    <AnimatePresence>
                        {showVideoSettings && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: -130, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute left-0 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 p-3"
                            >
                                <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Video Engine (Model)</h4>
                                <div className="space-y-1">
                                    <button 
                                        onClick={() => { setSelectedVideoModel('veo-3.1-fast-generate-preview'); setShowVideoSettings(false); }}
                                        className={`w-full text-left p-2 rounded-lg text-xs transition-all ${selectedVideoModel === 'veo-3.1-fast-generate-preview' ? 'bg-indigo-50 border border-indigo-200 font-bold' : 'hover:bg-gray-100'}`}
                                    >
                                        <div className="flex justify-between"><span>Veo 3.1 Fast</span><span className="text-[10px] text-green-600">รวดเร็ว</span></div>
                                        <p className="text-[10px] text-gray-400 font-normal">ประมวลผลไว เหมาะสำหรับทดสอบท่าทาง</p>
                                    </button>
                                    <button 
                                        onClick={() => { setSelectedVideoModel('veo-3.1-generate-preview'); setShowVideoSettings(false); }}
                                        className={`w-full text-left p-2 rounded-lg text-xs transition-all ${selectedVideoModel === 'veo-3.1-generate-preview' ? 'bg-indigo-50 border border-indigo-200 font-bold' : 'hover:bg-gray-100'}`}
                                    >
                                        <div className="flex justify-between"><span>Veo 3.1 Pro</span><span className="text-[10px] text-indigo-600">HQ</span></div>
                                        <p className="text-[10px] text-gray-400 font-normal">คุณภาพสูงสุด Cinematic และสมจริงกว่า</p>
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <button 
                    onClick={() => onGenerateVideo(selectedVideoModel)}
                    disabled={videoUrls.length >= 2}
                    className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-full font-bold shadow-2xl hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50 disabled:bg-gray-400 text-base"
                >
                    <VideoIcon className="w-5 h-5" />
                    {videoUrls.length === 0 ? "สร้างวิดีโอแฟชั่น" : "สร้างคลิปเพิ่ม"}
                </button>
            </div>
        )}

        {displayImageUrl && !isLoading && (
            <div 
            className="flex items-center justify-center gap-2 bg-white/90 backdrop-blur-md rounded-full p-2 border border-gray-300/50 shadow-xl"
            onMouseEnter={() => setIsPoseMenuOpen(true)}
            onMouseLeave={() => setIsPoseMenuOpen(false)}
            >
            <AnimatePresence>
                {isPoseMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full mb-3 w-64 bg-white/95 backdrop-blur-lg rounded-xl p-2 border border-gray-200/80 shadow-2xl"
                    >
                        <div className="grid grid-cols-2 gap-2">
                            {poseInstructions.map((pose, index) => (
                                <button
                                    key={pose}
                                    onClick={() => onSelectPose(index)}
                                    disabled={isLoading || index === currentPoseIndex}
                                    className="w-full text-left text-xs font-medium text-gray-800 p-2 rounded-md hover:bg-gray-200/70 disabled:font-bold disabled:bg-indigo-50"
                                >
                                    {pose}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            
            <button 
                onClick={handlePreviousPose}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-50"
                disabled={isLoading}
            >
                <ChevronLeftIcon className="w-5 h-5 text-gray-800" />
            </button>
            <button 
                className="text-sm font-semibold text-gray-800 w-40 text-center truncate px-2"
                onClick={() => setIsPoseMenuOpen(!isPoseMenuOpen)}
            >
                {poseInstructions[currentPoseIndex]}
            </button>
            <button 
                onClick={handleNextPose}
                className="p-2 rounded-full hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-50"
                disabled={isLoading}
            >
                <ChevronRightIcon className="w-5 h-5 text-gray-800" />
            </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default Canvas;
