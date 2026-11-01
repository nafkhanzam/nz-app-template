import Papa from "papaparse";
import { triggerBlobDownload } from "./download";

export function downloadCsv(rows: unknown[][], filename: string): void {
  const csv = Papa.unparse(rows);
  triggerBlobDownload(new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" }), filename);
}
