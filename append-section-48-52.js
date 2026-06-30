const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'background', 'service-worker.js');

const appendBlock = `
// ==================== SECTION 48: ADVANCED UTILITIES ====================

function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));
  const cloned = {};
  Object.keys(obj).forEach(key => {
    cloned[key] = deepClone(obj[key]);
  });
  return cloned;
}

function mergeDeep(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = mergeDeep(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === "object" && !Array.isArray(item);
}

function generateId(prefix = "x1", length = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = prefix + "_";
  for (let i = 0; i < length; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function debounce(func, wait, immediate = false) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    const callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

function retryAsync(fn, retries, delay) {
  return new Promise((resolve, reject) => {
    function attempt(n) {
      fn().then(resolve).catch(err => {
        if (n === 0) reject(err);
        else setTimeout(() => attempt(n - 1), delay);
      });
    }
    attempt(retries);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 2) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function groupBy(arr, key) {
  return arr.reduce((result, item) => {
    const k = typeof key === "function" ? key(item) : item[key];
    if (!result[k]) result[k] = [];
    result[k].push(item);
    return result;
  }, {});
}

function sortBy(arr, key, order = "asc") {
  return [...arr].sort((a, b) => {
    const aVal = typeof key === "function" ? key(a) : a[key];
    const bVal = typeof key === "function" ? key(b) : b[key];
    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  });
}

function unique(arr) {
  return [...new Set(arr)];
}

function flatten(arr, depth = 1) {
  return arr.reduce((flat, item) => {
    if (Array.isArray(item) && depth > 0) {
      return flat.concat(flatten(item, depth - 1));
    }
    return flat.concat(item);
  }, [);
}

function hasDuplicates(arr) {
  return new Set(arr).size !== arr.length;
}

function arraysEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ==================== SECTION 49: TEXT PROCESSING ====================

const TextProcessing = {
  countWords(text) {
    return text.trim().split(/\\s+/).filter(w => w.length > 0).length;
  },

  countChars(text) {
    return text.length;
  },

  countLines(text) {
    return text.split("\\n").length;
  },

  countParagraphs(text) {
    return text.split(/\\n\\s*\\n/).filter(p => p.trim().length > 0).length;
  },

  countSentences(text) {
    return (text.match(/[.!?]+/g) || []).length;
  },

  countSyllables(word) {
    word = word.toLowerCase();
    if (word.length <= 3) return 1;
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
    word = word.replace(/^y/, "");
    const matches = word.match(/[aeiouy]{1,2}/g);
    return matches ? matches.length : 1;
  },

  readingTime(text, wpm = 200) {
    const words = this.countWords(text);
    const minutes = Math.ceil(words / wpm);
    return minutes < 1 ? "1 min" : minutes + " min";
  },

  speakingTime(text, wpm = 150) {
    const words = this.countWords(text);
    const minutes = Math.ceil(words / wpm);
    return minutes < 1 ? "1 min" : minutes + " min";
  },

  readabilityScore(text) {
    const words = this.countWords(text);
    const sentences = this.countSentences(text) || 1;
    const syllables = text.split(/\\s+/).reduce((sum, w) => sum + this.countSyllables(w), 0);
    return Math.round(206.835 - 1.015 * (words / sentences) - 84.6 * (syllables / words));
  },

  summarize(text, maxSentences = 3) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    if (sentences.length <= maxSentences) return text;
    const scored = sentences.map((s, i) => ({
      sentence: s.trim(),
      score: (s.length / text.length) * (i / sentences.length)
    })).sort((a, b) => b.score - a.score).slice(0, maxSentences);
    return scored.map(s => s.sentence).join(" ");
  },

  extractKeywords(text, count = 10) {
    const words = text.toLowerCase().match(/[a-záéíóúñü]{3,}/g) || [];
    const stopwords = new Set(["que", "los", "las", "del", "una", "un", "con", "por", "para", "como", "más", "pero", "sus", "esta", "esta", "son", "tiene", "todo", "esta", "han", "ser", "también", "fue", "puede", "hacer", "muy", "sin", "sobre", "este", "entre", "cuando", "todo", "esta", "nos", "durante", "otro", "había", "antes", "después", "bajo", "cada", "mismo", "ella", "ellos", "ellas", "aquí", "allí", "ahora", "hoy", "ayer", "mañana", "aquí"]);
    const freq = {};
    words.forEach(w => {
      if (!stopwords.has(w)) {
        freq[w] = (freq[w] || 0) + 1;
      }
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, count).map(e => e[0]);
  },

  detectLanguage(text) {
    const patterns = {
      spanish: /[áéíóúñ]/i,
      french: /[àâçéèêëïîôùûüÿ]/i,
      german: /[äöüß]/i,
      portuguese: /[ãõ]/i,
      italian: /[àèéìíîòóùú]/i
    };
    let best = "english", maxScore = 0;
    for (const [lang, pattern] of Object.entries(patterns)) {
      const matches = (text.match(pattern) || []).length;
      if (matches > maxScore) { maxScore = matches; best = lang; }
    }
    return best;
  },

  sanitize(text) {
    return text.replace(/[<>{}[\]\\\\^~|`]/g, "");
  },

  slugify(text) {
    return text.toLowerCase().replace(/[^a-z0-9\\s-]/g, "").replace(/\\s+/g, "-").replace(/-+/g, "-").trim();
  },

  camelize(text) {
    return text.toLowerCase().replace(/[-_\\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : "");
  },

  pascalize(text) {
    const c = this.camelize(text);
    return c.charAt(0).toUpperCase() + c.slice(1);
  },

  snakelize(text) {
    return text.replace(/[A-Z]/g, l => "_" + l.toLowerCase()).replace(/^_/, "").replace(/[-\\s]+/g, "_");
  },

  extractEmails(text) {
    return (text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}/g) || []);
  },

  extractPhones(text) {
    const phones = text.match(/[+]?[(]?[0-9]{1,4}[)]?[-\\s./0-9]{7,15}/g) || [];
    return [...new Set(phones)];
  },

  extractUrls(text) {
    return (text.match(/https?:\\/\\/[^\\s<>"\${|\\\\^\\[\\]\`]+/gi) || []);
  },

  extractNumbers(text) {
    return (text.match(/\\d+[.,]?\\d*/g) || []).map(n => parseFloat(n.replace(",", ".")));
  },

  extractDates(text) {
    const dates = [];
    const patterns = [
      /\\d{1,2}[\\/-]\\d{1,2}[\\/-]\\d{2,4}/g,
      /\\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)( de \\d{4})?/gi,
      /(hoy|mañana|ayer|esta semana|próxima semana|este mes)/gi
    ];
    patterns.forEach(p => {
      const matches = text.match(p);
      if (matches) dates.push(...matches);
    });
    return [...new Set(dates)];
  },

  normalizeSpaces(text) {
    return text.replace(/[\\s\\u00A0]+/g, " ").trim();
  },

  normalizeNewlines(text) {
    return text.replace(/\\r\\n/g, "\\n").replace(/\\r/g, "\\n");
  },

  removeAccents(text) {
    return text.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "");
  },

  truncate(text, maxLength, suffix = "...") {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength).trimEnd() + suffix;
  },

  repeat(str, count) {
    return str.repeat(count);
  },

  padLeft(str, len, char = " ") {
    str = String(str);
    return str.length < len ? char.repeat(len - str.length) + str : str;
  },

  padRight(str, len, char = " ") {
    str = String(str);
    return str.length < len ? str + char.repeat(len - str.length) : str;
  },

  center(str, len, char = " ") {
    str = String(str);
    const spaces = len - str.length;
    const left = Math.floor(spaces / 2);
    const right = spaces - left;
    return char.repeat(left) + str + char.repeat(right);
  },

  wrap(text, width) {
    const words = text.split(/\\s+/);
    const lines = [];
    let currentLine = "";
    words.forEach(word => {
      if ((currentLine + " " + word).trim().length > width) {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = (currentLine + " " + word).trim();
      }
    });
    if (currentLine) lines.push(currentLine);
    return lines.join("\\n");
  },

  indent(text, spaces = 2) {
    const pad = " ".repeat(spaces);
    return text.split("\\n").map(line => pad + line).join("\\n");
  },

  dedent(text) {
    const lines = text.split("\\n").filter(l => l.trim().length > 0);
    const minIndent = Math.min(...lines.map(l => l.search(/\\S/)));
    return text.split("\\n").map(line => {
      const spaces = line.search(/\\S/);
      return spaces >= 0 && spaces >= minIndent ? line.substring(minIndent) : line;
    }).join("\\n");
  },

  template(template, data) {
    return template.replace(/\\{\\{(\\w+)\\}\\}/g, (_, key) => data[key] != null ? data[key] : "");
  },

  mask(text, visible = 4, maskChar = "*") {
    if (!text || text.length <= visible) return text;
    return maskChar.repeat(text.length - visible) + text.slice(-visible);
  },

  initials(name) {
    return name.split(/\\s+/).map(n => n.charAt(0).toUpperCase()).slice(0, 2).join("");
  },

  normalizePath(path) {
    return path.replace(/[\\\\/]+/g, "/").replace(/^\\/+|\\/+$/g, "");
  },

  relativePath(from, to) {
    const fromParts = this.normalizePath(from).split("/");
    const toParts = this.normalizePath(to).split("/");
    while (fromParts.length && toParts.length && fromParts[0] === toParts[0]) {
      fromParts.shift();
      toParts.shift();
    }
    return fromParts.map(() => "..").concat(toParts).join("/");
  },

  basename(path) {
    const parts = this.normalizePath(path).split("/");
    return parts[parts.length - 1] || "";
  },

  dirname(path) {
    const parts = this.normalizePath(path).split("/");
    parts.pop();
    return parts.join("/") || "/";
  },

  fileExtension(filename) {
    const parts = filename.split(".");
    return parts.length > 1 ? parts.pop().toLowerCase() : "";
  },

  changeExtension(filename, newExt) {
    const lastDot = filename.lastIndexOf(".");
    if (lastDot === -1) return filename + "." + newExt.replace(/^\\./, "");
    return filename.substring(0, lastDot) + "." + newExt.replace(/^\\./, "");
  }
};

// ==================== SECTION 50: NUMERIC UTILITIES ====================

const NumericUtils = {
  clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  },

  lerp(a, b, t) {
    return a + (b - a) * t;
  },

  map(val, inMin, inMax, outMin, outMax) {
    return ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  },

  roundTo(num, decimals = 0) {
    return Number(Math.round(num + "e" + decimals) + "e-" + decimals);
  },

  floorTo(num, decimals = 0) {
    return Number(Math.floor(num + "e" + decimals) + "e-" + decimals);
  },

  ceilTo(num, decimals = 0) {
    return Number(Math.ceil(num + "e" + decimals) + "e-" + decimals);
  },

  absDiff(a, b) {
    return Math.abs(a - b);
  },

  sign(num) {
    return num > 0 ? 1 : num < 0 ? -1 : 0;
  },

  isBetween(val, min, max, inclusive = true) {
    if (inclusive) return val >= min && val <= max;
    return val > min && val < max;
  },

  average(arr) {
    if (!arr.length) return 0;
    return arr.reduce((sum, n) => sum + n, 0) / arr.length;
  },

  median(arr) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },

  mode(arr) {
    if (!arr.length) return null;
    const freq = {};
    arr.forEach(n => { freq[n] = (freq[n] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    const modes = Object.keys(freq).filter(k => freq[k] === maxFreq);
    return modes.map(Number);
  },

  standardDeviation(arr) {
    if (arr.length < 2) return 0;
    const avg = this.average(arr);
    const squareDiffs = arr.map(v => Math.pow(v - avg, 2));
    return Math.sqrt(this.average(squareDiffs));
  },

  variance(arr) {
    if (arr.length < 2) return 0;
    const avg = this.average(arr);
    return arr.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / (arr.length - 1);
  },

  percentile(arr, p) {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  },

  factorial(n) {
    if (n < 0) return NaN;
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  },

  fibonacci(n) {
    if (n <= 0) return 0;
    if (n === 1) return 1;
    let a = 0, b = 1;
    for (let i = 2; i <= n; i++) { [a, b] = [b, a + b]; }
    return b;
  },

  isPrime(n) {
    if (n < 2) return false;
    if (n === 2) return true;
    if (n % 2 === 0) return false;
    for (let i = 3; i <= Math.sqrt(n); i += 2) {
      if (n % i === 0) return false;
    }
    return true;
  },

  gcd(a, b) {
    while (b) { [a, b] = [b, a % b]; }
    return a;
  },

  lcm(a, b) {
    return (a * b) / this.gcd(a, b);
  },

  toHex(num) {
    return "0x" + Math.round(num).toString(16).toUpperCase().padStart(2, "0");
  },

  toBinary(num) {
    return Number(num).toString(2);
  },

  toOctal(num) {
    return Number(num).toString(8);
  },

  degToRad(deg) {
    return deg * (Math.PI / 180);
  },

  radToDeg(rad) {
    return rad * (180 / Math.PI);
  },

  distance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  },

  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  },

  probability(successes, total) {
    if (total === 0) return 0;
    return successes / total;
  },

  combination(n, r) {
    if (r > n) return 0;
    return this.factorial(n) / (this.factorial(r) * this.factorial(n - r));
  },

  permutation(n, r) {
    if (r > n) return 0;
    return this.factorial(n) / this.factorial(n - r);
  },

  log(x, base = Math.E) {
    return Math.log(x) / Math.log(base);
  },

  sqrt(x) {
    return Math.sqrt(x);
  },

  pow(x, y) {
    return Math.pow(x, y);
  },

  exp(x) {
    return Math.exp(x);
  },

  sin(x) { return Math.sin(this.degToRad(x)); },
  cos(x) { return Math.cos(this.degToRad(x)); },
  tan(x) { return Math.tan(this.degToRad(x)); },
  asin(x) { return Math.asin(x) * (180 / Math.PI); },
  acos(x) { return Math.acos(x) * (180 / Math.PI); },
  atan(x) { return Math.atan(x) * (180 / Math.PI); },
  atan2(y, x) { return Math.atan2(y, x) * (180 / Math.PI); },

  hypot(...values) {
    return Math.hypot(...values);
  },

  cbrt(x) {
    return Math.cbrt(x);
  },

  trunc(x) {
    return Math.trunc(x);
  },

  signbit(x) {
    return Math.sign(x) === -1;
  },

  fround(x) {
    return Math.fround(x);
  },

  imul(a, b) {
    return Math.imul(a, b);
  },

  clz32(x) {
    return Math.clz32(x);
  },

  nextUp(x) {
    return Math.nextUp(x);
  },

  scale(x, inLow, inHigh, outLow, outHigh) {
    return this.map(x, inLow, inHigh, outLow, outHigh);
  },

  normalize(x, min, max) {
    return this.map(x, min, max, 0, 1);
  },

  denormalize(x, min, max) {
    return this.map(x, 0, 1, min, max);
  }
};

// ==================== SECTION 51: ARRAY UTILITIES ====================

const ArrayUtils = {
  first(arr, def = null) {
    return arr.length > 0 ? arr[0] : def;
  },

  last(arr, def = null) {
    return arr.length > 0 ? arr[arr.length - 1] : def;
  },

  nth(arr, n, def = null) {
    return arr.length > n ? arr[n] : def;
  },

  without(arr, ...values) {
    return arr.filter(item => !values.includes(item));
  },

  withoutAll(arr, values) {
    return arr.filter(item => !values.includes(item));
  },

  compact(arr) {
    return arr.filter(Boolean);
  },

  flattenDeep(arr) {
    return arr.reduce((acc, val) => Array.isArray(val) ? acc.concat(this.flattenDeep(val)) : acc.concat(val), []);
  },

  difference(arr, ...others) {
    const exclude = new Set(others.flat());
    return arr.filter(x => !exclude.has(x));
  },

  intersection(...arrays) {
    if (!arrays.length) return [];
    const result = arrays[0].filter(x => arrays.every(a => a.includes(x)));
    return result;
  },

  union(...arrays) {
    const set = new Set(arrays.flat());
    return [...set];
  },

  uniqWith(arr, comparator) {
    const result = [];
    const seen = new Set();
    arr.forEach(item => {
      const key = typeof comparator === "function" ? comparator(item) : JSON.stringify(item);
      if (!seen.has(key)) {
        seen.add(key);
        result.push(item);
      }
    });
    return result;
  },

  groupReduce(arr, key, reduceFn, initial) {
    const groups = this.groupBy(arr, key);
    const result = {};
    for (const [k, items] of Object.entries(groups)) {
      result[k] = items.reduce(reduceFn, initial);
    }
    return result;
  },

  partition(arr, predicate) {
    const pass = [], fail = [];
    arr.forEach(item => predicate(item) ? pass.push(item) : fail.push(item));
    return [pass, fail];
  },

  take(arr, n) {
    return arr.slice(0, n);
  },

  takeRight(arr, n) {
    return arr.slice(-n);
  },

  drop(arr, n) {
    return arr.slice(n);
  },

  dropRight(arr, n) {
    return arr.slice(0, -n);
  },

  takeWhile(arr, predicate) {
    const idx = arr.findIndex(item => !predicate(item));
    return idx === -1 ? arr : arr.slice(0, idx);
  },

  dropWhile(arr, predicate) {
    const idx = arr.findIndex(item => !predicate(item));
    return idx === -1 ? [] : arr.slice(idx);
  },

  findIndex(arr, predicate, fromIndex = 0) {
    for (let i = fromIndex; i < arr.length; i++) {
      if (predicate(arr[i], i, arr)) return i;
    }
    return -1;
  },

  findLastIndex(arr, predicate) {
    for (let i = arr.length - 1; i >= 0; i--) {
      if (predicate(arr[i], i, arr)) return i;
    }
    return -1;
  },

  sortedIndex(arr, value) {
    let low = 0, high = arr.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (arr[mid] < value) low = mid + 1;
      else high = mid;
    }
    return low;
  },

  move(arr, from, to) {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
  },

  remove(arr, predicate) {
    const result = [];
    arr.forEach(item => {
      if (!predicate(item)) result.push(item);
    });
    return result;
  },

  pull(arr, ...values) {
    return this.remove(arr, item => values.includes(item));
  },

  pullAll(arr, values) {
    return this.remove(arr, item => values.includes(item));
  },

  pullBy(arr, values, key) {
    if (typeof key === "function") {
      return this.remove(arr, item => values.some(v => key(v) === key(item)));
    }
    return this.remove(arr, item => values.some(v => item[key] === v[key]));
  },

  zip(...arrays) {
    const length = Math.max(...arrays.map(a => a.length));
    const result = [];
    for (let i = 0; i < length; i++) {
      result.push(arrays.map(arr => arr[i]));
    }
    return result;
  },

  unzip(arr) {
    return this.zip(...arr);
  },

  unzipWith(arr, iteratee) {
    return this.zip(...arr).map(group => iteratee(...group));
  },

  flattenDepth(arr, depth = 1) {
    return this.flatten(arr, depth);
  },

  sortedIndexBy(arr, value, key) {
    const getValue = typeof key === "function" ? key : item => item[key];
    return this.sortedIndex(arr.map(getValue), getValue(value));
  },

  xor(...arrays) {
    const counts = {};
    arrays.flat().forEach(item => {
      const key = JSON.stringify(item);
      counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts).filter(([_, c]) => c === 1).map(([k]) => JSON.parse(k));
  },

  fill(arr, value, start = 0, end = arr.length) {
    return arr.map((item, i) => i >= start && i < end ? value : item);
  },

  repeat(value, n) {
    return Array.from({ length: n }, () => value);
  },

  keyBy(arr, key) {
    return arr.reduce((result, item) => {
      const k = typeof key === "function" ? key(item) : item[key];
      result[k] = item;
      return result;
    }, {});
  },

  mapValues(obj, iteratee) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, iteratee(v, k, obj)])
    );
  },

  mapKeys(obj, iteratee) {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [iteratee(k, v, obj), v])
    );
  },

  pick(obj, ...keys) {
    const result = {};
    keys.forEach(key => { if (key in obj) result[key] = obj[key]; });
    return result;
  },

  omit(obj, ...keys) {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
  }
};

// ==================== SECTION 52: OBJECT UTILITIES ====================

const ObjectUtils = {
  keys(obj) {
    return Object.keys(obj);
  },

  values(obj) {
    return Object.values(obj);
  },

  entries(obj) {
    return Object.entries(obj);
  },

  fromPairs(pairs) {
    return Object.fromEntries(pairs);
  },

  toPairs(obj) {
    return Object.entries(obj);
  },

  invert(obj) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[value] = key;
    }
    return result;
  },

  invertBy(obj, transform) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      const transformed = transform(value);
      if (!result[transformed]) result[transformed] = [];
      result[transformed].push(key);
    }
    return result;
  },

  assign(target, ...sources) {
    return Object.assign(target, ...sources);
  },

  assignIn(target, ...sources) {
    return this.assign(target, ...sources);
  },

  defaults(target, ...sources) {
    sources.forEach(source => {
      Object.keys(source).forEach(key => {
        if (!(key in target)) target[key] = source[key];
      });
    });
    return target;
  },

  defaultsDeep(target, ...sources) {
    sources.forEach(source => {
      Object.keys(source).forEach(key => {
        if (!(key in target) || typeof target[key] !== "object") {
          target[key] = source[key];
        } else if (typeof target[key] === "object" && typeof source[key] === "object") {
          this.defaultsDeep(target[key], source[key]);
        }
      });
    });
    return target;
  },

  pick(obj, ...paths) {
    return paths.reduce((result, path) => {
      if (path in obj) result[path] = obj[path];
      return result;
    }, {});
  },

  pickBy(obj, predicate) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (predicate(value, key, obj)) result[key] = value;
    }
    return result;
  },

  omit(obj, ...paths) {
    const result = { ...obj };
    paths.forEach(path => delete result[path]);
    return result;
  },

  omitBy(obj, predicate) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      if (!predicate(value, key, obj)) result[key] = value;
    }
    return result;
  },

  clone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(item => this.clone(item));
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = this.clone(obj[key]);
      }
    }
    return cloned;
  },

  merge(target, ...sources) {
    return mergeDeep(target, Object.assign({}, ...sources));
  },

  mergeDeep(target, ...sources) {
    sources.forEach(source => {
      if (isObject(source)) {
        Object.keys(source).forEach(key => {
          if (isObject(source[key]) && isObject(target[key])) {
            this.mergeDeep(target[key], source[key]);
          } else {
            target[key] = source[key];
          }
        });
      }
    });
    return target;
  },

  get(obj, path, def = null) {
    const paths = Array.isArray(path) ? path : path.split(".");
    const result = paths.reduce((acc, part) => (acc && acc[part] != null) ? acc[part] : def, obj);
    return result;
  },

  set(obj, path, value) {
    const paths = Array.isArray(path) ? path : path.split(".");
    const last = paths.pop();
    const target = paths.reduce((acc, part) => {
      if (!(part in acc) || typeof acc[part] !== "object") acc[part] = {};
      return acc[part];
    }, obj);
    target[last] = value;
    return obj;
  },

  unset(obj, path) {
    const paths = path.split(".");
    const last = paths.pop();
    const target = paths.reduce((acc, part) => acc[part], obj);
    delete target[last];
    return obj;
  },

  has(obj, path) {
    const paths = path.split(".");
    let current = obj;
    for (const part of paths) {
      if (!(part in current) || current[part] == null) return false;
      current = current[part];
    }
    return true;
  },

  isEqual(a, b) {
    return JSON.stringify(a) === JSON.stringify(b);
  },

  isEmpty(obj) {
    if (obj === null || obj === undefined) return true;
    if (Array.isArray(obj) || typeof obj === "string") return obj.length === 0;
    return Object.keys(obj).length === 0;
  },

  isNotEmpty(obj) {
    return !this.isEmpty(obj);
  },

  size(obj) {
    if (obj === null || obj === undefined) return 0;
    if (Array.isArray(obj) || typeof obj === "string") return obj.length;
    return Object.keys(obj).length;
  },

  transform(obj, iteratee, accumulator = {}) {
    baseForOwn(obj, (value, key, object) => {
      iteratee(accumulator, value, key, object);
    });
    return accumulator;
  },

  mapValues(obj, iteratee) {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      result[key] = iteratee(value, key, obj);
    });
    return result;
  },

  mapKeys(obj, iteratee) {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      result[iteratee(value, key, obj)] = value;
    });
    return result;
  },

  forEach(obj, iteratee) {
    Object.entries(obj).forEach(([key, value], index) => iteratee(value, key, obj, index));
  },

  each(obj, iteratee) {
    this.forEach(obj, iteratee);
  },

  filter(obj, predicate) {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (predicate(value, key, obj)) result[key] = value;
    });
    return result;
  },

  reject(obj, predicate) {
    const result = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (!predicate(value, key, obj)) result[key] = value;
    });
    return result;
  },

  every(obj, predicate) {
    return Object.entries(obj).every(([key, value]) => predicate(value, key, obj));
  },

  some(obj, predicate) {
    return Object.entries(obj).some(([key, value]) => predicate(value, key, obj));
  },

  includes(obj, value) {
    return Object.values(obj).includes(value);
  },

  findKey(obj, predicate) {
    for (const [key, value] of Object.entries(obj)) {
      if (predicate(value, key, obj)) return key;
    }
    return undefined;
  },

  findLastKey(obj, predicate) {
    const keys = Object.keys(obj);
    for (let i = keys.length - 1; i >= 0; i--) {
      const key = keys[i];
      if (predicate(obj[key], key, obj)) return key;
    }
    return undefined;
  },

  reduce(obj, iteratee, accumulator) {
    const entries = Object.entries(obj);
    if (entries.length === 0) return accumulator;
    let result = accumulator != null ? accumulator : entries[0][1];
    entries.forEach(([key, value], i) => {
      if (i > 0 || accumulator != null) {
        result = iteratee(result, value, key, obj);
      }
    });
    return result;
  },

  reduceRight(obj, iteratee, accumulator) {
    const entries = Object.entries(obj);
    if (entries.length === 0) return accumulator;
    let result = accumulator != null ? accumulator : entries[entries.length - 1][1];
    for (let i = entries.length - 1; i >= 0; i--) {
      if (i < entries.length - 1 || accumulator != null) {
        result = iteratee(result, entries[i][1], entries[i][0], obj);
      }
    }
    return result;
  },

  sortBy(obj, iteratee) {
    return Object.fromEntries(
      Object.entries(obj).sort((a, b) => {
        const aVal = typeof iteratee === "function" ? iteratee(a[1]) : a[1][iteratee];
        const bVal = typeof iteratee === "function" ? iteratee(b[1]) : b[1][iteratee];
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
      })
    );
  },

  sortByAll(obj, iteratees) {
    return Object.fromEntries(
      Object.entries(obj).sort((a, b) => {
        for (const iteratee of iteratees) {
          const aVal = typeof iteratee === "function" ? iteratee(a[1]) : a[1][iteratee];
          const bVal = typeof iteratee === "function" ? iteratee(b[1]) : b[1][iteratee];
          if (aVal < bVal) return -1;
          if (aVal > bVal) return 1;
        }
        return 0;
      })
    );
  },

  groupBy(obj, key) {
    const groups = {};
    Object.entries(obj).forEach(([k, v]) => {
      const groupKey = typeof key === "function" ? key(v) : v[key];
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(v);
    });
    return groups;
  },

  countBy(obj, key) {
    const counts = {};
    Object.entries(obj).forEach(([k, v]) => {
      const groupKey = typeof key === "function" ? key(v) : v[key];
      counts[groupKey] = (counts[groupKey] || 0) + 1;
    });
    return counts;
  },

  partition(obj, predicate) {
    const pass = {}, fail = {};
    Object.entries(obj).forEach(([key, value]) => {
      if (predicate(value, key, obj)) pass[key] = value;
      else fail[key] = value;
    });
    return [pass, fail];
  }
};

`;

fs.appendFileSync(filePath, appendBlock);
const stats = fs.statSync(filePath);
console.log("Added Section 48-52. File now has " + (stats.size / 1024).toFixed(1) + " KB.");
