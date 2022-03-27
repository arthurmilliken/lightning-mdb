#ifndef HELD_VALUE_H
#define HELD_VALUE_H

#include <napi.h>

class HeldValue: public Napi::ObjectWrap<HeldValue> {
  public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    static Napi::Object NewInstance(Napi::Env env, Napi::Value arg);
    HeldValue(const Napi::CallbackInfo& info);
  
  private:
    Napi::Value GetValue(const Napi::CallbackInfo& info);
    Napi::Value Incr(const Napi::CallbackInfo& info);
    Napi::Value Mult(const Napi::CallbackInfo& info);

    double value_;
};

#endif
