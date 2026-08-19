import React from 'react';
import { motion } from 'framer-motion';
import NexusLanding from './NexusLanding';

export default function NexusHubModal({ isActive, isOpen, onLaunchMode, curiosityHooks, onLaunchCuriosity, onOpenCuriosityDashboard, onOpenFeedback, onOpenProfile, user, profile, isAdmin }) {
  const visible = isActive !== undefined ? isActive : (isOpen !== undefined ? isOpen : true);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 9999,
        background: '#030508',
        overflow: 'hidden'
      }}
    >
      <NexusLanding 
        onLaunchMode={onLaunchMode}
        curiosityHooks={curiosityHooks}
        onLaunchCuriosity={onLaunchCuriosity}
        onOpenCuriosityDashboard={onOpenCuriosityDashboard}
        onOpenFeedback={onOpenFeedback}
        onOpenProfile={onOpenProfile}
        user={user}
        profile={profile}
        isAdmin={isAdmin}
      />
    </motion.div>
  );
}
