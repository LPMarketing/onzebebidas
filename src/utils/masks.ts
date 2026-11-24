/**
 * Applies Brazilian CPF mask: 000.000.000-00
 */
export function maskCPF(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
}

/**
 * Applies Brazilian phone mask: (00) 00000-0000 or (00) 0000-0000
 */
export function maskPhone(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Strips non-digits from string for normalized database storage and searching
 */
export function normalizeDigits(value: string): string {
  if (!value) return '';
  return value.replace(/\D/g, '');
}

/**
 * Masks CPF for client view: ***.***.***-51
 */
export function maskCPFForClient(rawCpf: string): string {
  if (!rawCpf) return '***.***.***-**';
  const digits = rawCpf.replace(/\D/g, '');
  if (digits.length < 2) return '***.***.***-**';
  const last2 = digits.slice(-2);
  return `***.***.***-${last2}`;
}

/**
 * Formats a Date / ISO String to PT-BR string (e.g. 27/08/2026 às 13:40)
 */
export function formatDateTime(dateInput: any): string {
  if (!dateInput) return 'Recente';
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return 'Recente';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return 'Recente';
  }
}

/**
 * Formats date only (DD/MM/YYYY)
 */
export function formatDateOnly(dateInput: any): string {
  if (!dateInput) return 'Recente';
  try {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return 'Recente';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return 'Recente';
  }
}

/**
 * Formats date and time specifically for audit movements (e.g. 21/10/2026 às 10:35)
 */
export function formatMovementDate(dateInput: any): string {
  if (!dateInput) return 'Agora';
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return 'Agora';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hour = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} às ${hour}:${min}`;
  } catch {
    return 'Agora';
  }
}

