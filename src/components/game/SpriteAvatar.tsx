import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// 12 Kahoot-style cartoon animal characters
export const characterDesigns = [
  {
    name: 'Monty',
    animal: 'monkey',
    bodyColor: '#C4956A',
    faceColor: '#F5DEB3',
    accentColor: '#8B6914',
    earColor: '#C4956A',
    bgGradient: 'from-amber-400 to-orange-500'
  },
  {
    name: 'Pugsley',
    animal: 'pug',
    bodyColor: '#D4B896',
    faceColor: '#F5E6D3',
    accentColor: '#4A3728',
    earColor: '#B89B7D',
    bgGradient: 'from-amber-300 to-yellow-500'
  },
  {
    name: 'Oliver',
    animal: 'owl',
    bodyColor: '#D97706',
    faceColor: '#FEF3C7',
    accentColor: '#92400E',
    earColor: '#D97706',
    bgGradient: 'from-orange-400 to-amber-600'
  },
  {
    name: 'Leo',
    animal: 'lion',
    bodyColor: '#F59E0B',
    faceColor: '#FEF3C7',
    accentColor: '#D97706',
    earColor: '#F59E0B',
    bgGradient: 'from-yellow-400 to-orange-500'
  },
  {
    name: 'Tiggy',
    animal: 'tiger',
    bodyColor: '#FB923C',
    faceColor: '#FED7AA',
    accentColor: '#1F2937',
    earColor: '#FB923C',
    bgGradient: 'from-orange-400 to-red-500'
  },
  {
    name: 'Ellie',
    animal: 'elephant',
    bodyColor: '#9CA3AF',
    faceColor: '#D1D5DB',
    accentColor: '#6B7280',
    earColor: '#F9A8D4',
    bgGradient: 'from-gray-400 to-slate-500'
  },
  {
    name: 'Pandy',
    animal: 'panda',
    bodyColor: '#FFFFFF',
    faceColor: '#FFFFFF',
    accentColor: '#1F2937',
    earColor: '#1F2937',
    bgGradient: 'from-gray-100 to-gray-300'
  },
  {
    name: 'Penny',
    animal: 'penguin',
    bodyColor: '#1F2937',
    faceColor: '#FFFFFF',
    accentColor: '#F59E0B',
    earColor: '#1F2937',
    bgGradient: 'from-slate-600 to-gray-800'
  },
  {
    name: 'Teddy',
    animal: 'bear',
    bodyColor: '#F59E0B',
    faceColor: '#FDE68A',
    accentColor: '#92400E',
    earColor: '#F59E0B',
    bgGradient: 'from-amber-400 to-orange-500'
  },
  {
    name: 'Wolfie',
    animal: 'wolf',
    bodyColor: '#6B7280',
    faceColor: '#D1D5DB',
    accentColor: '#374151',
    earColor: '#6B7280',
    bgGradient: 'from-gray-400 to-slate-600'
  },
  {
    name: 'Piggy',
    animal: 'pig',
    bodyColor: '#FBCFE8',
    faceColor: '#FCE7F3',
    accentColor: '#EC4899',
    earColor: '#F9A8D4',
    bgGradient: 'from-pink-300 to-rose-400'
  },
  {
    name: 'Rocky',
    animal: 'raccoon',
    bodyColor: '#6B7280',
    faceColor: '#E5E7EB',
    accentColor: '#1F2937',
    earColor: '#6B7280',
    bgGradient: 'from-gray-500 to-slate-600'
  },
];

// Animated SVG-based animal face with idle animations
const AnimalFace = ({
  animal,
  bodyColor,
  faceColor,
  accentColor,
  earColor,
  size,
  animationSeed = 0,
}: {
  animal: string;
  bodyColor: string;
  faceColor: string;
  accentColor: string;
  earColor: string;
  size: number;
  animationSeed?: number;
}) => {
  const eyeSize = size * 0.18;
  const pupilSize = eyeSize * 0.6;

  // Unique animation delays based on seed for variety
  const blinkDelay = 2 + (animationSeed % 3);
  const earWiggleDelay = 1 + (animationSeed % 2);

  // Animals with wiggling ears
  const hasWigglyEars = ['pug', 'elephant', 'pig', 'bear', 'wolf', 'tiger'].includes(animal);

  return (
    <svg viewBox="0 0 100 100" className="w-full h-full">
      <defs>
        {/* Breathing animation */}
        <animate
          xlinkHref="#breathing-group"
          attributeName="transform"
          type="scale"
          values="1 1; 1.02 1.02; 1 1"
          dur="3s"
          repeatCount="indefinite"
        />
      </defs>

      <g id="breathing-group">
        {/* Left Ear with wiggle animation */}
        <g>
          {animal === 'monkey' && (
            <motion.g
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ duration: 2, repeat: Infinity, delay: earWiggleDelay }}
              style={{ originX: '12px', originY: '50px' }}
            >
              <circle cx="12" cy="50" r="18" fill={bodyColor} />
              <circle cx="12" cy="50" r="12" fill={faceColor} />
            </motion.g>
          )}
          {animal === 'pug' && (
            <motion.g
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: earWiggleDelay }}
              style={{ originX: '18px', originY: '35px' }}
            >
              <ellipse cx="18" cy="25" rx="12" ry="18" fill={accentColor} transform="rotate(-20 18 25)" />
            </motion.g>
          )}
          {animal === 'owl' && (
            <motion.g
              animate={{ y: [-1, 1, -1] }}
              transition={{ duration: 2, repeat: Infinity, delay: earWiggleDelay }}
            >
              <polygon points="20,15 35,45 5,45" fill={bodyColor} />
            </motion.g>
          )}
          {animal === 'lion' && (
            <>
              {/* Mane */}
              {[...Array(12)].map((_, i) => (
                <motion.circle
                  key={i}
                  cx={50 + 42 * Math.cos((i * 30 * Math.PI) / 180)}
                  cy={50 + 42 * Math.sin((i * 30 * Math.PI) / 180)}
                  r="12"
                  fill={accentColor}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, delay: i * 0.1 }}
                />
              ))}
              <circle cx="25" cy="20" r="10" fill={bodyColor} />
              <circle cx="75" cy="20" r="10" fill={bodyColor} />
            </>
          )}
          {animal === 'tiger' && (
            <motion.g
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: earWiggleDelay }}
              style={{ originX: '20px', originY: '30px' }}
            >
              <ellipse cx="20" cy="20" rx="15" ry="20" fill={bodyColor} />
              <ellipse cx="20" cy="20" rx="8" ry="12" fill={faceColor} />
            </motion.g>
          )}
          {animal === 'elephant' && (
            <motion.g
              animate={{ rotate: [-8, 8, -8], x: [-2, 2, -2] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: earWiggleDelay }}
              style={{ originX: '20px', originY: '50px' }}
            >
              <ellipse cx="10" cy="50" rx="20" ry="30" fill={bodyColor} />
              <ellipse cx="10" cy="50" rx="14" ry="22" fill={earColor} />
            </motion.g>
          )}
          {animal === 'panda' && (
            <motion.g
              animate={{ y: [-1, 1, -1] }}
              transition={{ duration: 2, repeat: Infinity, delay: earWiggleDelay }}
            >
              <circle cx="20" cy="22" r="16" fill={earColor} />
            </motion.g>
          )}
          {animal === 'penguin' && (
            <ellipse cx="50" cy="8" rx="8" ry="6" fill={bodyColor} />
          )}
          {animal === 'bear' && (
            <motion.g
              animate={{ rotate: [-4, 4, -4] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: earWiggleDelay }}
              style={{ originX: '22px', originY: '28px' }}
            >
              <circle cx="22" cy="20" r="14" fill={bodyColor} />
              <circle cx="22" cy="20" r="8" fill={accentColor} />
            </motion.g>
          )}
          {animal === 'wolf' && (
            <motion.g
              animate={{ rotate: [-4, 4, -4], y: [-1, 1, -1] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: earWiggleDelay }}
              style={{ originX: '20px', originY: '35px' }}
            >
              <polygon points="20,5 35,45 5,40" fill={bodyColor} />
              <polygon points="15,15 28,40 8,38" fill={earColor} />
            </motion.g>
          )}
          {animal === 'pig' && (
            <motion.g
              animate={{ rotate: [-6, 6, -6] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: earWiggleDelay }}
              style={{ originX: '18px', originY: '35px' }}
            >
              <ellipse cx="18" cy="25" rx="14" ry="18" fill={bodyColor} transform="rotate(-15 18 25)" />
            </motion.g>
          )}
          {animal === 'raccoon' && (
            <motion.g
              animate={{ rotate: [-3, 3, -3] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: earWiggleDelay }}
              style={{ originX: '18px', originY: '30px' }}
            >
              <polygon points="18,8 32,40 4,35" fill={bodyColor} />
            </motion.g>
          )}
        </g>

        {/* Right Ear with wiggle animation (opposite direction) */}
        <g>
          {animal === 'monkey' && (
            <motion.g
              animate={{ rotate: [2, -2, 2] }}
              transition={{ duration: 2, repeat: Infinity, delay: earWiggleDelay + 0.2 }}
              style={{ originX: '88px', originY: '50px' }}
            >
              <circle cx="88" cy="50" r="18" fill={bodyColor} />
              <circle cx="88" cy="50" r="12" fill={faceColor} />
            </motion.g>
          )}
          {animal === 'pug' && (
            <motion.g
              animate={{ rotate: [5, -5, 5] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: earWiggleDelay + 0.2 }}
              style={{ originX: '82px', originY: '35px' }}
            >
              <ellipse cx="82" cy="25" rx="12" ry="18" fill={accentColor} transform="rotate(20 82 25)" />
            </motion.g>
          )}
          {animal === 'owl' && (
            <motion.g
              animate={{ y: [1, -1, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: earWiggleDelay + 0.2 }}
            >
              <polygon points="80,15 95,45 65,45" fill={bodyColor} />
            </motion.g>
          )}
          {animal === 'tiger' && (
            <motion.g
              animate={{ rotate: [3, -3, 3] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: earWiggleDelay + 0.2 }}
              style={{ originX: '80px', originY: '30px' }}
            >
              <ellipse cx="80" cy="20" rx="15" ry="20" fill={bodyColor} />
              <ellipse cx="80" cy="20" rx="8" ry="12" fill={faceColor} />
            </motion.g>
          )}
          {animal === 'elephant' && (
            <motion.g
              animate={{ rotate: [8, -8, 8], x: [2, -2, 2] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: earWiggleDelay + 0.3 }}
              style={{ originX: '80px', originY: '50px' }}
            >
              <ellipse cx="90" cy="50" rx="20" ry="30" fill={bodyColor} />
              <ellipse cx="90" cy="50" rx="14" ry="22" fill={earColor} />
            </motion.g>
          )}
          {animal === 'panda' && (
            <motion.g
              animate={{ y: [1, -1, 1] }}
              transition={{ duration: 2, repeat: Infinity, delay: earWiggleDelay + 0.2 }}
            >
              <circle cx="80" cy="22" r="16" fill={earColor} />
            </motion.g>
          )}
          {animal === 'bear' && (
            <motion.g
              animate={{ rotate: [4, -4, 4] }}
              transition={{ duration: 1.6, repeat: Infinity, delay: earWiggleDelay + 0.2 }}
              style={{ originX: '78px', originY: '28px' }}
            >
              <circle cx="78" cy="20" r="14" fill={bodyColor} />
              <circle cx="78" cy="20" r="8" fill={accentColor} />
            </motion.g>
          )}
          {animal === 'wolf' && (
            <motion.g
              animate={{ rotate: [4, -4, 4], y: [1, -1, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, delay: earWiggleDelay + 0.2 }}
              style={{ originX: '80px', originY: '35px' }}
            >
              <polygon points="80,5 95,40 65,45" fill={bodyColor} />
              <polygon points="85,15 92,38 72,40" fill={earColor} />
            </motion.g>
          )}
          {animal === 'pig' && (
            <motion.g
              animate={{ rotate: [6, -6, 6] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: earWiggleDelay + 0.2 }}
              style={{ originX: '82px', originY: '35px' }}
            >
              <ellipse cx="82" cy="25" rx="14" ry="18" fill={bodyColor} transform="rotate(15 82 25)" />
            </motion.g>
          )}
          {animal === 'raccoon' && (
            <motion.g
              animate={{ rotate: [3, -3, 3] }}
              transition={{ duration: 1.8, repeat: Infinity, delay: earWiggleDelay + 0.2 }}
              style={{ originX: '82px', originY: '30px' }}
            >
              <polygon points="82,8 96,35 68,40" fill={bodyColor} />
            </motion.g>
          )}
        </g>

        {/* Main face with subtle breathing */}
        <motion.g
          animate={{ scale: [1, 1.015, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '50px', originY: '52px' }}
        >
          <circle cx="50" cy="52" r="38" fill={bodyColor} />

          {/* Face patch for some animals */}
          {['monkey', 'pug', 'bear', 'lion', 'tiger'].includes(animal) && (
            <ellipse cx="50" cy="60" rx="28" ry="25" fill={faceColor} />
          )}
          {animal === 'panda' && (
            <circle cx="50" cy="52" r="36" fill={faceColor} />
          )}
          {animal === 'penguin' && (
            <ellipse cx="50" cy="60" rx="30" ry="28" fill={faceColor} />
          )}
          {animal === 'raccoon' && (
            <>
              <ellipse cx="50" cy="58" rx="26" ry="22" fill={faceColor} />
              {/* Mask markings */}
              <ellipse cx="32" cy="45" rx="14" ry="10" fill={accentColor} />
              <ellipse cx="68" cy="45" rx="14" ry="10" fill={accentColor} />
            </>
          )}
          {animal === 'wolf' && (
            <ellipse cx="50" cy="60" rx="24" ry="22" fill={faceColor} />
          )}

          {/* Tiger stripes */}
          {animal === 'tiger' && (
            <>
              <path d="M 35 30 Q 30 35 35 40" stroke={accentColor} strokeWidth="3" fill="none" />
              <path d="M 65 30 Q 70 35 65 40" stroke={accentColor} strokeWidth="3" fill="none" />
              <path d="M 50 25 L 50 32" stroke={accentColor} strokeWidth="3" />
            </>
          )}

          {/* Eyes - panda has dark patches */}
          {animal === 'panda' && (
            <>
              <ellipse cx="32" cy="45" rx="14" ry="16" fill={accentColor} />
              <ellipse cx="68" cy="45" rx="14" ry="16" fill={accentColor} />
            </>
          )}

          {/* Eye whites */}
          <circle cx="35" cy="45" r={eyeSize} fill="white" />
          <circle cx="65" cy="45" r={eyeSize} fill="white" />

          {/* Animated pupils - look around */}
          <motion.g
            animate={{
              x: [-1, 1, 2, 0, -2, -1],
              y: [0, 1, 0, -1, 0, 0]
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: animationSeed * 0.3
            }}
          >
            <circle cx="37" cy="46" r={pupilSize} fill="#1a1a1a" />
            <circle cx="67" cy="46" r={pupilSize} fill="#1a1a1a" />
            <circle cx="39" cy="44" r={pupilSize * 0.3} fill="white" />
            <circle cx="69" cy="44" r={pupilSize * 0.3} fill="white" />
          </motion.g>

          {/* Blinking eyelids */}
          <motion.g
            animate={{ scaleY: [0, 0, 1, 1, 0, 0] }}
            transition={{
              duration: 0.3,
              repeat: Infinity,
              repeatDelay: blinkDelay,
              times: [0, 0.3, 0.5, 0.7, 1, 1]
            }}
            style={{ originY: '45px' }}
          >
            <ellipse cx="35" cy="45" rx={eyeSize + 2} ry={eyeSize + 2} fill={animal === 'panda' ? accentColor : bodyColor} />
            <ellipse cx="65" cy="45" rx={eyeSize + 2} ry={eyeSize + 2} fill={animal === 'panda' ? accentColor : bodyColor} />
          </motion.g>

          {/* Owl specific eyes */}
          {animal === 'owl' && (
            <>
              <circle cx="35" cy="45" r="16" fill="#FEF3C7" stroke={accentColor} strokeWidth="3" />
              <circle cx="65" cy="45" r="16" fill="#FEF3C7" stroke={accentColor} strokeWidth="3" />
              <motion.g
                animate={{
                  x: [-1, 1, 0],
                  y: [0, 1, 0]
                }}
                transition={{ duration: 3, repeat: Infinity }}
              >
                <circle cx="35" cy="45" r="8" fill="#1a1a1a" />
                <circle cx="65" cy="45" r="8" fill="#1a1a1a" />
                <circle cx="37" cy="43" r="3" fill="white" />
                <circle cx="67" cy="43" r="3" fill="white" />
              </motion.g>
            </>
          )}

          {/* Nose based on animal */}
          {['monkey', 'bear', 'lion'].includes(animal) && (
            <motion.ellipse
              cx="50" cy="62" rx="8" ry="6" fill={accentColor}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}
          {animal === 'pug' && (
            <motion.ellipse
              cx="50" cy="62" rx="12" ry="8" fill={accentColor}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            />
          )}
          {['tiger', 'wolf'].includes(animal) && (
            <motion.path
              d="M 45 60 L 50 66 L 55 60 Z"
              fill={accentColor}
              animate={{ y: [0, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
          )}
          {animal === 'panda' && (
            <ellipse cx="50" cy="62" rx="6" ry="4" fill="#1a1a1a" />
          )}
          {animal === 'penguin' && (
            <path d="M 42 58 L 50 70 L 58 58 Z" fill={accentColor} />
          )}
          {animal === 'elephant' && (
            <motion.path
              d="M 45 60 Q 50 58 55 60 Q 52 90 50 95 Q 48 90 45 60"
              fill={bodyColor}
              stroke={accentColor}
              strokeWidth="1"
              animate={{ rotate: [-2, 2, -2] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ originX: '50px', originY: '60px' }}
            />
          )}
          {animal === 'pig' && (
            <motion.g
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <ellipse cx="50" cy="65" rx="14" ry="10" fill={accentColor} />
              <circle cx="45" cy="65" r="3" fill={bodyColor} />
              <circle cx="55" cy="65" r="3" fill={bodyColor} />
            </motion.g>
          )}
          {animal === 'owl' && (
            <path d="M 47 62 L 50 68 L 53 62 Z" fill={accentColor} />
          )}
          {animal === 'raccoon' && (
            <ellipse cx="50" cy="65" rx="5" ry="4" fill="#1a1a1a" />
          )}

          {/* Animated mouth */}
          {!['penguin', 'owl'].includes(animal) && (
            <motion.path
              d="M 42 72 Q 50 78 58 72"
              fill="none"
              stroke={accentColor}
              strokeWidth="2"
              strokeLinecap="round"
              animate={{
                d: [
                  "M 42 72 Q 50 78 58 72",
                  "M 42 73 Q 50 80 58 73",
                  "M 42 72 Q 50 78 58 72"
                ]
              }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}

          {/* Blush cheeks for cute animals - with subtle pulse */}
          {['pig', 'panda', 'bear', 'monkey'].includes(animal) && (
            <motion.g
              animate={{ opacity: [0.5, 0.7, 0.5] }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <circle cx="25" cy="58" r="6" fill="#FECACA" opacity="0.6" />
              <circle cx="75" cy="58" r="6" fill="#FECACA" opacity="0.6" />
            </motion.g>
          )}

          {/* Whiskers for cat-like animals - with twitch animation */}
          {['tiger', 'lion', 'wolf', 'raccoon'].includes(animal) && (
            <motion.g
              animate={{ rotate: [-1, 1, -1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ originX: '50px', originY: '65px' }}
            >
              <line x1="20" y1="60" x2="35" y2="62" stroke={accentColor} strokeWidth="1" />
              <line x1="20" y1="65" x2="35" y2="65" stroke={accentColor} strokeWidth="1" />
              <line x1="20" y1="70" x2="35" y2="68" stroke={accentColor} strokeWidth="1" />
              <line x1="80" y1="60" x2="65" y2="62" stroke={accentColor} strokeWidth="1" />
              <line x1="80" y1="65" x2="65" y2="65" stroke={accentColor} strokeWidth="1" />
              <line x1="80" y1="70" x2="65" y2="68" stroke={accentColor} strokeWidth="1" />
            </motion.g>
          )}
        </motion.g>
      </g>
    </svg>
  );
};

interface SpriteAvatarProps {
  avatarId: number;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  isActive?: boolean;
  rank?: number;
  isJoining?: boolean;
  smSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  delay?: number;
}

const sizeConfig = {
  xs: { container: 'w-10 h-10', name: 'text-[10px]' },
  sm: { container: 'w-14 h-14', name: 'text-xs' },
  md: { container: 'w-20 h-20', name: 'text-sm' },
  lg: { container: 'w-28 h-28', name: 'text-base' },
  xl: { container: 'w-36 h-36', name: 'text-lg' },
};

const sizePixels = { xs: 40, sm: 56, md: 80, lg: 112, xl: 144 };

export function SpriteAvatar({
  avatarId,
  name,
  size = 'md',
  showName = true,
  isActive = false,
  rank,
  isJoining = false,
  smSize,
  className,
}: SpriteAvatarProps) {
  const character = characterDesigns[avatarId % characterDesigns.length];

  // Mobile-first: 'size' is the default, 'smSize' is for larger screens
  const config = sizeConfig[size];
  const smConfig = smSize ? sizeConfig[smSize] : null;
  const pixelSize = sizePixels[size];
  const smPixelSize = smSize ? sizePixels[smSize] : null;

  // Create a stable animation seed based on avatarId
  const animationSeed = useMemo(() => avatarId % 5, [avatarId]);

  return (
    <motion.div
      initial={isJoining ? { scale: 0, rotate: -180 } : { scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      exit={{ scale: 0, opacity: 0 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 15,
      }}
      className={cn('flex flex-col items-center gap-1', className)}
    >
      <div className={cn(
        "relative",
        config.container,
        smConfig && `sm:${smConfig.container}`
      )}>
        {/* Rank badge */}
        {rank !== undefined && rank <= 3 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className={cn(
              'absolute -top-2 -right-2 z-20 w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold shadow-lg border-2 border-white',
              rank === 1 && 'bg-yellow-400 text-yellow-900',
              rank === 2 && 'bg-gray-300 text-gray-700',
              rank === 3 && 'bg-orange-400 text-orange-900'
            )}
          >
            {rank}
          </motion.div>
        )}

        {/* Active glow */}
        {isActive && (
          <motion.div
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.3, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className={cn(
              'absolute inset-0 rounded-full bg-gradient-to-br',
              character.bgGradient,
              'blur-xl -z-10'
            )}
          />
        )}

        {/* Character container with bounce animation */}
        <motion.div
          animate={isActive ? {
            y: [0, -6, 0],
            rotate: [0, -2, 2, 0]
          } : {
            y: [0, -2, 0]
          }}
          transition={{
            duration: isActive ? 2 : 3,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className={cn(config.container, 'relative')}
        >
          {/* Background circle */}
          <div
            className={cn(
              'w-full h-full rounded-full bg-gradient-to-br shadow-lg overflow-hidden',
              character.bgGradient
            )}
            style={{
              boxShadow: `0 4px 20px ${character.bodyColor}60`,
            }}
          >
            {/* Highlight */}
            <div className="absolute top-2 left-1/4 w-1/3 h-1/4 bg-white/30 rounded-full blur-sm" />

            {/* Animal face with all idle animations */}
            <AnimalFace
              animal={character.animal}
              bodyColor={character.bodyColor}
              faceColor={character.faceColor}
              accentColor={character.accentColor}
              earColor={character.earColor}
              size={pixelSize}
              animationSeed={animationSeed}
            />
          </div>

          {/* Bounce shadow */}
          <motion.div
            animate={{
              scale: [1, 0.8, 1],
              opacity: [0.25, 0.15, 0.25]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-3 bg-black/20 rounded-full blur-sm"
          />
        </motion.div>
      </div>

      {/* Name */}
      {showName && name && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={cn(
            config.name,
            'font-semibold text-foreground truncate max-w-[100px] text-center drop-shadow-sm'
          )}
        >
          {name}
        </motion.span>
      )}
    </motion.div>
  );
}

// Avatar picker with the animal characters
interface SpriteAvatarPickerProps {
  selectedId: number;
  onSelect: (id: number) => void;
}

export function SpriteAvatarPicker({ selectedId, onSelect }: SpriteAvatarPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-3 p-4">
      {characterDesigns.map((character, index) => (
        <motion.button
          key={index}
          whileHover={{ scale: 1.1, rotate: [-2, 2, -2, 0] }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onSelect(index)}
          className={cn(
            'w-16 h-16 rounded-2xl bg-gradient-to-br flex items-center justify-center transition-all shadow-lg overflow-hidden',
            character.bgGradient,
            selectedId === index
              ? 'ring-4 ring-primary ring-offset-2 ring-offset-background scale-110'
              : 'opacity-80 hover:opacity-100'
          )}
        >
          <motion.div
            animate={selectedId === index ? {
              y: [0, -2, 0],
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
            className="w-full h-full p-1"
          >
            <AnimalFace
              animal={character.animal}
              bodyColor={character.bodyColor}
              faceColor={character.faceColor}
              accentColor={character.accentColor}
              earColor={character.earColor}
              size={56}
              animationSeed={index}
            />
          </motion.div>
        </motion.button>
      ))}
    </div>
  );
}

export function getCharacterDesign(id: number) {
  return characterDesigns[id % characterDesigns.length];
}
