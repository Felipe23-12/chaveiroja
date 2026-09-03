import { motion } from "framer-motion";

/**
 * Wrapper sutil de transição de página (fade + slide vertical curto).
 * Usado no Outlet do Layout para animar apenas o conteúdo da página,
 * mantendo a shell (sidebar/topbar/tabbar) estática.
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}