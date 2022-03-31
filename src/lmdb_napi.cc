#include <napi.h>
#include "lmdb.h"

using namespace Napi;

#define DEBUG 1
#if DEBUG
#define DEBUG_PRINT(x) printf x
#else
#define DEBUG_PRINT(x) \
  do                   \
  {                    \
  } while (0)
#endif

////////////////////////////////////////////////
// Helper functions
////////////////////////////////////////////////

static inline Value throw_undefined(Env env, int rc) {
  char *msg = mdb_strerror(rc);
  Error::New(env, msg).ThrowAsJavaScriptException();
  return env.Undefined();
}

static inline Value throw_null(Env env, int rc) {
  char *msg = mdb_strerror(rc);
  Error::New(env, msg).ThrowAsJavaScriptException();
  return env.Null();
}

static inline void throw_void(Env env, int rc) {
  char *msg = mdb_strerror(rc);
  Error::New(env, msg).ThrowAsJavaScriptException();
}

bool LOSSLESS;
static inline MDB_env *unwrap_env(Value value) {
  uint64_t addr = value.As<BigInt>().Uint64Value(&LOSSLESS);
  return reinterpret_cast<MDB_env *>(addr);
}

static inline MDB_txn *unwrap_txn(Value value) {
  if (value.IsUndefined() || value.IsNull()) {
    return NULL;
  }
  uint64_t addr = value.As<BigInt>().Uint64Value(&LOSSLESS);
  return reinterpret_cast<MDB_txn *>(addr);
}

static inline MDB_cursor *unwrap_cursor(Value value) {
  uint64_t addr = value.As<BigInt>().Uint64Value(&LOSSLESS);
  return reinterpret_cast<MDB_cursor *>(addr);
}

static inline MDB_dbi unwrap_dbi(Value value) {
  return (MDB_dbi)value.As<Number>().Uint32Value();
}

static inline MDB_val unwrap_val(Value value) {
  auto buf = value.As<Buffer<uint8_t>>();
  MDB_val val;
  val.mv_size = buf.ByteLength();
  val.mv_data = buf.Data();
  return val;
}

static inline Buffer<uint8_t> buffer_from_val(
  Env env,
  MDB_val *val,
  bool zerocopy
) {
  if (zerocopy) {
    return Buffer<uint8_t>::New(
      env,
      (uint8_t *)val->mv_data,
      val->mv_size
    );
  } else {
    return Buffer<uint8_t>::Copy(
      env,
      (const uint8_t*) val->mv_data,
      val->mv_size
    );
  }
}

////////////////////////////////////////////////
// LMDB function wrappers start here
////////////////////////////////////////////////

void lmdb_detach_buffer(const CallbackInfo& info) {
  if (!info[0].IsBuffer()) {
    return;
  }
  auto abuf = info[0].As<Buffer<uint8_t>>().ArrayBuffer();
  if (!abuf.IsDetached()) {
    DEBUG_PRINT(("detach buffer: %p\n", abuf.Data()));
    abuf.Detach();
  }
}

Object lmdb_version (const CallbackInfo& info) {
  Env env = info.Env();
  int major, minor, patch;
  char *version;
  version = mdb_version(&major, &minor, &patch);
  Object obj = Object::New(env);
  obj.Set("version", version);
  obj.Set("major", major);
  obj.Set("minor", minor);
  obj.Set("patch", patch);
  return obj;
}

Value lmdb_strerror (const CallbackInfo& info) {
  int err = (int) info[0].As<Number>();
  return String::New(info.Env(), mdb_strerror(err));
}

////////////////////////////////////////////////
// MDB_env functions
////////////////////////////////////////////////

Value lmdb_env_create(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv;
  int rc = mdb_env_create(&dbenv);
  DEBUG_PRINT(("mdb_env_create(%p): %d\n", dbenv, rc));
  if (rc) return throw_undefined(env, rc);
  return BigInt::New(env, (uint64_t)dbenv);
}

void lmdb_env_open(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  std::string path = info[1].As<String>().Utf8Value();
  unsigned int flags = (unsigned int)info[2].As<Number>().Uint32Value();
  unsigned int mode = (unsigned int)info[3].As<Number>().Uint32Value();
  int rc = mdb_env_open(dbenv, path.c_str(), (unsigned int)flags, (mdb_mode_t)mode);
  DEBUG_PRINT(("mdb_env_open(%p, '%s', 0x%x, 0%03o): %d\n", dbenv, path.c_str(), flags, mode, rc));
  if (rc) return throw_void(env, rc);
}

void lmdb_env_close(const CallbackInfo& info) {
  MDB_env *dbenv = unwrap_env(info[0]);
  mdb_env_close(dbenv);
  DEBUG_PRINT(("mdb_env_close(%p)\n", dbenv));
}

// TODO: make async worker
void lmdb_env_copy2(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  std::string path = info[1].As<String>().Utf8Value();
  unsigned int flags = (unsigned int)info[2].As<Number>().Uint32Value();
  int rc = mdb_env_copy2(dbenv, path.c_str(), flags);
  DEBUG_PRINT(("mdb_dbenv_copy2(%p, '%s', 0x%x): %d\n", dbenv, path.c_str(), flags, rc));
  if (rc) return throw_void(env, rc);
}

// TODO: make async worker
void lmdb_env_copyfd2(const CallbackInfo& info) {
  Env env = info.Env();
  unsigned int flags = (unsigned int)info[2].As<Number>().Uint32Value();
  MDB_env *dbenv = unwrap_env(info[0]);
#ifdef _WIN32  
  mdb_filehandle_t fd = (mdb_filehandle_t)info[1].As<Number>().Int64Value();
  int rc = mdb_env_copyfd2(dbenv, fd, flags);
  DEBUG_PRINT(("mdb_dbenv_copyfd2(%p, %p, 0x%x): %d\n", dbenv, fd, flags, rc));
#else
  mdb_filehandle_t fd = (mdb_filehandle_t)info[1].As<Number>().Int32Value();
  int rc = mdb_env_copyfd2(dbenv, fd, flags);
  DEBUG_PRINT(("mdb_dbenv_copyfd2(%p, %d, 0x%x): %d\n", dbenv, fd, flags, rc));
#endif
  if (rc) return throw_void(env, rc);
}

Object object_from_stat(Env env, MDB_stat *stat) {
  Object obj = Object::New(env);
  obj.Set("pageSize", stat->ms_psize);
  obj.Set("depth", stat->ms_depth);
  obj.Set("branchPages", stat->ms_branch_pages);
  obj.Set("leafPages", stat->ms_leaf_pages);
  obj.Set("overflowPages", stat->ms_overflow_pages);
  obj.Set("entries", stat->ms_entries);
  return obj;
}

Value lmdb_env_stat(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  MDB_stat stat;
  int rc = mdb_env_stat(dbenv, &stat);
  DEBUG_PRINT(("mdb_env_stat(%p, %p): %d\n", dbenv, &stat, rc));
  if (rc) return throw_undefined(env, rc);
  return object_from_stat(env, &stat);
}

Value lmdb_env_info(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  MDB_envinfo envinfo;
  int rc = mdb_env_info(dbenv, &envinfo);
  DEBUG_PRINT(("mdb_env_info(%p, %p): %d\n", dbenv, &envinfo, rc));
  if (rc) return throw_undefined(env, rc);
  Object obj = Object::New(env);
  obj.Set("mapAddr", BigInt::New(env, (uint64_t)envinfo.me_mapaddr));
  obj.Set("mapSize", envinfo.me_mapsize);
  obj.Set("lastPage", envinfo.me_last_pgno);
  obj.Set("lastTxn", envinfo.me_last_txnid);
  obj.Set("maxReaders", envinfo.me_maxreaders);
  obj.Set("numReaders", envinfo.me_numreaders);
  return obj;
}

void lmdb_env_sync(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  int force = (int)info[1].As<Number>().Int32Value();
  int rc = mdb_env_sync(dbenv, force);
  DEBUG_PRINT(("mdb_env_sync(%p, %d)\n", dbenv, force));
  if (rc) return throw_void(env, rc);
}

void lmdb_env_set_flags(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  unsigned int flags = (unsigned int) info[1].As<Number>().Uint32Value();
  int onoff = (int) info[2].As<Number>().Int32Value();
  int rc = mdb_env_set_flags(dbenv, flags, onoff);
  DEBUG_PRINT(("mdb_env_set_flags(%p, 0x%x, %d): %d\n", dbenv, flags, onoff, rc));
  if(rc) return throw_void(env, rc);
}

Value lmdb_env_get_flags(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  unsigned int flags;
  int rc = mdb_env_get_flags(dbenv, &flags);
  DEBUG_PRINT(("mdb_env_get_flags(%p, 0x%x): %d\n", dbenv, flags, rc));
  if (rc) return throw_undefined(env, rc);
  return Number::New(env, (double)flags);
}

Value lmdb_env_get_path(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  const char *path;
  int rc = mdb_env_get_path(dbenv, &path);
  DEBUG_PRINT(("mdb_env_get_path(%p, '%s'): %d\n", dbenv, path, rc));
  if (rc) return throw_undefined(env, rc);
  return String::New(env, path);
}

Value lmdb_env_get_fd(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  mdb_filehandle_t fd;
  int rc = mdb_env_get_fd(dbenv, &fd);
#if _WIN32
  DEBUG_PRINT(("mdb_env_get_fd(%p, %p): %d\n", dbenv, fd, rc));
#else
  DEBUG_PRINT(("mdb_env_get_fd(%p, %d): %d\n", dbenv, fd, rc));
#endif
  if (rc) return throw_undefined(env, rc);
  return Number::New(env, (uint64_t)fd);
}

void lmdb_env_set_mapsize(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  size_t size = (size_t) info[0].As<Number>().DoubleValue();
  int rc = mdb_env_set_mapsize(dbenv, size);
  DEBUG_PRINT(("mdb_env_set_mapsize(%p, %zu): %d", dbenv, size, rc));
  if (rc) return throw_void(env, rc);
}

void lmdb_env_set_maxreaders(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  unsigned int readers = (unsigned int) info[0].As<Number>().Uint32Value();
  int rc = mdb_env_set_maxreaders(dbenv, readers);
  DEBUG_PRINT(("mdb_env_set_maxreaders(%p, %u): %d\n", dbenv, readers, rc));
  if (rc) return throw_void(env, rc);
}

Value lmdb_env_get_maxreaders(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  unsigned int readers;
  int rc = mdb_env_get_maxreaders(dbenv, &readers);
  DEBUG_PRINT(("mdb_env_get_maxreaders(%p, %u): %d\n", dbenv, readers, rc));
  if (rc) return throw_undefined(env, rc);
  return Number::New(env, (double)readers);
}

void lmdb_env_set_maxdbs(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  MDB_dbi dbs = (MDB_dbi) info[1].As<Number>().Uint32Value();
  int rc = mdb_env_set_maxdbs(dbenv, dbs);
  DEBUG_PRINT(("mdb_env_set_maxdbs(%p, %u): %d\n", dbenv, dbs, rc));
  if (rc) return throw_void(env, rc);
}

Value lmdb_env_get_maxkeysize(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  int maxkeysize = mdb_env_get_maxkeysize(dbenv);
  DEBUG_PRINT(("mdb_env_get_maxkeysize(%p): %d\n", dbenv, maxkeysize));
  return Number::New(env, (double)maxkeysize);
}

////////////////////////////////////////////////
// MDB_txn functions
////////////////////////////////////////////////

Value lmdb_txn_begin(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  MDB_txn *parent = unwrap_txn(info[1]);
  MDB_txn *txn;
  unsigned int flags = (unsigned int) info[2].As<Number>().Uint32Value();
  int rc = mdb_txn_begin(dbenv, parent, flags, &txn);
  DEBUG_PRINT(("mdb_txn_begin(%p, %p, 0x%x, %p): %d\n", dbenv, parent, flags, txn, rc));
  if (rc) return throw_undefined(env, rc);
  return BigInt::New(env, (uint64_t) txn);
}

Value lmdb_txn_env(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_env *dbenv = mdb_txn_env(txn);
  DEBUG_PRINT(("mdb_txn_env(%p): %p\n", txn, dbenv));
  return BigInt::New(env, (uint64_t) dbenv);
}

Value lmdb_txn_id(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  size_t id = mdb_txn_id(txn);
  DEBUG_PRINT(("mdb_txn_id(%p): %zu\n", txn, id));
  return Number::New(env, (double) id); 
}

void lmdb_txn_commit(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  int rc = mdb_txn_commit(txn);
  DEBUG_PRINT(("mdb_txn_commit(%p): %d\n", txn, rc));
  if (rc) return throw_void(env, rc);
}

void lmdb_txn_abort(const CallbackInfo& info) {
  MDB_txn *txn = unwrap_txn(info[0]);
  mdb_txn_abort(txn);
  DEBUG_PRINT(("mdb_txn_abort(%p):\n", txn));
}

void lmdb_txn_reset(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  mdb_txn_reset(txn);
  DEBUG_PRINT(("mdb_txn_reset(%p):\n", txn));
}

void lmdb_txn_renew(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  int rc = mdb_txn_renew(txn);
  DEBUG_PRINT(("mdb_txn_renew(%p): %d\n", txn, rc));
  if (rc) return throw_void(env, rc);
}

////////////////////////////////////////////////
// MDB_dbi functions
////////////////////////////////////////////////

Value lmdb_dbi_open(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi;
  char* name;
  if (info[1].IsNull() || info[1].IsUndefined()) {
    name = NULL;
  }
  else {
    std::string name_str = info[1].As<String>().Utf8Value();
    name = (char*) calloc(name_str.length() + 1, sizeof(char));
    name_str.copy(name, name_str.length());
  }
  unsigned int flags = (unsigned int) info[2].As<Number>().Uint32Value();
  DEBUG_PRINT(("lmdb_dbi_open(%p, '%s', %u)\n", txn, name, flags));
  int rc = mdb_dbi_open(txn, name, flags, &dbi);
  DEBUG_PRINT(("mdb_dbi_open(%p, '%s', 0x%x, %u): %d\n", txn, name, flags, dbi, rc));
  if (name) free(name);
  if (rc) return throw_undefined(env, rc);
  return Number::New(env, (double)dbi);
}

Value lmdb_stat(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  MDB_stat stat;
  int rc = mdb_stat(txn, dbi, &stat);
  DEBUG_PRINT(("mdb_stat(%p, %d, %p): %d\n", txn, dbi, &stat, rc));
  if (rc) return throw_undefined(env, rc);
  return object_from_stat(env, &stat);
}

Value lmdb_dbi_flags(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  unsigned int flags;
  int rc = mdb_dbi_flags(txn, dbi, &flags);
  DEBUG_PRINT(("mdb_dbi_flags(%p, %u, 0x%x): %d\n", txn, dbi, flags, rc));
  return Number::New(env, (double)flags);
}

void lmdb_dbi_close(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  mdb_dbi_close(dbenv, dbi);
  DEBUG_PRINT(("mdb_dbi_close(%p, %u)\n", dbenv, dbi));
}

void lmdb_mdb_drop(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  int del = (int)info[2].As<Number>().Int32Value();
  int rc = mdb_drop(txn, dbi, del);
  DEBUG_PRINT(("mdb_drop(%p, %d, %d): %d\n", txn, dbi, del, rc));
  if (rc) return throw_void(env, rc);
}

/**
 * @brief Retrieve data at specified key
 * 
 * @param info [ptxn: bigint,
 *              dbi: number,
 *              key: Buffer,
 *              zerocopy?: boolean]
 * @return Value - null if key is not found
 */
Value lmdb_get(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  MDB_val key = unwrap_val(info[2]);
  MDB_val data;
  int rc = mdb_get(txn, dbi, &key, &data);
  DEBUG_PRINT(("mdb_get(%p, %u, %p, %p): %d\n", txn, dbi, &key, &data, rc));
  DEBUG_PRINT(("- key : %p (%zu bytes)\n", key.mv_data, key.mv_size));
  DEBUG_PRINT(("- data: %p (%zu bytes)\n", data.mv_data, data.mv_size));
  if (rc == MDB_NOTFOUND) return env.Null();
  else if (rc) return throw_undefined(env, rc);
  bool zerocopy = false;
  if (info[3].IsBoolean()) zerocopy = info[3].As<Boolean>();
  return buffer_from_val(env, &data, zerocopy);
}

/**
 * @brief Put data into DB at specified key
 * 
 * @param info [ptxn: bigint,
 *              dbi: number,
 *              key: Buffer,
 *              data: Buffer,
 *              flags?: number,
 *              zerocopy?: boolean]
 * @return Value - usually null, but if MDB_NOOVERWRITE flag is passed and
 *         db returns MDB_KEYEXIST, then this will be the current data
 *         corresponding to the given key
 */
Value lmdb_put(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  MDB_val key = unwrap_val(info[2]);
  size_t maxkeysize = mdb_env_get_maxkeysize(mdb_txn_env(txn));
  if (key.mv_size > maxkeysize) {
    char msg[50];
    sprintf(msg, "Key is longer than max keysize %zu bytes", maxkeysize);
    RangeError::New(env, msg).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  MDB_val data = unwrap_val(info[3]);
  unsigned int flags = 0;
  if (info[4].IsNumber()) flags = info[4].As<Number>().Uint32Value();
  int rc = mdb_put(txn, dbi, &key, &data, flags);
  DEBUG_PRINT(("mdb_put(%p, %u, %p, %p, 0x%x): %d\n", txn, dbi, &key, &data, flags, rc));
  DEBUG_PRINT(("- key : %p (%zu bytes)\n", key.mv_data, key.mv_size));
  DEBUG_PRINT(("- data: %p (%zu bytes)\n", data.mv_data, data.mv_size));
  if (rc && rc != MDB_KEYEXIST) return throw_null(env, rc);
  else if (rc == MDB_KEYEXIST) {
    if (flags & MDB_APPEND || flags & MDB_APPENDDUP) {
      const char *msg = "Keys and data must be appended in sorted order";
      Error::New(env, msg).ThrowAsJavaScriptException();
      return env.Undefined();
    }
    else {
      bool zerocopy = false;
      if (info[5].IsBoolean()) zerocopy = info[5].As<Boolean>();
      return buffer_from_val(env, &data, true);
    } 
  }
  else return env.Null();
}

void lmdb_del(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  MDB_val key = unwrap_val(info[2]);
  MDB_val data;
  if (info[3].IsUndefined() || info[3].IsNull()) {
    data.mv_size = 0;
    data.mv_data = NULL;
  }
  else {
    data = unwrap_val(info[3]);
  }
  int rc = mdb_del(txn, dbi, &key, &data);
  DEBUG_PRINT(("mdb_del(%p, %u, %p, %p): %d\n", txn, dbi, &key, &data, rc));
  DEBUG_PRINT(("- key : %p (%zu bytes)\n", key.mv_data, key.mv_size));
  DEBUG_PRINT(("- data: %p (%zu bytes)\n", data.mv_data, data.mv_size));
}

////////////////////////////////////////////////
// MDB_cursor functions
////////////////////////////////////////////////

Value lmdb_cursor_open(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  MDB_cursor *cursor;
  int rc = mdb_cursor_open(txn, dbi, &cursor);
  DEBUG_PRINT(("mdb_cursor_open(%p, %u, %p): %d\n", txn, dbi, cursor, rc));
  if (rc) return throw_undefined(env, rc);
  return BigInt::New(env, (uint64_t)cursor);
}

void lmdb_cursor_close(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_cursor *cursor = unwrap_cursor(info[0]);
  mdb_cursor_close(cursor);
  DEBUG_PRINT(("mdb_cursor_close(%p)\n", cursor));
}

void lmdb_cursor_renew(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_cursor *cursor = unwrap_cursor(info[1]);
  int rc = mdb_cursor_renew(txn, cursor);
  DEBUG_PRINT(("mdb_cursor_renew(%p, %p): %d\n", txn, cursor, rc));
  if (rc) return throw_void(env, rc);
}

Value lmdb_cursor_txn(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_cursor *cursor = unwrap_cursor(info[0]);
  MDB_txn *txn = mdb_cursor_txn(cursor);
  DEBUG_PRINT(("mdb_cursor_txn(%p): %p\n", cursor, txn));
  return BigInt::New(env, (uint64_t)txn);
}

Value lmdb_cursor_dbi(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_cursor *cursor = unwrap_cursor(info[0]);
  MDB_dbi dbi = mdb_cursor_dbi(cursor);
  DEBUG_PRINT(("mdb_cursor_dbi(%p): %u\n", cursor, dbi));
  return Number::New(env, (double)dbi);
}

/**
 * @brief Retrieve by cursor.
 * 
 * @param info [cursorp: bigint,
 *              op: CursorOp, 
 *              key?: Buffer,
 *              data?: Buffer,
 *              zerocopy?: boolean]
 * @return Array[key: Buffer, data: Buffer], or null if MDB_NOTFOUND
 */
Value lmdb_cursor_get(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_cursor *cursor = unwrap_cursor(info[0]);
  MDB_cursor_op op = (MDB_cursor_op) info[1].As<Number>().Int32Value();
  MDB_val key, data;
  if (info[1].IsBuffer()) {
    key = unwrap_val(info[2]);
  }
  if (info[2].IsBuffer()) {
    data = unwrap_val(info[3]);
  }
  int rc = mdb_cursor_get(cursor, &key, &data, op);
  DEBUG_PRINT(("mdb_cursor_get(%p, %p, %p, %d): %d\n", cursor, &key, &data, (int)op, rc));
  DEBUG_PRINT(("- key : %p (%zu bytes)\n", key.mv_data, key.mv_size));
  DEBUG_PRINT(("- data: %p (%zu bytes)\n", data.mv_data, data.mv_size));
  if (rc == MDB_NOTFOUND) {
    return env.Null();
  }
  else if (rc) return throw_undefined(env, rc);
  bool zerocopy = false;
  if (info[4].IsBoolean()) zerocopy = info[4].As<Boolean>();
  auto keyBuf = buffer_from_val(env, &key, zerocopy);
  auto dataBuf = buffer_from_val(env, &data, zerocopy);
  auto array = Array::New(env, 2);
  array[0u] = keyBuf;
  array[1u] = dataBuf;
  return array;
}

/**
 * @brief Store by cursor.
 * 
 * @param info [cursorp: bigint,
 *              key: Buffer,
 *              data: Buffer,
 *              flags?: number]
 */
void lmdb_cursor_put(CallbackInfo& info) {
  Env env = info.Env();
  MDB_cursor *cursor = unwrap_cursor(info[0]);
  MDB_val key = unwrap_val(info[1]);
  MDB_val data = unwrap_val(info[2]);
  unsigned int flags = 0;
  if (info[3].IsNumber()) flags = info[3].As<Number>().Int32Value();
  int rc = mdb_cursor_put(cursor, &key, &data, flags);
  DEBUG_PRINT(("mdb_cursor_put(%p, %p, %p, 0x%x): %d\n", cursor, &key, &data, flags, rc));
  DEBUG_PRINT(("- key : %p (%zu bytes)\n", key.mv_data, key.mv_size));
  DEBUG_PRINT(("- data: %p (%zu bytes)\n", data.mv_data, data.mv_size));
  if (rc) return throw_void(env, rc);
}

void lmdb_cursor_del(CallbackInfo& info) {
  Env env = info.Env();
  MDB_cursor *cursor = unwrap_cursor(info[0]);
  unsigned int flags = 0;
  if (info[1].IsNumber()) flags = info[1].As<Number>().Int32Value();
  int rc = mdb_cursor_del(cursor, flags);
  DEBUG_PRINT(("mdb_cursor_del(%p): %d\n", cursor, rc));
  if (rc) return throw_void(env, rc);
}

void lmdb_cursor_count(CallbackInfo& info) {
  Env env = info.Env();
  MDB_cursor *cursor = unwrap_cursor(info[0]);
  size_t count;
  int rc = mdb_cursor_count(cursor, &count);
}

////////////////////////////////////////////////
// Miscellaneous functions
////////////////////////////////////////////////

Value lmdb_cmp(CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  MDB_val a = unwrap_val(info[2]);
  MDB_val b = unwrap_val(info[3]);
  int cmp = mdb_cmp(txn, dbi, &a, &b);
  DEBUG_PRINT(("mdb_cmp(%p, %u, %p, %p): %d\n", txn, dbi, &a, &b, cmp));
  DEBUG_PRINT(("- a: %p (%zu bytes)\n", a.mv_data, a.mv_size));
  DEBUG_PRINT(("- b: %p (%zu bytes)\n", b.mv_data, b.mv_size));
  return Number::New(env, (double)cmp);
}

Value lmdb_dcmp(CallbackInfo& info) {
  Env env = info.Env();
  MDB_txn *txn = unwrap_txn(info[0]);
  MDB_dbi dbi = unwrap_dbi(info[1]);
  MDB_val a = unwrap_val(info[2]);
  MDB_val b = unwrap_val(info[3]);
  int dcmp = mdb_dcmp(txn, dbi, &a, &b);
  DEBUG_PRINT(("mdb_dcmp(%p, %u, %p, %p): %d\n", txn, dbi, &a, &b, dcmp));
  DEBUG_PRINT(("- a: %p (%zu bytes)\n", a.mv_data, a.mv_size));
  DEBUG_PRINT(("- b: %p (%zu bytes)\n", b.mv_data, b.mv_size));
  return Number::New(env, (double)dcmp);
}

Value lmdb_reader_check(CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *dbenv = unwrap_env(info[0]);
  int dead;
  int rc = mdb_reader_check(dbenv, &dead);
  DEBUG_PRINT(("mdb_reader_check(%p, %d): %d\n", dbenv, dead, rc));
  if (rc) return throw_undefined(env, rc);
  return Number::New(env, (double)dead);
}

Object Init(Env env, Object exports) {
  exports.Set(String::New(env, "detach_buffer"), Function::New(env, lmdb_detach_buffer));
  exports.Set(String::New(env, "version"), Function::New(env, lmdb_version));
  exports.Set(String::New(env, "strerror"), Function::New(env, lmdb_strerror));
  exports.Set(String::New(env, "env_create"), Function::New(env, lmdb_env_create));
  exports.Set(String::New(env, "env_open"), Function::New(env, lmdb_env_open));
  exports.Set(String::New(env, "env_copy2"), Function::New(env, lmdb_env_copy2));
  exports.Set(String::New(env, "env_close"), Function::New(env, lmdb_env_close));
  exports.Set(String::New(env, "env_copyfd2"), Function::New(env, lmdb_env_copyfd2));
  exports.Set(String::New(env, "env_stat"), Function::New(env, lmdb_env_stat));
  exports.Set(String::New(env, "env_info"), Function::New(env, lmdb_env_info));
  exports.Set(String::New(env, "env_sync"), Function::New(env, lmdb_env_sync));
  exports.Set(String::New(env, "env_set_flags"), Function::New(env, lmdb_env_set_flags));
  exports.Set(String::New(env, "env_get_flags"), Function::New(env, lmdb_env_get_flags));
  exports.Set(String::New(env, "env_get_path"), Function::New(env, lmdb_env_get_path));
  exports.Set(String::New(env, "env_get_fd"), Function::New(env, lmdb_env_get_fd));
  exports.Set(String::New(env, "env_set_mapsize"), Function::New(env, lmdb_env_set_mapsize));
  exports.Set(String::New(env, "env_set_maxreaders"), Function::New(env, lmdb_env_set_maxreaders));
  exports.Set(String::New(env, "env_set_maxdbs"), Function::New(env, lmdb_env_set_maxdbs));
  exports.Set(String::New(env, "env_get_maxkeysize"), Function::New(env, lmdb_env_get_maxkeysize));
  exports.Set(String::New(env, "txn_begin"), Function::New(env, lmdb_txn_begin));
  exports.Set(String::New(env, "txn_env"), Function::New(env, lmdb_txn_env));
  exports.Set(String::New(env, "txn_id"), Function::New(env, lmdb_txn_id));
  exports.Set(String::New(env, "txn_commit"), Function::New(env, lmdb_txn_commit));
  exports.Set(String::New(env, "txn_abort"), Function::New(env, lmdb_txn_abort));
  exports.Set(String::New(env, "txn_reset"), Function::New(env, lmdb_txn_reset));
  exports.Set(String::New(env, "txn_renew"), Function::New(env, lmdb_txn_renew));
  exports.Set(String::New(env, "dbi_open"), Function::New(env, lmdb_dbi_open));
  exports.Set(String::New(env, "stat"), Function::New(env, lmdb_stat));
  exports.Set(String::New(env, "dbi_flags"), Function::New(env, lmdb_dbi_flags));
  exports.Set(String::New(env, "dbi_close"), Function::New(env, lmdb_dbi_close));
  exports.Set(String::New(env, "mdb_drop"), Function::New(env, lmdb_mdb_drop));
  exports.Set(String::New(env, "get"), Function::New(env, lmdb_get));
  exports.Set(String::New(env, "put"), Function::New(env, lmdb_put));
  exports.Set(String::New(env, "del"), Function::New(env, lmdb_del));
  exports.Set(String::New(env, "cursor_open"), Function::New(env, lmdb_cursor_open));
  exports.Set(String::New(env, "cursor_close"), Function::New(env, lmdb_cursor_close));
  exports.Set(String::New(env, "cursor_renew"), Function::New(env, lmdb_cursor_renew));
  exports.Set(String::New(env, "cursor_txn"), Function::New(env, lmdb_cursor_txn));
  exports.Set(String::New(env, "cursor_dbi"), Function::New(env, lmdb_cursor_dbi));
  exports.Set(String::New(env, "cursor_get"), Function::New(env, lmdb_cursor_get));
  exports.Set(String::New(env, "cursor_put"), Function::New(env, lmdb_cursor_put));
  exports.Set(String::New(env, "cursor_del"), Function::New(env, lmdb_cursor_del));
  exports.Set(String::New(env, "cursor_count"), Function::New(env, lmdb_cursor_count));
  exports.Set(String::New(env, "cmp"), Function::New(env, lmdb_cmp));
  exports.Set(String::New(env, "dcmp"), Function::New(env, lmdb_dcmp));
  exports.Set(String::New(env, "reader_check"), Function::New(env, lmdb_reader_check));
  return exports;
}

NODE_API_MODULE(addon, Init)
