import { Cursor } from "./cursor";
export declare class MultimapCursor extends Cursor {
    firstDup(): boolean;
    findDup(key: string, value: string): boolean;
    findNextDup(key: string, value: string): boolean;
    currentPage(): boolean;
    lastDup(): boolean;
    nextDup(skip?: number): boolean;
    nextPage(skip?: number): boolean;
    nextKey(skip?: number): boolean;
    prevDup(skip?: number): boolean;
    prevKey(skip?: number): boolean;
    prevPage(skip?: number): boolean;
}
