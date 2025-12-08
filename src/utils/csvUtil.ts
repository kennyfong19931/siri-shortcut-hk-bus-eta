import { parse } from 'csv-parse';

export const parseCsvString = (input: string): Promise<Record<string, string>[]> =>
    new Promise((resolve, reject) => {
        parse(
            input,
            { bom:true, columns: true, skip_empty_lines: true, trim: true },
            (err: Error | undefined | null, records: any[]) => {
                if (err) reject(err);
                else resolve(records as Record<string, string>[]);
            },
        );
    });
