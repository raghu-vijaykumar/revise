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
