import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function RewardOverlay({ isVisible, onComplete, piecesEarned }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: -50 }}
            transition={{ type: 'spring', bounce: 0.5, duration: 0.8 }}
            style={{
              background: 'linear-gradient(145deg, var(--wood-medium), #4a332c)',
              padding: '40px',
              borderRadius: '16px',
              border: '2px solid var(--gold-accent)',
              textAlign: 'center',
              boxShadow: '0 0 30px rgba(255, 213, 79, 0.3)',
              maxWidth: '90%',
            }}
          >
            <h2 style={{ color: 'var(--success)', fontSize: '2.5rem', margin: '0 0 20px 0' }}>ACCESS GRANTED</h2>
            
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ fontSize: '4rem', margin: '20px 0' }}
            >
              🧩
            </motion.div>

            <p style={{ fontSize: '1.5rem', marginBottom: '30px' }}>
              You recovered <strong style={{ color: 'var(--gold-accent)' }}>{piecesEarned}</strong> Fragment Pieces!
            </p>

            <button 
              className="btn-primary" 
              onClick={onComplete}
              style={{ padding: '15px 30px', fontSize: '1.2rem' }}
            >
              Continue Mission
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default RewardOverlay;
