/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./node_modules/dotenv/lib/main.js":
/*!*****************************************!*\
  !*** ./node_modules/dotenv/lib/main.js ***!
  \*****************************************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

const fs = __webpack_require__(/*! fs */ "fs")
const path = __webpack_require__(/*! path */ "path")
const os = __webpack_require__(/*! os */ "os")
const crypto = __webpack_require__(/*! crypto */ "crypto")
const packageJson = __webpack_require__(/*! ../package.json */ "./node_modules/dotenv/package.json")

const version = packageJson.version

const LINE = /(?:^|^)\s*(?:export\s+)?([\w.-]+)(?:\s*=\s*?|:\s+?)(\s*'(?:\\'|[^'])*'|\s*"(?:\\"|[^"])*"|\s*`(?:\\`|[^`])*`|[^#\r\n]+)?\s*(?:#.*)?(?:$|$)/mg

// Parse src into an Object
function parse (src) {
  const obj = {}

  // Convert buffer to string
  let lines = src.toString()

  // Convert line breaks to same format
  lines = lines.replace(/\r\n?/mg, '\n')

  let match
  while ((match = LINE.exec(lines)) != null) {
    const key = match[1]

    // Default undefined or null to empty string
    let value = (match[2] || '')

    // Remove whitespace
    value = value.trim()

    // Check if double quoted
    const maybeQuote = value[0]

    // Remove surrounding quotes
    value = value.replace(/^(['"`])([\s\S]*)\1$/mg, '$2')

    // Expand newlines if double quoted
    if (maybeQuote === '"') {
      value = value.replace(/\\n/g, '\n')
      value = value.replace(/\\r/g, '\r')
    }

    // Add to object
    obj[key] = value
  }

  return obj
}

function _parseVault (options) {
  const vaultPath = _vaultPath(options)

  // Parse .env.vault
  const result = DotenvModule.configDotenv({ path: vaultPath })
  if (!result.parsed) {
    const err = new Error(`MISSING_DATA: Cannot parse ${vaultPath} for an unknown reason`)
    err.code = 'MISSING_DATA'
    throw err
  }

  // handle scenario for comma separated keys - for use with key rotation
  // example: DOTENV_KEY="dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=prod,dotenv://:key_7890@dotenvx.com/vault/.env.vault?environment=prod"
  const keys = _dotenvKey(options).split(',')
  const length = keys.length

  let decrypted
  for (let i = 0; i < length; i++) {
    try {
      // Get full key
      const key = keys[i].trim()

      // Get instructions for decrypt
      const attrs = _instructions(result, key)

      // Decrypt
      decrypted = DotenvModule.decrypt(attrs.ciphertext, attrs.key)

      break
    } catch (error) {
      // last key
      if (i + 1 >= length) {
        throw error
      }
      // try next key
    }
  }

  // Parse decrypted .env string
  return DotenvModule.parse(decrypted)
}

function _log (message) {
  console.log(`[dotenv@${version}][INFO] ${message}`)
}

function _warn (message) {
  console.log(`[dotenv@${version}][WARN] ${message}`)
}

function _debug (message) {
  console.log(`[dotenv@${version}][DEBUG] ${message}`)
}

function _dotenvKey (options) {
  // prioritize developer directly setting options.DOTENV_KEY
  if (options && options.DOTENV_KEY && options.DOTENV_KEY.length > 0) {
    return options.DOTENV_KEY
  }

  // secondary infra already contains a DOTENV_KEY environment variable
  if (process.env.DOTENV_KEY && process.env.DOTENV_KEY.length > 0) {
    return process.env.DOTENV_KEY
  }

  // fallback to empty string
  return ''
}

function _instructions (result, dotenvKey) {
  // Parse DOTENV_KEY. Format is a URI
  let uri
  try {
    uri = new URL(dotenvKey)
  } catch (error) {
    if (error.code === 'ERR_INVALID_URL') {
      const err = new Error('INVALID_DOTENV_KEY: Wrong format. Must be in valid uri format like dotenv://:key_1234@dotenvx.com/vault/.env.vault?environment=development')
      err.code = 'INVALID_DOTENV_KEY'
      throw err
    }

    throw error
  }

  // Get decrypt key
  const key = uri.password
  if (!key) {
    const err = new Error('INVALID_DOTENV_KEY: Missing key part')
    err.code = 'INVALID_DOTENV_KEY'
    throw err
  }

  // Get environment
  const environment = uri.searchParams.get('environment')
  if (!environment) {
    const err = new Error('INVALID_DOTENV_KEY: Missing environment part')
    err.code = 'INVALID_DOTENV_KEY'
    throw err
  }

  // Get ciphertext payload
  const environmentKey = `DOTENV_VAULT_${environment.toUpperCase()}`
  const ciphertext = result.parsed[environmentKey] // DOTENV_VAULT_PRODUCTION
  if (!ciphertext) {
    const err = new Error(`NOT_FOUND_DOTENV_ENVIRONMENT: Cannot locate environment ${environmentKey} in your .env.vault file.`)
    err.code = 'NOT_FOUND_DOTENV_ENVIRONMENT'
    throw err
  }

  return { ciphertext, key }
}

function _vaultPath (options) {
  let possibleVaultPath = null

  if (options && options.path && options.path.length > 0) {
    if (Array.isArray(options.path)) {
      for (const filepath of options.path) {
        if (fs.existsSync(filepath)) {
          possibleVaultPath = filepath.endsWith('.vault') ? filepath : `${filepath}.vault`
        }
      }
    } else {
      possibleVaultPath = options.path.endsWith('.vault') ? options.path : `${options.path}.vault`
    }
  } else {
    possibleVaultPath = path.resolve(process.cwd(), '.env.vault')
  }

  if (fs.existsSync(possibleVaultPath)) {
    return possibleVaultPath
  }

  return null
}

function _resolveHome (envPath) {
  return envPath[0] === '~' ? path.join(os.homedir(), envPath.slice(1)) : envPath
}

function _configVault (options) {
  _log('Loading env from encrypted .env.vault')

  const parsed = DotenvModule._parseVault(options)

  let processEnv = process.env
  if (options && options.processEnv != null) {
    processEnv = options.processEnv
  }

  DotenvModule.populate(processEnv, parsed, options)

  return { parsed }
}

function configDotenv (options) {
  let dotenvPath = path.resolve(process.cwd(), '.env')
  let encoding = 'utf8'
  const debug = Boolean(options && options.debug)

  if (options) {
    if (options.path != null) {
      let envPath = options.path

      if (Array.isArray(envPath)) {
        for (const filepath of options.path) {
          if (fs.existsSync(filepath)) {
            envPath = filepath
            break
          }
        }
      }

      dotenvPath = _resolveHome(envPath)
    }
    if (options.encoding != null) {
      encoding = options.encoding
    } else {
      if (debug) {
        _debug('No encoding is specified. UTF-8 is used by default')
      }
    }
  }

  try {
    // Specifying an encoding returns a string instead of a buffer
    const parsed = DotenvModule.parse(fs.readFileSync(dotenvPath, { encoding }))

    let processEnv = process.env
    if (options && options.processEnv != null) {
      processEnv = options.processEnv
    }

    DotenvModule.populate(processEnv, parsed, options)

    return { parsed }
  } catch (e) {
    if (debug) {
      _debug(`Failed to load ${dotenvPath} ${e.message}`)
    }

    return { error: e }
  }
}

// Populates process.env from .env file
function config (options) {
  // fallback to original dotenv if DOTENV_KEY is not set
  if (_dotenvKey(options).length === 0) {
    return DotenvModule.configDotenv(options)
  }

  const vaultPath = _vaultPath(options)

  // dotenvKey exists but .env.vault file does not exist
  if (!vaultPath) {
    _warn(`You set DOTENV_KEY but you are missing a .env.vault file at ${vaultPath}. Did you forget to build it?`)

    return DotenvModule.configDotenv(options)
  }

  return DotenvModule._configVault(options)
}

function decrypt (encrypted, keyStr) {
  const key = Buffer.from(keyStr.slice(-64), 'hex')
  let ciphertext = Buffer.from(encrypted, 'base64')

  const nonce = ciphertext.subarray(0, 12)
  const authTag = ciphertext.subarray(-16)
  ciphertext = ciphertext.subarray(12, -16)

  try {
    const aesgcm = crypto.createDecipheriv('aes-256-gcm', key, nonce)
    aesgcm.setAuthTag(authTag)
    return `${aesgcm.update(ciphertext)}${aesgcm.final()}`
  } catch (error) {
    const isRange = error instanceof RangeError
    const invalidKeyLength = error.message === 'Invalid key length'
    const decryptionFailed = error.message === 'Unsupported state or unable to authenticate data'

    if (isRange || invalidKeyLength) {
      const err = new Error('INVALID_DOTENV_KEY: It must be 64 characters long (or more)')
      err.code = 'INVALID_DOTENV_KEY'
      throw err
    } else if (decryptionFailed) {
      const err = new Error('DECRYPTION_FAILED: Please check your DOTENV_KEY')
      err.code = 'DECRYPTION_FAILED'
      throw err
    } else {
      throw error
    }
  }
}

// Populate process.env with parsed values
function populate (processEnv, parsed, options = {}) {
  const debug = Boolean(options && options.debug)
  const override = Boolean(options && options.override)

  if (typeof parsed !== 'object') {
    const err = new Error('OBJECT_REQUIRED: Please check the processEnv argument being passed to populate')
    err.code = 'OBJECT_REQUIRED'
    throw err
  }

  // Set process.env
  for (const key of Object.keys(parsed)) {
    if (Object.prototype.hasOwnProperty.call(processEnv, key)) {
      if (override === true) {
        processEnv[key] = parsed[key]
      }

      if (debug) {
        if (override === true) {
          _debug(`"${key}" is already defined and WAS overwritten`)
        } else {
          _debug(`"${key}" is already defined and was NOT overwritten`)
        }
      }
    } else {
      processEnv[key] = parsed[key]
    }
  }
}

const DotenvModule = {
  configDotenv,
  _configVault,
  _parseVault,
  config,
  decrypt,
  parse,
  populate
}

module.exports.configDotenv = DotenvModule.configDotenv
module.exports._configVault = DotenvModule._configVault
module.exports._parseVault = DotenvModule._parseVault
module.exports.config = DotenvModule.config
module.exports.decrypt = DotenvModule.decrypt
module.exports.parse = DotenvModule.parse
module.exports.populate = DotenvModule.populate

module.exports = DotenvModule


/***/ }),

/***/ "./src/routes/delete.User.ts":
/*!***********************************!*\
  !*** ./src/routes/delete.User.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.deleteUser = void 0;
const postUser_1 = __webpack_require__(/*! ./postUser */ "./src/routes/postUser.ts");
const uuid_1 = __webpack_require__(/*! uuid */ "./node_modules/uuid/dist/esm-node/index.js");
const deleteUser = (request, response, userId) => {
    if (!(0, uuid_1.validate)(userId)) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ message: 'Invalid user ID' }));
    }
    else {
        const userIndex = postUser_1.database.findIndex((user) => user.id === userId);
        if (userIndex === -1) {
            response.statusCode = 404;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ message: 'User not found' }));
            return;
        }
        const data = postUser_1.database.filter((item) => item.id !== userId);
        (0, postUser_1.setDatabase)(data);
        response.statusCode = 204;
        response.end(JSON.stringify({ message: 'User was deleted' }));
    }
};
exports.deleteUser = deleteUser;


/***/ }),

/***/ "./src/routes/getUserById.ts":
/*!***********************************!*\
  !*** ./src/routes/getUserById.ts ***!
  \***********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getUserById = void 0;
const postUser_1 = __webpack_require__(/*! ./postUser */ "./src/routes/postUser.ts");
const uuid_1 = __webpack_require__(/*! uuid */ "./node_modules/uuid/dist/esm-node/index.js");
const getUserById = (request, response, userId) => {
    if (!(0, uuid_1.validate)(userId)) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ message: 'Invalid user ID' }));
    }
    else {
        const user = postUser_1.database.find((user) => user.id === userId);
        if (user) {
            response.statusCode = 200;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(user));
        }
        else {
            response.statusCode = 404;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ message: 'User not found' }));
        }
    }
};
exports.getUserById = getUserById;


/***/ }),

/***/ "./src/routes/getUsers.ts":
/*!********************************!*\
  !*** ./src/routes/getUsers.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.getUsers = void 0;
const postUser_1 = __webpack_require__(/*! ./postUser */ "./src/routes/postUser.ts");
const getUsers = (request, response) => {
    response.statusCode = 200;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(postUser_1.database));
};
exports.getUsers = getUsers;


/***/ }),

/***/ "./src/routes/postUser.ts":
/*!********************************!*\
  !*** ./src/routes/postUser.ts ***!
  \********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.createUser = exports.setDatabase = exports.database = void 0;
const uuid_1 = __webpack_require__(/*! uuid */ "./node_modules/uuid/dist/esm-node/index.js");
exports.database = [];
function setDatabase(data) {
    exports.database = data;
}
exports.setDatabase = setDatabase;
;
const createUser = (request, response) => {
    let body = '';
    request.on('data', (chunk) => {
        body += chunk;
    });
    request.on('end', () => {
        try {
            const requestBody = JSON.parse(body);
            const { username, age, hobbies } = requestBody;
            if (!username || !age || !hobbies) {
                response.statusCode = 400;
                response.setHeader('Content-Type', 'application/json');
                return response.end(JSON.stringify({
                    message: 'Username, age, and hobbies are required fields',
                }));
            }
            const user = { id: (0, uuid_1.v4)(), username, age, hobbies };
            exports.database.push(user);
            response.statusCode = 201;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(user));
        }
        catch (error) {
            response.statusCode = 400;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({
                message: 'Invalid JSON',
            }));
        }
    });
};
exports.createUser = createUser;


/***/ }),

/***/ "./src/routes/upDateUser.ts":
/*!**********************************!*\
  !*** ./src/routes/upDateUser.ts ***!
  \**********************************/
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

"use strict";

Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.updateUser = void 0;
const postUser_1 = __webpack_require__(/*! ./postUser */ "./src/routes/postUser.ts");
const uuid_1 = __webpack_require__(/*! uuid */ "./node_modules/uuid/dist/esm-node/index.js");
const updateUser = (request, response, userId) => {
    if (!(0, uuid_1.validate)(userId)) {
        response.statusCode = 400;
        response.setHeader('Content-Type', 'application/json');
        response.end(JSON.stringify({ message: 'Invalid user ID' }));
    }
    else {
        const userToUpdate = postUser_1.database.find((user) => user.id === userId);
        if (!userToUpdate) {
            response.statusCode = 404;
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify({ message: 'User not found' }));
            return;
        }
        let body = '';
        request.on('data', (chunk) => {
            body += chunk;
        });
        request.on('end', () => {
            try {
                const data = JSON.parse(body);
                userToUpdate.username = data.username || userToUpdate.username;
                userToUpdate.age = data.age || userToUpdate.age;
                userToUpdate.hobbies = data.hobbies || userToUpdate.hobbies;
                response.statusCode = 200;
                response.setHeader('Content-Type', 'application/json');
                response.end(JSON.stringify(userToUpdate));
            }
            catch (error) {
                response.statusCode = 400;
                response.setHeader('Content-Type', 'application/json');
                response.end(JSON.stringify({ message: 'Invalid request body' }));
            }
        });
    }
};
exports.updateUser = updateUser;


/***/ }),

/***/ "./src/server.ts":
/*!***********************!*\
  !*** ./src/server.ts ***!
  \***********************/
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";

var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", ({ value: true }));
exports.server = exports.port = void 0;
const process_1 = __importDefault(__webpack_require__(/*! process */ "process"));
const dotenv_1 = __importDefault(__webpack_require__(/*! dotenv */ "./node_modules/dotenv/lib/main.js"));
const getUsers_1 = __webpack_require__(/*! ./routes/getUsers */ "./src/routes/getUsers.ts");
const getUserById_1 = __webpack_require__(/*! ./routes/getUserById */ "./src/routes/getUserById.ts");
const postUser_1 = __webpack_require__(/*! ./routes/postUser */ "./src/routes/postUser.ts");
const http_1 = __importDefault(__webpack_require__(/*! http */ "http"));
const upDateUser_1 = __webpack_require__(/*! ./routes/upDateUser */ "./src/routes/upDateUser.ts");
const delete_User_1 = __webpack_require__(/*! ./routes/delete.User */ "./src/routes/delete.User.ts");
dotenv_1.default.config();
exports.port = process_1.default.env.PORT || 3000;
console.log(process_1.default.env.PORT);
exports.server = http_1.default.createServer((req, res) => {
    const userId = getUserIdFromUrl(req.url);
    try {
        if (req.method === 'POST' && req.url.startsWith('/api/users')) {
            (0, postUser_1.createUser)(req, res);
        }
        else if (req.method === 'GET' && req.url.startsWith('/api/users')) {
            if (req.url === '/api/users' || req.url === '/api/users/') {
                (0, getUsers_1.getUsers)(req, res);
            }
            else {
                (0, getUserById_1.getUserById)(req, res, userId);
            }
        }
        else if (req.method === 'PUT' && req.url.startsWith('/api/users/')) {
            (0, upDateUser_1.updateUser)(req, res, userId);
        }
        else if (req.method === 'DELETE' && req.url.startsWith('/api/users/')) {
            (0, delete_User_1.deleteUser)(req, res, userId);
        }
        else {
            res.statusCode = 404;
            res.end('Not Found');
        }
    }
    catch (error) {
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Internal Server Error' }));
    }
});
function getUserIdFromUrl(url) {
    const urlArray = url.split('/');
    const userId = urlArray[urlArray.length - 1];
    return userId;
}


/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/index.js":
/*!**************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/index.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   NIL: () => (/* reexport safe */ _nil_js__WEBPACK_IMPORTED_MODULE_4__["default"]),
/* harmony export */   parse: () => (/* reexport safe */ _parse_js__WEBPACK_IMPORTED_MODULE_8__["default"]),
/* harmony export */   stringify: () => (/* reexport safe */ _stringify_js__WEBPACK_IMPORTED_MODULE_7__["default"]),
/* harmony export */   v1: () => (/* reexport safe */ _v1_js__WEBPACK_IMPORTED_MODULE_0__["default"]),
/* harmony export */   v3: () => (/* reexport safe */ _v3_js__WEBPACK_IMPORTED_MODULE_1__["default"]),
/* harmony export */   v4: () => (/* reexport safe */ _v4_js__WEBPACK_IMPORTED_MODULE_2__["default"]),
/* harmony export */   v5: () => (/* reexport safe */ _v5_js__WEBPACK_IMPORTED_MODULE_3__["default"]),
/* harmony export */   validate: () => (/* reexport safe */ _validate_js__WEBPACK_IMPORTED_MODULE_6__["default"]),
/* harmony export */   version: () => (/* reexport safe */ _version_js__WEBPACK_IMPORTED_MODULE_5__["default"])
/* harmony export */ });
/* harmony import */ var _v1_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./v1.js */ "./node_modules/uuid/dist/esm-node/v1.js");
/* harmony import */ var _v3_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./v3.js */ "./node_modules/uuid/dist/esm-node/v3.js");
/* harmony import */ var _v4_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./v4.js */ "./node_modules/uuid/dist/esm-node/v4.js");
/* harmony import */ var _v5_js__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./v5.js */ "./node_modules/uuid/dist/esm-node/v5.js");
/* harmony import */ var _nil_js__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! ./nil.js */ "./node_modules/uuid/dist/esm-node/nil.js");
/* harmony import */ var _version_js__WEBPACK_IMPORTED_MODULE_5__ = __webpack_require__(/*! ./version.js */ "./node_modules/uuid/dist/esm-node/version.js");
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_6__ = __webpack_require__(/*! ./validate.js */ "./node_modules/uuid/dist/esm-node/validate.js");
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_7__ = __webpack_require__(/*! ./stringify.js */ "./node_modules/uuid/dist/esm-node/stringify.js");
/* harmony import */ var _parse_js__WEBPACK_IMPORTED_MODULE_8__ = __webpack_require__(/*! ./parse.js */ "./node_modules/uuid/dist/esm-node/parse.js");










/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/md5.js":
/*!************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/md5.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! crypto */ "crypto");
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_0__);


function md5(bytes) {
  if (Array.isArray(bytes)) {
    bytes = Buffer.from(bytes);
  } else if (typeof bytes === 'string') {
    bytes = Buffer.from(bytes, 'utf8');
  }

  return crypto__WEBPACK_IMPORTED_MODULE_0___default().createHash('md5').update(bytes).digest();
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (md5);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/native.js":
/*!***************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/native.js ***!
  \***************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! crypto */ "crypto");
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_0__);

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ({
  randomUUID: (crypto__WEBPACK_IMPORTED_MODULE_0___default().randomUUID)
});

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/nil.js":
/*!************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/nil.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = ('00000000-0000-0000-0000-000000000000');

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/parse.js":
/*!**************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/parse.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./validate.js */ "./node_modules/uuid/dist/esm-node/validate.js");


function parse(uuid) {
  if (!(0,_validate_js__WEBPACK_IMPORTED_MODULE_0__["default"])(uuid)) {
    throw TypeError('Invalid UUID');
  }

  let v;
  const arr = new Uint8Array(16); // Parse ########-....-....-....-............

  arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
  arr[1] = v >>> 16 & 0xff;
  arr[2] = v >>> 8 & 0xff;
  arr[3] = v & 0xff; // Parse ........-####-....-....-............

  arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
  arr[5] = v & 0xff; // Parse ........-....-####-....-............

  arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
  arr[7] = v & 0xff; // Parse ........-....-....-####-............

  arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
  arr[9] = v & 0xff; // Parse ........-....-....-....-############
  // (Use "/" to avoid 32-bit truncation when bit-shifting high-order bytes)

  arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 0x10000000000 & 0xff;
  arr[11] = v / 0x100000000 & 0xff;
  arr[12] = v >>> 24 & 0xff;
  arr[13] = v >>> 16 & 0xff;
  arr[14] = v >>> 8 & 0xff;
  arr[15] = v & 0xff;
  return arr;
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (parse);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/regex.js":
/*!**************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/regex.js ***!
  \**************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (/^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/rng.js":
/*!************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/rng.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (/* binding */ rng)
/* harmony export */ });
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! crypto */ "crypto");
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_0__);

const rnds8Pool = new Uint8Array(256); // # of random values to pre-allocate

let poolPtr = rnds8Pool.length;
function rng() {
  if (poolPtr > rnds8Pool.length - 16) {
    crypto__WEBPACK_IMPORTED_MODULE_0___default().randomFillSync(rnds8Pool);
    poolPtr = 0;
  }

  return rnds8Pool.slice(poolPtr, poolPtr += 16);
}

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/sha1.js":
/*!*************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/sha1.js ***!
  \*************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! crypto */ "crypto");
/* harmony import */ var crypto__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(crypto__WEBPACK_IMPORTED_MODULE_0__);


function sha1(bytes) {
  if (Array.isArray(bytes)) {
    bytes = Buffer.from(bytes);
  } else if (typeof bytes === 'string') {
    bytes = Buffer.from(bytes, 'utf8');
  }

  return crypto__WEBPACK_IMPORTED_MODULE_0___default().createHash('sha1').update(bytes).digest();
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (sha1);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/stringify.js":
/*!******************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/stringify.js ***!
  \******************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__),
/* harmony export */   unsafeStringify: () => (/* binding */ unsafeStringify)
/* harmony export */ });
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./validate.js */ "./node_modules/uuid/dist/esm-node/validate.js");

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */

const byteToHex = [];

for (let i = 0; i < 256; ++i) {
  byteToHex.push((i + 0x100).toString(16).slice(1));
}

function unsafeStringify(arr, offset = 0) {
  // Note: Be careful editing this code!  It's been tuned for performance
  // and works in ways you may not expect. See https://github.com/uuidjs/uuid/pull/434
  return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + '-' + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + '-' + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + '-' + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + '-' + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
}

function stringify(arr, offset = 0) {
  const uuid = unsafeStringify(arr, offset); // Consistency check for valid UUID.  If this throws, it's likely due to one
  // of the following:
  // - One or more input array values don't map to a hex octet (leading to
  // "undefined" in the uuid)
  // - Invalid input values for the RFC `version` or `variant` fields

  if (!(0,_validate_js__WEBPACK_IMPORTED_MODULE_0__["default"])(uuid)) {
    throw TypeError('Stringified UUID is invalid');
  }

  return uuid;
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (stringify);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/v1.js":
/*!***********************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/v1.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _rng_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./rng.js */ "./node_modules/uuid/dist/esm-node/rng.js");
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./stringify.js */ "./node_modules/uuid/dist/esm-node/stringify.js");

 // **`v1()` - Generate time-based UUID**
//
// Inspired by https://github.com/LiosK/UUID.js
// and http://docs.python.org/library/uuid.html

let _nodeId;

let _clockseq; // Previous uuid creation time


let _lastMSecs = 0;
let _lastNSecs = 0; // See https://github.com/uuidjs/uuid for API details

function v1(options, buf, offset) {
  let i = buf && offset || 0;
  const b = buf || new Array(16);
  options = options || {};
  let node = options.node || _nodeId;
  let clockseq = options.clockseq !== undefined ? options.clockseq : _clockseq; // node and clockseq need to be initialized to random values if they're not
  // specified.  We do this lazily to minimize issues related to insufficient
  // system entropy.  See #189

  if (node == null || clockseq == null) {
    const seedBytes = options.random || (options.rng || _rng_js__WEBPACK_IMPORTED_MODULE_0__["default"])();

    if (node == null) {
      // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
      node = _nodeId = [seedBytes[0] | 0x01, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
    }

    if (clockseq == null) {
      // Per 4.2.2, randomize (14 bit) clockseq
      clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 0x3fff;
    }
  } // UUID timestamps are 100 nano-second units since the Gregorian epoch,
  // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
  // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
  // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.


  let msecs = options.msecs !== undefined ? options.msecs : Date.now(); // Per 4.2.1.2, use count of uuid's generated during the current clock
  // cycle to simulate higher resolution clock

  let nsecs = options.nsecs !== undefined ? options.nsecs : _lastNSecs + 1; // Time since last uuid creation (in msecs)

  const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 10000; // Per 4.2.1.2, Bump clockseq on clock regression

  if (dt < 0 && options.clockseq === undefined) {
    clockseq = clockseq + 1 & 0x3fff;
  } // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
  // time interval


  if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === undefined) {
    nsecs = 0;
  } // Per 4.2.1.2 Throw error if too many uuids are requested


  if (nsecs >= 10000) {
    throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
  }

  _lastMSecs = msecs;
  _lastNSecs = nsecs;
  _clockseq = clockseq; // Per 4.1.4 - Convert from unix epoch to Gregorian epoch

  msecs += 12219292800000; // `time_low`

  const tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
  b[i++] = tl >>> 24 & 0xff;
  b[i++] = tl >>> 16 & 0xff;
  b[i++] = tl >>> 8 & 0xff;
  b[i++] = tl & 0xff; // `time_mid`

  const tmh = msecs / 0x100000000 * 10000 & 0xfffffff;
  b[i++] = tmh >>> 8 & 0xff;
  b[i++] = tmh & 0xff; // `time_high_and_version`

  b[i++] = tmh >>> 24 & 0xf | 0x10; // include version

  b[i++] = tmh >>> 16 & 0xff; // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)

  b[i++] = clockseq >>> 8 | 0x80; // `clock_seq_low`

  b[i++] = clockseq & 0xff; // `node`

  for (let n = 0; n < 6; ++n) {
    b[i + n] = node[n];
  }

  return buf || (0,_stringify_js__WEBPACK_IMPORTED_MODULE_1__.unsafeStringify)(b);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v1);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/v3.js":
/*!***********************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/v3.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _v35_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./v35.js */ "./node_modules/uuid/dist/esm-node/v35.js");
/* harmony import */ var _md5_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./md5.js */ "./node_modules/uuid/dist/esm-node/md5.js");


const v3 = (0,_v35_js__WEBPACK_IMPORTED_MODULE_0__["default"])('v3', 0x30, _md5_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v3);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/v35.js":
/*!************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/v35.js ***!
  \************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   DNS: () => (/* binding */ DNS),
/* harmony export */   URL: () => (/* binding */ URL),
/* harmony export */   "default": () => (/* binding */ v35)
/* harmony export */ });
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./stringify.js */ "./node_modules/uuid/dist/esm-node/stringify.js");
/* harmony import */ var _parse_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./parse.js */ "./node_modules/uuid/dist/esm-node/parse.js");



function stringToBytes(str) {
  str = unescape(encodeURIComponent(str)); // UTF8 escape

  const bytes = [];

  for (let i = 0; i < str.length; ++i) {
    bytes.push(str.charCodeAt(i));
  }

  return bytes;
}

const DNS = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const URL = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';
function v35(name, version, hashfunc) {
  function generateUUID(value, namespace, buf, offset) {
    var _namespace;

    if (typeof value === 'string') {
      value = stringToBytes(value);
    }

    if (typeof namespace === 'string') {
      namespace = (0,_parse_js__WEBPACK_IMPORTED_MODULE_0__["default"])(namespace);
    }

    if (((_namespace = namespace) === null || _namespace === void 0 ? void 0 : _namespace.length) !== 16) {
      throw TypeError('Namespace must be array-like (16 iterable integer values, 0-255)');
    } // Compute hash of namespace and value, Per 4.3
    // Future: Use spread syntax when supported on all platforms, e.g. `bytes =
    // hashfunc([...namespace, ... value])`


    let bytes = new Uint8Array(16 + value.length);
    bytes.set(namespace);
    bytes.set(value, namespace.length);
    bytes = hashfunc(bytes);
    bytes[6] = bytes[6] & 0x0f | version;
    bytes[8] = bytes[8] & 0x3f | 0x80;

    if (buf) {
      offset = offset || 0;

      for (let i = 0; i < 16; ++i) {
        buf[offset + i] = bytes[i];
      }

      return buf;
    }

    return (0,_stringify_js__WEBPACK_IMPORTED_MODULE_1__.unsafeStringify)(bytes);
  } // Function#name is not settable on some platforms (#270)


  try {
    generateUUID.name = name; // eslint-disable-next-line no-empty
  } catch (err) {} // For CommonJS default export support


  generateUUID.DNS = DNS;
  generateUUID.URL = URL;
  return generateUUID;
}

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/v4.js":
/*!***********************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/v4.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _native_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./native.js */ "./node_modules/uuid/dist/esm-node/native.js");
/* harmony import */ var _rng_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./rng.js */ "./node_modules/uuid/dist/esm-node/rng.js");
/* harmony import */ var _stringify_js__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./stringify.js */ "./node_modules/uuid/dist/esm-node/stringify.js");




function v4(options, buf, offset) {
  if (_native_js__WEBPACK_IMPORTED_MODULE_0__["default"].randomUUID && !buf && !options) {
    return _native_js__WEBPACK_IMPORTED_MODULE_0__["default"].randomUUID();
  }

  options = options || {};
  const rnds = options.random || (options.rng || _rng_js__WEBPACK_IMPORTED_MODULE_1__["default"])(); // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`

  rnds[6] = rnds[6] & 0x0f | 0x40;
  rnds[8] = rnds[8] & 0x3f | 0x80; // Copy bytes to buffer, if provided

  if (buf) {
    offset = offset || 0;

    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }

    return buf;
  }

  return (0,_stringify_js__WEBPACK_IMPORTED_MODULE_2__.unsafeStringify)(rnds);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v4);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/v5.js":
/*!***********************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/v5.js ***!
  \***********************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _v35_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./v35.js */ "./node_modules/uuid/dist/esm-node/v35.js");
/* harmony import */ var _sha1_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./sha1.js */ "./node_modules/uuid/dist/esm-node/sha1.js");


const v5 = (0,_v35_js__WEBPACK_IMPORTED_MODULE_0__["default"])('v5', 0x50, _sha1_js__WEBPACK_IMPORTED_MODULE_1__["default"]);
/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (v5);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/validate.js":
/*!*****************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/validate.js ***!
  \*****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _regex_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./regex.js */ "./node_modules/uuid/dist/esm-node/regex.js");


function validate(uuid) {
  return typeof uuid === 'string' && _regex_js__WEBPACK_IMPORTED_MODULE_0__["default"].test(uuid);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (validate);

/***/ }),

/***/ "./node_modules/uuid/dist/esm-node/version.js":
/*!****************************************************!*\
  !*** ./node_modules/uuid/dist/esm-node/version.js ***!
  \****************************************************/
/***/ ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var _validate_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./validate.js */ "./node_modules/uuid/dist/esm-node/validate.js");


function version(uuid) {
  if (!(0,_validate_js__WEBPACK_IMPORTED_MODULE_0__["default"])(uuid)) {
    throw TypeError('Invalid UUID');
  }

  return parseInt(uuid.slice(14, 15), 16);
}

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (version);

/***/ }),

/***/ "crypto":
/*!*************************!*\
  !*** external "crypto" ***!
  \*************************/
/***/ ((module) => {

"use strict";
module.exports = require("crypto");

/***/ }),

/***/ "fs":
/*!*********************!*\
  !*** external "fs" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ }),

/***/ "http":
/*!***********************!*\
  !*** external "http" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("http");

/***/ }),

/***/ "os":
/*!*********************!*\
  !*** external "os" ***!
  \*********************/
/***/ ((module) => {

"use strict";
module.exports = require("os");

/***/ }),

/***/ "path":
/*!***********************!*\
  !*** external "path" ***!
  \***********************/
/***/ ((module) => {

"use strict";
module.exports = require("path");

/***/ }),

/***/ "process":
/*!**************************!*\
  !*** external "process" ***!
  \**************************/
/***/ ((module) => {

"use strict";
module.exports = require("process");

/***/ }),

/***/ "./node_modules/dotenv/package.json":
/*!******************************************!*\
  !*** ./node_modules/dotenv/package.json ***!
  \******************************************/
/***/ ((module) => {

"use strict";
module.exports = /*#__PURE__*/JSON.parse('{"name":"dotenv","version":"16.4.2","description":"Loads environment variables from .env file","main":"lib/main.js","types":"lib/main.d.ts","exports":{".":{"types":"./lib/main.d.ts","require":"./lib/main.js","default":"./lib/main.js"},"./config":"./config.js","./config.js":"./config.js","./lib/env-options":"./lib/env-options.js","./lib/env-options.js":"./lib/env-options.js","./lib/cli-options":"./lib/cli-options.js","./lib/cli-options.js":"./lib/cli-options.js","./package.json":"./package.json"},"scripts":{"dts-check":"tsc --project tests/types/tsconfig.json","lint":"standard","lint-readme":"standard-markdown","pretest":"npm run lint && npm run dts-check","test":"tap tests/*.js --100 -Rspec","prerelease":"npm test","release":"standard-version"},"repository":{"type":"git","url":"git://github.com/motdotla/dotenv.git"},"funding":"https://dotenvx.com","keywords":["dotenv","env",".env","environment","variables","config","settings"],"readmeFilename":"README.md","license":"BSD-2-Clause","devDependencies":{"@definitelytyped/dtslint":"^0.0.133","@types/node":"^18.11.3","decache":"^4.6.1","sinon":"^14.0.1","standard":"^17.0.0","standard-markdown":"^7.1.0","standard-version":"^9.5.0","tap":"^16.3.0","tar":"^6.1.11","typescript":"^4.8.4"},"engines":{"node":">=12"},"browser":{"fs":false}}');

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
(() => {
"use strict";
var exports = __webpack_exports__;
/*!**********************!*\
  !*** ./src/index.ts ***!
  \**********************/

Object.defineProperty(exports, "__esModule", ({ value: true }));
const server_1 = __webpack_require__(/*! ./server */ "./src/server.ts");
server_1.server.listen(server_1.port, () => {
    console.log(`Server is running on port ${server_1.port}`);
});

})();

/******/ })()
;
//# sourceMappingURL=data:application/json;charset=utf-8;base64,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Ozs7OztBQ0hjOztBQUUvQjtBQUNBLHFDQUFxQyxpREFBSztBQUMxQzs7QUFFQSxpRUFBZSxRQUFROzs7Ozs7Ozs7Ozs7Ozs7O0FDTmM7O0FBRXJDO0FBQ0EsT0FBTyx3REFBUTtBQUNmO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQSxpRUFBZSxPQUFPOzs7Ozs7Ozs7OztBQ1Z0Qjs7Ozs7Ozs7Ozs7QUNBQTs7Ozs7Ozs7Ozs7QUNBQTs7Ozs7Ozs7Ozs7QUNBQTs7Ozs7Ozs7Ozs7QUNBQTs7Ozs7Ozs7Ozs7QUNBQTs7Ozs7Ozs7Ozs7Ozs7Ozs7VUNBQTtVQUNBOztVQUVBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBO1VBQ0E7VUFDQTtVQUNBOztVQUVBO1VBQ0E7O1VBRUE7VUFDQTtVQUNBOzs7OztXQ3RCQTtXQUNBO1dBQ0E7V0FDQTtXQUNBO1dBQ0EsaUNBQWlDLFdBQVc7V0FDNUM7V0FDQTs7Ozs7V0NQQTtXQUNBO1dBQ0E7V0FDQTtXQUNBLHlDQUF5Qyx3Q0FBd0M7V0FDakY7V0FDQTtXQUNBOzs7OztXQ1BBOzs7OztXQ0FBO1dBQ0E7V0FDQTtXQUNBLHVEQUF1RCxpQkFBaUI7V0FDeEU7V0FDQSxnREFBZ0QsYUFBYTtXQUM3RDs7Ozs7Ozs7Ozs7O0FDTmE7QUFDYiw4Q0FBNkMsRUFBRSxhQUFhLEVBQUM7QUFDN0QsaUJBQWlCLG1CQUFPLENBQUMsaUNBQVU7QUFDbkM7QUFDQSw2Q0FBNkMsY0FBYztBQUMzRCxDQUFDIiwic291cmNlcyI6WyJ3ZWJwYWNrOi8vY3J1ZC1hcGkvLi9ub2RlX21vZHVsZXMvZG90ZW52L2xpYi9tYWluLmpzIiwid2VicGFjazovL2NydWQtYXBpLy4vc3JjL3JvdXRlcy9kZWxldGUuVXNlci50cyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL3NyYy9yb3V0ZXMvZ2V0VXNlckJ5SWQudHMiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvLi9zcmMvcm91dGVzL2dldFVzZXJzLnRzIiwid2VicGFjazovL2NydWQtYXBpLy4vc3JjL3JvdXRlcy9wb3N0VXNlci50cyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL3NyYy9yb3V0ZXMvdXBEYXRlVXNlci50cyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL3NyYy9zZXJ2ZXIudHMiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvLi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1ub2RlL2luZGV4LmpzIiwid2VicGFjazovL2NydWQtYXBpLy4vbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tbm9kZS9tZDUuanMiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvLi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1ub2RlL25hdGl2ZS5qcyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLW5vZGUvbmlsLmpzIiwid2VicGFjazovL2NydWQtYXBpLy4vbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tbm9kZS9wYXJzZS5qcyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLW5vZGUvcmVnZXguanMiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvLi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1ub2RlL3JuZy5qcyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLW5vZGUvc2hhMS5qcyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLW5vZGUvc3RyaW5naWZ5LmpzIiwid2VicGFjazovL2NydWQtYXBpLy4vbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tbm9kZS92MS5qcyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLW5vZGUvdjMuanMiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvLi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1ub2RlL3YzNS5qcyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLW5vZGUvdjQuanMiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvLi9ub2RlX21vZHVsZXMvdXVpZC9kaXN0L2VzbS1ub2RlL3Y1LmpzIiwid2VicGFjazovL2NydWQtYXBpLy4vbm9kZV9tb2R1bGVzL3V1aWQvZGlzdC9lc20tbm9kZS92YWxpZGF0ZS5qcyIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL25vZGVfbW9kdWxlcy91dWlkL2Rpc3QvZXNtLW5vZGUvdmVyc2lvbi5qcyIsIndlYnBhY2s6Ly9jcnVkLWFwaS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwiY3J5cHRvXCIiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImZzXCIiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvZXh0ZXJuYWwgbm9kZS1jb21tb25qcyBcImh0dHBcIiIsIndlYnBhY2s6Ly9jcnVkLWFwaS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwib3NcIiIsIndlYnBhY2s6Ly9jcnVkLWFwaS9leHRlcm5hbCBub2RlLWNvbW1vbmpzIFwicGF0aFwiIiwid2VicGFjazovL2NydWQtYXBpL2V4dGVybmFsIG5vZGUtY29tbW9uanMgXCJwcm9jZXNzXCIiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvd2VicGFjay9ydW50aW1lL2NvbXBhdCBnZXQgZGVmYXVsdCBleHBvcnQiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvd2VicGFjay9ydW50aW1lL2RlZmluZSBwcm9wZXJ0eSBnZXR0ZXJzIiwid2VicGFjazovL2NydWQtYXBpL3dlYnBhY2svcnVudGltZS9oYXNPd25Qcm9wZXJ0eSBzaG9ydGhhbmQiLCJ3ZWJwYWNrOi8vY3J1ZC1hcGkvd2VicGFjay9ydW50aW1lL21ha2UgbmFtZXNwYWNlIG9iamVjdCIsIndlYnBhY2s6Ly9jcnVkLWFwaS8uL3NyYy9pbmRleC50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJjb25zdCBmcyA9IHJlcXVpcmUoJ2ZzJylcbmNvbnN0IHBhdGggPSByZXF1aXJlKCdwYXRoJylcbmNvbnN0IG9zID0gcmVxdWlyZSgnb3MnKVxuY29uc3QgY3J5cHRvID0gcmVxdWlyZSgnY3J5cHRvJylcbmNvbnN0IHBhY2thZ2VKc29uID0gcmVxdWlyZSgnLi4vcGFja2FnZS5qc29uJylcblxuY29uc3QgdmVyc2lvbiA9IHBhY2thZ2VKc29uLnZlcnNpb25cblxuY29uc3QgTElORSA9IC8oPzpefF4pXFxzKig/OmV4cG9ydFxccyspPyhbXFx3Li1dKykoPzpcXHMqPVxccyo/fDpcXHMrPykoXFxzKicoPzpcXFxcJ3xbXiddKSonfFxccypcIig/OlxcXFxcInxbXlwiXSkqXCJ8XFxzKmAoPzpcXFxcYHxbXmBdKSpgfFteI1xcclxcbl0rKT9cXHMqKD86Iy4qKT8oPzokfCQpL21nXG5cbi8vIFBhcnNlIHNyYyBpbnRvIGFuIE9iamVjdFxuZnVuY3Rpb24gcGFyc2UgKHNyYykge1xuICBjb25zdCBvYmogPSB7fVxuXG4gIC8vIENvbnZlcnQgYnVmZmVyIHRvIHN0cmluZ1xuICBsZXQgbGluZXMgPSBzcmMudG9TdHJpbmcoKVxuXG4gIC8vIENvbnZlcnQgbGluZSBicmVha3MgdG8gc2FtZSBmb3JtYXRcbiAgbGluZXMgPSBsaW5lcy5yZXBsYWNlKC9cXHJcXG4/L21nLCAnXFxuJylcblxuICBsZXQgbWF0Y2hcbiAgd2hpbGUgKChtYXRjaCA9IExJTkUuZXhlYyhsaW5lcykpICE9IG51bGwpIHtcbiAgICBjb25zdCBrZXkgPSBtYXRjaFsxXVxuXG4gICAgLy8gRGVmYXVsdCB1bmRlZmluZWQgb3IgbnVsbCB0byBlbXB0eSBzdHJpbmdcbiAgICBsZXQgdmFsdWUgPSAobWF0Y2hbMl0gfHwgJycpXG5cbiAgICAvLyBSZW1vdmUgd2hpdGVzcGFjZVxuICAgIHZhbHVlID0gdmFsdWUudHJpbSgpXG5cbiAgICAvLyBDaGVjayBpZiBkb3VibGUgcXVvdGVkXG4gICAgY29uc3QgbWF5YmVRdW90ZSA9IHZhbHVlWzBdXG5cbiAgICAvLyBSZW1vdmUgc3Vycm91bmRpbmcgcXVvdGVzXG4gICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9eKFsnXCJgXSkoW1xcc1xcU10qKVxcMSQvbWcsICckMicpXG5cbiAgICAvLyBFeHBhbmQgbmV3bGluZXMgaWYgZG91YmxlIHF1b3RlZFxuICAgIGlmIChtYXliZVF1b3RlID09PSAnXCInKSB7XG4gICAgICB2YWx1ZSA9IHZhbHVlLnJlcGxhY2UoL1xcXFxuL2csICdcXG4nKVxuICAgICAgdmFsdWUgPSB2YWx1ZS5yZXBsYWNlKC9cXFxcci9nLCAnXFxyJylcbiAgICB9XG5cbiAgICAvLyBBZGQgdG8gb2JqZWN0XG4gICAgb2JqW2tleV0gPSB2YWx1ZVxuICB9XG5cbiAgcmV0dXJuIG9ialxufVxuXG5mdW5jdGlvbiBfcGFyc2VWYXVsdCAob3B0aW9ucykge1xuICBjb25zdCB2YXVsdFBhdGggPSBfdmF1bHRQYXRoKG9wdGlvbnMpXG5cbiAgLy8gUGFyc2UgLmVudi52YXVsdFxuICBjb25zdCByZXN1bHQgPSBEb3RlbnZNb2R1bGUuY29uZmlnRG90ZW52KHsgcGF0aDogdmF1bHRQYXRoIH0pXG4gIGlmICghcmVzdWx0LnBhcnNlZCkge1xuICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcihgTUlTU0lOR19EQVRBOiBDYW5ub3QgcGFyc2UgJHt2YXVsdFBhdGh9IGZvciBhbiB1bmtub3duIHJlYXNvbmApXG4gICAgZXJyLmNvZGUgPSAnTUlTU0lOR19EQVRBJ1xuICAgIHRocm93IGVyclxuICB9XG5cbiAgLy8gaGFuZGxlIHNjZW5hcmlvIGZvciBjb21tYSBzZXBhcmF0ZWQga2V5cyAtIGZvciB1c2Ugd2l0aCBrZXkgcm90YXRpb25cbiAgLy8gZXhhbXBsZTogRE9URU5WX0tFWT1cImRvdGVudjovLzprZXlfMTIzNEBkb3RlbnZ4LmNvbS92YXVsdC8uZW52LnZhdWx0P2Vudmlyb25tZW50PXByb2QsZG90ZW52Oi8vOmtleV83ODkwQGRvdGVudnguY29tL3ZhdWx0Ly5lbnYudmF1bHQ/ZW52aXJvbm1lbnQ9cHJvZFwiXG4gIGNvbnN0IGtleXMgPSBfZG90ZW52S2V5KG9wdGlvbnMpLnNwbGl0KCcsJylcbiAgY29uc3QgbGVuZ3RoID0ga2V5cy5sZW5ndGhcblxuICBsZXQgZGVjcnlwdGVkXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICB0cnkge1xuICAgICAgLy8gR2V0IGZ1bGwga2V5XG4gICAgICBjb25zdCBrZXkgPSBrZXlzW2ldLnRyaW0oKVxuXG4gICAgICAvLyBHZXQgaW5zdHJ1Y3Rpb25zIGZvciBkZWNyeXB0XG4gICAgICBjb25zdCBhdHRycyA9IF9pbnN0cnVjdGlvbnMocmVzdWx0LCBrZXkpXG5cbiAgICAgIC8vIERlY3J5cHRcbiAgICAgIGRlY3J5cHRlZCA9IERvdGVudk1vZHVsZS5kZWNyeXB0KGF0dHJzLmNpcGhlcnRleHQsIGF0dHJzLmtleSlcblxuICAgICAgYnJlYWtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgLy8gbGFzdCBrZXlcbiAgICAgIGlmIChpICsgMSA+PSBsZW5ndGgpIHtcbiAgICAgICAgdGhyb3cgZXJyb3JcbiAgICAgIH1cbiAgICAgIC8vIHRyeSBuZXh0IGtleVxuICAgIH1cbiAgfVxuXG4gIC8vIFBhcnNlIGRlY3J5cHRlZCAuZW52IHN0cmluZ1xuICByZXR1cm4gRG90ZW52TW9kdWxlLnBhcnNlKGRlY3J5cHRlZClcbn1cblxuZnVuY3Rpb24gX2xvZyAobWVzc2FnZSkge1xuICBjb25zb2xlLmxvZyhgW2RvdGVudkAke3ZlcnNpb259XVtJTkZPXSAke21lc3NhZ2V9YClcbn1cblxuZnVuY3Rpb24gX3dhcm4gKG1lc3NhZ2UpIHtcbiAgY29uc29sZS5sb2coYFtkb3RlbnZAJHt2ZXJzaW9ufV1bV0FSTl0gJHttZXNzYWdlfWApXG59XG5cbmZ1bmN0aW9uIF9kZWJ1ZyAobWVzc2FnZSkge1xuICBjb25zb2xlLmxvZyhgW2RvdGVudkAke3ZlcnNpb259XVtERUJVR10gJHttZXNzYWdlfWApXG59XG5cbmZ1bmN0aW9uIF9kb3RlbnZLZXkgKG9wdGlvbnMpIHtcbiAgLy8gcHJpb3JpdGl6ZSBkZXZlbG9wZXIgZGlyZWN0bHkgc2V0dGluZyBvcHRpb25zLkRPVEVOVl9LRVlcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5ET1RFTlZfS0VZICYmIG9wdGlvbnMuRE9URU5WX0tFWS5sZW5ndGggPiAwKSB7XG4gICAgcmV0dXJuIG9wdGlvbnMuRE9URU5WX0tFWVxuICB9XG5cbiAgLy8gc2Vjb25kYXJ5IGluZnJhIGFscmVhZHkgY29udGFpbnMgYSBET1RFTlZfS0VZIGVudmlyb25tZW50IHZhcmlhYmxlXG4gIGlmIChwcm9jZXNzLmVudi5ET1RFTlZfS0VZICYmIHByb2Nlc3MuZW52LkRPVEVOVl9LRVkubGVuZ3RoID4gMCkge1xuICAgIHJldHVybiBwcm9jZXNzLmVudi5ET1RFTlZfS0VZXG4gIH1cblxuICAvLyBmYWxsYmFjayB0byBlbXB0eSBzdHJpbmdcbiAgcmV0dXJuICcnXG59XG5cbmZ1bmN0aW9uIF9pbnN0cnVjdGlvbnMgKHJlc3VsdCwgZG90ZW52S2V5KSB7XG4gIC8vIFBhcnNlIERPVEVOVl9LRVkuIEZvcm1hdCBpcyBhIFVSSVxuICBsZXQgdXJpXG4gIHRyeSB7XG4gICAgdXJpID0gbmV3IFVSTChkb3RlbnZLZXkpXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgaWYgKGVycm9yLmNvZGUgPT09ICdFUlJfSU5WQUxJRF9VUkwnKSB7XG4gICAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IoJ0lOVkFMSURfRE9URU5WX0tFWTogV3JvbmcgZm9ybWF0LiBNdXN0IGJlIGluIHZhbGlkIHVyaSBmb3JtYXQgbGlrZSBkb3RlbnY6Ly86a2V5XzEyMzRAZG90ZW52eC5jb20vdmF1bHQvLmVudi52YXVsdD9lbnZpcm9ubWVudD1kZXZlbG9wbWVudCcpXG4gICAgICBlcnIuY29kZSA9ICdJTlZBTElEX0RPVEVOVl9LRVknXG4gICAgICB0aHJvdyBlcnJcbiAgICB9XG5cbiAgICB0aHJvdyBlcnJvclxuICB9XG5cbiAgLy8gR2V0IGRlY3J5cHQga2V5XG4gIGNvbnN0IGtleSA9IHVyaS5wYXNzd29yZFxuICBpZiAoIWtleSkge1xuICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcignSU5WQUxJRF9ET1RFTlZfS0VZOiBNaXNzaW5nIGtleSBwYXJ0JylcbiAgICBlcnIuY29kZSA9ICdJTlZBTElEX0RPVEVOVl9LRVknXG4gICAgdGhyb3cgZXJyXG4gIH1cblxuICAvLyBHZXQgZW52aXJvbm1lbnRcbiAgY29uc3QgZW52aXJvbm1lbnQgPSB1cmkuc2VhcmNoUGFyYW1zLmdldCgnZW52aXJvbm1lbnQnKVxuICBpZiAoIWVudmlyb25tZW50KSB7XG4gICAgY29uc3QgZXJyID0gbmV3IEVycm9yKCdJTlZBTElEX0RPVEVOVl9LRVk6IE1pc3NpbmcgZW52aXJvbm1lbnQgcGFydCcpXG4gICAgZXJyLmNvZGUgPSAnSU5WQUxJRF9ET1RFTlZfS0VZJ1xuICAgIHRocm93IGVyclxuICB9XG5cbiAgLy8gR2V0IGNpcGhlcnRleHQgcGF5bG9hZFxuICBjb25zdCBlbnZpcm9ubWVudEtleSA9IGBET1RFTlZfVkFVTFRfJHtlbnZpcm9ubWVudC50b1VwcGVyQ2FzZSgpfWBcbiAgY29uc3QgY2lwaGVydGV4dCA9IHJlc3VsdC5wYXJzZWRbZW52aXJvbm1lbnRLZXldIC8vIERPVEVOVl9WQVVMVF9QUk9EVUNUSU9OXG4gIGlmICghY2lwaGVydGV4dCkge1xuICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcihgTk9UX0ZPVU5EX0RPVEVOVl9FTlZJUk9OTUVOVDogQ2Fubm90IGxvY2F0ZSBlbnZpcm9ubWVudCAke2Vudmlyb25tZW50S2V5fSBpbiB5b3VyIC5lbnYudmF1bHQgZmlsZS5gKVxuICAgIGVyci5jb2RlID0gJ05PVF9GT1VORF9ET1RFTlZfRU5WSVJPTk1FTlQnXG4gICAgdGhyb3cgZXJyXG4gIH1cblxuICByZXR1cm4geyBjaXBoZXJ0ZXh0LCBrZXkgfVxufVxuXG5mdW5jdGlvbiBfdmF1bHRQYXRoIChvcHRpb25zKSB7XG4gIGxldCBwb3NzaWJsZVZhdWx0UGF0aCA9IG51bGxcblxuICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnBhdGggJiYgb3B0aW9ucy5wYXRoLmxlbmd0aCA+IDApIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheShvcHRpb25zLnBhdGgpKSB7XG4gICAgICBmb3IgKGNvbnN0IGZpbGVwYXRoIG9mIG9wdGlvbnMucGF0aCkge1xuICAgICAgICBpZiAoZnMuZXhpc3RzU3luYyhmaWxlcGF0aCkpIHtcbiAgICAgICAgICBwb3NzaWJsZVZhdWx0UGF0aCA9IGZpbGVwYXRoLmVuZHNXaXRoKCcudmF1bHQnKSA/IGZpbGVwYXRoIDogYCR7ZmlsZXBhdGh9LnZhdWx0YFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHBvc3NpYmxlVmF1bHRQYXRoID0gb3B0aW9ucy5wYXRoLmVuZHNXaXRoKCcudmF1bHQnKSA/IG9wdGlvbnMucGF0aCA6IGAke29wdGlvbnMucGF0aH0udmF1bHRgXG4gICAgfVxuICB9IGVsc2Uge1xuICAgIHBvc3NpYmxlVmF1bHRQYXRoID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuY3dkKCksICcuZW52LnZhdWx0JylcbiAgfVxuXG4gIGlmIChmcy5leGlzdHNTeW5jKHBvc3NpYmxlVmF1bHRQYXRoKSkge1xuICAgIHJldHVybiBwb3NzaWJsZVZhdWx0UGF0aFxuICB9XG5cbiAgcmV0dXJuIG51bGxcbn1cblxuZnVuY3Rpb24gX3Jlc29sdmVIb21lIChlbnZQYXRoKSB7XG4gIHJldHVybiBlbnZQYXRoWzBdID09PSAnficgPyBwYXRoLmpvaW4ob3MuaG9tZWRpcigpLCBlbnZQYXRoLnNsaWNlKDEpKSA6IGVudlBhdGhcbn1cblxuZnVuY3Rpb24gX2NvbmZpZ1ZhdWx0IChvcHRpb25zKSB7XG4gIF9sb2coJ0xvYWRpbmcgZW52IGZyb20gZW5jcnlwdGVkIC5lbnYudmF1bHQnKVxuXG4gIGNvbnN0IHBhcnNlZCA9IERvdGVudk1vZHVsZS5fcGFyc2VWYXVsdChvcHRpb25zKVxuXG4gIGxldCBwcm9jZXNzRW52ID0gcHJvY2Vzcy5lbnZcbiAgaWYgKG9wdGlvbnMgJiYgb3B0aW9ucy5wcm9jZXNzRW52ICE9IG51bGwpIHtcbiAgICBwcm9jZXNzRW52ID0gb3B0aW9ucy5wcm9jZXNzRW52XG4gIH1cblxuICBEb3RlbnZNb2R1bGUucG9wdWxhdGUocHJvY2Vzc0VudiwgcGFyc2VkLCBvcHRpb25zKVxuXG4gIHJldHVybiB7IHBhcnNlZCB9XG59XG5cbmZ1bmN0aW9uIGNvbmZpZ0RvdGVudiAob3B0aW9ucykge1xuICBsZXQgZG90ZW52UGF0aCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmN3ZCgpLCAnLmVudicpXG4gIGxldCBlbmNvZGluZyA9ICd1dGY4J1xuICBjb25zdCBkZWJ1ZyA9IEJvb2xlYW4ob3B0aW9ucyAmJiBvcHRpb25zLmRlYnVnKVxuXG4gIGlmIChvcHRpb25zKSB7XG4gICAgaWYgKG9wdGlvbnMucGF0aCAhPSBudWxsKSB7XG4gICAgICBsZXQgZW52UGF0aCA9IG9wdGlvbnMucGF0aFxuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheShlbnZQYXRoKSkge1xuICAgICAgICBmb3IgKGNvbnN0IGZpbGVwYXRoIG9mIG9wdGlvbnMucGF0aCkge1xuICAgICAgICAgIGlmIChmcy5leGlzdHNTeW5jKGZpbGVwYXRoKSkge1xuICAgICAgICAgICAgZW52UGF0aCA9IGZpbGVwYXRoXG4gICAgICAgICAgICBicmVha1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBkb3RlbnZQYXRoID0gX3Jlc29sdmVIb21lKGVudlBhdGgpXG4gICAgfVxuICAgIGlmIChvcHRpb25zLmVuY29kaW5nICE9IG51bGwpIHtcbiAgICAgIGVuY29kaW5nID0gb3B0aW9ucy5lbmNvZGluZ1xuICAgIH0gZWxzZSB7XG4gICAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgX2RlYnVnKCdObyBlbmNvZGluZyBpcyBzcGVjaWZpZWQuIFVURi04IGlzIHVzZWQgYnkgZGVmYXVsdCcpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgdHJ5IHtcbiAgICAvLyBTcGVjaWZ5aW5nIGFuIGVuY29kaW5nIHJldHVybnMgYSBzdHJpbmcgaW5zdGVhZCBvZiBhIGJ1ZmZlclxuICAgIGNvbnN0IHBhcnNlZCA9IERvdGVudk1vZHVsZS5wYXJzZShmcy5yZWFkRmlsZVN5bmMoZG90ZW52UGF0aCwgeyBlbmNvZGluZyB9KSlcblxuICAgIGxldCBwcm9jZXNzRW52ID0gcHJvY2Vzcy5lbnZcbiAgICBpZiAob3B0aW9ucyAmJiBvcHRpb25zLnByb2Nlc3NFbnYgIT0gbnVsbCkge1xuICAgICAgcHJvY2Vzc0VudiA9IG9wdGlvbnMucHJvY2Vzc0VudlxuICAgIH1cblxuICAgIERvdGVudk1vZHVsZS5wb3B1bGF0ZShwcm9jZXNzRW52LCBwYXJzZWQsIG9wdGlvbnMpXG5cbiAgICByZXR1cm4geyBwYXJzZWQgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgaWYgKGRlYnVnKSB7XG4gICAgICBfZGVidWcoYEZhaWxlZCB0byBsb2FkICR7ZG90ZW52UGF0aH0gJHtlLm1lc3NhZ2V9YClcbiAgICB9XG5cbiAgICByZXR1cm4geyBlcnJvcjogZSB9XG4gIH1cbn1cblxuLy8gUG9wdWxhdGVzIHByb2Nlc3MuZW52IGZyb20gLmVudiBmaWxlXG5mdW5jdGlvbiBjb25maWcgKG9wdGlvbnMpIHtcbiAgLy8gZmFsbGJhY2sgdG8gb3JpZ2luYWwgZG90ZW52IGlmIERPVEVOVl9LRVkgaXMgbm90IHNldFxuICBpZiAoX2RvdGVudktleShvcHRpb25zKS5sZW5ndGggPT09IDApIHtcbiAgICByZXR1cm4gRG90ZW52TW9kdWxlLmNvbmZpZ0RvdGVudihvcHRpb25zKVxuICB9XG5cbiAgY29uc3QgdmF1bHRQYXRoID0gX3ZhdWx0UGF0aChvcHRpb25zKVxuXG4gIC8vIGRvdGVudktleSBleGlzdHMgYnV0IC5lbnYudmF1bHQgZmlsZSBkb2VzIG5vdCBleGlzdFxuICBpZiAoIXZhdWx0UGF0aCkge1xuICAgIF93YXJuKGBZb3Ugc2V0IERPVEVOVl9LRVkgYnV0IHlvdSBhcmUgbWlzc2luZyBhIC5lbnYudmF1bHQgZmlsZSBhdCAke3ZhdWx0UGF0aH0uIERpZCB5b3UgZm9yZ2V0IHRvIGJ1aWxkIGl0P2ApXG5cbiAgICByZXR1cm4gRG90ZW52TW9kdWxlLmNvbmZpZ0RvdGVudihvcHRpb25zKVxuICB9XG5cbiAgcmV0dXJuIERvdGVudk1vZHVsZS5fY29uZmlnVmF1bHQob3B0aW9ucylcbn1cblxuZnVuY3Rpb24gZGVjcnlwdCAoZW5jcnlwdGVkLCBrZXlTdHIpIHtcbiAgY29uc3Qga2V5ID0gQnVmZmVyLmZyb20oa2V5U3RyLnNsaWNlKC02NCksICdoZXgnKVxuICBsZXQgY2lwaGVydGV4dCA9IEJ1ZmZlci5mcm9tKGVuY3J5cHRlZCwgJ2Jhc2U2NCcpXG5cbiAgY29uc3Qgbm9uY2UgPSBjaXBoZXJ0ZXh0LnN1YmFycmF5KDAsIDEyKVxuICBjb25zdCBhdXRoVGFnID0gY2lwaGVydGV4dC5zdWJhcnJheSgtMTYpXG4gIGNpcGhlcnRleHQgPSBjaXBoZXJ0ZXh0LnN1YmFycmF5KDEyLCAtMTYpXG5cbiAgdHJ5IHtcbiAgICBjb25zdCBhZXNnY20gPSBjcnlwdG8uY3JlYXRlRGVjaXBoZXJpdignYWVzLTI1Ni1nY20nLCBrZXksIG5vbmNlKVxuICAgIGFlc2djbS5zZXRBdXRoVGFnKGF1dGhUYWcpXG4gICAgcmV0dXJuIGAke2Flc2djbS51cGRhdGUoY2lwaGVydGV4dCl9JHthZXNnY20uZmluYWwoKX1gXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc3QgaXNSYW5nZSA9IGVycm9yIGluc3RhbmNlb2YgUmFuZ2VFcnJvclxuICAgIGNvbnN0IGludmFsaWRLZXlMZW5ndGggPSBlcnJvci5tZXNzYWdlID09PSAnSW52YWxpZCBrZXkgbGVuZ3RoJ1xuICAgIGNvbnN0IGRlY3J5cHRpb25GYWlsZWQgPSBlcnJvci5tZXNzYWdlID09PSAnVW5zdXBwb3J0ZWQgc3RhdGUgb3IgdW5hYmxlIHRvIGF1dGhlbnRpY2F0ZSBkYXRhJ1xuXG4gICAgaWYgKGlzUmFuZ2UgfHwgaW52YWxpZEtleUxlbmd0aCkge1xuICAgICAgY29uc3QgZXJyID0gbmV3IEVycm9yKCdJTlZBTElEX0RPVEVOVl9LRVk6IEl0IG11c3QgYmUgNjQgY2hhcmFjdGVycyBsb25nIChvciBtb3JlKScpXG4gICAgICBlcnIuY29kZSA9ICdJTlZBTElEX0RPVEVOVl9LRVknXG4gICAgICB0aHJvdyBlcnJcbiAgICB9IGVsc2UgaWYgKGRlY3J5cHRpb25GYWlsZWQpIHtcbiAgICAgIGNvbnN0IGVyciA9IG5ldyBFcnJvcignREVDUllQVElPTl9GQUlMRUQ6IFBsZWFzZSBjaGVjayB5b3VyIERPVEVOVl9LRVknKVxuICAgICAgZXJyLmNvZGUgPSAnREVDUllQVElPTl9GQUlMRUQnXG4gICAgICB0aHJvdyBlcnJcbiAgICB9IGVsc2Uge1xuICAgICAgdGhyb3cgZXJyb3JcbiAgICB9XG4gIH1cbn1cblxuLy8gUG9wdWxhdGUgcHJvY2Vzcy5lbnYgd2l0aCBwYXJzZWQgdmFsdWVzXG5mdW5jdGlvbiBwb3B1bGF0ZSAocHJvY2Vzc0VudiwgcGFyc2VkLCBvcHRpb25zID0ge30pIHtcbiAgY29uc3QgZGVidWcgPSBCb29sZWFuKG9wdGlvbnMgJiYgb3B0aW9ucy5kZWJ1ZylcbiAgY29uc3Qgb3ZlcnJpZGUgPSBCb29sZWFuKG9wdGlvbnMgJiYgb3B0aW9ucy5vdmVycmlkZSlcblxuICBpZiAodHlwZW9mIHBhcnNlZCAhPT0gJ29iamVjdCcpIHtcbiAgICBjb25zdCBlcnIgPSBuZXcgRXJyb3IoJ09CSkVDVF9SRVFVSVJFRDogUGxlYXNlIGNoZWNrIHRoZSBwcm9jZXNzRW52IGFyZ3VtZW50IGJlaW5nIHBhc3NlZCB0byBwb3B1bGF0ZScpXG4gICAgZXJyLmNvZGUgPSAnT0JKRUNUX1JFUVVJUkVEJ1xuICAgIHRocm93IGVyclxuICB9XG5cbiAgLy8gU2V0IHByb2Nlc3MuZW52XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKHBhcnNlZCkpIHtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHByb2Nlc3NFbnYsIGtleSkpIHtcbiAgICAgIGlmIChvdmVycmlkZSA9PT0gdHJ1ZSkge1xuICAgICAgICBwcm9jZXNzRW52W2tleV0gPSBwYXJzZWRba2V5XVxuICAgICAgfVxuXG4gICAgICBpZiAoZGVidWcpIHtcbiAgICAgICAgaWYgKG92ZXJyaWRlID09PSB0cnVlKSB7XG4gICAgICAgICAgX2RlYnVnKGBcIiR7a2V5fVwiIGlzIGFscmVhZHkgZGVmaW5lZCBhbmQgV0FTIG92ZXJ3cml0dGVuYClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBfZGVidWcoYFwiJHtrZXl9XCIgaXMgYWxyZWFkeSBkZWZpbmVkIGFuZCB3YXMgTk9UIG92ZXJ3cml0dGVuYClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICBwcm9jZXNzRW52W2tleV0gPSBwYXJzZWRba2V5XVxuICAgIH1cbiAgfVxufVxuXG5jb25zdCBEb3RlbnZNb2R1bGUgPSB7XG4gIGNvbmZpZ0RvdGVudixcbiAgX2NvbmZpZ1ZhdWx0LFxuICBfcGFyc2VWYXVsdCxcbiAgY29uZmlnLFxuICBkZWNyeXB0LFxuICBwYXJzZSxcbiAgcG9wdWxhdGVcbn1cblxubW9kdWxlLmV4cG9ydHMuY29uZmlnRG90ZW52ID0gRG90ZW52TW9kdWxlLmNvbmZpZ0RvdGVudlxubW9kdWxlLmV4cG9ydHMuX2NvbmZpZ1ZhdWx0ID0gRG90ZW52TW9kdWxlLl9jb25maWdWYXVsdFxubW9kdWxlLmV4cG9ydHMuX3BhcnNlVmF1bHQgPSBEb3RlbnZNb2R1bGUuX3BhcnNlVmF1bHRcbm1vZHVsZS5leHBvcnRzLmNvbmZpZyA9IERvdGVudk1vZHVsZS5jb25maWdcbm1vZHVsZS5leHBvcnRzLmRlY3J5cHQgPSBEb3RlbnZNb2R1bGUuZGVjcnlwdFxubW9kdWxlLmV4cG9ydHMucGFyc2UgPSBEb3RlbnZNb2R1bGUucGFyc2Vcbm1vZHVsZS5leHBvcnRzLnBvcHVsYXRlID0gRG90ZW52TW9kdWxlLnBvcHVsYXRlXG5cbm1vZHVsZS5leHBvcnRzID0gRG90ZW52TW9kdWxlXG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZGVsZXRlVXNlciA9IHZvaWQgMDtcbmNvbnN0IHBvc3RVc2VyXzEgPSByZXF1aXJlKFwiLi9wb3N0VXNlclwiKTtcbmNvbnN0IHV1aWRfMSA9IHJlcXVpcmUoXCJ1dWlkXCIpO1xuY29uc3QgZGVsZXRlVXNlciA9IChyZXF1ZXN0LCByZXNwb25zZSwgdXNlcklkKSA9PiB7XG4gICAgaWYgKCEoMCwgdXVpZF8xLnZhbGlkYXRlKSh1c2VySWQpKSB7XG4gICAgICAgIHJlc3BvbnNlLnN0YXR1c0NvZGUgPSA0MDA7XG4gICAgICAgIHJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgcmVzcG9uc2UuZW5kKEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0ludmFsaWQgdXNlciBJRCcgfSkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY29uc3QgdXNlckluZGV4ID0gcG9zdFVzZXJfMS5kYXRhYmFzZS5maW5kSW5kZXgoKHVzZXIpID0+IHVzZXIuaWQgPT09IHVzZXJJZCk7XG4gICAgICAgIGlmICh1c2VySW5kZXggPT09IC0xKSB7XG4gICAgICAgICAgICByZXNwb25zZS5zdGF0dXNDb2RlID0gNDA0O1xuICAgICAgICAgICAgcmVzcG9uc2Uuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgcmVzcG9uc2UuZW5kKEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ1VzZXIgbm90IGZvdW5kJyB9KSk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZGF0YSA9IHBvc3RVc2VyXzEuZGF0YWJhc2UuZmlsdGVyKChpdGVtKSA9PiBpdGVtLmlkICE9PSB1c2VySWQpO1xuICAgICAgICAoMCwgcG9zdFVzZXJfMS5zZXREYXRhYmFzZSkoZGF0YSk7XG4gICAgICAgIHJlc3BvbnNlLnN0YXR1c0NvZGUgPSAyMDQ7XG4gICAgICAgIHJlc3BvbnNlLmVuZChKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdVc2VyIHdhcyBkZWxldGVkJyB9KSk7XG4gICAgfVxufTtcbmV4cG9ydHMuZGVsZXRlVXNlciA9IGRlbGV0ZVVzZXI7XG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMuZ2V0VXNlckJ5SWQgPSB2b2lkIDA7XG5jb25zdCBwb3N0VXNlcl8xID0gcmVxdWlyZShcIi4vcG9zdFVzZXJcIik7XG5jb25zdCB1dWlkXzEgPSByZXF1aXJlKFwidXVpZFwiKTtcbmNvbnN0IGdldFVzZXJCeUlkID0gKHJlcXVlc3QsIHJlc3BvbnNlLCB1c2VySWQpID0+IHtcbiAgICBpZiAoISgwLCB1dWlkXzEudmFsaWRhdGUpKHVzZXJJZCkpIHtcbiAgICAgICAgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9IDQwMDtcbiAgICAgICAgcmVzcG9uc2Uuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICByZXNwb25zZS5lbmQoSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiAnSW52YWxpZCB1c2VyIElEJyB9KSk7XG4gICAgfVxuICAgIGVsc2Uge1xuICAgICAgICBjb25zdCB1c2VyID0gcG9zdFVzZXJfMS5kYXRhYmFzZS5maW5kKCh1c2VyKSA9PiB1c2VyLmlkID09PSB1c2VySWQpO1xuICAgICAgICBpZiAodXNlcikge1xuICAgICAgICAgICAgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9IDIwMDtcbiAgICAgICAgICAgIHJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIHJlc3BvbnNlLmVuZChKU09OLnN0cmluZ2lmeSh1c2VyKSk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICByZXNwb25zZS5zdGF0dXNDb2RlID0gNDA0O1xuICAgICAgICAgICAgcmVzcG9uc2Uuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgcmVzcG9uc2UuZW5kKEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ1VzZXIgbm90IGZvdW5kJyB9KSk7XG4gICAgICAgIH1cbiAgICB9XG59O1xuZXhwb3J0cy5nZXRVc2VyQnlJZCA9IGdldFVzZXJCeUlkO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5leHBvcnRzLmdldFVzZXJzID0gdm9pZCAwO1xuY29uc3QgcG9zdFVzZXJfMSA9IHJlcXVpcmUoXCIuL3Bvc3RVc2VyXCIpO1xuY29uc3QgZ2V0VXNlcnMgPSAocmVxdWVzdCwgcmVzcG9uc2UpID0+IHtcbiAgICByZXNwb25zZS5zdGF0dXNDb2RlID0gMjAwO1xuICAgIHJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICByZXNwb25zZS5lbmQoSlNPTi5zdHJpbmdpZnkocG9zdFVzZXJfMS5kYXRhYmFzZSkpO1xufTtcbmV4cG9ydHMuZ2V0VXNlcnMgPSBnZXRVc2VycztcbiIsIlwidXNlIHN0cmljdFwiO1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5jcmVhdGVVc2VyID0gZXhwb3J0cy5zZXREYXRhYmFzZSA9IGV4cG9ydHMuZGF0YWJhc2UgPSB2b2lkIDA7XG5jb25zdCB1dWlkXzEgPSByZXF1aXJlKFwidXVpZFwiKTtcbmV4cG9ydHMuZGF0YWJhc2UgPSBbXTtcbmZ1bmN0aW9uIHNldERhdGFiYXNlKGRhdGEpIHtcbiAgICBleHBvcnRzLmRhdGFiYXNlID0gZGF0YTtcbn1cbmV4cG9ydHMuc2V0RGF0YWJhc2UgPSBzZXREYXRhYmFzZTtcbjtcbmNvbnN0IGNyZWF0ZVVzZXIgPSAocmVxdWVzdCwgcmVzcG9uc2UpID0+IHtcbiAgICBsZXQgYm9keSA9ICcnO1xuICAgIHJlcXVlc3Qub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgYm9keSArPSBjaHVuaztcbiAgICB9KTtcbiAgICByZXF1ZXN0Lm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0Qm9keSA9IEpTT04ucGFyc2UoYm9keSk7XG4gICAgICAgICAgICBjb25zdCB7IHVzZXJuYW1lLCBhZ2UsIGhvYmJpZXMgfSA9IHJlcXVlc3RCb2R5O1xuICAgICAgICAgICAgaWYgKCF1c2VybmFtZSB8fCAhYWdlIHx8ICFob2JiaWVzKSB7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9IDQwMDtcbiAgICAgICAgICAgICAgICByZXNwb25zZS5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3BvbnNlLmVuZChKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICAgIG1lc3NhZ2U6ICdVc2VybmFtZSwgYWdlLCBhbmQgaG9iYmllcyBhcmUgcmVxdWlyZWQgZmllbGRzJyxcbiAgICAgICAgICAgICAgICB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBjb25zdCB1c2VyID0geyBpZDogKDAsIHV1aWRfMS52NCkoKSwgdXNlcm5hbWUsIGFnZSwgaG9iYmllcyB9O1xuICAgICAgICAgICAgZXhwb3J0cy5kYXRhYmFzZS5wdXNoKHVzZXIpO1xuICAgICAgICAgICAgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9IDIwMTtcbiAgICAgICAgICAgIHJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIHJlc3BvbnNlLmVuZChKU09OLnN0cmluZ2lmeSh1c2VyKSk7XG4gICAgICAgIH1cbiAgICAgICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICByZXNwb25zZS5zdGF0dXNDb2RlID0gNDAwO1xuICAgICAgICAgICAgcmVzcG9uc2Uuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgcmVzcG9uc2UuZW5kKEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBtZXNzYWdlOiAnSW52YWxpZCBKU09OJyxcbiAgICAgICAgICAgIH0pKTtcbiAgICAgICAgfVxuICAgIH0pO1xufTtcbmV4cG9ydHMuY3JlYXRlVXNlciA9IGNyZWF0ZVVzZXI7XG4iLCJcInVzZSBzdHJpY3RcIjtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmV4cG9ydHMudXBkYXRlVXNlciA9IHZvaWQgMDtcbmNvbnN0IHBvc3RVc2VyXzEgPSByZXF1aXJlKFwiLi9wb3N0VXNlclwiKTtcbmNvbnN0IHV1aWRfMSA9IHJlcXVpcmUoXCJ1dWlkXCIpO1xuY29uc3QgdXBkYXRlVXNlciA9IChyZXF1ZXN0LCByZXNwb25zZSwgdXNlcklkKSA9PiB7XG4gICAgaWYgKCEoMCwgdXVpZF8xLnZhbGlkYXRlKSh1c2VySWQpKSB7XG4gICAgICAgIHJlc3BvbnNlLnN0YXR1c0NvZGUgPSA0MDA7XG4gICAgICAgIHJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgcmVzcG9uc2UuZW5kKEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0ludmFsaWQgdXNlciBJRCcgfSkpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgY29uc3QgdXNlclRvVXBkYXRlID0gcG9zdFVzZXJfMS5kYXRhYmFzZS5maW5kKCh1c2VyKSA9PiB1c2VyLmlkID09PSB1c2VySWQpO1xuICAgICAgICBpZiAoIXVzZXJUb1VwZGF0ZSkge1xuICAgICAgICAgICAgcmVzcG9uc2Uuc3RhdHVzQ29kZSA9IDQwNDtcbiAgICAgICAgICAgIHJlc3BvbnNlLnNldEhlYWRlcignQ29udGVudC1UeXBlJywgJ2FwcGxpY2F0aW9uL2pzb24nKTtcbiAgICAgICAgICAgIHJlc3BvbnNlLmVuZChKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdVc2VyIG5vdCBmb3VuZCcgfSkpO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIGxldCBib2R5ID0gJyc7XG4gICAgICAgIHJlcXVlc3Qub24oJ2RhdGEnLCAoY2h1bmspID0+IHtcbiAgICAgICAgICAgIGJvZHkgKz0gY2h1bms7XG4gICAgICAgIH0pO1xuICAgICAgICByZXF1ZXN0Lm9uKCdlbmQnLCAoKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGRhdGEgPSBKU09OLnBhcnNlKGJvZHkpO1xuICAgICAgICAgICAgICAgIHVzZXJUb1VwZGF0ZS51c2VybmFtZSA9IGRhdGEudXNlcm5hbWUgfHwgdXNlclRvVXBkYXRlLnVzZXJuYW1lO1xuICAgICAgICAgICAgICAgIHVzZXJUb1VwZGF0ZS5hZ2UgPSBkYXRhLmFnZSB8fCB1c2VyVG9VcGRhdGUuYWdlO1xuICAgICAgICAgICAgICAgIHVzZXJUb1VwZGF0ZS5ob2JiaWVzID0gZGF0YS5ob2JiaWVzIHx8IHVzZXJUb1VwZGF0ZS5ob2JiaWVzO1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlLnN0YXR1c0NvZGUgPSAyMDA7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2Uuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmVuZChKU09OLnN0cmluZ2lmeSh1c2VyVG9VcGRhdGUpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGNhdGNoIChlcnJvcikge1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlLnN0YXR1c0NvZGUgPSA0MDA7XG4gICAgICAgICAgICAgICAgcmVzcG9uc2Uuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICAgICAgICAgIHJlc3BvbnNlLmVuZChKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdJbnZhbGlkIHJlcXVlc3QgYm9keScgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG59O1xuZXhwb3J0cy51cGRhdGVVc2VyID0gdXBkYXRlVXNlcjtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9faW1wb3J0RGVmYXVsdCA9ICh0aGlzICYmIHRoaXMuX19pbXBvcnREZWZhdWx0KSB8fCBmdW5jdGlvbiAobW9kKSB7XG4gICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBcImRlZmF1bHRcIjogbW9kIH07XG59O1xuT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xuZXhwb3J0cy5zZXJ2ZXIgPSBleHBvcnRzLnBvcnQgPSB2b2lkIDA7XG5jb25zdCBwcm9jZXNzXzEgPSBfX2ltcG9ydERlZmF1bHQocmVxdWlyZShcInByb2Nlc3NcIikpO1xuY29uc3QgZG90ZW52XzEgPSBfX2ltcG9ydERlZmF1bHQocmVxdWlyZShcImRvdGVudlwiKSk7XG5jb25zdCBnZXRVc2Vyc18xID0gcmVxdWlyZShcIi4vcm91dGVzL2dldFVzZXJzXCIpO1xuY29uc3QgZ2V0VXNlckJ5SWRfMSA9IHJlcXVpcmUoXCIuL3JvdXRlcy9nZXRVc2VyQnlJZFwiKTtcbmNvbnN0IHBvc3RVc2VyXzEgPSByZXF1aXJlKFwiLi9yb3V0ZXMvcG9zdFVzZXJcIik7XG5jb25zdCBodHRwXzEgPSBfX2ltcG9ydERlZmF1bHQocmVxdWlyZShcImh0dHBcIikpO1xuY29uc3QgdXBEYXRlVXNlcl8xID0gcmVxdWlyZShcIi4vcm91dGVzL3VwRGF0ZVVzZXJcIik7XG5jb25zdCBkZWxldGVfVXNlcl8xID0gcmVxdWlyZShcIi4vcm91dGVzL2RlbGV0ZS5Vc2VyXCIpO1xuZG90ZW52XzEuZGVmYXVsdC5jb25maWcoKTtcbmV4cG9ydHMucG9ydCA9IHByb2Nlc3NfMS5kZWZhdWx0LmVudi5QT1JUIHx8IDMwMDA7XG5jb25zb2xlLmxvZyhwcm9jZXNzXzEuZGVmYXVsdC5lbnYuUE9SVCk7XG5leHBvcnRzLnNlcnZlciA9IGh0dHBfMS5kZWZhdWx0LmNyZWF0ZVNlcnZlcigocmVxLCByZXMpID0+IHtcbiAgICBjb25zdCB1c2VySWQgPSBnZXRVc2VySWRGcm9tVXJsKHJlcS51cmwpO1xuICAgIHRyeSB7XG4gICAgICAgIGlmIChyZXEubWV0aG9kID09PSAnUE9TVCcgJiYgcmVxLnVybC5zdGFydHNXaXRoKCcvYXBpL3VzZXJzJykpIHtcbiAgICAgICAgICAgICgwLCBwb3N0VXNlcl8xLmNyZWF0ZVVzZXIpKHJlcSwgcmVzKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyZXEubWV0aG9kID09PSAnR0VUJyAmJiByZXEudXJsLnN0YXJ0c1dpdGgoJy9hcGkvdXNlcnMnKSkge1xuICAgICAgICAgICAgaWYgKHJlcS51cmwgPT09ICcvYXBpL3VzZXJzJyB8fCByZXEudXJsID09PSAnL2FwaS91c2Vycy8nKSB7XG4gICAgICAgICAgICAgICAgKDAsIGdldFVzZXJzXzEuZ2V0VXNlcnMpKHJlcSwgcmVzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGVsc2Uge1xuICAgICAgICAgICAgICAgICgwLCBnZXRVc2VyQnlJZF8xLmdldFVzZXJCeUlkKShyZXEsIHJlcywgdXNlcklkKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICBlbHNlIGlmIChyZXEubWV0aG9kID09PSAnUFVUJyAmJiByZXEudXJsLnN0YXJ0c1dpdGgoJy9hcGkvdXNlcnMvJykpIHtcbiAgICAgICAgICAgICgwLCB1cERhdGVVc2VyXzEudXBkYXRlVXNlcikocmVxLCByZXMsIHVzZXJJZCk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAocmVxLm1ldGhvZCA9PT0gJ0RFTEVURScgJiYgcmVxLnVybC5zdGFydHNXaXRoKCcvYXBpL3VzZXJzLycpKSB7XG4gICAgICAgICAgICAoMCwgZGVsZXRlX1VzZXJfMS5kZWxldGVVc2VyKShyZXEsIHJlcywgdXNlcklkKTtcbiAgICAgICAgfVxuICAgICAgICBlbHNlIHtcbiAgICAgICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNDA0O1xuICAgICAgICAgICAgcmVzLmVuZCgnTm90IEZvdW5kJyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIHJlcy5zdGF0dXNDb2RlID0gNTAwO1xuICAgICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgICByZXMuZW5kKEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0ludGVybmFsIFNlcnZlciBFcnJvcicgfSkpO1xuICAgIH1cbn0pO1xuZnVuY3Rpb24gZ2V0VXNlcklkRnJvbVVybCh1cmwpIHtcbiAgICBjb25zdCB1cmxBcnJheSA9IHVybC5zcGxpdCgnLycpO1xuICAgIGNvbnN0IHVzZXJJZCA9IHVybEFycmF5W3VybEFycmF5Lmxlbmd0aCAtIDFdO1xuICAgIHJldHVybiB1c2VySWQ7XG59XG4iLCJleHBvcnQgeyBkZWZhdWx0IGFzIHYxIH0gZnJvbSAnLi92MS5qcyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIHYzIH0gZnJvbSAnLi92My5qcyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIHY0IH0gZnJvbSAnLi92NC5qcyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIHY1IH0gZnJvbSAnLi92NS5qcyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIE5JTCB9IGZyb20gJy4vbmlsLmpzJztcbmV4cG9ydCB7IGRlZmF1bHQgYXMgdmVyc2lvbiB9IGZyb20gJy4vdmVyc2lvbi5qcyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIHZhbGlkYXRlIH0gZnJvbSAnLi92YWxpZGF0ZS5qcyc7XG5leHBvcnQgeyBkZWZhdWx0IGFzIHN0cmluZ2lmeSB9IGZyb20gJy4vc3RyaW5naWZ5LmpzJztcbmV4cG9ydCB7IGRlZmF1bHQgYXMgcGFyc2UgfSBmcm9tICcuL3BhcnNlLmpzJzsiLCJpbXBvcnQgY3J5cHRvIGZyb20gJ2NyeXB0byc7XG5cbmZ1bmN0aW9uIG1kNShieXRlcykge1xuICBpZiAoQXJyYXkuaXNBcnJheShieXRlcykpIHtcbiAgICBieXRlcyA9IEJ1ZmZlci5mcm9tKGJ5dGVzKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgYnl0ZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgYnl0ZXMgPSBCdWZmZXIuZnJvbShieXRlcywgJ3V0ZjgnKTtcbiAgfVxuXG4gIHJldHVybiBjcnlwdG8uY3JlYXRlSGFzaCgnbWQ1JykudXBkYXRlKGJ5dGVzKS5kaWdlc3QoKTtcbn1cblxuZXhwb3J0IGRlZmF1bHQgbWQ1OyIsImltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcbmV4cG9ydCBkZWZhdWx0IHtcbiAgcmFuZG9tVVVJRDogY3J5cHRvLnJhbmRvbVVVSURcbn07IiwiZXhwb3J0IGRlZmF1bHQgJzAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCc7IiwiaW1wb3J0IHZhbGlkYXRlIGZyb20gJy4vdmFsaWRhdGUuanMnO1xuXG5mdW5jdGlvbiBwYXJzZSh1dWlkKSB7XG4gIGlmICghdmFsaWRhdGUodXVpZCkpIHtcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ0ludmFsaWQgVVVJRCcpO1xuICB9XG5cbiAgbGV0IHY7XG4gIGNvbnN0IGFyciA9IG5ldyBVaW50OEFycmF5KDE2KTsgLy8gUGFyc2UgIyMjIyMjIyMtLi4uLi0uLi4uLS4uLi4tLi4uLi4uLi4uLi4uXG5cbiAgYXJyWzBdID0gKHYgPSBwYXJzZUludCh1dWlkLnNsaWNlKDAsIDgpLCAxNikpID4+PiAyNDtcbiAgYXJyWzFdID0gdiA+Pj4gMTYgJiAweGZmO1xuICBhcnJbMl0gPSB2ID4+PiA4ICYgMHhmZjtcbiAgYXJyWzNdID0gdiAmIDB4ZmY7IC8vIFBhcnNlIC4uLi4uLi4uLSMjIyMtLi4uLi0uLi4uLS4uLi4uLi4uLi4uLlxuXG4gIGFycls0XSA9ICh2ID0gcGFyc2VJbnQodXVpZC5zbGljZSg5LCAxMyksIDE2KSkgPj4+IDg7XG4gIGFycls1XSA9IHYgJiAweGZmOyAvLyBQYXJzZSAuLi4uLi4uLi0uLi4uLSMjIyMtLi4uLi0uLi4uLi4uLi4uLi5cblxuICBhcnJbNl0gPSAodiA9IHBhcnNlSW50KHV1aWQuc2xpY2UoMTQsIDE4KSwgMTYpKSA+Pj4gODtcbiAgYXJyWzddID0gdiAmIDB4ZmY7IC8vIFBhcnNlIC4uLi4uLi4uLS4uLi4tLi4uLi0jIyMjLS4uLi4uLi4uLi4uLlxuXG4gIGFycls4XSA9ICh2ID0gcGFyc2VJbnQodXVpZC5zbGljZSgxOSwgMjMpLCAxNikpID4+PiA4O1xuICBhcnJbOV0gPSB2ICYgMHhmZjsgLy8gUGFyc2UgLi4uLi4uLi4tLi4uLi0uLi4uLS4uLi4tIyMjIyMjIyMjIyMjXG4gIC8vIChVc2UgXCIvXCIgdG8gYXZvaWQgMzItYml0IHRydW5jYXRpb24gd2hlbiBiaXQtc2hpZnRpbmcgaGlnaC1vcmRlciBieXRlcylcblxuICBhcnJbMTBdID0gKHYgPSBwYXJzZUludCh1dWlkLnNsaWNlKDI0LCAzNiksIDE2KSkgLyAweDEwMDAwMDAwMDAwICYgMHhmZjtcbiAgYXJyWzExXSA9IHYgLyAweDEwMDAwMDAwMCAmIDB4ZmY7XG4gIGFyclsxMl0gPSB2ID4+PiAyNCAmIDB4ZmY7XG4gIGFyclsxM10gPSB2ID4+PiAxNiAmIDB4ZmY7XG4gIGFyclsxNF0gPSB2ID4+PiA4ICYgMHhmZjtcbiAgYXJyWzE1XSA9IHYgJiAweGZmO1xuICByZXR1cm4gYXJyO1xufVxuXG5leHBvcnQgZGVmYXVsdCBwYXJzZTsiLCJleHBvcnQgZGVmYXVsdCAvXig/OlswLTlhLWZdezh9LVswLTlhLWZdezR9LVsxLTVdWzAtOWEtZl17M30tWzg5YWJdWzAtOWEtZl17M30tWzAtOWEtZl17MTJ9fDAwMDAwMDAwLTAwMDAtMDAwMC0wMDAwLTAwMDAwMDAwMDAwMCkkL2k7IiwiaW1wb3J0IGNyeXB0byBmcm9tICdjcnlwdG8nO1xuY29uc3Qgcm5kczhQb29sID0gbmV3IFVpbnQ4QXJyYXkoMjU2KTsgLy8gIyBvZiByYW5kb20gdmFsdWVzIHRvIHByZS1hbGxvY2F0ZVxuXG5sZXQgcG9vbFB0ciA9IHJuZHM4UG9vbC5sZW5ndGg7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiBybmcoKSB7XG4gIGlmIChwb29sUHRyID4gcm5kczhQb29sLmxlbmd0aCAtIDE2KSB7XG4gICAgY3J5cHRvLnJhbmRvbUZpbGxTeW5jKHJuZHM4UG9vbCk7XG4gICAgcG9vbFB0ciA9IDA7XG4gIH1cblxuICByZXR1cm4gcm5kczhQb29sLnNsaWNlKHBvb2xQdHIsIHBvb2xQdHIgKz0gMTYpO1xufSIsImltcG9ydCBjcnlwdG8gZnJvbSAnY3J5cHRvJztcblxuZnVuY3Rpb24gc2hhMShieXRlcykge1xuICBpZiAoQXJyYXkuaXNBcnJheShieXRlcykpIHtcbiAgICBieXRlcyA9IEJ1ZmZlci5mcm9tKGJ5dGVzKTtcbiAgfSBlbHNlIGlmICh0eXBlb2YgYnl0ZXMgPT09ICdzdHJpbmcnKSB7XG4gICAgYnl0ZXMgPSBCdWZmZXIuZnJvbShieXRlcywgJ3V0ZjgnKTtcbiAgfVxuXG4gIHJldHVybiBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMScpLnVwZGF0ZShieXRlcykuZGlnZXN0KCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHNoYTE7IiwiaW1wb3J0IHZhbGlkYXRlIGZyb20gJy4vdmFsaWRhdGUuanMnO1xuLyoqXG4gKiBDb252ZXJ0IGFycmF5IG9mIDE2IGJ5dGUgdmFsdWVzIHRvIFVVSUQgc3RyaW5nIGZvcm1hdCBvZiB0aGUgZm9ybTpcbiAqIFhYWFhYWFhYLVhYWFgtWFhYWC1YWFhYLVhYWFhYWFhYWFhYWFxuICovXG5cbmNvbnN0IGJ5dGVUb0hleCA9IFtdO1xuXG5mb3IgKGxldCBpID0gMDsgaSA8IDI1NjsgKytpKSB7XG4gIGJ5dGVUb0hleC5wdXNoKChpICsgMHgxMDApLnRvU3RyaW5nKDE2KS5zbGljZSgxKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1bnNhZmVTdHJpbmdpZnkoYXJyLCBvZmZzZXQgPSAwKSB7XG4gIC8vIE5vdGU6IEJlIGNhcmVmdWwgZWRpdGluZyB0aGlzIGNvZGUhICBJdCdzIGJlZW4gdHVuZWQgZm9yIHBlcmZvcm1hbmNlXG4gIC8vIGFuZCB3b3JrcyBpbiB3YXlzIHlvdSBtYXkgbm90IGV4cGVjdC4gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS91dWlkanMvdXVpZC9wdWxsLzQzNFxuICByZXR1cm4gYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAwXV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDFdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgMl1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyAzXV0gKyAnLScgKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDRdXSArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgNV1dICsgJy0nICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA2XV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDddXSArICctJyArIGJ5dGVUb0hleFthcnJbb2Zmc2V0ICsgOF1dICsgYnl0ZVRvSGV4W2FycltvZmZzZXQgKyA5XV0gKyAnLScgKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDEwXV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDExXV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDEyXV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDEzXV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDE0XV0gKyBieXRlVG9IZXhbYXJyW29mZnNldCArIDE1XV07XG59XG5cbmZ1bmN0aW9uIHN0cmluZ2lmeShhcnIsIG9mZnNldCA9IDApIHtcbiAgY29uc3QgdXVpZCA9IHVuc2FmZVN0cmluZ2lmeShhcnIsIG9mZnNldCk7IC8vIENvbnNpc3RlbmN5IGNoZWNrIGZvciB2YWxpZCBVVUlELiAgSWYgdGhpcyB0aHJvd3MsIGl0J3MgbGlrZWx5IGR1ZSB0byBvbmVcbiAgLy8gb2YgdGhlIGZvbGxvd2luZzpcbiAgLy8gLSBPbmUgb3IgbW9yZSBpbnB1dCBhcnJheSB2YWx1ZXMgZG9uJ3QgbWFwIHRvIGEgaGV4IG9jdGV0IChsZWFkaW5nIHRvXG4gIC8vIFwidW5kZWZpbmVkXCIgaW4gdGhlIHV1aWQpXG4gIC8vIC0gSW52YWxpZCBpbnB1dCB2YWx1ZXMgZm9yIHRoZSBSRkMgYHZlcnNpb25gIG9yIGB2YXJpYW50YCBmaWVsZHNcblxuICBpZiAoIXZhbGlkYXRlKHV1aWQpKSB7XG4gICAgdGhyb3cgVHlwZUVycm9yKCdTdHJpbmdpZmllZCBVVUlEIGlzIGludmFsaWQnKTtcbiAgfVxuXG4gIHJldHVybiB1dWlkO1xufVxuXG5leHBvcnQgZGVmYXVsdCBzdHJpbmdpZnk7IiwiaW1wb3J0IHJuZyBmcm9tICcuL3JuZy5qcyc7XG5pbXBvcnQgeyB1bnNhZmVTdHJpbmdpZnkgfSBmcm9tICcuL3N0cmluZ2lmeS5qcyc7IC8vICoqYHYxKClgIC0gR2VuZXJhdGUgdGltZS1iYXNlZCBVVUlEKipcbi8vXG4vLyBJbnNwaXJlZCBieSBodHRwczovL2dpdGh1Yi5jb20vTGlvc0svVVVJRC5qc1xuLy8gYW5kIGh0dHA6Ly9kb2NzLnB5dGhvbi5vcmcvbGlicmFyeS91dWlkLmh0bWxcblxubGV0IF9ub2RlSWQ7XG5cbmxldCBfY2xvY2tzZXE7IC8vIFByZXZpb3VzIHV1aWQgY3JlYXRpb24gdGltZVxuXG5cbmxldCBfbGFzdE1TZWNzID0gMDtcbmxldCBfbGFzdE5TZWNzID0gMDsgLy8gU2VlIGh0dHBzOi8vZ2l0aHViLmNvbS91dWlkanMvdXVpZCBmb3IgQVBJIGRldGFpbHNcblxuZnVuY3Rpb24gdjEob3B0aW9ucywgYnVmLCBvZmZzZXQpIHtcbiAgbGV0IGkgPSBidWYgJiYgb2Zmc2V0IHx8IDA7XG4gIGNvbnN0IGIgPSBidWYgfHwgbmV3IEFycmF5KDE2KTtcbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGxldCBub2RlID0gb3B0aW9ucy5ub2RlIHx8IF9ub2RlSWQ7XG4gIGxldCBjbG9ja3NlcSA9IG9wdGlvbnMuY2xvY2tzZXEgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMuY2xvY2tzZXEgOiBfY2xvY2tzZXE7IC8vIG5vZGUgYW5kIGNsb2Nrc2VxIG5lZWQgdG8gYmUgaW5pdGlhbGl6ZWQgdG8gcmFuZG9tIHZhbHVlcyBpZiB0aGV5J3JlIG5vdFxuICAvLyBzcGVjaWZpZWQuICBXZSBkbyB0aGlzIGxhemlseSB0byBtaW5pbWl6ZSBpc3N1ZXMgcmVsYXRlZCB0byBpbnN1ZmZpY2llbnRcbiAgLy8gc3lzdGVtIGVudHJvcHkuICBTZWUgIzE4OVxuXG4gIGlmIChub2RlID09IG51bGwgfHwgY2xvY2tzZXEgPT0gbnVsbCkge1xuICAgIGNvbnN0IHNlZWRCeXRlcyA9IG9wdGlvbnMucmFuZG9tIHx8IChvcHRpb25zLnJuZyB8fCBybmcpKCk7XG5cbiAgICBpZiAobm9kZSA9PSBudWxsKSB7XG4gICAgICAvLyBQZXIgNC41LCBjcmVhdGUgYW5kIDQ4LWJpdCBub2RlIGlkLCAoNDcgcmFuZG9tIGJpdHMgKyBtdWx0aWNhc3QgYml0ID0gMSlcbiAgICAgIG5vZGUgPSBfbm9kZUlkID0gW3NlZWRCeXRlc1swXSB8IDB4MDEsIHNlZWRCeXRlc1sxXSwgc2VlZEJ5dGVzWzJdLCBzZWVkQnl0ZXNbM10sIHNlZWRCeXRlc1s0XSwgc2VlZEJ5dGVzWzVdXTtcbiAgICB9XG5cbiAgICBpZiAoY2xvY2tzZXEgPT0gbnVsbCkge1xuICAgICAgLy8gUGVyIDQuMi4yLCByYW5kb21pemUgKDE0IGJpdCkgY2xvY2tzZXFcbiAgICAgIGNsb2Nrc2VxID0gX2Nsb2Nrc2VxID0gKHNlZWRCeXRlc1s2XSA8PCA4IHwgc2VlZEJ5dGVzWzddKSAmIDB4M2ZmZjtcbiAgICB9XG4gIH0gLy8gVVVJRCB0aW1lc3RhbXBzIGFyZSAxMDAgbmFuby1zZWNvbmQgdW5pdHMgc2luY2UgdGhlIEdyZWdvcmlhbiBlcG9jaCxcbiAgLy8gKDE1ODItMTAtMTUgMDA6MDApLiAgSlNOdW1iZXJzIGFyZW4ndCBwcmVjaXNlIGVub3VnaCBmb3IgdGhpcywgc29cbiAgLy8gdGltZSBpcyBoYW5kbGVkIGludGVybmFsbHkgYXMgJ21zZWNzJyAoaW50ZWdlciBtaWxsaXNlY29uZHMpIGFuZCAnbnNlY3MnXG4gIC8vICgxMDAtbmFub3NlY29uZHMgb2Zmc2V0IGZyb20gbXNlY3MpIHNpbmNlIHVuaXggZXBvY2gsIDE5NzAtMDEtMDEgMDA6MDAuXG5cblxuICBsZXQgbXNlY3MgPSBvcHRpb25zLm1zZWNzICE9PSB1bmRlZmluZWQgPyBvcHRpb25zLm1zZWNzIDogRGF0ZS5ub3coKTsgLy8gUGVyIDQuMi4xLjIsIHVzZSBjb3VudCBvZiB1dWlkJ3MgZ2VuZXJhdGVkIGR1cmluZyB0aGUgY3VycmVudCBjbG9ja1xuICAvLyBjeWNsZSB0byBzaW11bGF0ZSBoaWdoZXIgcmVzb2x1dGlvbiBjbG9ja1xuXG4gIGxldCBuc2VjcyA9IG9wdGlvbnMubnNlY3MgIT09IHVuZGVmaW5lZCA/IG9wdGlvbnMubnNlY3MgOiBfbGFzdE5TZWNzICsgMTsgLy8gVGltZSBzaW5jZSBsYXN0IHV1aWQgY3JlYXRpb24gKGluIG1zZWNzKVxuXG4gIGNvbnN0IGR0ID0gbXNlY3MgLSBfbGFzdE1TZWNzICsgKG5zZWNzIC0gX2xhc3ROU2VjcykgLyAxMDAwMDsgLy8gUGVyIDQuMi4xLjIsIEJ1bXAgY2xvY2tzZXEgb24gY2xvY2sgcmVncmVzc2lvblxuXG4gIGlmIChkdCA8IDAgJiYgb3B0aW9ucy5jbG9ja3NlcSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY2xvY2tzZXEgPSBjbG9ja3NlcSArIDEgJiAweDNmZmY7XG4gIH0gLy8gUmVzZXQgbnNlY3MgaWYgY2xvY2sgcmVncmVzc2VzIChuZXcgY2xvY2tzZXEpIG9yIHdlJ3ZlIG1vdmVkIG9udG8gYSBuZXdcbiAgLy8gdGltZSBpbnRlcnZhbFxuXG5cbiAgaWYgKChkdCA8IDAgfHwgbXNlY3MgPiBfbGFzdE1TZWNzKSAmJiBvcHRpb25zLm5zZWNzID09PSB1bmRlZmluZWQpIHtcbiAgICBuc2VjcyA9IDA7XG4gIH0gLy8gUGVyIDQuMi4xLjIgVGhyb3cgZXJyb3IgaWYgdG9vIG1hbnkgdXVpZHMgYXJlIHJlcXVlc3RlZFxuXG5cbiAgaWYgKG5zZWNzID49IDEwMDAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwidXVpZC52MSgpOiBDYW4ndCBjcmVhdGUgbW9yZSB0aGFuIDEwTSB1dWlkcy9zZWNcIik7XG4gIH1cblxuICBfbGFzdE1TZWNzID0gbXNlY3M7XG4gIF9sYXN0TlNlY3MgPSBuc2VjcztcbiAgX2Nsb2Nrc2VxID0gY2xvY2tzZXE7IC8vIFBlciA0LjEuNCAtIENvbnZlcnQgZnJvbSB1bml4IGVwb2NoIHRvIEdyZWdvcmlhbiBlcG9jaFxuXG4gIG1zZWNzICs9IDEyMjE5MjkyODAwMDAwOyAvLyBgdGltZV9sb3dgXG5cbiAgY29uc3QgdGwgPSAoKG1zZWNzICYgMHhmZmZmZmZmKSAqIDEwMDAwICsgbnNlY3MpICUgMHgxMDAwMDAwMDA7XG4gIGJbaSsrXSA9IHRsID4+PiAyNCAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsID4+PiAxNiAmIDB4ZmY7XG4gIGJbaSsrXSA9IHRsID4+PiA4ICYgMHhmZjtcbiAgYltpKytdID0gdGwgJiAweGZmOyAvLyBgdGltZV9taWRgXG5cbiAgY29uc3QgdG1oID0gbXNlY3MgLyAweDEwMDAwMDAwMCAqIDEwMDAwICYgMHhmZmZmZmZmO1xuICBiW2krK10gPSB0bWggPj4+IDggJiAweGZmO1xuICBiW2krK10gPSB0bWggJiAweGZmOyAvLyBgdGltZV9oaWdoX2FuZF92ZXJzaW9uYFxuXG4gIGJbaSsrXSA9IHRtaCA+Pj4gMjQgJiAweGYgfCAweDEwOyAvLyBpbmNsdWRlIHZlcnNpb25cblxuICBiW2krK10gPSB0bWggPj4+IDE2ICYgMHhmZjsgLy8gYGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWRgIChQZXIgNC4yLjIgLSBpbmNsdWRlIHZhcmlhbnQpXG5cbiAgYltpKytdID0gY2xvY2tzZXEgPj4+IDggfCAweDgwOyAvLyBgY2xvY2tfc2VxX2xvd2BcblxuICBiW2krK10gPSBjbG9ja3NlcSAmIDB4ZmY7IC8vIGBub2RlYFxuXG4gIGZvciAobGV0IG4gPSAwOyBuIDwgNjsgKytuKSB7XG4gICAgYltpICsgbl0gPSBub2RlW25dO1xuICB9XG5cbiAgcmV0dXJuIGJ1ZiB8fCB1bnNhZmVTdHJpbmdpZnkoYik7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHYxOyIsImltcG9ydCB2MzUgZnJvbSAnLi92MzUuanMnO1xuaW1wb3J0IG1kNSBmcm9tICcuL21kNS5qcyc7XG5jb25zdCB2MyA9IHYzNSgndjMnLCAweDMwLCBtZDUpO1xuZXhwb3J0IGRlZmF1bHQgdjM7IiwiaW1wb3J0IHsgdW5zYWZlU3RyaW5naWZ5IH0gZnJvbSAnLi9zdHJpbmdpZnkuanMnO1xuaW1wb3J0IHBhcnNlIGZyb20gJy4vcGFyc2UuanMnO1xuXG5mdW5jdGlvbiBzdHJpbmdUb0J5dGVzKHN0cikge1xuICBzdHIgPSB1bmVzY2FwZShlbmNvZGVVUklDb21wb25lbnQoc3RyKSk7IC8vIFVURjggZXNjYXBlXG5cbiAgY29uc3QgYnl0ZXMgPSBbXTtcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IHN0ci5sZW5ndGg7ICsraSkge1xuICAgIGJ5dGVzLnB1c2goc3RyLmNoYXJDb2RlQXQoaSkpO1xuICB9XG5cbiAgcmV0dXJuIGJ5dGVzO1xufVxuXG5leHBvcnQgY29uc3QgRE5TID0gJzZiYTdiODEwLTlkYWQtMTFkMS04MGI0LTAwYzA0ZmQ0MzBjOCc7XG5leHBvcnQgY29uc3QgVVJMID0gJzZiYTdiODExLTlkYWQtMTFkMS04MGI0LTAwYzA0ZmQ0MzBjOCc7XG5leHBvcnQgZGVmYXVsdCBmdW5jdGlvbiB2MzUobmFtZSwgdmVyc2lvbiwgaGFzaGZ1bmMpIHtcbiAgZnVuY3Rpb24gZ2VuZXJhdGVVVUlEKHZhbHVlLCBuYW1lc3BhY2UsIGJ1Ziwgb2Zmc2V0KSB7XG4gICAgdmFyIF9uYW1lc3BhY2U7XG5cbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSAnc3RyaW5nJykge1xuICAgICAgdmFsdWUgPSBzdHJpbmdUb0J5dGVzKHZhbHVlKTtcbiAgICB9XG5cbiAgICBpZiAodHlwZW9mIG5hbWVzcGFjZSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIG5hbWVzcGFjZSA9IHBhcnNlKG5hbWVzcGFjZSk7XG4gICAgfVxuXG4gICAgaWYgKCgoX25hbWVzcGFjZSA9IG5hbWVzcGFjZSkgPT09IG51bGwgfHwgX25hbWVzcGFjZSA9PT0gdm9pZCAwID8gdm9pZCAwIDogX25hbWVzcGFjZS5sZW5ndGgpICE9PSAxNikge1xuICAgICAgdGhyb3cgVHlwZUVycm9yKCdOYW1lc3BhY2UgbXVzdCBiZSBhcnJheS1saWtlICgxNiBpdGVyYWJsZSBpbnRlZ2VyIHZhbHVlcywgMC0yNTUpJyk7XG4gICAgfSAvLyBDb21wdXRlIGhhc2ggb2YgbmFtZXNwYWNlIGFuZCB2YWx1ZSwgUGVyIDQuM1xuICAgIC8vIEZ1dHVyZTogVXNlIHNwcmVhZCBzeW50YXggd2hlbiBzdXBwb3J0ZWQgb24gYWxsIHBsYXRmb3JtcywgZS5nLiBgYnl0ZXMgPVxuICAgIC8vIGhhc2hmdW5jKFsuLi5uYW1lc3BhY2UsIC4uLiB2YWx1ZV0pYFxuXG5cbiAgICBsZXQgYnl0ZXMgPSBuZXcgVWludDhBcnJheSgxNiArIHZhbHVlLmxlbmd0aCk7XG4gICAgYnl0ZXMuc2V0KG5hbWVzcGFjZSk7XG4gICAgYnl0ZXMuc2V0KHZhbHVlLCBuYW1lc3BhY2UubGVuZ3RoKTtcbiAgICBieXRlcyA9IGhhc2hmdW5jKGJ5dGVzKTtcbiAgICBieXRlc1s2XSA9IGJ5dGVzWzZdICYgMHgwZiB8IHZlcnNpb247XG4gICAgYnl0ZXNbOF0gPSBieXRlc1s4XSAmIDB4M2YgfCAweDgwO1xuXG4gICAgaWYgKGJ1Zikge1xuICAgICAgb2Zmc2V0ID0gb2Zmc2V0IHx8IDA7XG5cbiAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgMTY7ICsraSkge1xuICAgICAgICBidWZbb2Zmc2V0ICsgaV0gPSBieXRlc1tpXTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGJ1ZjtcbiAgICB9XG5cbiAgICByZXR1cm4gdW5zYWZlU3RyaW5naWZ5KGJ5dGVzKTtcbiAgfSAvLyBGdW5jdGlvbiNuYW1lIGlzIG5vdCBzZXR0YWJsZSBvbiBzb21lIHBsYXRmb3JtcyAoIzI3MClcblxuXG4gIHRyeSB7XG4gICAgZ2VuZXJhdGVVVUlELm5hbWUgPSBuYW1lOyAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgbm8tZW1wdHlcbiAgfSBjYXRjaCAoZXJyKSB7fSAvLyBGb3IgQ29tbW9uSlMgZGVmYXVsdCBleHBvcnQgc3VwcG9ydFxuXG5cbiAgZ2VuZXJhdGVVVUlELkROUyA9IEROUztcbiAgZ2VuZXJhdGVVVUlELlVSTCA9IFVSTDtcbiAgcmV0dXJuIGdlbmVyYXRlVVVJRDtcbn0iLCJpbXBvcnQgbmF0aXZlIGZyb20gJy4vbmF0aXZlLmpzJztcbmltcG9ydCBybmcgZnJvbSAnLi9ybmcuanMnO1xuaW1wb3J0IHsgdW5zYWZlU3RyaW5naWZ5IH0gZnJvbSAnLi9zdHJpbmdpZnkuanMnO1xuXG5mdW5jdGlvbiB2NChvcHRpb25zLCBidWYsIG9mZnNldCkge1xuICBpZiAobmF0aXZlLnJhbmRvbVVVSUQgJiYgIWJ1ZiAmJiAhb3B0aW9ucykge1xuICAgIHJldHVybiBuYXRpdmUucmFuZG9tVVVJRCgpO1xuICB9XG5cbiAgb3B0aW9ucyA9IG9wdGlvbnMgfHwge307XG4gIGNvbnN0IHJuZHMgPSBvcHRpb25zLnJhbmRvbSB8fCAob3B0aW9ucy5ybmcgfHwgcm5nKSgpOyAvLyBQZXIgNC40LCBzZXQgYml0cyBmb3IgdmVyc2lvbiBhbmQgYGNsb2NrX3NlcV9oaV9hbmRfcmVzZXJ2ZWRgXG5cbiAgcm5kc1s2XSA9IHJuZHNbNl0gJiAweDBmIHwgMHg0MDtcbiAgcm5kc1s4XSA9IHJuZHNbOF0gJiAweDNmIHwgMHg4MDsgLy8gQ29weSBieXRlcyB0byBidWZmZXIsIGlmIHByb3ZpZGVkXG5cbiAgaWYgKGJ1Zikge1xuICAgIG9mZnNldCA9IG9mZnNldCB8fCAwO1xuXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCAxNjsgKytpKSB7XG4gICAgICBidWZbb2Zmc2V0ICsgaV0gPSBybmRzW2ldO1xuICAgIH1cblxuICAgIHJldHVybiBidWY7XG4gIH1cblxuICByZXR1cm4gdW5zYWZlU3RyaW5naWZ5KHJuZHMpO1xufVxuXG5leHBvcnQgZGVmYXVsdCB2NDsiLCJpbXBvcnQgdjM1IGZyb20gJy4vdjM1LmpzJztcbmltcG9ydCBzaGExIGZyb20gJy4vc2hhMS5qcyc7XG5jb25zdCB2NSA9IHYzNSgndjUnLCAweDUwLCBzaGExKTtcbmV4cG9ydCBkZWZhdWx0IHY1OyIsImltcG9ydCBSRUdFWCBmcm9tICcuL3JlZ2V4LmpzJztcblxuZnVuY3Rpb24gdmFsaWRhdGUodXVpZCkge1xuICByZXR1cm4gdHlwZW9mIHV1aWQgPT09ICdzdHJpbmcnICYmIFJFR0VYLnRlc3QodXVpZCk7XG59XG5cbmV4cG9ydCBkZWZhdWx0IHZhbGlkYXRlOyIsImltcG9ydCB2YWxpZGF0ZSBmcm9tICcuL3ZhbGlkYXRlLmpzJztcblxuZnVuY3Rpb24gdmVyc2lvbih1dWlkKSB7XG4gIGlmICghdmFsaWRhdGUodXVpZCkpIHtcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ0ludmFsaWQgVVVJRCcpO1xuICB9XG5cbiAgcmV0dXJuIHBhcnNlSW50KHV1aWQuc2xpY2UoMTQsIDE1KSwgMTYpO1xufVxuXG5leHBvcnQgZGVmYXVsdCB2ZXJzaW9uOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcImNyeXB0b1wiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJmc1wiKTsiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoXCJodHRwXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcIm9zXCIpOyIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZShcInBhdGhcIik7IiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKFwicHJvY2Vzc1wiKTsiLCIvLyBUaGUgbW9kdWxlIGNhY2hlXG52YXIgX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fID0ge307XG5cbi8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG5mdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cdC8vIENoZWNrIGlmIG1vZHVsZSBpcyBpbiBjYWNoZVxuXHR2YXIgY2FjaGVkTW9kdWxlID0gX193ZWJwYWNrX21vZHVsZV9jYWNoZV9fW21vZHVsZUlkXTtcblx0aWYgKGNhY2hlZE1vZHVsZSAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0cmV0dXJuIGNhY2hlZE1vZHVsZS5leHBvcnRzO1xuXHR9XG5cdC8vIENyZWF0ZSBhIG5ldyBtb2R1bGUgKGFuZCBwdXQgaXQgaW50byB0aGUgY2FjaGUpXG5cdHZhciBtb2R1bGUgPSBfX3dlYnBhY2tfbW9kdWxlX2NhY2hlX19bbW9kdWxlSWRdID0ge1xuXHRcdC8vIG5vIG1vZHVsZS5pZCBuZWVkZWRcblx0XHQvLyBubyBtb2R1bGUubG9hZGVkIG5lZWRlZFxuXHRcdGV4cG9ydHM6IHt9XG5cdH07XG5cblx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG5cdF9fd2VicGFja19tb2R1bGVzX19bbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG5cdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG5cdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbn1cblxuIiwiLy8gZ2V0RGVmYXVsdEV4cG9ydCBmdW5jdGlvbiBmb3IgY29tcGF0aWJpbGl0eSB3aXRoIG5vbi1oYXJtb255IG1vZHVsZXNcbl9fd2VicGFja19yZXF1aXJlX18ubiA9IChtb2R1bGUpID0+IHtcblx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG5cdFx0KCkgPT4gKG1vZHVsZVsnZGVmYXVsdCddKSA6XG5cdFx0KCkgPT4gKG1vZHVsZSk7XG5cdF9fd2VicGFja19yZXF1aXJlX18uZChnZXR0ZXIsIHsgYTogZ2V0dGVyIH0pO1xuXHRyZXR1cm4gZ2V0dGVyO1xufTsiLCIvLyBkZWZpbmUgZ2V0dGVyIGZ1bmN0aW9ucyBmb3IgaGFybW9ueSBleHBvcnRzXG5fX3dlYnBhY2tfcmVxdWlyZV9fLmQgPSAoZXhwb3J0cywgZGVmaW5pdGlvbikgPT4ge1xuXHRmb3IodmFyIGtleSBpbiBkZWZpbml0aW9uKSB7XG5cdFx0aWYoX193ZWJwYWNrX3JlcXVpcmVfXy5vKGRlZmluaXRpb24sIGtleSkgJiYgIV9fd2VicGFja19yZXF1aXJlX18ubyhleHBvcnRzLCBrZXkpKSB7XG5cdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywga2V5LCB7IGVudW1lcmFibGU6IHRydWUsIGdldDogZGVmaW5pdGlvbltrZXldIH0pO1xuXHRcdH1cblx0fVxufTsiLCJfX3dlYnBhY2tfcmVxdWlyZV9fLm8gPSAob2JqLCBwcm9wKSA9PiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKG9iaiwgcHJvcCkpIiwiLy8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuX193ZWJwYWNrX3JlcXVpcmVfXy5yID0gKGV4cG9ydHMpID0+IHtcblx0aWYodHlwZW9mIFN5bWJvbCAhPT0gJ3VuZGVmaW5lZCcgJiYgU3ltYm9sLnRvU3RyaW5nVGFnKSB7XG5cdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFN5bWJvbC50b1N0cmluZ1RhZywgeyB2YWx1ZTogJ01vZHVsZScgfSk7XG5cdH1cblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsICdfX2VzTW9kdWxlJywgeyB2YWx1ZTogdHJ1ZSB9KTtcbn07IiwiXCJ1c2Ugc3RyaWN0XCI7XG5PYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XG5jb25zdCBzZXJ2ZXJfMSA9IHJlcXVpcmUoXCIuL3NlcnZlclwiKTtcbnNlcnZlcl8xLnNlcnZlci5saXN0ZW4oc2VydmVyXzEucG9ydCwgKCkgPT4ge1xuICAgIGNvbnNvbGUubG9nKGBTZXJ2ZXIgaXMgcnVubmluZyBvbiBwb3J0ICR7c2VydmVyXzEucG9ydH1gKTtcbn0pO1xuIl0sIm5hbWVzIjpbXSwic291cmNlUm9vdCI6IiJ9