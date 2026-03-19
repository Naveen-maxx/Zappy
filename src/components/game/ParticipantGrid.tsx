import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnimatedAvatar } from './AnimatedAvatar';
import type { Participant } from '@/types/game';

interface ParticipantGridProps {
  participants: Participant[];
  maxDisplay?: number;
}

export function ParticipantGrid({ participants, maxDisplay = 20 }: ParticipantGridProps) {
  const displayedParticipants = participants.slice(0, maxDisplay);
  const remainingCount = Math.max(0, participants.length - maxDisplay);

  return (
    <div className="w-full">
      <motion.div
        layout
        className="flex flex-wrap justify-center gap-4 md:gap-6"
      >
        <AnimatePresence mode="popLayout">
          {displayedParticipants.map((participant, index) => (
            <motion.div
              key={participant.id}
              layout
              initial={{ scale: 0, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0, opacity: 0, y: -20 }}
              transition={{
                type: 'spring',
                stiffness: 500,
                damping: 30,
                delay: index * 0.05,
              }}
            >
              <AnimatedAvatar
                avatarId={participant.avatarId}
                name={participant.name}
                size="lg"
                showName
                isActive
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Remaining count */}
      {remainingCount > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-6 text-center"
        >
          <span className="text-muted-foreground font-medium">
            +{remainingCount} more player{remainingCount > 1 ? 's' : ''} waiting...
          </span>
        </motion.div>
      )}
    </div>
  );
}
