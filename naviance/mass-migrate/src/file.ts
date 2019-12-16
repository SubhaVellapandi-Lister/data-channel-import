import parse from "csv-parse";
import fs from "fs";

export async function csvRows(path: string): Promise<string[][]> {
    const allRows: string[][] = [];
    const parser = parse({ bom: true, skip_empty_lines: true, skip_lines_with_empty_values: true});
    const istream = fs.createReadStream(path);

    return new Promise<string[][]>((resolve, reject) => {
        parser.on('readable', async () => {
            let record = parser.read();

            while (record) {
                const raw = record as string[];
                allRows.push(raw);

                record = parser.read();
            }
        });
        parser.on('end', () => {
            resolve(allRows);
        });
        parser.on('error', (err) => {
            // TODO: find better way to deal with blank line at end of file
            console.log(`CSV Read Error ${err}`);
            reject(err);
        });
        parser.on('skip', (err) => {
            console.log(`CSV Row Skipped ${err}`);
        });
        istream.pipe(parser);
    });
}
