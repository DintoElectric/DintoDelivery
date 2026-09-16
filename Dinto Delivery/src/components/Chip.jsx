import { statusChipClass, typeChipClass } from '../lib/format.js';

export function StatusChip({ status }) {
  return <span className={statusChipClass(status)}>{status}</span>;
}

export function TypeChip({ type }) {
  return <span className={typeChipClass(type)}>{type}</span>;
}
