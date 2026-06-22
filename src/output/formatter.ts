export type OutputFormat = 'json' | 'table';

export function getOutputFormat(options: { output?: string }): OutputFormat {
  return options.output === 'json' ? 'json' : 'table';
}

/**
 * Render data to stdout. `json` prints pretty JSON; `table` prints
 * `console.table` for arrays of objects and an aligned key/value list for
 * single objects.
 */
export function output(data: unknown, format: OutputFormat = 'table'): void {
  if (format === 'json') {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log('No data');
      return;
    }
    if (data.every((row) => row !== null && typeof row === 'object' && !Array.isArray(row))) {
      console.table(data);
      return;
    }
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data !== null && typeof data === 'object') {
    const entries = Object.entries(data as Record<string, unknown>);
    if (entries.length === 0) {
      console.log('(empty)');
      return;
    }
    const maxKeyLen = Math.max(...entries.map(([k]) => k.length));
    for (const [key, value] of entries) {
      const displayValue =
        value !== null && typeof value === 'object'
          ? JSON.stringify(value)
          : String(value);
      console.log(`  ${key.padEnd(maxKeyLen + 2)} ${displayValue}`);
    }
    return;
  }

  console.log(String(data));
}
