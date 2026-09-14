/** Contêiner neutro: evita criar uma camada gráfica do tamanho da página no Android. */
export default function PageTransition({ children }) {
  return <div>{children}</div>;
}