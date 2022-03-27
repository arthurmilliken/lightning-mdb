#include <napi.h>
#include <stdio.h>
#include "held_value.h"
#include "lmdb.h"

using namespace Napi;

Value lmdb_add (const CallbackInfo& info) {
  Env env = info.Env();
  const char arg_error[] = "usage - add(a: number, b: number): number";
  if (info.Length() < 2 || !(info[0].IsNumber() && info[1].IsNumber())) {
    TypeError::New(env, arg_error).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  double arg0 = info[0].As<Number>().DoubleValue();
  double arg1 = info[1].As<Number>().DoubleValue();
  return Number::New(env, arg0 + arg1);
}

void lmdb_run_callback (const CallbackInfo& info) {
  Env env = info.Env();
  const char arg_error[] = "usage - run_callback((msg) => {}): void";
  if (info.Length() < 1 || !info[0].IsFunction()) {
    TypeError::New(env, arg_error).ThrowAsJavaScriptException();
    return;
  }
  Function cb = info[0].As<Function>();
  cb.Call(env.Global(), { String::New(env, "hello from run_callback!") });
}

Value lmdb_create (const CallbackInfo& info) {
  Env env = info.Env();
  const char arg_error[] = "usage - create(msg: string): object";
  if (info.Length() < 1) {
    TypeError::New(env, arg_error).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Object obj = Object::New(env);
  obj.Set(String::New(env, "msg"), info[0].ToString());
  return obj;
}

String lmdb_func (const CallbackInfo& info) {
  Env env = info.Env();
  return String::New(env, "hello from lmdb_func!");
}

Function lmdb_thunk (const CallbackInfo& info) {
  Env env = info.Env();
  Function fn = Function::New(env, lmdb_func, "func");
  return fn;
}


void lmdb_print_buffer (const CallbackInfo& info) {
  Env env = info.Env();
  const char arg_error[] = "usage - print_buffer(buf: Buffer): void";
  if (info.Length() < 1 || !info[0].IsBuffer()) {
    TypeError::New(env, arg_error).ThrowAsJavaScriptException();
    return;
  }
  Buffer<char> buf = info[0].As<Buffer<char>>();
  
  for (size_t i = 0; i < buf.ByteLength(); i++) {
    fprintf(stderr, "[%02llu]: '%c'\n", i, buf[i]);
  }
}

Value lmdb_create_heldvalue (const CallbackInfo& info) {
  Env env = info.Env();
  const char arg_error[] = "usage - create_heldvalue(val: number): void";
  if (info.Length() < 1 || !info[0].IsNumber()) {
    TypeError::New(env, arg_error).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  return HeldValue::NewInstance(info.Env(), info[0]);
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

////////////////////////////////////////////////////////
// LMDB method wrappers start here
////////////////////////////////////////////////////////

Value lmdb_strerror (const CallbackInfo& info) {
  Env env = info.Env();
  const char arg_error[] = "usage - strerror(val: number): string";
  if (info.Length() < 1 || !info[0].IsNumber()) {
    TypeError::New(env, arg_error).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  int err = (int) info[0].As<Number>();
  return String::New(env, mdb_strerror(err));
}

String lmdb_env_create(const CallbackInfo& info) {
  Env env = info.Env();
  return String::New(env, "lmdb_env_create(): created!");
}

String lmdb_env_close(const CallbackInfo& info) {
  Env env = info.Env();
  return String::New(env, "lmdb_env_create(): closed!");
}

void lmdb_throw_error(const CallbackInfo& info) {
  Env env = info.Env();
  Error::New(env, "BOOM!").ThrowAsJavaScriptException();
}

Object Init(Env env, Object exports) {
  HeldValue::Init(env, exports);
  exports.Set(String::New(env, "add"), Function::New(env, lmdb_add));
  exports.Set(String::New(env, "run_callback"), Function::New(env, lmdb_run_callback));
  exports.Set(String::New(env, "create"), Function::New(env, lmdb_create));
  exports.Set(String::New(env, "thunk"), Function::New(env, lmdb_thunk));
  exports.Set(String::New(env, "print_buffer"), Function::New(env, lmdb_print_buffer));
  exports.Set(String::New(env, "create_heldvalue"), Function::New(env, lmdb_create_heldvalue));
  ///////////////////////////////////////////////////////////
  exports.Set(String::New(env, "version"), Function::New(env, lmdb_version));
  exports.Set(String::New(env, "strerror"), Function::New(env, lmdb_strerror));
  exports.Set(String::New(env, "env_create"), Function::New(env, lmdb_env_create));
  exports.Set(String::New(env, "env_close"), Function::New(env, lmdb_env_close));
  exports.Set(String::New(env, "throw_error"), Function::New(env, lmdb_throw_error));
  return exports;
}

NODE_API_MODULE(addon, Init)
