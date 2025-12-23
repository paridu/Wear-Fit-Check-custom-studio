
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { RotateCcwIcon, ChevronLeftIcon, ChevronRightIcon, VideoIcon, PlayIcon, HeartIcon, DownloadIcon, XIcon, Settings2Icon, GridIcon, SquareIcon, Wand2Icon } from './icons';
import Spinner from './Spinner';
import { AnimatePresence, motion } from 'framer-motion';
import { OutfitLayer } from '../types';

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
  activeOutfitLayer?: OutfitLayer;
  onGenerateAllPoses: () => void;
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
  onSaveOutfit,
  activeOutfitLayer,
  onGenerateAllPoses
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
  
  const [viewMode, setViewMode] = useState<'single' | 'collage'>('single');

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

  // Check if we are currently generating missing poses
  const isGeneratingCollage = isLoading && loadingMessage.includes("ท่าทาง");
  
  return (
    <div className="w-full h-full flex flex-col p-4 relative animate-zoom-in group bg-gray-50/50">
      
      {/* Top Bar Controls */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2">
          <button 
              onClick={onStartOver}
              className="flex items-center justify-center bg-white border border-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-95 text-xs shadow-sm"
          >
              <RotateCcwIcon className="w-3.5 h-3.5 mr-2" />
              เริ่มใหม่
          </button>
      </div>

      <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
          {!isLoading && displayImageUrl && (
              <div className="flex gap-2" ref={downloadMenuRef}>
                 {/* View Toggle */}
                 <div className="bg-white border border-gray-200 rounded-full p-1 flex items-center shadow-sm mr-2">
                    <button 
                        onClick={() => setViewMode('single')}
                        className={`p-2 rounded-full transition-all ${viewMode === 'single' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        title="มุมมองเดี่ยว"
                    >
                        <SquareIcon className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setViewMode('collage')}
                        className={`p-2 rounded-full transition-all ${viewMode === 'collage' ? 'bg-gray-900 text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                        title="มุมมองคอลลาจ"
                    >
                        <GridIcon className="w-4 h-4" />
                    </button>
                 </div>

                  <button 
                    onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                    className="flex items-center justify-center bg-white border border-gray-200 text-gray-700 font-semibold py-2 px-4 rounded-full transition-all hover:bg-gray-50 hover:border-gray-300 active:scale-95 text-xs shadow-sm"
                  >
                    <DownloadIcon className="w-3.5 h-3.5 mr-2" />
                    ดาวน์โหลด
                  </button>

                  <AnimatePresence>
                    {showDownloadMenu && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-12 w-64 bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 overflow-hidden"
                      >
                         {/* Download Menu Content (Same as before) */}
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
                          <button onClick={executeDownload} disabled={isProcessingDownload} className="w-full py-2 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 hover:bg-indigo-700">
                            {isProcessingDownload ? <Spinner className="w-4 h-4 border-white/30 border-t-white" /> : <DownloadIcon className="w-4 h-4" />}
                            ดาวน์โหลดตอนนี้
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <button 
                    onClick={onSaveOutfit}
                    className="flex items-center justify-center bg-white border border-pink-200 text-pink-600 font-semibold py-2 px-4 rounded-full transition-all hover:bg-pink-50 hover:border-pink-300 active:scale-95 text-xs shadow-sm"
                  >
                    <HeartIcon className="w-3.5 h-3.5 mr-2 fill-pink-500" />
                    บันทึก
                  </button>
              </div>
          )}
      </div>

      {videoUrls.length > 0 && !isLoading && viewMode === 'single' && (
        <div className="absolute top-20 right-4 z-20 flex flex-col gap-2">
            <button 
                onClick={() => setActiveVideoIndex(null)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-sm border transition-all ${activeVideoIndex === null ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/80 text-gray-600 border-gray-200'}`}
            >
                ภาพนิ่ง
            </button>
            {videoUrls.map((_, i) => (
                <button 
                    key={i}
                    onClick={() => setActiveVideoIndex(i)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-sm border transition-all ${activeVideoIndex === i ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/80 text-gray-600 border-gray-200'}`}
                >
                    <PlayIcon className="w-2.5 h-2.5" />
                    วิดีโอ {i + 1}
                </button>
            ))}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-grow w-full h-full flex items-center justify-center overflow-hidden py-16 px-4">
        
        {/* SINGLE VIEW MODE */}
        {viewMode === 'single' && (
            <div className="relative aspect-[9/16] h-full max-h-full w-auto flex items-center justify-center">
                {displayImageUrl ? (
                <>
                    {activeVideoIndex !== null ? (
                        <video
                            key={videoUrls[activeVideoIndex]}
                            src={videoUrls[activeVideoIndex]}
                            autoPlay
                            loop
                            className="w-full h-full object-contain rounded-2xl shadow-2xl"
                        />
                    ) : (
                        <img
                            key={displayImageUrl}
                            src={displayImageUrl}
                            alt="Model"
                            className="w-full h-full object-contain transition-opacity duration-500 animate-fade-in rounded-2xl shadow-2xl bg-white"
                        />
                    )}
                </>
                ) : (
                    <div className="w-full h-full bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                    <Spinner />
                    <p className="text-sm font-serif text-gray-500 mt-4 px-4 text-center">กำลังเตรียมสตูดิโอ...</p>
                    </div>
                )}
                
                <AnimatePresence>
                {isLoading && !isGeneratingCollage && (
                    <motion.div
                        className="absolute inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-20 rounded-2xl border border-white/50"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <Spinner className="w-10 h-10 text-indigo-600" />
                        <motion.p 
                            key={currentDisplayMessage}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-base font-serif text-gray-800 mt-6 text-center px-8"
                        >
                            {currentDisplayMessage}
                        </motion.p>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        )}

        {/* COLLAGE VIEW MODE */}
        {viewMode === 'collage' && (
            <div className="w-full h-full max-w-4xl overflow-y-auto pr-2 custom-scrollbar">
                 <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pb-20">
                    {poseInstructions.map((pose, index) => {
                        const hasImage = activeOutfitLayer?.poseImages[pose];
                        const isCurrent = currentPoseIndex === index;
                        
                        return (
                            <div 
                                key={pose} 
                                className={`relative aspect-[9/16] rounded-xl overflow-hidden border transition-all cursor-pointer group ${isCurrent ? 'ring-2 ring-indigo-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'}`}
                                onClick={() => {
                                    onSelectPose(index);
                                    // Optionally switch back to single view on click? For now, let's keep in collage.
                                }}
                            >
                                {hasImage ? (
                                    <img src={hasImage} alt={pose} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-gray-50 flex flex-col items-center justify-center p-4 text-center">
                                        {isGeneratingCollage && index === currentPoseIndex ? (
                                            <div className="flex flex-col items-center">
                                                <Spinner className="w-6 h-6 text-indigo-500 mb-2"/>
                                                <span className="text-[10px] text-indigo-600 font-bold animate-pulse">กำลังสร้าง...</span>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-8 h-8 rounded-full bg-gray-200 mb-2" />
                                                <span className="text-[10px] text-gray-400">{pose}</span>
                                            </>
                                        )}
                                    </div>
                                )}
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-white text-[10px] font-medium">{pose}</p>
                                </div>
                            </div>
                        )
                    })}
                 </div>
                 
                 {/* Empty State / Call to Action in Collage */}
                 {!isGeneratingCollage && availablePoseKeys.length < poseInstructions.length && (
                     <div className="sticky bottom-4 flex justify-center w-full z-10">
                        <button 
                            onClick={onGenerateAllPoses}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-full shadow-xl font-bold flex items-center gap-2 hover:bg-indigo-700 hover:scale-105 transition-all text-sm"
                        >
                            <Wand2Icon className="w-4 h-4" />
                            Magic Generate All ({poseInstructions.length - availablePoseKeys.length} Remaining)
                        </button>
                     </div>
                 )}
            </div>
        )}
      </div>

      {/* Control bar (Only show in Single View) */}
      {viewMode === 'single' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4 transition-all duration-300 w-full px-4">
            {!isLoading && displayImageUrl && (
                <div className="flex items-center gap-2">
                    <div className="relative" ref={videoSettingsRef}>
                        <button 
                            onClick={() => setShowVideoSettings(!showVideoSettings)}
                            className="p-3.5 bg-white text-gray-700 rounded-full shadow-lg hover:bg-gray-50 transition-all border border-gray-200"
                            title="เลือก Video Engine"
                        >
                            <Settings2Icon className="w-5 h-5" />
                        </button>
                        
                        <AnimatePresence>
                            {showVideoSettings && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: -130, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute left-0 w-64 bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200 p-3"
                                >
                                    <h4 className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-2">Video Engine</h4>
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
                        {videoUrls.length === 0 ? "สร้างวิดีโอ" : "สร้างเพิ่ม"}
                    </button>
                </div>
            )}

            {displayImageUrl && !isLoading && (
                <div 
                className="flex items-center justify-center gap-2 bg-white/90 backdrop-blur-md rounded-full p-1.5 border border-gray-200 shadow-xl"
                onMouseEnter={() => setIsPoseMenuOpen(true)}
                onMouseLeave={() => setIsPoseMenuOpen(false)}
                >
                <AnimatePresence>
                    {isPoseMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full mb-3 w-64 bg-white/95 backdrop-blur-lg rounded-xl p-2 border border-gray-200 shadow-2xl"
                        >
                            <div className="grid grid-cols-1 gap-1">
                                {poseInstructions.map((pose, index) => (
                                    <button
                                        key={pose}
                                        onClick={() => onSelectPose(index)}
                                        disabled={isLoading || index === currentPoseIndex}
                                        className={`w-full text-left text-xs font-medium p-2 rounded-lg flex justify-between items-center ${index === currentPoseIndex ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        {pose}
                                        {activeOutfitLayer?.poseImages[pose] && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                <button 
                    onClick={handlePreviousPose}
                    className="p-2.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-50"
                    disabled={isLoading}
                >
                    <ChevronLeftIcon className="w-5 h-5 text-gray-800" />
                </button>
                <div className="flex flex-col items-center justify-center w-40 px-2 cursor-pointer" onClick={() => setIsPoseMenuOpen(!isPoseMenuOpen)}>
                    <span className="text-xs font-bold text-gray-800 truncate w-full text-center">{poseInstructions[currentPoseIndex]}</span>
                    <span className="text-[9px] text-gray-500">{availablePoseKeys.length}/{poseInstructions.length} Poses</span>
                </div>
                <button 
                    onClick={handleNextPose}
                    className="p-2.5 rounded-full hover:bg-gray-100 active:scale-90 transition-all disabled:opacity-50"
                    disabled={isLoading}
                >
                    <ChevronRightIcon className="w-5 h-5 text-gray-800" />
                </button>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default Canvas;
