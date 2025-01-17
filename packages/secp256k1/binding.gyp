{
  'variables': {
    'arch': '<!(node -p "process.arch")',
  },
  'target_default': {
    'cflags': [
      '-Wall',
      '-Wextra',
    ],
  },
  'targets': [
    {
      'target_name': 'libsecp256k1',
      'type': 'static_library',
      'sources': [
        'lib/libsecp256k1/src/secp256k1.c',
      ],
      'include_dirs': [
        'lib/libsecp256k1',
        'lib/libsecp256k1/src'
      ],
      'cflags': [
        '-Wno-unused-function',
        '-Wno-nonnull-compare',
      ],
      'defines': [
        # DETERMINISTIC introduced in https://github.com/bitcoin-core/secp256k1/pull/107
        # Callbacks introduced in https://github.com/bitcoin-core/secp256k1/pull/278
        # External callbacks introduced in https://github.com/bitcoin-core/secp256k1/pull/595
        #
        # USE_EXTERNAL_DEFAULT_CALLBACKS only for WASM, where we ignore all illegal/error callbacks
        # CHECK uses `fprintf()`, `abort()` and `stderr`, but only if we use GMP or define VERIFY
        # Because we do not use GMP, DETERMINISTIC is not used.
        # 'DETERMINISTIC=1',
        #
        # For all available definitions, see src/basic-config.h
        # Current default values for desktop (544002c at 24.11.2019)
        'ECMULT_GEN_PREC_BITS=4',
        'ECMULT_WINDOW_SIZE=15',
        # Activate modules
        'ENABLE_MODULE_ECDH=1',
        'ENABLE_MODULE_RECOVERY=1',
        #
        'USE_ENDOMORPHISM=1',
        # Ignore GMP, dynamic linking, so will be hard to use with prebuilds
        'USE_NUM_NONE=1',
        'USE_FIELD_INV_BUILTIN=1',
        'USE_SCALAR_INV_BUILTIN=1',
      ],
      'conditions': [
        ['target_arch=="x64" and OS!="win"', {
          'defines': [
            'HAVE___INT128=1',
            'USE_ASM_X86_64=1',
            'USE_FIELD_5X52=1',
            'USE_SCALAR_4X64=1',
          ]
        }, {
          'defines': [
            'USE_FIELD_10X26=1',
            'USE_SCALAR_8X32=1',
          ]
        }],
      ],
    },
    {
      'target_name': 'addon',
      'dependencies': [
        'libsecp256k1',
      ],
      'sources': [
        'lib/addon.cc',
        'lib/addon_secp256k1.cc',
      ],
      'include_dirs': [
        "<!(node -p \"require('node-addon-api').include_dir\")",
        'lib'
      ],
      'cflags!': [
        '-fno-exceptions',
      ],
      'cflags_cc!': [
        '-fno-exceptions',
      ],
      'conditions': [
        ["OS=='win'", {
          "defines": [
            "_HAS_EXCEPTIONS=1"
          ],
          "msvs_settings": {
            "VCCLCompilerTool": {
              "ExceptionHandling": 1
            },
          },
        }],
        ["OS=='mac'", {
          'xcode_settings': {
            'GCC_ENABLE_CPP_EXCEPTIONS': 'YES',
            'CLANG_CXX_LIBRARY': 'libc++',
            'MACOSX_DEPLOYMENT_TARGET': '10.7',
          },
        }],
      ],
    },
  ],
}
