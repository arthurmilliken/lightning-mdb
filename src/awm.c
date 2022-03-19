#include <stdio.h>
#include <string.h>
#include <stdlib.h>
#include "lmdb.h"

#define s_equal(s1, s2) !strcmp(s1, s2)
#define E(expr) CHECK((rc = (expr)) == MDB_SUCCESS, #expr)
#define RES(err, expr) ((rc = expr) == (err) || (CHECK(!rc, #expr), 0))
#define CHECK(test, msg) ((test) ? (void)0 : ((void)fprintf(stderr, "%s:%d: %s: %s\n", __FILE__, __LINE__, msg, mdb_strerror(rc)), abort()))

int cmd_usage()
{
  puts("usage: awm <cmd> [args...]");
  puts("commands:");
  puts("  hello");
  puts("  put <key> <value>");
  puts("  get <key>");
  puts("  del <key>");
  puts("  list");
  return 1;
}

int cmd_open()
{
  MDB_env *env;
  int rc;
  E(mdb_env_create(&env));
  printf("after mdb_env_create: env: %p\n", env);
  E(mdb_env_open(env, "./.testdb", 0, 0664));
  puts("after mdb_env_open()");
  mdb_env_close(env);
  puts("after mdb_env_close()");
  return 0;
}

int cmd_put(char *key, char *value)
{
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

int cmd_get(char *key)
{
  printf("cmd_get(\"%s\"):\n", key);
  MDB_env *env;
  MDB_dbi dbi;
  MDB_val db_key, db_value;
  MDB_txn *txn;
  int rc;
  E(mdb_env_create(&env));
  E(mdb_env_open(env, "./.testdb", 0, 0664));
  E(mdb_txn_begin(env, NULL, MDB_RDONLY, &txn));
  E(mdb_dbi_open(txn, NULL, 0, &dbi));
  db_key.mv_size = strlen(key);
  db_key.mv_data = key;
  E(mdb_get(txn, dbi, &db_key, &db_value));
  printf("GET key: '%.*s', value: '%.*s'\n",
         (int)db_key.mv_size, (char *)db_key.mv_data,
         (int)db_value.mv_size, (char *)db_value.mv_data);
  mdb_txn_abort(txn);
  mdb_env_close(env);
  return 0;
}

int cmd_del(char *key)
{
  printf("cmd_del(\"%s\"):\n", key);
  MDB_env *env;
  MDB_dbi dbi;
  MDB_val db_key;
  MDB_txn *txn;
  int rc;
  E(mdb_env_create(&env));
  E(mdb_env_open(env, "./.testdb", 0, 0664));
  E(mdb_txn_begin(env, NULL, 0, &txn));
  E(mdb_dbi_open(txn, NULL, 0, &dbi));
  db_key.mv_size = strlen(key);
  db_key.mv_data = key;
  E(mdb_del(txn, dbi, &db_key, NULL));
  E(mdb_txn_commit(txn));
  printf("DEL key: '%.*s'\n",
         (int)db_key.mv_size, (char *)db_key.mv_data);
  mdb_env_close(env);
  return 0;
}

int cmd_list()
{
  puts("cmd_list():");
  MDB_env *env;
  MDB_dbi dbi;
  MDB_val db_key, db_value;
  MDB_txn *txn;
  MDB_cursor *cursor;
  int rc;
  E(mdb_env_create(&env));
  E(mdb_env_open(env, "./.testdb", 0, 0664));
  E(mdb_txn_begin(env, NULL, MDB_RDONLY, &txn));
  E(mdb_dbi_open(txn, NULL, 0, &dbi));
  E(mdb_cursor_open(txn, dbi, &cursor));
  while ((rc = mdb_cursor_get(cursor, &db_key, &db_value, MDB_NEXT)) == 0)
  {
    printf("LIST key: '%.*s', value: '%.*s'\n",
           (int)db_key.mv_size, (char *)db_key.mv_data,
           (int)db_value.mv_size, (char *)db_value.mv_data);
  }
  mdb_txn_abort(txn);
  mdb_env_close(env);
  return 0;
}

int main(int argc, char *argv[])
{
  puts("------------");
  if (argc < 2)
  {
    return cmd_usage();
  }
  else if (s_equal(argv[1], "hello"))
  {
    puts("hello!");
  }
  else if (s_equal(argv[1], "open"))
  {
    return cmd_open();
  }
  else if (s_equal(argv[1], "get"))
  {
    if (argc < 3)
      return cmd_usage();
    else
      return cmd_get(argv[2]);
  }
  else if (s_equal(argv[1], "put"))
  {
    if (argc < 4)
      return cmd_usage();
    else
      return cmd_put(argv[2], argv[3]);
  }
  else if (s_equal(argv[1], "del"))
  {
    if (argc < 3)
      return cmd_usage();
    else
      return cmd_del(argv[2]);
  }
  else if (s_equal(argv[1], "list"))
  {
    return cmd_list();
  }
  else
  {
    return cmd_usage();
  }
  return 0;
}
