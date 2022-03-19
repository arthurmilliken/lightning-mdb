const arr = new Uint32Array(5);
arr.fill(1);
const ptr = Deno.UnsafePointer.of(arr);
console.log({
  ptr,
  value: ptr.value.toString(16),
  valueOf: ptr.valueOf().toString(16),
});
