#include "held_value.h"

using namespace Napi;

Object HeldValue::Init(Napi::Env env, Object exports) {
  Function func = DefineClass(
    env,
    "HeldValue",
    {
      InstanceMethod("value", &HeldValue::GetValue),
      InstanceMethod("incr", &HeldValue::Incr),
      InstanceMethod("mult", &HeldValue::Mult),
    }
  );

  FunctionReference *constructor = new FunctionReference();
  *constructor = Persistent(func);
  env.SetInstanceData(constructor);

  exports.Set("HeldValue", func);
  return exports;
}

/**
 * @brief Construct a new Held Value:: Held Value object
 * 
 * @param info 
 */
HeldValue::HeldValue(const CallbackInfo& info)
  : ObjectWrap<HeldValue>(info)
{
  Napi::Env env = info.Env();
  const char arg_error[] = "usage - new HeldValue(v: number)";
  if (info.Length() < 1 || !info[0].IsNumber()) {
    TypeError::New(env, arg_error).ThrowAsJavaScriptException();
    return;
  }
  Number value = info[0].As<Number>();
  this->value_ = value.DoubleValue();
}

Object HeldValue::NewInstance(Napi::Env env, Napi::Value arg) {
  EscapableHandleScope scope(env);
  Object obj = env.GetInstanceData<FunctionReference>()->New({ arg });
  return scope.Escape(napi_value(obj)).ToObject();
}

Value HeldValue::GetValue(const CallbackInfo& info) {
  double num = this->value_;
  return Number::New(info.Env(), num);
}

Value HeldValue::Incr(const CallbackInfo& info) {
  this->value_++;
  return this->GetValue(info);
}

Value HeldValue::Mult(const CallbackInfo& info) {
  Napi::Env env = info.Env();
  const char arg_error[] = "usage - heldValue.mult(v: number): number";
  if (info.Length() < 1 || !info[0].IsNumber()) {
    TypeError::New(env, arg_error).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  this->value_ = this->value_ * (double) info[0].As<Number>();
  return this->GetValue(info);
}