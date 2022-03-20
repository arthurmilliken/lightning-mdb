#include <errno.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "lmdb.h"

#define CSTR_FROM_VAL(var, from)           \
  char var[from.mv_size + 1];              \
  memcpy(var, from.mv_data, from.mv_size); \
  var[from.mv_size] = '\0'

#define DEBUG 1
#if DEBUG
#define DEBUG_PRINT(x) printf x
#else
#define DEBUG_PRINT(x) \
  do                   \
  {                    \
  } while (0)
#endif

void wrap_cstr(char *cstr, uint8_t *wrapper)
{
  uint64_t addr = (uint64_t)cstr;
  memcpy(wrapper, &addr, sizeof(addr));
}

size_t sizedbl = sizeof(double);

///////////////////////////////////////////////
// global functions
///////////////////////////////////////////////

/**
 * @brief mdb_version wrapper
 *
 * @param[out] major
 * @param[out] minor
 * @param[out] patch
 * @return uint8_t* C string
 */
uint8_t *ffi_version(int32_t *major, int32_t *minor, int32_t *patch)
{
  static int _major, _minor, _patch;
  static uint8_t *version;
  if (!version)
  {
    version = (uint8_t *)mdb_version(&_major, &_minor, &_patch);
  }
  *major = (int32_t)_major;
  *minor = (int32_t)_minor;
  *patch = (int32_t)_patch;
  return version;
}

/**
 * @brief mdb_strerror wrapper
 *
 * @param error code
 * @return uint8_t* C string
 */
uint8_t *ffi_strerror(int32_t error)
{
  return (uint8_t *)mdb_strerror((int)error);
}

void wrap_val(MDB_val val, uint8_t *wrapper)
{
  memcpy(wrapper, &val.mv_size, sizeof(val.mv_size));
  memcpy(wrapper + sizeof(val.mv_size), &val.mv_data, sizeof(val.mv_data));
}

MDB_val unwrap_val(uint8_t *wrapper)
{
  MDB_val val;
  memcpy(&val.mv_size, wrapper, sizeof(val.mv_size));
  memcpy(&val.mv_data, wrapper + sizeof(val.mv_size), sizeof(val.mv_data));
  return val;
}

///////////////////////////////////////////////
// MDB_env functions
///////////////////////////////////////////////

void wrap_env(MDB_env *env, uint8_t *wrapper)
{
  uint64_t addr = (uint64_t)env;
  memcpy(wrapper, &addr, sizeof(addr));
}

MDB_env *unwrap_env(uint8_t *wrapper)
{
  uint64_t addr;
  memcpy(&addr, wrapper, sizeof(addr));
  return (MDB_env *)addr;
}

/**
 * @brief mdb_env_create wrapper
 * @param[out] fenv FFI wrapper containing pointer to new MDB_env
 * @return 0 on success, non-zero otherwise
 */
int32_t ffi_env_create(uint8_t *fenv)
{
  MDB_env *env;
  int rc = mdb_env_create(&env);
  DEBUG_PRINT(("mdb_env_create(%p): %d\n", env, rc));
  wrap_env(env, fenv);
  return rc;
}

/**
 * @brief mdb_env_open wrapper
 *
 * @param fenv MDB_env wrapper
 * @param fpath MDB_val wrapper
 * @param flags
 * @param mode
 * @return int32_t 0 on success, non-zero otherwise
 */
int32_t ffi_env_open(uint8_t *fenv, uint8_t *fpath, uint32_t flags, uint32_t mode)
{
  MDB_env *env = unwrap_env(fenv);
  MDB_val path = unwrap_val(fpath);
  CSTR_FROM_VAL(cpath, path);
  int rc = mdb_env_open(env, cpath, (unsigned int)flags, (mdb_mode_t)mode);
  DEBUG_PRINT(("mdb_env_open(%p, '%s', %d, 0%03o): %d\n", env, cpath, flags, mode, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_copy wrapper */
int32_t ffi_env_copy(uint8_t *fenv, uint8_t *fpath)
{
  MDB_env *env = unwrap_env(fenv);
  MDB_val path = unwrap_val(fpath);
  CSTR_FROM_VAL(cpath, path);
  int rc = mdb_env_copy(env, cpath);
  DEBUG_PRINT(("mdb_env_copy(%p, '%s'): %d\n", env, cpath, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_copyfd wrapper */
int32_t ffi_env_copyfd(uint8_t *fenv, int32_t fd)
{
  MDB_env *env = unwrap_env(fenv);
  int rc = mdb_env_copyfd(env, (mdb_filehandle_t)fd);
  DEBUG_PRINT(("mdb_env_copyfd(%p, %d): %d\n", env, fd, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_copy2 wrapper */
int32_t ffi_env_copy2(uint8_t *fenv, uint8_t *fpath, uint32_t flags)
{
  MDB_env *env = unwrap_env(fenv);
  MDB_val path = unwrap_val(fpath);
  CSTR_FROM_VAL(cpath, path);
  int rc = mdb_env_copy2(env, cpath, (unsigned int)flags);
  DEBUG_PRINT(("mdb_env_copy2(%p, '%s', %d)\n", env, cpath, flags));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_copyfd2 wrapper */
int32_t ffi_env_copyfd2(uint8_t *fenv, int32_t fd, uint32_t flags)
{
  MDB_env *env = unwrap_env(fenv);
  int rc = mdb_env_copyfd2(env, (mdb_filehandle_t)fd, (unsigned int)flags);
  DEBUG_PRINT(("mdb_env_copyfd2(%p, %d, %d): %d", env, fd, flags, rc));
  return (int32_t)rc;
}

#define STAT_PSIZE 0
#define STAT_DEPTH 1
#define STAT_BRANCH_PAGES 2
#define STAT_LEAF_PAGES 3
#define STAT_OVERFLOW_PAGES 4
#define STAT_ENTRIES 5

/** Serialize MDB_stat object src into dest */
void copy_stat(uint8_t *dest, MDB_stat *src)
{
  double psize = (double)src->ms_psize;
  double depth = (double)src->ms_depth;
  double branch_pages = (double)src->ms_branch_pages;
  double leaf_pages = (double)src->ms_leaf_pages;
  double overflow_pages = (double)src->ms_overflow_pages;
  double entries = (double)src->ms_overflow_pages;
  memcpy(dest + (STAT_PSIZE * sizedbl), &psize, sizedbl);
  memcpy(dest + (STAT_DEPTH * sizedbl), &depth, sizedbl);
  memcpy(dest + (STAT_BRANCH_PAGES * sizedbl), &branch_pages, sizedbl);
  memcpy(dest + (STAT_LEAF_PAGES * sizedbl), &leaf_pages, sizedbl);
  memcpy(dest + (STAT_OVERFLOW_PAGES * sizedbl), &overflow_pages, sizedbl);
  memcpy(dest + (STAT_ENTRIES * sizedbl), &entries, sizedbl);
}

/**
 * @brief mdb_env_stat wrapper
 * @param[in] fenv MDB_env wrapper
 * @param[out] fstat_dbl array of doubles containing MDB_stat data
 */
int32_t ffi_env_stat(uint8_t *fenv, u_int8_t *fstat_dbl)
{
  MDB_env *env = unwrap_env(fenv);
  MDB_stat stat;
  int rc = mdb_env_stat(env, &stat);
  DEBUG_PRINT(("mdb_env_stat(%p, %p): %d\n", env, &stat, rc));
  copy_stat(fstat_dbl, &stat);
  return (int32_t)rc;
}

#define INFO_MAPSIZE 0
#define INFO_LAST_PGNO 1
#define INFO_LAST_TXNID 2
#define INFO_MAXREADERS 3
#define INFO_NUMREADERS 4

/**
 * @brief mdb_env_info wrapper
 * @param[in] fenv MDB_env wrapper
 * @param[out] finfo_dbl array of doubles containing MDB_envinfo data
 */
int32_t ffi_env_info(uint8_t *fenv, u_int8_t *finfo_dbl)
{
  MDB_env *env = unwrap_env(fenv);
  MDB_envinfo info;
  int rc = mdb_env_info(env, &info);
  DEBUG_PRINT(("mdb_env_info(%p, %p): %d\n", env, &info, rc));
  double mapsize = (double)info.me_mapsize;
  double last_pgno = (double)info.me_last_pgno;
  double last_txnid = (double)info.me_last_txnid;
  double maxreaders = (double)info.me_maxreaders;
  double numreaders = (double)info.me_numreaders;
  memcpy(finfo_dbl + (INFO_MAPSIZE * sizedbl), &mapsize, sizedbl);
  memcpy(finfo_dbl + (INFO_LAST_PGNO * sizedbl), &last_pgno, sizedbl);
  memcpy(finfo_dbl + (INFO_LAST_TXNID * sizedbl), &last_txnid, sizedbl);
  memcpy(finfo_dbl + (INFO_MAXREADERS * sizedbl), &maxreaders, sizedbl);
  memcpy(finfo_dbl + (INFO_NUMREADERS * sizedbl), &numreaders, sizedbl);
  return (int32_t)rc;
}

/**
 * @brief mdb_env_sync wrapper */
int32_t ffi_env_sync(uint8_t *fenv, int32_t force)
{
  MDB_env *env = unwrap_env(fenv);
  int rc = mdb_env_sync(env, (int)force);
  DEBUG_PRINT(("mdb_env_sync(%p, %d)\n", env, force));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_close wrapper */
void ffi_env_close(uint8_t *fenv)
{
  MDB_env *env = unwrap_env(fenv);
  mdb_env_close(env);
  DEBUG_PRINT(("mdb_env_close(%p)\n", env));
}

/**
 * @brief mdb_env_set_flags wrapper */
int32_t ffi_env_set_flags(uint8_t *fenv, uint32_t flags, int32_t onoff)
{
  MDB_env *env = unwrap_env(fenv);
  int rc = mdb_env_set_flags(env, (unsigned int)flags, (int)onoff);
  DEBUG_PRINT(("mdb_env_set_flags(%p, 0x%x, %d): %d\n", env, flags, onoff, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_get_flags wrapper
 * @param[in] fenv MDB_env wrapper
 * @param[out] flags
 */
int32_t ffi_env_get_flags(uint8_t *fenv, uint32_t *flags)
{
  MDB_env *env = unwrap_env(fenv);
  unsigned int _flags;
  int rc = mdb_env_get_flags(env, &_flags);
  DEBUG_PRINT(("mdb_env_get_flags(%p, 0x%x): %d\n", env, _flags, rc));
  *flags = (uint32_t)_flags;
  return (int32_t)rc;
}

/**
 * @brief mdb_env_get_path wrapper
 * @param[in] fenv MDB_env wrapper
 * @param[out] fpath MDB_val wrapper
 */
int32_t ffi_env_get_path(uint8_t *fenv, uint8_t *fpath)
{
  MDB_env *env = unwrap_env(fenv);
  char *cpath;
  int rc = mdb_env_get_path(env, (const char **)&cpath);
  DEBUG_PRINT(("mdb_env_get_path(%p, '%s'): %d\n", env, cpath, rc));
  MDB_val path;
  path.mv_size = strlen(cpath);
  path.mv_data = cpath;
  wrap_val(path, fpath);
  return (int32_t)rc;
}

/**
 * @brief mdb_env_get_fd wrapper
 * @param[in] fenv MDB_env wrapper
 * @param[out] fd file descriptor
 */
int32_t ffi_env_get_fd(uint8_t *fenv, int32_t *fd)
{
  MDB_env *env = unwrap_env(fenv);
  int rc = mdb_env_get_fd(env, fd);
  DEBUG_PRINT(("mdb_env_get_fd(%p, %d): %d\n", env, *fd, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_set_mapsize wrapper */
int32_t ffi_env_set_mapsize(uint8_t *fenv, uint64_t size)
{
  MDB_env *env = unwrap_env(fenv);
  int rc = mdb_env_set_mapsize(env, (mdb_size_t)size);
  DEBUG_PRINT(("mdb_env_set_mapsize(%p, %ld): %d\n", env, size, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_set_maxreaders wrapper
 * NOTE: Must be called before ffi_env_open().
 * */
int32_t ffi_env_set_maxreaders(uint8_t *fenv, uint32_t readers)
{
  MDB_env *env = unwrap_env(fenv);
  int rc = mdb_env_set_maxreaders(env, (unsigned int)readers);
  DEBUG_PRINT(("mdb_env_set_maxreaders(%p, %d): %d\n", env, readers, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_get_maxreaders wrapper
 * @param[in] fenv MDB_env wrapper
 * @param[out] readers
 */
int32_t ffi_env_get_maxreaders(uint8_t *fenv, uint32_t *readers)
{
  MDB_env *env = unwrap_env(fenv);
  unsigned int _readers;
  int rc = mdb_env_get_maxreaders(env, &_readers);
  DEBUG_PRINT(("mdb_env_get_maxreaders(%p, %d): %d\n", env, _readers, rc));
  *readers = (uint32_t)_readers;
  return (int32_t)rc;
}

/**
 * @brief mdb_env_set_maxdbs wrapper
 * NOTE: Must be called before ffi_env_open()
 */
int32_t ffi_env_set_maxdbs(uint8_t *fenv, uint32_t dbs)
{
  MDB_env *env = unwrap_env(fenv);
  int rc = mdb_env_set_maxdbs(env, (MDB_dbi)dbs);
  DEBUG_PRINT(("mdb_env_set_maxdbs(%p, %d): %d\n", env, dbs, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_get_maxkeysize wrapper
 * @param[in] fenv MDB_env wrapper
 * @returns max keysize, in bytes
 */
int32_t ffi_env_get_maxkeysize(uint8_t *fenv)
{
  MDB_env *env = unwrap_env(fenv);
  int keysize = mdb_env_get_maxkeysize(env);
  DEBUG_PRINT(("mdb_env_get_maxkeysize(%p): %d\n", env, keysize));
  return (int32_t)keysize;
}

/**
 * @brief mdb_env_set_userctx wrapper
 * @param[in] fenv MDB_env wrapper
 * @param[in] ctx a user-defined object
 */
int32_t ffi_env_set_userctx(uint8_t *fenv, void *ctx)
{
  MDB_env *env = unwrap_env(fenv);
  int rc = mdb_env_set_userctx(env, ctx);
  DEBUG_PRINT(("mdb_env_set_userctx(%p, %p): %d\n", env, ctx, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_env_get_userctx wrapper
 * @param[in] fenv MDB_env wrapper
 * @returns the ctx object passed into ffi_env_set_userctx()
 */
void *ffi_env_get_userctx(uint8_t *fenv)
{
  MDB_env *env = unwrap_env(fenv);
  DEBUG_PRINT(("mdb_env_get_userctx(%p)\n", env));
  return mdb_env_get_userctx(env);
}

///////////////////////////////////////////////
// MDB_txn functions
///////////////////////////////////////////////

void wrap_txn(MDB_txn *txn, uint8_t *wrapper)
{
  uint64_t addr = (uint64_t)txn;
  memcpy(wrapper, &addr, sizeof(addr));
}

MDB_txn *unwrap_txn(uint8_t *wrapper)
{
  uint64_t addr;
  memcpy(&addr, wrapper, sizeof(addr));
  return (MDB_txn *)addr;
}

/**
 * @brief mdb_txn_begin wrapper
 * @param[in] fenv MDB_env wrapper
 * @param[in] fparent MDB_txn wrapper or NULL
 * @param[in] flags
 * @param[out] ftxn FFI wrapper containing pointer to new MDB_txn
 * @returns 0 on success, non-zero otherwise
 */
int32_t ffi_txn_begin(uint8_t *fenv, uint8_t *fparent, uint32_t flags, uint8_t *ftxn)
{
  MDB_env *env = unwrap_env(fenv);
  MDB_txn *parent;
  if (fparent)
    parent = unwrap_txn(fparent);
  else
    parent = NULL;
  MDB_txn *txn;
  int rc = mdb_txn_begin(env, parent, (unsigned int)flags, &txn);
  DEBUG_PRINT(("mdb_txn_begin(%p, %p, %d, %p): %d\n", env, parent, flags, txn, rc));
  uint64_t txn_addr = (uint64_t)txn;
  memcpy(ftxn, &txn_addr, sizeof(txn_addr));
  return (int32_t)rc;
}

/**
 * @brief mdb_txn_env wrapper
 * @param[in] ftxn MDB_txn wrapper
 * @returns address of MDB_env object, which must be wrapped.
 */
uint64_t ffi_txn_env(uint8_t *ftxn)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  MDB_env *env = mdb_txn_env(txn);
  DEBUG_PRINT(("mdb_txn_env(%p): %p\n", txn, env));
  return (uint64_t)env;
}

/**
 * @brief mdb_txn_id wrapper
 * @param[in] ftxn
 * @returns id of wrapped MDB_txn
 */
size_t ffi_txn_id(uint8_t *ftxn)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  DEBUG_PRINT(("mdb_txn_id(%p)\n", txn));
  return (size_t)mdb_txn_id(txn);
}

/**
 * @brief mdb_txn_commit wrapper */
int32_t ffi_txn_commit(uint8_t *ftxn)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  int rc = mdb_txn_commit(txn);
  DEBUG_PRINT(("mdb_txn_commit(%p): %d\n", txn, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_txn_abort wrapper */
void ffi_txn_abort(uint8_t *ftxn)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  mdb_txn_abort(txn);
  DEBUG_PRINT(("mdb_txn_abort(%p)\n", txn));
}

/**
 * @brief mdb_txn_reset wrapper */
void ffi_txn_reset(uint8_t *ftxn)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  mdb_txn_reset(txn);
  DEBUG_PRINT(("mdb_txn_reset(%p)\n", txn));
}

/**
 * @brief mdb_txn_renew wrapper */
uint32_t ffi_txn_renew(uint8_t *ftxn)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  int rc = mdb_txn_renew(txn);
  DEBUG_PRINT(("mdb_txn_renew(%p): %d\n", txn, rc));
  return (uint32_t)rc;
}

///////////////////////////////////////////////
// MDB_dbi functions
///////////////////////////////////////////////

/**
 * @brief mdb_dbi_open wrapper
 * @param[in] ftxn MDB_txn wrapper
 * @param[in] fname MDB_val wrapper or null
 * @param[in] flags
 * @param[out] MDB_dbi handle
 * @returns 0 on success, non-zero otherwise
 */
int32_t ffi_dbi_open(uint8_t *ftxn,
                     uint8_t *fname,
                     uint32_t flags,
                     uint32_t *dbi)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  const char *name;
  if (fname)
  {
    MDB_val nameval = unwrap_val(fname);
    CSTR_FROM_VAL(cname, nameval);
    name = cname;
  }
  else
    name = NULL;
  MDB_dbi _dbi;
  // DEBUG_PRINT comes before mdb_dbi_open() because name ptr gets redirected.
  DEBUG_PRINT(("mdb_dbi_open(%p, '%s', 0x%x, %d):\n", txn, name, flags, _dbi));
  int rc = mdb_dbi_open(txn, name, (unsigned int)flags, &_dbi);
  *dbi = _dbi;
  return (int32_t)rc;
}

/**
 * @brief mdb_stat wrapper
 * @param[in] ftxn MDB_txn wrapper
 * @param[in] dbi MDB_dbi handle
 * @param[out] fstat_dbl array of doubles containing MDB_stat data
 * @returns 0 on success, non-zero otherwise
 */
int32_t ffi_stat(uint8_t *ftxn, uint32_t dbi, uint8_t *fstat_dbl)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  MDB_stat stat;
  int rc = mdb_stat(txn, (MDB_dbi)dbi, &stat);
  DEBUG_PRINT(("mdb_stat(%p, %d, %p): %d\n", txn, dbi, &stat, rc));
  copy_stat(fstat_dbl, &stat);
  return (int32_t)rc;
}

/**
 * @brief mdb_dbi_flags wrapper
 * @param[in] ftxn MDB_txn wrapper
 * @param[in] dbi MDB_dbi handle
 * @param[out] flags
 * @returns 0 on success, non-zero otherwise
 */
int32_t ffi_dbi_flags(uint8_t *ftxn, uint32_t dbi, uint32_t *flags)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  unsigned int _flags;
  int rc = mdb_dbi_flags(txn, (MDB_dbi)dbi, &_flags);
  DEBUG_PRINT(("mdb_dbi_flags(%p, %d, 0x%x): %d\n", txn, dbi, _flags, rc));
  *flags = (uint32_t)_flags;
  return (int32_t)rc;
}

/**
 * @brief mdb_dbi_close wrapper */
void ffi_dbi_close(uint8_t *fenv, uint32_t dbi)
{
  MDB_env *env = unwrap_env(fenv);
  mdb_dbi_close(env, (MDB_dbi)dbi);
  DEBUG_PRINT(("mdb_dbi_close(%p, %d)\n", env, dbi));
}

#define DROP_EMPTY 0
#define DROP_DELETE 1
/**
 * @brief mdb_drop wrapper */
int32_t ffi_drop(uint8_t *ftxn, uint32_t dbi, uint32_t del)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  int rc = mdb_drop(txn, (MDB_dbi)dbi, (int)del);
  DEBUG_PRINT(("mdb_drop(%p, %d): %d\n", txn, dbi, del));
  return (int32_t)rc;
}

/**
 * @brief mdb_get wrapper
 * @param[in] ftxn MDB_txn wrapper
 * @param[in] dbi MDB_dbi handle
 * @param[in] fkey MDB_val wrapper
 * @param[out] fdata MDB_val wrapper
 * @returns 0 on success, non-zero otherwise
 */
int32_t ffi_get(uint8_t *ftxn,
                uint32_t dbi,
                uint8_t *fkey,
                uint8_t *fdata)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  MDB_val key = unwrap_val(fkey);
  MDB_val data = unwrap_val(fdata);
  int rc = mdb_get(txn, (MDB_dbi)dbi, &key, &data);
  DEBUG_PRINT(("mdb_get(%p, %d, %p, %p): %d\n", txn, dbi, &key, &data, rc));
  wrap_val(data, fdata);
  return (int32_t)rc;
}

/**
 * @brief mdb_put wrapper
 * @param[in] ftxn MDB_txn wrapper
 * @param[in] dbi MDB_dbi handle
 * @param[in] fkey MDB_val wrapper
 * @param[in,out] fdata MDV_val wrapper
 * @param[in] flags
 * @returns 0 on success, non-zero otherwise
 */
int32_t ffi_put(uint8_t *ftxn,
                uint32_t dbi,
                uint8_t *fkey,
                uint8_t *fdata,
                uint32_t flags)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  MDB_val key = unwrap_val(fkey);
  MDB_val data = unwrap_val(fdata);
#if DEBUG
  CSTR_FROM_VAL(ckey, key);
  CSTR_FROM_VAL(cdata, data);
  DEBUG_PRINT(("ffi_put: key='%s', data='%s'\n", ckey, cdata));
#endif
  int rc = mdb_put(txn, (MDB_dbi)dbi, &key, &data, (unsigned int)flags);
  DEBUG_PRINT(("mdb_put(%p, %d, %p, %p): %d\n", txn, dbi, &key, &data, rc));
  wrap_val(key, fkey);
  wrap_val(data, fdata);
  return (int32_t)rc;
}

/**
 * @brief mdb_del wrapper */
int32_t ffi_del(uint8_t *ftxn,
                uint32_t dbi,
                uint8_t *fkey,
                uint8_t *fdata)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  MDB_val key = unwrap_val(fkey);
  int rc;
  if (fdata)
  {
    MDB_val data = unwrap_val(fdata);
    rc = mdb_del(txn, (MDB_dbi)dbi, &key, &data);
    DEBUG_PRINT(("mdb_del(%p, %d, %p, %p): %d\n", txn, dbi, &key, &data, rc));
  }
  else
  {
    rc = mdb_del(txn, (MDB_dbi)dbi, &key, NULL);
    DEBUG_PRINT(("mdb_del(%p, %d, %p, %p): %d\n", txn, dbi, &key, NULL, rc));
  }
  return (int32_t)rc;
}

///////////////////////////////////////////////
// MDB_cursor functions
///////////////////////////////////////////////

void wrap_cursor(MDB_cursor *cursor, uint8_t *wrapper)
{
  uint64_t addr = (uint64_t)cursor;
  memcpy(wrapper, &addr, sizeof(addr));
}

MDB_cursor *unwrap_cursor(uint8_t *wrapper)
{
  uint64_t addr;
  memcpy(&addr, wrapper, sizeof(addr));
  return (MDB_cursor *)addr;
}

/**
 * @brief mdb_cursor_open wrapper
 *
 * @param[in] ftxn MDB_txn wrapper
 * @param[in] dbi MDB_dbi handle
 * @param[out] fcursor FFI wrapper for new MDB_cursor
 * @return int32_t 0 on success, non-zero otherwise
 */
int32_t ffi_cursor_open(uint8_t *ftxn, uint32_t dbi, uint8_t *fcursor)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  MDB_cursor *cursor;
  int rc = mdb_cursor_open(txn, dbi, &cursor);
  DEBUG_PRINT(("mdb_cursor_open(%p, %d, %p): %d\n", txn, dbi, cursor, rc));
  wrap_cursor(cursor, fcursor);
  return (int32_t)rc;
}

/**
 * @brief mdb_cursor_close wrapper
 *
 * @param fcursor
 */
void ffi_cursor_close(uint8_t *fcursor)
{
  MDB_cursor *cursor = unwrap_cursor(fcursor);
  mdb_cursor_close(cursor);
  DEBUG_PRINT(("mdb_cursor_close(%p)\n", cursor));
}

/**
 * @brief mdb_cursor_renew wrapper
 *
 * @param ftxn
 * @param fcursor
 * @return int32_t
 */
int32_t ffi_cursor_renew(uint8_t *ftxn, uint8_t *fcursor)
{
  MDB_txn *txn = unwrap_txn(ftxn);
  MDB_cursor *cursor = unwrap_cursor(fcursor);
  int rc = mdb_cursor_renew(txn, cursor);
  DEBUG_PRINT(("mdb_cursor_renew(%p, %p): %d\n", txn, cursor, rc));
  return (int32_t)rc;
}

/**
 * @brief mdb_cursor_txn wrapper
 *
 * @param fcursor
 * @return uint64_t
 */
uint64_t ffi_cursor_txn(uint8_t *fcursor)
{
  MDB_cursor *cursor = unwrap_cursor(fcursor);
  MDB_txn *txn = mdb_cursor_txn(cursor);
  DEBUG_PRINT(("mdb_cursor_txn(%p): %p\n", cursor, txn));
  return (uint64_t)txn;
}

/**
 * @brief mdb_cursor_dbi wrapper
 *
 * @param fcursor
 * @return uint32_t
 */
uint32_t ffi_cursor_dbi(uint8_t *fcursor)
{
  MDB_cursor *cursor = unwrap_cursor(fcursor);
  MDB_dbi dbi = mdb_cursor_dbi(cursor);
  DEBUG_PRINT(("mdb_cursor_dbi(%p): %d\n", cursor, dbi));
  return (uint32_t)dbi;
}

/**
 * @brief mdb_cursor_get wrapper
 *
 * @param[in] fcursor MDB_cursor wrapper
 * @param[in,out] fkey MDB_val wrapper for key
 * @param[in,out] fdata MDB_val wrapper for data
 * @param[in] op cursor operation
 * @return int32_t 0 on success, non-zero otherwise
 */
int32_t ffi_cursor_get(uint8_t *fcursor,
                       uint8_t *fkey,
                       uint8_t *fdata,
                       uint32_t op)
{
  MDB_cursor *cursor = unwrap_cursor(fcursor);
  MDB_val key = unwrap_val(fkey);
  MDB_val data = unwrap_val(fdata);
  int rc = mdb_cursor_get(cursor, &key, &data, (MDB_cursor_op)op);
  DEBUG_PRINT(("mdb_cursor_get(%p, %p, %p, %d): %d\n", cursor, &key, &data, op, rc));
  wrap_val(key, fkey);
  wrap_val(data, fdata);
  return (int32_t)rc;
}

/**
 * @brief mdb_cursor_put wrapper
 *
 * @param[in] fcursor
 * @param[in] fkey
 * @param[in] fdata
 * @param[in] flags
 * @return uint32_t 0 on success, non-zero otherwise
 */
int32_t ffi_cursor_put(uint8_t *fcursor, uint8_t *fkey, uint8_t *fdata, uint32_t flags)
{
  MDB_cursor *cursor = unwrap_cursor(fcursor);
  MDB_val key = unwrap_val(fkey);
  MDB_val data = unwrap_val(fdata);
#if DEBUG
  CSTR_FROM_VAL(ckey, key);
  CSTR_FROM_VAL(cdata, data);
  DEBUG_PRINT(("ffi_cursor_put: key='%s', data='%s'\n", ckey, cdata));
#endif
  int rc = mdb_cursor_put(cursor, &key, &data, (unsigned int)flags);
  DEBUG_PRINT(("mdb_cursor_put(%p, %p, %p, 0x%x): %d\n", cursor, &key, &data, flags, rc));
  wrap_val(key, fkey);
  wrap_val(data, fdata);
  return (int32_t)rc;
}

/**
 * @brief mdb_cursor_del wrapper
 *
 * @param[in] fcursor
 * @param[in] flags
 * @return int32_t 0 on success, non-zero otherwise
 */
int32_t ffi_cursor_del(uint8_t *fcursor, uint32_t flags)
{
  MDB_cursor *cursor = unwrap_cursor(fcursor);
  int rc = mdb_cursor_del(cursor, (unsigned int)flags);
  DEBUG_PRINT(("mdb_cursor_del(%p, %d): %d\n", cursor, flags, rc));
  return (int32_t)rc;
}

///////////////////////////////////////////////////////////////////

int main(int argc, char *argv[])
{
  puts("Hello from main");
  return 0;
}