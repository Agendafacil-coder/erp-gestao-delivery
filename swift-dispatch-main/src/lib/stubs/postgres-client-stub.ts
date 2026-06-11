/**
 * Stub para o bundle do browser (build client).
 * Não deve ser invocado em runtime — server functions rodam no servidor.
 */
export default function postgres(): never {
  throw new Error("postgres is server-only");
}
