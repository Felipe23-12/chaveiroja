/** Opacidade é composta pela GPU sem transformar os descendentes fixos.
 * A camada é liberada ao terminar; index.css respeita movimento reduzido. */
export default function PageTransition({ children }) {
  return <div className="page-transition">{children}</div>;
}