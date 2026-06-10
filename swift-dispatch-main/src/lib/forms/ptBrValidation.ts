import type { FormEvent } from "react";

/** Mensagens de validação nativa do browser em português (pt-BR). */
export const PT_BR_MESSAGES = {
  required: "Preencha este campo.",
  email: "Informe um e-mail válido.",
  invalid: "Valor inválido.",
  minLength: (min: number) => `Use pelo menos ${min} caracteres.`,
} as const;

type ValidatableElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

export function handlePtBrInvalid(
  e: FormEvent<ValidatableElement>,
  requiredMessage = PT_BR_MESSAGES.required,
) {
  const el = e.currentTarget;
  if (el.validity.valueMissing) {
    el.setCustomValidity(requiredMessage);
    return;
  }
  if (el.validity.typeMismatch && el instanceof HTMLInputElement && el.type === "email") {
    el.setCustomValidity(PT_BR_MESSAGES.email);
    return;
  }
  if (el.validity.tooShort) {
    el.setCustomValidity(PT_BR_MESSAGES.minLength(el.minLength));
    return;
  }
  el.setCustomValidity(PT_BR_MESSAGES.invalid);
}

export function clearPtBrValidity(e: FormEvent<ValidatableElement>) {
  e.currentTarget.setCustomValidity("");
}

/** Props para inputs com `required` — tooltip do browser em português. */
export function ptBrInputProps(requiredMessage?: string) {
  return {
    onInvalid: (e: FormEvent<ValidatableElement>) => handlePtBrInvalid(e, requiredMessage),
    onInput: clearPtBrValidity,
  };
}
