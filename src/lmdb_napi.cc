#include <napi.h>
#include <stdio.h>
#include <string.h>
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


Value throw_undefined(Env env, int rc) {
    char *msg = mdb_strerror(rc);
    Error::New(env, msg).ThrowAsJavaScriptException();
    return env.Undefined();
}

void throw_void(Env env, int rc) {
    char *msg = mdb_strerror(rc);
    Error::New(env, msg).ThrowAsJavaScriptException();
}

bool NOLOSS;
MDB_env *unwrap_env(const CallbackInfo& info) {
  uint64_t addr = info[0].As<BigInt>().Uint64Value(&NOLOSS);
  DEBUG_PRINT(("unwrap_env: addr=%llx\n", addr));
  return (MDB_env *) addr;
}

////////////////////////////////////////////////////////
// LMDB method wrappers start here
////////////////////////////////////////////////////////

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

Value lmdb_env_create(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv;
  int rc = mdb_env_create(&penv);
  DEBUG_PRINT(("mdb_env_create(%p): %d\n", penv, rc));
  if (rc) return throw_undefined(env, rc);
  return BigInt::New(env, (uint64_t)penv);
}

void lmdb_env_open(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv = unwrap_env(info);
  std::string path = info[1].As<String>().Utf8Value();
  unsigned int flags = (unsigned int)info[2].As<Number>().Uint32Value();
  unsigned int mode = (unsigned int)info[3].As<Number>().Uint32Value();
  int rc = mdb_env_open(penv, path.c_str(), (unsigned int)flags, (mdb_mode_t)mode);
  DEBUG_PRINT(("mdb_env_open(%p, '%s', %d, 0%03o): %d\n", penv, path.c_str(), flags, mode, rc));
  if (rc) return throw_void(env, rc);
}

void lmdb_env_close(const CallbackInfo& info) {
  MDB_env *penv = unwrap_env(info);
  mdb_env_close(penv);
  DEBUG_PRINT(("mdb_env_close(%p)\n", penv));
}

void lmdb_env_copy(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv = unwrap_env(info);
  std::string path = info[1].As<String>().Utf8Value();
  unsigned int flags = (unsigned int)info[2].As<Number>().Uint32Value();
  int rc = mdb_env_copy2(penv, path.c_str(), flags);
  DEBUG_PRINT(("mdb_penv_copy2(%p, '%s', %d): %d\n", penv, path.c_str(), flags, rc));
  if (rc) return throw_void(env, rc);
}

void lmdb_env_copyfd(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv = unwrap_env(info);
  mdb_filehandle_t fd = (mdb_filehandle_t)info[1].As<Number>().Int64Value();
  unsigned int flags = (unsigned int)info[2].As<Number>().Uint32Value();
  int rc = mdb_env_copyfd2(penv, fd, flags);
  DEBUG_PRINT(("mdb_penv_copyfd2(%p, %llu, %d): %d\n", penv, (unsigned long long)fd, flags, rc));
  if (rc) return throw_void(env, rc);
}

Value lmdb_env_stat(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv = unwrap_env(info);
  MDB_stat stat;
  int rc = mdb_env_stat(penv, &stat);
  DEBUG_PRINT(("mdb_env_stat(%p, %p): %d\n", penv, &stat, rc));
  if (rc) return throw_undefined(env, rc);
  Object obj = Object::New(env);
  obj.Set("pageSize", stat.ms_psize);
  obj.Set("depth", stat.ms_depth);
  obj.Set("branchPages", stat.ms_branch_pages);
  obj.Set("leafPages", stat.ms_leaf_pages);
  obj.Set("overflowPages", stat.ms_overflow_pages);
  obj.Set("entries", stat.ms_entries);
  return obj;
}

Value lmdb_env_info(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv = unwrap_env(info);
  MDB_envinfo envinfo;
  int rc = mdb_env_info(penv, &envinfo);
  DEBUG_PRINT(("mdb_env_info(%p, %p): %d\n", penv, &envinfo, rc));
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
  MDB_env *penv = unwrap_env(info);
  int force = (int)info[1].As<Number>().Int32Value();
  int rc = mdb_env_sync(penv, force);
  DEBUG_PRINT(("mdb_env_sync(%p, %d)\n", penv, force));
  if (rc) return throw_void(env, rc);
}

void lmdb_env_set_flags(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv = unwrap_env(info);
  unsigned int flags = (unsigned int) info[1].As<Number>().Uint32Value();
  int onoff = (int) info[2].As<Number>().Int32Value();
  int rc = mdb_env_set_flags(penv, flags, onoff);
  DEBUG_PRINT(("mdb_env_set_flags(%p, 0x%x, %d): %d\n", penv, flags, onoff, rc));
  if(rc) return throw_void(env, rc);
}

Value lmdb_env_get_flags(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv = unwrap_env(info);
  unsigned int flags;
  int rc = mdb_env_get_flags(penv, &flags);
  DEBUG_PRINT(("mdb_env_get_flags(%p, 0x%x): %d\n", penv, flags, rc));
  if (rc) return throw_undefined(env, rc);
  Object obj = Object::New(env);
  obj.Set("flags", flags);
  obj.Set("fixedMap", flags & MDB_FIXEDMAP ? true : false);
  obj.Set("noSubdir", flags & MDB_NOSUBDIR ? true : false);
  obj.Set("readOnly", flags & MDB_RDONLY ? true : false);
  obj.Set("writeMap", flags & MDB_WRITEMAP ? true : false);
  obj.Set("noTLS", flags & MDB_NOTLS ? true : false);
  obj.Set("noLock", flags & MDB_NOLOCK ? true : false);
  obj.Set("noReadAhead", flags & MDB_NORDAHEAD ? true : false);
  obj.Set("noMetaSync", flags & MDB_NOMETASYNC ? true : false);
  obj.Set("noSync", flags & MDB_NOSYNC ? true : false);
  obj.Set("mapAsync", flags & MDB_MAPASYNC ? true : false);
  obj.Set("noMemInit", flags & MDB_NOMEMINIT ? true : false);
  return obj;
}

Value lmdb_env_get_path(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv = unwrap_env(info);
  const char *path;
  int rc = mdb_env_get_path(penv, &path);
  DEBUG_PRINT(("mdb_env_get_path(%p, '%s'): %d\n", penv, path, rc));
  if (rc) return throw_undefined(env, rc);
  return String::New(env, path);
}

Value lmdb_env_get_fd(const CallbackInfo& info) {
  Env env = info.Env();
  MDB_env *penv = unwrap_env(info);
  mdb_filehandle_t fd;
  int rc = mdb_env_get_fd(penv, &fd);
  if (rc) return throw_undefined(env, rc);
  return Number::New(env, (uint64_t)fd);
}

Object Init(Env env, Object exports) {
  exports.Set(String::New(env, "version"), Function::New(env, lmdb_version));
  exports.Set(String::New(env, "strerror"), Function::New(env, lmdb_strerror));
  exports.Set(String::New(env, "env_create"), Function::New(env, lmdb_env_create));
  exports.Set(String::New(env, "env_open"), Function::New(env, lmdb_env_open));
  exports.Set(String::New(env, "env_copy"), Function::New(env, lmdb_env_copy));
  exports.Set(String::New(env, "env_close"), Function::New(env, lmdb_env_close));
  exports.Set(String::New(env, "env_copy"), Function::New(env, lmdb_env_copy));
  exports.Set(String::New(env, "env_copyfd"), Function::New(env, lmdb_env_copyfd));
  exports.Set(String::New(env, "env_stat"), Function::New(env, lmdb_env_stat));
  exports.Set(String::New(env, "env_info"), Function::New(env, lmdb_env_info));
  exports.Set(String::New(env, "env_sync"), Function::New(env, lmdb_env_sync));
  exports.Set(String::New(env, "env_set_flags"), Function::New(env, lmdb_env_set_flags));
  exports.Set(String::New(env, "env_get_flags"), Function::New(env, lmdb_env_get_flags));
  exports.Set(String::New(env, "env_get_path"), Function::New(env, lmdb_env_get_path));
  exports.Set(String::New(env, "env_get_fd"), Function::New(env, lmdb_env_get_fd));
  return exports;
}

NODE_API_MODULE(addon, Init)
