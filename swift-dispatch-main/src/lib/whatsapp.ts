/** Dígitos do telefone para exibição curta (últimos 9, formato 9769-5106). */
export function formatPhoneShort(phone: string | null | undefined): string {
  const digits = phone?.replace(/\D/g, "") ?? "";
  const tail = digits.slice(-9);
  if (!tail) return "—";
  if (tail.length >= 5) return `${tail.slice(0, tail.length - 4)}-${tail.slice(-4)}`;
  return tail;
}

/** URL wa.me para abrir conversa no WhatsApp (nova aba). */
export function whatsAppChatUrl(phone: string | null | undefined): string | null {
  if (!phone?.trim()) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length <= 11 && !digits.startsWith("55")) {
    digits = `55${digits}`;
  }
  if (digits.length < 12) return null;
  return `https://wa.me/${digits}`;
}
