/// <reference types="node" />
import { AddMode, CursorOp } from "./constants";
import { DbItem, DbStat, EnvInfo, Version } from "./types";
interface LMDB {
    version(): Version;
    strerror(code: number): string;
    env_create(): bigint;
    env_open(envp: bigint, path: string, flags: number, mode: number): void;
    env_copy2(envp: bigint, path: string, flags: number): void;
    env_copyfd2(envp: bigint, fd: number, flags: number): void;
    env_stat(envp: bigint): DbStat;
    env_info(envp: bigint): EnvInfo;
    env_sync(envp: bigint, force: boolean): void;
    env_close(envp: bigint): void;
    env_set_flags(envp: bigint, flags: number, unset?: boolean): void;
    env_get_flags(envp: bigint): number;
    env_get_path(envp: bigint): string;
    env_get_fd(envp: bigint): number;
    env_set_mapsize(envp: bigint, size: number): void;
    env_set_maxreaders(envp: bigint, maxReaders: number): void;
    env_get_maxreaders(envp: bigint): number;
    env_set_maxdbs(envp: bigint, maxDBs: number): void;
    env_get_maxkeysize(envp: bigint): number;
    reader_list(envp: bigint): string[];
    reader_check(envp: bigint): number;
    txn_begin(envp: bigint, parent: bigint | null, flags: number): bigint;
    txn_commit(txnp: bigint): void;
    txn_abort(txnp: bigint): void;
    txn_reset(txnp: bigint): void;
    txn_renew(txnp: bigint): void;
    dbi_open(txnp: bigint, name: string | null, flags: number): number;
    stat(txnp: bigint, dbi: number): DbStat;
    dbi_flags(txnp: bigint, dbi: number): number;
    dbi_close(envp: bigint, dbi: number): void;
    mdb_drop(txnp: bigint, dbi: number, del: boolean): void;
    get(params: {
        txnp: bigint;
        dbi: number;
        key: Buffer;
        zeroCopy?: boolean;
    }): Buffer | null;
    put(params: {
        txnp: bigint;
        dbi: number;
        key: Buffer;
        value: Buffer;
        flags: number;
    }): void;
    add(params: {
        txnp: bigint;
        dbi: number;
        key: Buffer;
        value: Buffer;
        mode: AddMode;
    }): boolean | Buffer;
    reserve(params: {
        txnp: bigint;
        dbi: number;
        key: Buffer;
        size: number;
        flags: number;
    }): Buffer | false;
    del(txnp: bigint, dbi: number, key: Buffer): boolean;
    cmp(txnp: bigint, dbi: number, a: Buffer, b: Buffer): number;
    detach_buffer(buf: Buffer): void;
    cursor_open(tnxp: bigint, dbi: number): bigint;
    cursor_close(cursorp: bigint): void;
    cursor_renew(tnxp: bigint, cursorp: bigint): void;
    cursor_get(params: {
        cursorp: bigint;
        op: CursorOp;
        key?: Buffer;
        value?: Buffer;
        returnKey?: boolean;
        returnValue?: boolean;
        zeroCopy?: boolean;
    }): DbItem<Buffer, Buffer> | null;
    cursor_put(cursorp: bigint, key: Buffer, value: Buffer, flags: number): void;
    cursor_add(): boolean | Buffer;
}
declare const lmdb: LMDB;
export { lmdb };
