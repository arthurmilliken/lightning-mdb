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

pthread_mutex_t mutex = PTHREAD_MUTEX_INITIALIZER;
size_t sizeint = sizeof(int32_t);
size_t sizebig = sizeof(size_t);
size_t sizedbl = sizeof(double);

void send(void *msg, size_t size)
{
  if (msg == NULL)
  {
    puts("send(): received NULL");
    return;
  }
  char value[size + 1];
  memcpy(value, msg, size);
  value[size] = '\0';

  printf("send(%p, %ld)\n", msg, size);
  printf("  data: '%s'\n", (char *)value);
}

#define V_MAJOR_OFFSET 0
#define V_MINOR_OFFSET 8
#define V_PATCH_OFFSET 16
#define V_VERSION_OFFSET 24
#define V_VERSION_LEN 64
uint8_t fversion[V_VERSION_OFFSET + V_VERSION_LEN];
int fversion_set = 0;

uint8_t *ffi_version()
{
  pthread_mutex_lock(&mutex);
  if (!fversion_set)
  {
    memset(fversion, 0, 62);
    int major, minor, patch;
    uint8_t *version = mdb_version(&major, &minor, &patch);
    DEBUG_PRINT(("mdb_version(%d, %d, %d): %s\n", major, minor, patch, version));
    double fmajor = (double)major;
    double fminor = (double)minor;
    double fpatch = (double)patch;
    memcpy(fversion + V_MAJOR_OFFSET, &fmajor, sizedbl);
    memcpy(fversion + V_MINOR_OFFSET, &fminor, sizedbl);
    memcpy(fversion + V_PATCH_OFFSET, &fpatch, sizedbl);
    memcpy(fversion + V_VERSION_OFFSET, version, strlen(version));
    fversion_set = 1;
  }
  pthread_mutex_unlock(&mutex);
  return fversion;
}

char *ffi_strerror(int32_t err)
{
  char *msg = mdb_strerror(err);
  DEBUG_PRINT(("mdb_strerror(%d): %s\n", err, msg));
  return msg;
}

// Env functions

uint8_t *ffi_env_create()
{
  MDB_env *env;
  double rc = (double)mdb_env_create(&env);
  DEBUG_PRINT(("mdb_env_create(%p): %.0f\n", env, rc));

  uint8_t *fenv = malloc(sizedbl + sizeof(env));
  if (fenv == NULL)
    ABORT("ffi_env_create(): out of memory.");
  memcpy(fenv, &rc, sizedbl);
  memcpy(fenv + sizedbl, &env, sizeof(env));

  return fenv;
}

double ffi_env_set_maxdbs(const uint8_t *fenv, uint32_t dbs)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  int rc = mdb_env_set_maxdbs(env, (MDB_dbi)dbs);
  DEBUG_PRINT(("mdb_env_set_maxdbs(%p, %d): %d\n", env, dbs, rc));
  return (double)rc;
}

double ffi_env_open(const uint8_t *fenv,
                    const char *path,
                    size_t pathlen,
                    uint32_t flags,
                    uint32_t mode)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  char db_path[pathlen + 1];
  memcpy(db_path, path, pathlen);
  db_path[pathlen] = '\0';
  DEBUG_PRINT(("mdb_env_open(%p, %s, %u, %o)\n",
               env, db_path, flags, mode));
  return (double)mdb_env_open(env, db_path, flags, mode);
}

double ffi_env_copy(const uint8_t *fenv, const char *path, size_t pathlen)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  char db_path[pathlen + 1];
  memcpy(db_path, path, pathlen);
  db_path[pathlen] = '\0';
  DEBUG_PRINT(("mdb_env_copy(%p, %s)\n", env, db_path));
  return (double)mdb_env_copy(env, db_path);
}

double ffi_env_copyfd(const uint8_t *fenv, int32_t fd)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  DEBUG_PRINT(("mdb_env_copyfd(%p, %d)\n", env, fd));
  return (double)mdb_env_copyfd(env, (mdb_filehandle_t)fd);
}

double ffi_env_copy2(const uint8_t *fenv, const char *path, size_t pathlen, uint32_t flags)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  char db_path[pathlen + 1];
  memcpy(db_path, path, pathlen);
  db_path[pathlen] = '\0';
  DEBUG_PRINT(("mdb_env_copy2(%p, %s, %d)\n", env, db_path, flags));
  return (double)mdb_env_copy2(env, db_path, (unsigned int)flags);
}

double ffi_env_copyfd2(const uint8_t *fenv, int32_t fd, uint32_t flags)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  DEBUG_PRINT(("mdb_env_copyfd2(%p, %d, %d)\n", env, fd, flags));
  return (double)mdb_env_copyfd2(env, (mdb_filehandle_t)fd, (unsigned int)flags);
}

#define STAT_LENGTH 7
#define STAT_RC 0
#define STAT_PSIZE 1
#define STAT_DEPTH 2
#define STAT_BRANCH_PAGES 3
#define STAT_LEAF_PAGES 4
#define STAT_OVERFLOW_PAGES 5
#define STAT_ENTRIES 6

double *ffi_env_stat_create(uint8_t *fenv)
{
  MDB_stat stat;
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  double *fstat = calloc(STAT_LENGTH, sizedbl);
  if (fstat == NULL)
    ABORT("ffi_env_stat_create(): out of memory.");

  double rc = (double)mdb_env_stat(env, &stat);
  DEBUG_PRINT(("mdb_env_stat(%p, %p): %.0f\n", env, &stat, rc));
  fstat[STAT_RC] = rc;
  if (rc)
    return fstat;
  fstat[STAT_PSIZE] = (double)stat.ms_psize;
  fstat[STAT_DEPTH] = (double)stat.ms_depth;
  fstat[STAT_BRANCH_PAGES] = (double)stat.ms_branch_pages;
  fstat[STAT_LEAF_PAGES] = (double)stat.ms_leaf_pages;
  fstat[STAT_OVERFLOW_PAGES] = (double)stat.ms_overflow_pages;
  fstat[STAT_ENTRIES] = (double)stat.ms_entries;
  return fstat;
}

void ffi_env_stat_dispose(double *fstat)
{
  free(fstat);
  PRINT_DEBUG(("free(%p)", fstat));
}

#define ENVINFO_LENGTH 7
#define ENVINFO_RC 0
#define ENVINFO_MAPSIZE 1
#define ENVINFO_LAST_PGNO 2
#define ENVINFO_LAST_TXNID 3
#define ENVINFO_MAXREADERS 4
#define ENVINFO_NUMREADERS 5

double *ffi_env_info_create(uint8_t *fenv)
{
  MDB_envinfo envinfo;
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  double rc = (double)mdb_env_info(env, &envinfo);
  double *fenvinfo = calloc(sizedbl, ENVINFO_LENGTH);
  if (!fenvinfo)
    ABORT("ffi_env_stat_create(): out of memory.");
  fenvinfo[ENVINFO_RC] = rc;
  if (rc != 0)
    return fenvinfo;
  fenvinfo[ENVINFO_MAPSIZE] = (double)envinfo.me_mapsize;
  fenvinfo[ENVINFO_LAST_PGNO] = (double)envinfo.me_last_pgno;
  fenvinfo[ENVINFO_LAST_TXNID] = (double)envinfo.me_last_txnid;
  fenvinfo[ENVINFO_MAXREADERS] = (double)envinfo.me_maxreaders;
  fenvinfo[ENVINFO_NUMREADERS] = (double)envinfo.me_numreaders;
  return fenvinfo;
}

void ffi_env_info_dispose(double *fenvinfo)
{
  free(fenvinfo);
  PRINT_DEBUG(("free(%p)", fenvinfo));
}

double ffi_env_sync(uint8_t *fenv, int32_t force)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  DEBUG_PRINT(("mdb_env_sync(%p, %d)", env, force));
  return (double)mdb_env_sync(env, (int)force);
}

double ffi_env_set_flags(uint8_t *fenv, uint32_t flags, int32_t onoff)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  DEBUG_PRINT(("mdb_env_set_flags(%p, %d, %d)", env, flags, onoff));
  return (double)mdb_env_set_flags(env, (unsigned int)flags, (int)onoff);
}

uint8_t *ffi_env_get_flags_create(uint8_t *fenv)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  unsigned int flags;
  int rc = mdb_env_get_flags(env, &flags);
  DEBUG_PRINT(("mdb_env_get_flags(%p, %d): %d", env, flags, rc));
  double drc = (double)rc;
  double dflags = (double)flags;
  uint8_t *fflags = malloc(sizeof(drc) + sizeof(dflags));
  if (fflags == NULL)
    ABORT("ffi_env_get_flags_create(): out of memory.");
  memcpy(fflags, &drc, sizeof(drc));
  memcpy(fflags + sizeof(drc), &dflags, sizeof(dflags));
  return fflags;
}

void ffi_env_get_flags_dispose(uint8_t *fflags)
{
  free(fflags);
  PRINT_DEBUG(("ffi_env_get_flags_dispose(%p)", fflags));
}

uint8_t *ffi_env_get_path_create(uint8_t *fenv)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  const char *path;
  int rc = mdb_env_get_path(env, &path);
  DEBUG_PRINT(("mdb_env_get_path(%p, %s): %d", env, path, rc));
  double drc = (double)rc;
  uint8_t *fpath = malloc(sizeof(drc) + sizeof(path));
  if (fpath == NULL)
    ABORT("ffi_env_get_path_create(): out of memory.");
  memcpy(fpath, &drc, sizeof(drc));
  memcpy(fpath + sizeof(drc), &path, sizeof(path));
  return fpath;
}

void ffi_env_get_path_dispose(uint8_t *fpath)
{
  free(fpath);
  DEBUG_PRINT(("free(%p)", fpath));
}

double *ffi_env_get_fd_create(uint8_t *fenv)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  mdb_filehandle_t fd;
  int rc = mdb_env_get_fd(env, &fd);
  DEBUG_PRINT(("mdb_env_get_fd(%p, %d)\n", env, rc));
  double *ffd = calloc(2, sizeof(double));
  ffd[0] = (double)rc;
  ffd[1] = (double)fd;
  return ffd;
}

void ffi_env_get_fd_dispose(double *ffd)
{
  free(ffd);
  DEBUG_PRINT(("free(%p)", ffd));
}

void ffi_env_close(uint8_t *fenv)
{
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  DEBUG_PRINT(("mdb_env_close(%p)\n", env));
  mdb_env_close(env);
  free(fenv);
}

// Txn functions

uint8_t *ffi_txn_begin(uint8_t *fenv, uint8_t *fparent, uint32_t flags)
{
  MDB_txn *txn;
  MDB_env *env;
  memcpy(&env, fenv + sizedbl, sizeof(env));
  MDB_txn *parent;
  if (fparent)
    memcpy(&parent, fparent + sizedbl, sizeof(parent));
  else
    parent = NULL;

  uint8_t *ftxn = malloc(sizedbl + sizeof(txn));
  if (ftxn == NULL)
    ABORT("ffi_env_stat_create(): out of memory.");
  double rc = (double)mdb_txn_begin(env, parent, flags, &txn);
  DEBUG_PRINT(("mdb_txn_begin(%p, %p, %u, %p): %.0f\n", env, parent, flags, txn, rc));
  memcpy(ftxn, &rc, sizeof(rc));
  memcpy(ftxn + sizeof(rc), &txn, sizeof(txn));
  return ftxn;
}

double ffi_txn_id(uint8_t *ftxn)
{
  MDB_txn *txn;
  memcpy(&txn, ftxn + sizedbl, sizeof(txn));
  mdb_size_t id = mdb_txn_id(txn);
  DEBUG_PRINT(("mdb_txn_id(%p): %ld\n", txn, id));
  return (double)id;
}

double ffi_txn_commit(uint8_t *ftxn)
{
  MDB_txn *txn;
  memcpy(&txn, ftxn + sizedbl, sizeof(txn));
  int rc = mdb_txn_commit(txn);
  DEBUG_PRINT(("mdb_txn_commit(%p): %d\n", txn, rc));
  free(ftxn);
  return (double)rc;
}

void ffi_txn_abort(uint8_t *ftxn)
{
  MDB_txn *txn;
  memcpy(&txn, ftxn + sizedbl, sizeof(txn));
  mdb_txn_abort(txn);
  DEBUG_PRINT(("mdb_txn_abort(%p)\n", txn));
  free(ftxn);
}

void ffi_txn_reset(uint8_t *ftxn)
{
  MDB_txn *txn;
  memcpy(&txn, ftxn + sizedbl, sizeof(txn));
  mdb_txn_reset(txn);
  DEBUG_PRINT(("mdb_txn_reset(%p)\n", txn));
}

double ffi_txn_renew(uint8_t *ftxn)
{
  MDB_txn *txn;
  memcpy(&txn, ftxn + sizedbl, sizeof(txn));
  int rc = mdb_txn_renew(txn);
  DEBUG_PRINT(("mdb_txn_renew(%p): %d\n", txn, rc));
  return (double)rc;
}

// Dbi functions

uint8_t *ffi_dbi_open(uint8_t *ftxn, const char *name, size_t namelen, uint32_t flags)
{
  MDB_txn *txn;
  memcpy(&txn, ftxn + sizedbl, sizeof(txn));

  MDB_dbi dbi;
  double rc;
  if (name)
  {
    char db_name[namelen + 1];
    memcpy(db_name, name, namelen);
    db_name[namelen] = '\0';
    rc = (double)mdb_dbi_open(txn, db_name, flags, &dbi);
    DEBUG_PRINT(("mdb_dbi_open(%p, %s, %u, %u): %.0f\n", txn, db_name, flags, dbi, rc));
  }
  else
  {
    rc = (double)mdb_dbi_open(txn, NULL, flags, &dbi);
    DEBUG_PRINT(("mdb_dbi_open(%p, %p, %u, %u): %.0f\n", txn, NULL, flags, dbi, rc));
  }
  uint8_t *fdbi;
  fdbi = malloc(sizedbl + sizeof(dbi));
  if (fdbi == NULL)
    ABORT("ffi_env_stat_create(): out of memory.");
  memcpy(fdbi, &rc, sizeof(rc));
  memcpy(fdbi + sizeof(rc), &dbi, sizeof(dbi));
  return fdbi;
}

///////////////////////////////////////////////
// Command-line functions:
///////////////////////////////////////////////

#define TESTDB ".testdb"
#define TESTDB_LEN strlen(TESTDB)

int cmd_usage(char *argv[])
{
  printf("usage: %s <cmd> [args...]\n", argv[0]);
  puts("commands:");
  // global
  puts("  send <msg>");
  puts("  version");
  puts("  error <rc>");
  // env
  puts("  create");
  puts("  maxdbs <num> [<path>]");
  puts("  open [<path>]");
  puts("  stat");
  puts("  info");
  // txn
  puts("  commit");
  puts("  abort");
  puts("  renew");
  puts("  child");
  puts("  txnid");
  // dbi
  puts("  opendbi [<name>]");
  puts("  put <key> <value>");
  return 1;
}

int cmd_send(int argc, char *argv[])
{
  if (argc < 3)
    return cmd_usage(argv);
  char *msg = argv[2];
  size_t size = strlen(msg);
  send(msg, size);
  return 0;
}

int cmd_version()
{
  uint8_t *version = ffi_version();
  printf("version: '%s' (%.0f,%.0f,%.0f)\n",
         version + V_VERSION_OFFSET,
         *(double *)version + V_MAJOR_OFFSET,
         *(double *)version + V_MINOR_OFFSET,
         *(double *)version + V_PATCH_OFFSET);
  return 0;
}

int cmd_error(int argc, char *argv[])
{
  if (argc < 3)
    return cmd_usage(argv);
  int err = atoi(argv[2]);
  char *msg = ffi_strerror(err);
  printf("strerror: %d = %s\n", err, msg);
  return 0;
}

int cmd_create()
{
  uint8_t *fenv = ffi_env_create();
  ffi_env_close(fenv);
  return 0;
}

int cmd_maxdbs(int argc, char *argv[])
{
  if (argc < 3)
    return cmd_usage(argv);
  MDB_dbi dbs = (MDB_dbi)atoi(argv[2]);
  char *path;
  if (argc < 4)
  {
    path = TESTDB;
  }
  else
  {
    path = argv[3];
  }
  printf("cmd_maxdbs(%d, %s)\n", dbs, path ? path : "(nil)");
  uint8_t *fenv = ffi_env_create();
  int rc;
  E((int)ffi_env_set_maxdbs(fenv, dbs));
  E((int)ffi_env_open(fenv, path, strlen(path), 0, 0664));
  ffi_env_close(fenv);
  return 0;
}

int cmd_open(int argc, char *argv[])
{
  char *path;
  if (argc < 3)
  {
    path = TESTDB;
  }
  else
  {
    path = argv[2];
  }
  printf("cmd_open(%s)\n", path);
  uint8_t *fenv = ffi_env_create();
  int rc;
  E((int)ffi_env_open(fenv, path, strlen(path), 0, 0664));
  ffi_env_close(fenv);
  return 0;
}

int cmd_stat()
{
  uint8_t *fenv = ffi_env_create();
  int rc;
  E(ffi_env_open(fenv, TESTDB, TESTDB_LEN, 0, 0664));
  double *stat = ffi_env_stat_create(fenv);
  printf("stat:\n");
  printf("- rc:            %7.0f\n", stat[STAT_RC]);
  printf("- page size:     %7.0f\n", stat[STAT_PSIZE]);
  printf("- tree depth:    %7.0f\n", stat[STAT_DEPTH]);
  printf("- branch pages:  %7.0f\n", stat[STAT_BRANCH_PAGES]);
  printf("- leaf pages:    %7.0f\n", stat[STAT_LEAF_PAGES]);
  printf("- overflow pages:%7.0f\n", stat[STAT_OVERFLOW_PAGES]);
  printf("- entries:       %7.0f\n", stat[STAT_ENTRIES]);
  ffi_env_stat_dispose(stat);
  ffi_env_close(fenv);
  return 0;
}

int cmd_info()
{
  uint8_t *fenv = ffi_env_create();
  int rc;
  E(ffi_env_open(fenv, TESTDB, TESTDB_LEN, MDB_FIXEDMAP, 0664));
  double *envinfo = ffi_env_info_create(fenv);
  printf("envinfo:\n");
  printf("- map size:   %7.0f\n", envinfo[ENVINFO_MAPSIZE]);
  printf("- last page:  %7.0f\n", envinfo[ENVINFO_LAST_PGNO]);
  printf("- last txn:   %7.0f\n", envinfo[ENVINFO_LAST_TXNID]);
  printf("- max readers:%7.0f\n", envinfo[ENVINFO_MAXREADERS]);
  printf("- num readers:%7.0f\n", envinfo[ENVINFO_NUMREADERS]);
  ffi_env_info_dispose(envinfo);
  ffi_env_close(fenv);
  return 0;
}

int cmd_commit()
{
  printf("cmd_commit(): %s\n", TESTDB);
  uint8_t *fenv = ffi_env_create();
  int rc;
  E((int)ffi_env_open(fenv, TESTDB, TESTDB_LEN, 0, 0664));
  uint8_t *ftxn = ffi_txn_begin(fenv, NULL, 0);
  double drc;
  memcpy(&drc, ftxn, sizedbl);
  E((int)drc);
  E((int)ffi_txn_commit(ftxn));
  ffi_env_close(fenv);
  return 0;
}

int cmd_abort()
{
  printf("cmd_abort(): %s\n", TESTDB);
  uint8_t *fenv = ffi_env_create();
  int rc;
  E((int)ffi_env_open(fenv, TESTDB, TESTDB_LEN, 0, 0664));
  uint8_t *ftxn = ffi_txn_begin(fenv, NULL, 0);
  double drc;
  memcpy(&drc, ftxn, sizedbl);
  E((int)drc);
  ffi_txn_abort(ftxn);
  ffi_env_close(fenv);
  return 0;
}

int cmd_renew()
{
  printf("cmd_renew(): %s\n", TESTDB);
  uint8_t *fenv = ffi_env_create();
  int rc;
  E((int)ffi_env_open(fenv, TESTDB, TESTDB_LEN, 0, 0664));
  uint8_t *ftxn = ffi_txn_begin(fenv, NULL, MDB_RDONLY);
  double drc;
  memcpy(&drc, ftxn, sizedbl);
  E((int)drc);
  ffi_txn_reset(ftxn);
  E((int)ffi_txn_renew(ftxn));
  E((int)ffi_txn_commit(ftxn));
  ffi_env_close(fenv);
  return 0;
}

int cmd_child()
{
  printf("cmd_child(): %s\n", TESTDB);
  uint8_t *fenv = ffi_env_create();
  int rc;
  E((int)ffi_env_open(fenv, TESTDB, TESTDB_LEN, 0, 0664));
  uint8_t *fparent = ffi_txn_begin(fenv, NULL, 0);
  double drc;
  memcpy(&drc, fparent, sizedbl);
  E((int)drc);
  uint8_t *fchild = ffi_txn_begin(fenv, fparent, 0);
  memcpy(&drc, fchild, sizedbl);
  E((int)drc);
  E((int)ffi_txn_commit(fchild));
  E((int)ffi_txn_commit(fparent));
  ffi_env_close(fenv);
  return 0;
}

int cmd_txnid()
{
  printf("cmd_txnid(): %s\n", TESTDB);
  uint8_t *fenv = ffi_env_create();
  int rc;
  E((int)ffi_env_open(fenv, TESTDB, TESTDB_LEN, 0, 0664));
  uint8_t *ftxn = ffi_txn_begin(fenv, NULL, MDB_RDONLY);
  double drc;
  memcpy(&drc, ftxn, sizedbl);
  E((int)drc);
  printf("- txnid: %.0f\n", ffi_txn_id(ftxn));
  E((int)ffi_txn_commit(ftxn));
  ffi_env_close(fenv);
  return 0;
}

int cmd_opendbi(int argc, char *argv[])
{
  char *name;
  size_t namelen;
  if (argc < 3)
  {
    name = NULL;
    namelen = 0;
  }
  else
  {
    name = argv[2];
    namelen = strlen(name);
  }
  printf("cmd_opendbi(%s):\n", name);
  uint8_t *fenv = ffi_env_create();
  int rc;
  E((int)ffi_env_set_maxdbs(fenv, 2));
  E((int)ffi_env_open(fenv, TESTDB, TESTDB_LEN, 0, 0664));
  uint8_t *ftxn = ffi_txn_begin(fenv, NULL, 0);
  double drc;
  memcpy(&drc, ftxn, sizedbl);
  E((int)drc);
  uint8_t *fdbi = ffi_dbi_open(ftxn, name, namelen, MDB_CREATE);
  memcpy(&drc, fdbi, sizedbl);
  E((int)drc);
  ffi_txn_commit(ftxn);
  ffi_env_close(fenv);
  return 0;
}

int cmd_put(int argc, char *argv[])
{
  if (argc < 4)
    return cmd_usage(argv);
  char *key = argv[2];
  char *value = argv[3];
  printf("cmd_put(\"%s\", \"%s\"):\n", key, value);
  MDB_env *env;
  MDB_dbi dbi;
  MDB_val db_key, db_value;
  MDB_txn *txn;
  int rc;
  E(mdb_env_create(&env));
  E(mdb_env_open(env, "./.testdb", 0, 0664));
  E(mdb_txn_begin(env, NULL, 0, &txn));
  E(mdb_dbi_open(txn, NULL, 0, &dbi));
  db_key.mv_size = strlen(key);
  db_key.mv_data = key;
  db_value.mv_size = strlen(value);
  db_value.mv_data = value;
  E(mdb_put(txn, dbi, &db_key, &db_value, 0));
  E(mdb_txn_commit(txn));
  printf("PUT key: '%.*s', value: '%.*s'\n",
         (int)db_key.mv_size, (char *)db_key.mv_data,
         (int)db_value.mv_size, (char *)db_value.mv_data);
  mdb_env_close(env);
  return 0;
}

int main(int argc, char *argv[])
{
  if (argc < 2)
  {
    return cmd_usage(argv);
  }
  else if (S_EQUAL(argv[1], "send"))
  {
    return cmd_send(argc, argv);
  }
  else if (S_EQUAL(argv[1], "version"))
  {
    return cmd_version();
  }
  else if (S_EQUAL(argv[1], "error"))
  {
    return cmd_error(argc, argv);
  }
  else if (S_EQUAL(argv[1], "create"))
  {
    return cmd_create();
  }
  else if (S_EQUAL(argv[1], "maxdbs"))
  {
    return cmd_maxdbs(argc, argv);
  }
  else if (S_EQUAL(argv[1], "stat"))
  {
    return cmd_stat();
  }
  else if (S_EQUAL(argv[1], "info"))
  {
    return cmd_info();
  }
  else if (S_EQUAL(argv[1], "open"))
  {
    return cmd_open(argc, argv);
  }
  else if (S_EQUAL(argv[1], "commit"))
  {
    return cmd_commit();
  }
  else if (S_EQUAL(argv[1], "abort"))
  {
    return cmd_abort();
  }
  else if (S_EQUAL(argv[1], "renew"))
  {
    return cmd_renew();
  }
  else if (S_EQUAL(argv[1], "child"))
  {
    return cmd_child();
  }
  else if (S_EQUAL(argv[1], "txnid"))
  {
    return cmd_txnid();
  }
  else if (S_EQUAL(argv[1], "opendbi"))
  {
    return cmd_opendbi(argc, argv);
  }
  else if (S_EQUAL(argv[1], "put"))
  {
    return cmd_put(argc, argv);
  }
  else
  {
    return cmd_usage(argv);
  }
}
