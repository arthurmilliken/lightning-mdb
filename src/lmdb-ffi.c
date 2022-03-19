#include <errno.h>
#include <pthread.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "lmdb.h"

#define DEBUG 1
#if DEBUG
#define DEBUG_PRINT(x) printf x
#else
#define DEBUG_PRINT(x) \
  do                   \
  {                    \
  } while (0)
#endif

#define S_EQUAL(s1, s2) !strcmp(s1, s2)
#define ABORT(msg) (puts(msg), abort())
#define CHECK(test, msg) ((test) ? (void)0 : ((void)fprintf(stderr, "%s:%d: %s: %s (%d)\n", __FILE__, __LINE__, msg, mdb_strerror(rc), rc), abort()))
#define E(expr) CHECK((rc = (expr)) == MDB_SUCCESS, #expr)
#define RES(err, expr) ((rc = expr) == (err) || (CHECK(!rc, #expr), 0))

#define PTR_FROM_WRAPPER(var, type, from)  \
  uint64_t address;                        \
  memcpy(&address, from, sizeof(address)); \
  type var = (type)address

#define CSTR_FROM_UTF8(var, from, len) \
  char var[len + 1];                   \
  memcpy(var, from, len);              \
  var[len] = '\0'

pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
size_t sizeint = sizeof(int32_t);
size_t sizebig = sizeof(size_t);
size_t sizedbl = sizeof(double);

uint8_t *ffi_version(int32_t *major, int32_t *minor, int32_t *patch)
{
  int _major, _minor, _patch;
  uint8_t *version = (uint8_t *)mdb_version(&_major, &_minor, &_patch);
  *major = (int32_t)_major;
  *minor = (int32_t)_minor;
  *patch = (int32_t)_patch;
  return version;
}

uint8_t *ffi_strerror(int32_t error)
{
  return (uint8_t *)mdb_strerror((int)error);
}

int32_t ffi_env_create(uint8_t *fenv)
{
  MDB_env *env;
  int rc = mdb_env_create(&env);
  DEBUG_PRINT(("mdb_env_create(%p): %d\n", env, rc));
  uint64_t addr = (uint64_t)env;
  memcpy(fenv, &addr, sizeof(addr));
  return rc;
}

int32_t ffi_env_open(uint8_t *fenv, uint8_t *path_utf8, size_t pathlen, uint32_t flags, uint32_t mode)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  CSTR_FROM_UTF8(path, path_utf8, pathlen);
  int rc = mdb_env_open(env, path, (unsigned int)flags, (mdb_mode_t)mode);
  DEBUG_PRINT(("mdb_env_open(%p, %s, %d, 0%03o): %d\n", env, path, flags, mode, rc));
  return (int32_t)rc;
}

int32_t ffi_env_copy(uint8_t *fenv, uint8_t *path_utf8, size_t pathlen)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  CSTR_FROM_UTF8(path, path_utf8, pathlen);
  int rc = mdb_env_copy(env, path);
  DEBUG_PRINT(("mdb_env_copy(%p, %s): %d\n", env, path, rc));
  return (int32_t)rc;
}

int32_t ffi_env_copyfd(uint8_t *fenv, int32_t fd)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  int rc = mdb_env_copyfd(env, (mdb_filehandle_t)fd);
  DEBUG_PRINT(("mdb_env_copyfd(%p, %d): %d\n", env, fd, rc));
  return (int32_t)rc;
}

int32_t ffi_env_copy2(uint8_t *fenv, uint8_t *path_utf8, size_t pathlen, uint32_t flags)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  CSTR_FROM_UTF8(path, path_utf8, pathlen);
  int rc = mdb_env_copy2(env, path, (unsigned int)flags);
  DEBUG_PRINT(("mdb_env_copy2(%p, %s, %d)\n", env, path, flags));
  return (int32_t)rc;
}

int32_t ffi_env_copyfd2(uint8_t *fenv, int32_t fd, uint32_t flags)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
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

int32_t ffi_env_stat(uint8_t *fenv, u_int8_t *fstat_dbl)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  MDB_stat stat;
  int rc = mdb_env_stat(env, &stat);
  DEBUG_PRINT(("mdb_env_stat(%p, %p): %d\n", env, &stat, rc));
  double psize = (double)stat.ms_psize;
  double depth = (double)stat.ms_depth;
  double branch_pages = (double)stat.ms_branch_pages;
  double leaf_pages = (double)stat.ms_leaf_pages;
  double overflow_pages = (double)stat.ms_overflow_pages;
  double entries = (double)stat.ms_overflow_pages;
  memcpy(fstat_dbl + (STAT_PSIZE * sizedbl), &psize, sizedbl);
  memcpy(fstat_dbl + (STAT_DEPTH * sizedbl), &depth, sizedbl);
  memcpy(fstat_dbl + (STAT_BRANCH_PAGES * sizedbl), &branch_pages, sizedbl);
  memcpy(fstat_dbl + (STAT_LEAF_PAGES * sizedbl), &leaf_pages, sizedbl);
  memcpy(fstat_dbl + (STAT_OVERFLOW_PAGES * sizedbl), &overflow_pages, sizedbl);
  memcpy(fstat_dbl + (STAT_ENTRIES * sizedbl), &entries, sizedbl);
  return (int32_t)rc;
}

#define INFO_MAPSIZE 0
#define INFO_LAST_PGNO 1
#define INFO_LAST_TXNID 2
#define INFO_MAXREADERS 3
#define INFO_NUMREADERS 4

int32_t ffi_env_info(uint8_t *fenv, u_int8_t *finfo_dbl)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
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

int32_t ffi_env_sync(uint8_t *fenv, int32_t force)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  int rc = mdb_env_sync(env, (int)force);
  DEBUG_PRINT(("mdb_env_sync(%p, %d)\n", env, force));
  return (int32_t)rc;
}

void ffi_env_close(uint8_t *fenv)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  mdb_env_close(env);
  DEBUG_PRINT(("mdb_env_close(%p)\n", env));
}

int32_t ffi_env_set_flags(uint8_t *fenv, uint32_t flags, int32_t onoff)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  int rc = mdb_env_set_flags(env, (unsigned int)flags, (int)onoff);
  DEBUG_PRINT(("mdb_env_set_flags(%p, 0x%x, %d): %d\n", env, flags, onoff, rc));
  return (int32_t)rc;
}

int32_t ffi_env_get_flags(uint8_t *fenv, uint8_t *flags)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  unsigned int _flags;
  int rc = mdb_env_get_flags(env, &_flags);
  DEBUG_PRINT(("mdb_env_get_flags(%p, 0x%x): %d\n", env, _flags, rc));
  *flags = (uint32_t)_flags;
  return (int32_t)rc;
}

int32_t ffi_env_get_path(uint8_t *fenv, uint8_t *ppath)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  const char *path;
  int rc = mdb_env_get_path(env, &path);
  DEBUG_PRINT(("mdb_env_get_path(%p, %s): %d\n", env, path, rc));
  uint64_t addr = (uint64_t)path;
  memcpy(ppath, &addr, sizeof(addr));
  return (int32_t)rc;
}

int32_t ffi_env_get_fd(uint8_t *fenv, int32_t *fd)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  int rc = mdb_env_get_fd(env, fd);
  DEBUG_PRINT(("mdb_env_get_fd(%p, %d): %d\n", env, *fd, rc));
  return (int32_t)rc;
}

int32_t ffi_env_set_mapsize(uint8_t *fenv, uint64_t size)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  int rc = mdb_env_set_mapsize(env, (mdb_size_t)size);
  DEBUG_PRINT(("mdb_env_set_mapsize(%p, %ld): %d\n", env, size, rc));
  return (int32_t)rc;
}

// NOTE: Must be called before env is open.
int32_t ffi_env_set_maxreaders(uint8_t *fenv, uint32_t readers)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  int rc = mdb_env_set_maxreaders(env, (unsigned int)readers);
  DEBUG_PRINT(("mdb_env_set_maxreaders(%p, %d): %d\n", env, readers, rc));
  return (int32_t)rc;
}

int32_t ffi_env_get_maxreaders(uint8_t *fenv, uint32_t *readers)
{
  PTR_FROM_WRAPPER(env, MDB_env *, fenv);
  unsigned int _readers;
  int rc = mdb_env_get_maxreaders(env, &_readers);
  DEBUG_PRINT(("mdb_env_get_maxreaders(%p, %d): %d\n", env, _readers, rc));
  *readers = (uint32_t)_readers;
  return rc;
}

///////////////////////////////////////////////////////////////////

int main(int argc, char *argv[])
{
  puts("Hello from main");
  return 0;
}