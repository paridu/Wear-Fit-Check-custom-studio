
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const REMIX_SUGGESTIONS = [
  "ไอเดีย: ลองสร้างลุคที่ใช้ร่วมกับกระเป๋าใบโปรดของคุณ",
  "ไอเดีย: ใช้ AI Generate เพื่อค้นหาเสื้อผ้าสไตล์ใหม่ๆ",
  "ไอเดีย: ลองเปลี่ยนท่าทางเพื่อดูการทิ้งตัวของผ้าในมุมต่างๆ",
  "ไอเดีย: บันทึกชุดที่คุณชอบไว้ในคอลเลกชันส่วนตัว",
  "ไอเดีย: สร้างวิดีโอเพื่อดูความสมจริงของการเคลื่อนไหว",
  "ไอเดีย: มิกซ์แอนด์แมทช์เครื่องประดับให้เข้ากับชุดทางการ",
];

interface FooterProps {
  isOnDressingScreen?: boolean;
}

const Footer: React.FC<FooterProps> = ({ isOnDressingScreen = false }) => {
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIndex((prevIndex) => (prevIndex + 1) % REMIX_SUGGESTIONS.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className={`fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 p-3 z-50 ${isOnDressingScreen ? 'hidden sm:block' : ''}`}>
      <div className="mx-auto flex flex-col sm:flex-row items-center justify-between text-[11px] text-gray-500 max-w-7xl px-4">
        <div className="flex items-center gap-2">
          <p className="font-medium">Created by <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">tongservo</span></p>
          <span className="text-gray-300">|</span>
          <p>Powered by Gemini 2.5</p>
        </div>
        <div className="h-4 mt-1 sm:mt-0 flex items-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.p
                key={suggestionIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center sm:text-right font-medium text-gray-400 italic"
              >
                {REMIX_SUGGESTIONS[suggestionIndex]}
              </motion.p>
            </AnimatePresence>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
