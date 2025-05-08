
declare module 'xlsx' {
  export interface WorkBook {
    SheetNames: string[];
    Sheets: {
      [sheet: string]: WorkSheet;
    };
    Props?: any;
  }

  export interface WorkSheet {
    [cell: string]: CellObject | any;
  }

  export interface CellObject {
    t: string; // Type
    v: any;    // Value
    r?: string; // Rich text
    h?: string; // HTML
    w?: string; // Formatted text
  }

  export function read(data: any, opts?: any): WorkBook;
  export function write(wb: WorkBook, opts?: any): any;
  export const utils: {
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name?: string): void;
    json_to_sheet(data: any[], opts?: any): WorkSheet;
    sheet_to_csv(ws: WorkSheet, opts?: any): string;
    sheet_to_json(ws: WorkSheet, opts?: any): any[];
  };
}
