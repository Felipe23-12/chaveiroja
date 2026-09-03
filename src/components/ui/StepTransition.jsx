import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Transição suave entre etapas do fluxo.
 * Envolve o conteúdo de cada step com fade + slide lateral,
 * dando a sensação de progressão profissional.
 */
export default function StepTransition({ stepKey, children }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -24 }}
        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}