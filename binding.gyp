{
  'targets': [
    {
      'target_name': 'lmdb_napi',
      'sources': [
        'src/lmdb_napi.cc',
        'deps/liblmdb/mdb.c',
        'deps/liblmdb/midl.c'
      ],
      'include_dirs': [
        "<!@(node -p \"require('node-addon-api').include\")",
        "deps/liblmdb"
      ],
      'defines': ['MDB_MAXKEYSIZE=0', 'NAPI_DISABLE_CPP_EXCEPTIONS'],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      'cflags!': [ '-fno-exceptions' ],
      'cflags_cc!': [ '-fno-exceptions' ],
      'xcode_settings': {
        'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
        'CLANG_CXX_LIBRARY': 'libc++',
        'MACOSX_DEPLOYMENT_TARGET': '10.7'
      },
      'msvs_settings': {
        'VCCLCompilerTool': { 'ExceptionHandling': 1 },
      }
    }    
  ]
}