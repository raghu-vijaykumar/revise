import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js';

export function hashText(value: string): string {
  return bytesToHex(sha256(utf8ToBytes(value)));
}

export function lineStartOffsets(source: string): number[] {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === '\n') starts.push(index + 1);
  }
  return starts;
}

export function offsetAt(source: string, line: number, column: number): number {
  const start = lineStartOffsets(source)[line - 1];
  if (start === undefined || column < 1) throw new Error('Invalid Markdown position');
  return start + column - 1;
}
