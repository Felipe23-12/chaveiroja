/** Transição leve, sem biblioteca de animação no carregamento do Android. */
export default function PageTransition({ children }) {
  return <div className="fade-in-up">{children}</div>;
}