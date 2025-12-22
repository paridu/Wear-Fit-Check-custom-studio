
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import StartScreen from './components/StartScreen';
import Canvas, { VideoModelType } from './components/Canvas';
import WardrobePanel from './components/WardrobeModal';
import OutfitStack from './components/OutfitStack';
import SavedOutfits from './components/SavedOutfits';
import { generateVirtualTryOnImage, generatePoseVariation, generateVideo } from './services/geminiService';
import { OutfitLayer, WardrobeItem, SavedOutfit } from './types';
import { ChevronDownIcon, ChevronUpIcon } from './components/icons';
import { defaultWardrobe } from './wardrobe';
import Footer from './components/Footer';
import { getFriendlyErrorMessage } from './lib/utils';
import Spinner from './components/Spinner';

const POSE_INSTRUCTIONS = [
  "ยืนตัวตรง มือวางข้างลำตัว",
  "หันข้างเล็กน้อย 45 องศา",
  "หันข้างเต็มตัว",
  "กระโดดในอากาศ ท่าแอคชั่น",
  "กำลังเดินเข้าหาหน้าจอ",
  "พิงกำแพงแบบเท่ๆ",
];

const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => setMatches(event.matches);
    mediaQueryList.addEventListener('change', listener);
    if (mediaQueryList.matches !== matches) {
      setMatches(mediaQueryList.matches);
    }
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query, matches]);

  return matches;
};


const App: React.FC = () => {
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [outfitHistory, setOutfitHistory] = useState<OutfitLayer[]>([]);
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [currentPoseIndex, setCurrentPoseIndex] = useState(0);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [wardrobe, setWardrobe] = useState<WardrobeItem[]>(defaultWardrobe);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);

  const isMobile = useMediaQuery('(max-width: 767px)');

  // โหลดข้อมูลชุดที่บันทึกไว้จาก localStorage เมื่อเริ่มแอป
  useEffect(() => {
    const stored = localStorage.getItem('wear-fit-saved-outfits');
    if (stored) {
      try {
        setSavedOutfits(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to load saved outfits", e);
      }
    }
  }, []);

  // บันทึกข้อมูลลง localStorage เมื่อมีการเปลี่ยนแปลง
  useEffect(() => {
    localStorage.setItem('wear-fit-saved-outfits', JSON.stringify(savedOutfits));
  }, [savedOutfits]);

  const activeOutfitLayers = useMemo(() => 
    outfitHistory.slice(0, currentOutfitIndex + 1), 
    [outfitHistory, currentOutfitIndex]
  );
  
  const activeGarmentIds = useMemo(() => 
    activeOutfitLayers.map(layer => layer.garment?.id).filter(Boolean) as string[], 
    [activeOutfitLayers]
  );
  
  const displayImageUrl = useMemo(() => {
    if (outfitHistory.length === 0) return modelImageUrl;
    const currentLayer = outfitHistory[currentOutfitIndex];
    if (!currentLayer) return modelImageUrl;

    const poseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
    return currentLayer.poseImages[poseInstruction] ?? Object.values(currentLayer.poseImages)[0];
  }, [outfitHistory, currentOutfitIndex, currentPoseIndex, modelImageUrl]);

  const availablePoseKeys = useMemo(() => {
    if (outfitHistory.length === 0) return [];
    const currentLayer = outfitHistory[currentOutfitIndex];
    return currentLayer ? Object.keys(currentLayer.poseImages) : [];
  }, [outfitHistory, currentOutfitIndex]);

  const handleModelFinalized = (url: string) => {
    setModelImageUrl(url);
    setOutfitHistory([{
      garment: null,
      poseImages: { [POSE_INSTRUCTIONS[0]]: url }
    }]);
    setCurrentOutfitIndex(0);
  };

  const handleStartOver = () => {
    setModelImageUrl(null);
    setOutfitHistory([]);
    setCurrentOutfitIndex(0);
    setIsLoading(false);
    setLoadingMessage('');
    setError(null);
    setCurrentPoseIndex(0);
    setIsSheetCollapsed(false);
    setWardrobe(defaultWardrobe);
    setVideoUrls([]);
  };

  const handleGarmentSelect = useCallback(async (garmentFile: File, garmentInfo: WardrobeItem) => {
    if (!displayImageUrl || isLoading) return;

    const nextLayer = outfitHistory[currentOutfitIndex + 1];
    if (nextLayer && nextLayer.garment?.id === garmentInfo.id) {
        setCurrentOutfitIndex(prev => prev + 1);
        setCurrentPoseIndex(0);
        return;
    }

    setError(null);
    setIsLoading(true);
    const actionText = garmentInfo.category === 'accessory' ? 'เพิ่มเครื่องประดับ' : 'ลองชุด';
    setLoadingMessage(`กำลัง${actionText} ${garmentInfo.name}...`);

    try {
      const newImageUrl = await generateVirtualTryOnImage(displayImageUrl!, garmentFile);
      const currentPoseInstruction = POSE_INSTRUCTIONS[currentPoseIndex];
      
      const newLayer: OutfitLayer = { 
        garment: garmentInfo, 
        poseImages: { [currentPoseInstruction]: newImageUrl } 
      };

      setOutfitHistory(prevHistory => {
        const newHistory = prevHistory.slice(0, currentOutfitIndex + 1);
        return [...newHistory, newLayer];
      });
      setCurrentOutfitIndex(prev => prev + 1);
      
      setWardrobe(prev => {
        if (prev.find(item => item.id === garmentInfo.id)) {
            return prev;
        }
        return [...prev, garmentInfo];
      });
      setVideoUrls([]);
    } catch (err: unknown) {
      // Fix: Pass unknown error directly to getFriendlyErrorMessage
      setError(getFriendlyErrorMessage(err, 'ไม่สามารถใช้ไอเทมนี้ได้'));
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [displayImageUrl, isLoading, currentPoseIndex, outfitHistory, currentOutfitIndex]);

  const handleRemoveLastGarment = () => {
    if (currentOutfitIndex > 0) {
      setCurrentOutfitIndex(prevIndex => prevIndex - 1);
      setCurrentPoseIndex(0);
      setVideoUrls([]);
    }
  };
  
  const handlePoseSelect = useCallback(async (newIndex: number) => {
    if (isLoading || outfitHistory.length === 0 || newIndex === currentPoseIndex) return;
    
    const poseInstruction = POSE_INSTRUCTIONS[newIndex];
    const currentLayer = outfitHistory[currentOutfitIndex];

    if (currentLayer.poseImages[poseInstruction]) {
      setCurrentPoseIndex(newIndex);
      return;
    }

    const baseImageForPoseChange = Object.values(currentLayer.poseImages)[0];
    if (!baseImageForPoseChange) return;

    setError(null);
    setIsLoading(true);
    setLoadingMessage(`กำลังเปลี่ยนท่าทาง...`);
    
    const prevPoseIndex = currentPoseIndex;
    setCurrentPoseIndex(newIndex);

    try {
      const newImageUrl = await generatePoseVariation(baseImageForPoseChange, poseInstruction);
      setOutfitHistory((prevHistory: OutfitLayer[]) => {
        const newHistory = [...prevHistory];
        const updatedLayer = { ...newHistory[currentOutfitIndex] };
        updatedLayer.poseImages = { ...updatedLayer.poseImages, [poseInstruction]: newImageUrl };
        newHistory[currentOutfitIndex] = updatedLayer;
        return newHistory;
      });
      setVideoUrls([]);
    } catch (err: unknown) {
      // Fix: Pass unknown error directly to getFriendlyErrorMessage
      setError(getFriendlyErrorMessage(err, 'ไม่สามารถเปลี่ยนท่าทางได้'));
      setCurrentPoseIndex(prevPoseIndex);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  }, [currentPoseIndex, outfitHistory, isLoading, currentOutfitIndex]);

  const handleGenerateVideo = async (model: VideoModelType) => {
    if (!displayImageUrl || isVideoLoading) return;

    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }

    setIsVideoLoading(true);
    setError(null);
    setLoadingMessage(`กำลังสร้างวิดีโอด้วย ${model === 'veo-3.1-generate-preview' ? 'Veo Pro' : 'Veo Fast'}...`);

    try {
      const videoUrl = await generateVideo(displayImageUrl as string, model);
      setVideoUrls(prev => [...prev, videoUrl].slice(-2));
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes("Requested entity was not found")) {
        await (window as any).aistudio.openSelectKey();
      }
      // Fix: Pass unknown error directly to getFriendlyErrorMessage
      setError(getFriendlyErrorMessage(err, 'ไม่สามารถสร้างวิดีโอได้'));
    } finally {
      setIsVideoLoading(false);
      setLoadingMessage('');
    }
  };

  const handleSaveOutfit = () => {
    if (!displayImageUrl) return;
    
    const currentItems = activeOutfitLayers
      .map(layer => layer.garment)
      .filter((item): item is WardrobeItem => item !== null);
    
    const newSaved: SavedOutfit = {
      id: `saved-${Date.now()}`,
      imageUrl: displayImageUrl,
      items: currentItems,
      timestamp: Date.now()
    };
    
    setSavedOutfits(prev => [newSaved, ...prev]);
  };

  const handleDeleteSavedOutfit = (id: string) => {
    setSavedOutfits(prev => prev.filter(o => o.id !== id));
  };

  const viewVariants = {
    initial: { opacity: 0, y: 15 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -15 },
  };

  return (
    <div className="font-sans">
      <AnimatePresence mode="wait">
        {!modelImageUrl ? (
          <motion.div
            key="start-screen"
            className="w-screen min-h-screen flex items-start sm:items-center justify-center bg-gray-50 p-4 pb-20"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <StartScreen onModelFinalized={handleModelFinalized} />
          </motion.div>
        ) : (
          <motion.div
            key="main-app"
            className="relative flex flex-col h-screen bg-white overflow-hidden"
            variants={viewVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            <main className="flex-grow relative flex flex-col md:flex-row overflow-hidden">
              <div className="w-full h-full flex-grow flex items-center justify-center bg-white pb-16 relative">
                <Canvas 
                  displayImageUrl={displayImageUrl}
                  onStartOver={handleStartOver}
                  isLoading={isLoading || isVideoLoading}
                  loadingMessage={loadingMessage}
                  onSelectPose={handlePoseSelect}
                  poseInstructions={POSE_INSTRUCTIONS}
                  currentPoseIndex={currentPoseIndex}
                  availablePoseKeys={availablePoseKeys}
                  videoUrls={videoUrls}
                  onGenerateVideo={handleGenerateVideo}
                  onSaveOutfit={handleSaveOutfit}
                />
              </div>

              <aside 
                className={`absolute md:relative md:flex-shrink-0 bottom-0 right-0 h-auto md:h-full w-full md:w-1/3 md:max-w-sm bg-white/80 backdrop-blur-md flex flex-col border-t md:border-t-0 md:border-l border-gray-200/60 transition-transform duration-500 ease-in-out ${isSheetCollapsed ? 'translate-y-[calc(100%-4.5rem)]' : 'translate-y-0'} md:translate-y-0 shadow-2xl md:shadow-none z-40`}
                style={{ transitionProperty: 'transform' }}
              >
                  <button 
                    onClick={() => setIsSheetCollapsed(!isSheetCollapsed)} 
                    className="md:hidden w-full h-8 flex items-center justify-center bg-gray-100/50"
                  >
                    {isSheetCollapsed ? <ChevronUpIcon className="w-6 h-6 text-gray-500" /> : <ChevronDownIcon className="w-6 h-6 text-gray-500" />}
                  </button>
                  <div className="p-4 md:p-6 pb-24 overflow-y-auto flex-grow flex flex-col gap-8">
                    {error && (
                      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md">
                        <p className="font-bold">ข้อผิดพลาด</p>
                        <p>{error}</p>
                      </div>
                    )}
                    <OutfitStack 
                      outfitHistory={activeOutfitLayers}
                      onRemoveLastGarment={handleRemoveLastGarment}
                    />
                    <WardrobePanel
                      onGarmentSelect={handleGarmentSelect}
                      activeGarmentIds={activeGarmentIds}
                      isLoading={isLoading || isVideoLoading}
                      wardrobe={wardrobe}
                    />
                    <SavedOutfits 
                      outfits={savedOutfits} 
                      onDelete={handleDeleteSavedOutfit}
                    />
                  </div>
              </aside>
            </main>
            <AnimatePresence>
              {(isLoading || isVideoLoading) && isMobile && (
                <motion.div
                  className="fixed inset-0 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <Spinner />
                  {loadingMessage && (
                    <p className="text-lg font-serif text-gray-700 mt-4 text-center px-4">{loadingMessage}</p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
      <Footer isOnDressingScreen={!!modelImageUrl} />
    </div>
  );
};

export default App;
