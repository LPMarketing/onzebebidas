/**
 * Validates a Brazilian CPF mathematically using modulo 11 check digits algorithm.
 */
export function validateCPF(rawCpf: string): boolean {
  if (!rawCpf) return false;

  // Clean non-digits
  const clean = rawCpf.replace(/\D/g, '');

  // Must have 11 digits
  if (clean.length !== 11) return false;

  // Reject known invalid sequences of identical numbers (e.g. 11111111111, 00000000000)
  if (/^(\d)\1{10}$/.test(clean)) return false;

  // Validate 1st check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let firstRemainder = (sum * 10) % 11;
  if (firstRemainder === 10 || firstRemainder === 11) {
    firstRemainder = 0;
  }
  if (firstRemainder !== parseInt(clean.charAt(9), 10)) {
    return false;
  }

  // Validate 2nd check digit
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  let secondRemainder = (sum * 10) % 11;
  if (secondRemainder === 10 || secondRemainder === 11) {
    secondRemainder = 0;
  }
  if (secondRemainder !== parseInt(clean.charAt(10), 10)) {
    return false;
  }

  return true;
}
