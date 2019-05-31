if (typeof module !== 'object' || typeof module.exports !== 'object') {
    window.Nette = {
        noInit: true
    };
}

(function () {
  global = this

  var queueId = 1
  var queue = {}
  var isRunningTask = false

  if (!global.setImmediate)
    global.addEventListener('message', function (e) {
      if (e.source == global){
        if (isRunningTask)
          nextTick(queue[e.data])
        else {
          isRunningTask = true
          try {
            queue[e.data]()
          } catch (e) {}

          delete queue[e.data]
          isRunningTask = false
        }
      }
    })

  function nextTick(fn) {
    if (global.setImmediate) setImmediate(fn)
    // if inside of web worker
    else if (global.importScripts) setTimeout(fn)
    else {
      queueId++
      queue[queueId] = fn
      global.postMessage(queueId, '*')
    }
  }

  Deferred.resolve = function (value) {
    if (!(this._d == 1))
      throw TypeError()

    if (value instanceof Deferred)
      return value

    return new Deferred(function (resolve) {
        resolve(value)
    })
  }

  Deferred.reject = function (value) {
    if (!(this._d == 1))
      throw TypeError()

    return new Deferred(function (resolve, reject) {
        reject(value)
    })
  }

  Deferred.all = function (arr) {
    if (!(this._d == 1))
      throw TypeError()

    if (!(arr instanceof Array))
      return Deferred.reject(TypeError())

    var d = new Deferred()

    function done(e, v) {
      if (v)
        return d.resolve(v)

      if (e)
        return d.reject(e)

      var unresolved = arr.reduce(function (cnt, v) {
        if (v && v.then)
          return cnt + 1
        return cnt
      }, 0)

      if(unresolved == 0)
        d.resolve(arr)

      arr.map(function (v, i) {
        if (v && v.then)
          v.then(function (r) {
            arr[i] = r
            done()
            return r
          }, done)
      })
    }

    done()

    return d
  }

  Deferred.race = function (arr) {
    if (!(this._d == 1))
      throw TypeError()

    if (!(arr instanceof Array))
      return Deferred.reject(TypeError())

    if (arr.length == 0)
      return new Deferred()

    var d = new Deferred()

    function done(e, v) {
      if (v)
        return d.resolve(v)

      if (e)
        return d.reject(e)

      var unresolved = arr.reduce(function (cnt, v) {
        if (v && v.then)
          return cnt + 1
        return cnt
      }, 0)

      if(unresolved == 0)
        d.resolve(arr)

      arr.map(function (v, i) {
        if (v && v.then)
          v.then(function (r) {
            done(null, r)
          }, done)
      })
    }

    done()

    return d
  }

  Deferred._d = 1


  /**
   * @constructor
   */
  function Deferred(resolver) {
    'use strict'
    if (typeof resolver != 'function' && resolver != undefined)
      throw TypeError()

    if (typeof this != 'object' || (this && this.then))
      throw TypeError()

    // states
    // 0: pending
    // 1: resolving
    // 2: rejecting
    // 3: resolved
    // 4: rejected
    var self = this,
      state = 0,
      val = 0,
      next = [],
      fn, er;

    self['promise'] = self

    self['resolve'] = function (v) {
      fn = self.fn
      er = self.er
      if (!state) {
        val = v
        state = 1

        nextTick(fire)
      }
      return self
    }

    self['reject'] = function (v) {
      fn = self.fn
      er = self.er
      if (!state) {
        val = v
        state = 2

        nextTick(fire)

      }
      return self
    }

    self['_d'] = 1

    self['then'] = function (_fn, _er) {
      if (!(this._d == 1))
        throw TypeError()

      var d = new Deferred()

      d.fn = _fn
      d.er = _er
      if (state == 3) {
        d.resolve(val)
      }
      else if (state == 4) {
        d.reject(val)
      }
      else {
        next.push(d)
      }

      return d
    }

    self['catch'] = function (_er) {
      return self['then'](null, _er)
    }

    var finish = function (type) {
      state = type || 4
      next.map(function (p) {
        state == 3 && p.resolve(val) || p.reject(val)
      })
    }

    try {
      if (typeof resolver == 'function')
        resolver(self['resolve'], self['reject'])
    } catch (e) {
      self['reject'](e)
    }

    return self

    // ref : reference to 'then' function
    // cb, ec, cn : successCallback, failureCallback, notThennableCallback
    function thennable (ref, cb, ec, cn) {
      // Promises can be rejected with other promises, which should pass through
      if (state == 2) {
        return cn()
      }
      if ((typeof val == 'object' || typeof val == 'function') && typeof ref == 'function') {
        try {

          // cnt protects against abuse calls from spec checker
          var cnt = 0
          ref.call(val, function (v) {
            if (cnt++) return
            val = v
            cb()
          }, function (v) {
            if (cnt++) return
            val = v
            ec()
          })
        } catch (e) {
          val = e
          ec()
        }
      } else {
        cn()
      }
    };

    function fire() {

      // check if it's a thenable
      var ref;
      try {
        ref = val && val.then
      } catch (e) {
        val = e
        state = 2
        return fire()
      }

      thennable(ref, function () {
        state = 1
        fire()
      }, function () {
        state = 2
        fire()
      }, function () {
        try {
          if (state == 1 && typeof fn == 'function') {
            val = fn(val)
          }

          else if (state == 2 && typeof er == 'function') {
            val = er(val)
            state = 1
          }
        } catch (e) {
          val = e
          return finish()
        }

        if (val == self) {
          val = TypeError()
          finish()
        } else thennable(ref, function () {
            finish(3)
          }, finish, function () {
            finish(state == 1 && 3)
          })

      })
    }


  }

  // Export our library object, either for node.js or as a globally scoped variable
  if (typeof module != 'undefined') {
    module['exports'] = Deferred
  } else {
    global['Promise'] = global['Promise'] || Deferred
  }
})()

var _context = (function() {
    var t = {},
        api,
        loaded = [],
        loading = {},
        REQ_TIMEOUT = 30000,
        undefined,
        doc = document,
        elem = function(n) { return doc.createElement(n); },
        win = window,
        loc = win.history.location || win.location, // support for HTML5 history polyfill
        setTimeout = function(c, t) { return win.setTimeout(c, t); },
        clearTimeout = function(t) { return win.clearTimeout(t); },
        promise = Promise,
        resolver = null,
        nsStack = [],
        nonce = null,
        map = {
            names: [],
            classes: []
        };

    function resolveUrl(u) {
        resolver || (resolver = elem('a'));
        resolver.href = u;
        return resolver.href;
    }


    function isRelative(u) {
        try {
            var len = /^https?:\/\/.+?(\/|$)/i.exec(loc.href)[0].length;
            return u.substr(0, len) === loc.href.substr(0, len);

        } catch (err) {
            return false;

        }
    }

    var xhrFactory = (function(o, f) {
        while(o.length) {
            try {
                f = o.shift();
                f();

                return f;

            } catch (e) {}
        }

        return function() { throw new Error(); };

    })([
        function() { return new XMLHttpRequest(); },
        function() { return new ActiveXObject('Msxml2.XMLHTTP'); },
        function() { return new ActiveXObject('Msxml3.XMLHTTP'); },
        function() { return new ActiveXObject('Microsoft.XMLHTTP'); }
    ]);

    var xdrFactory = (function() {
        try {
            if ('withCredentials' in new XMLHttpRequest()) {
                return function() { return new XMLHttpRequest(); };

            } else if (win.XDomainRequest !== undefined) {
                return function() { return new win.XDomainRequest(); };

            }

        } catch (err) { }

        return function() { throw new Error(); };

    })();

    function xhr(u) {
        return new promise(function(fulfill, reject) {
            var req,
                m;

            if (isRelative(u)) {
                req = xhrFactory();

            } else {
                req = xdrFactory();

            }

            req.open('GET', u, true);

            var f = function () {
                m && clearTimeout(m);
                fulfill(req);
            };

            var r = function () {
                m && clearTimeout(m);
                reject(req);
            };

            if ('onsuccess' in req) {
                req.onsuccess = f;
                req.onerror = r;

            } else if (win.XDomainRequest !== undefined && req instanceof win.XDomainRequest) {
                req.onload = f;
                req.onerror = r;

            } else {
                req.onreadystatechange = function() {
                    if (req.readyState !== 4) {
                        return;

                    }

                    if (req.status === 200) {
                        f();

                    } else {
                        r();

                    }
                };
            }

            req.send();

            m = setTimeout(function() {
                if (req.readyState && req.readyState < 4) try {
                    req.abort();

                } catch (err) { }

                m = null;
                r();

            }, REQ_TIMEOUT);

        });
    }

    function resolveNonce() {
        if (nonce !== null) {
            return nonce;
        }

        var elems = document.getElementsByTagName('script'),
            i, n, elem;

        for (i = 0, n = elems.length; i < n; i++) {
            elem = elems.item(i);

            if (/^((application|text)\/javascript)?$/i.test(elem.type) && elem.nonce) {
                return nonce = elem.nonce;
            }
        }

        return nonce = false;
    }

    function exec(s, t, u) {
        var e, o = resolveNonce();

        if (!t) {
            if (u.match(/\.(?:less|css)/i)) {
                t = 'text/css';
            } else  {
                t = 'application/javascript';
            }
        } else {
            t = t.replace(/\s*;.*$/, '').toLowerCase();
        }

        if (t === 'text/css') {
            e = elem('style');
            e.type = t;
            o && e.setAttribute('nonce', o);

            u = u.replace(/[^\/]+$/, '');
            s = s.replace(/url\s*\((['"])?(?:\.\/)?(.+?)\1\)/, function (m, q, n) {
                q || (q = '"');

                if (n.match(/^(?:(?:https?:)?\/)?\//)) {
                    return 'url(' + q + n + q + ')';
                } else {
                    return 'url(' + q + resolveUrl(u + n) + q + ')';
                }
            });

            if (e.styleSheet) {
                e.styleSheet.cssText = s;
            } else {
                e.appendChild(doc.createTextNode(s));
            }

            doc.head.appendChild(e);

        } else {
            e = elem('script');
            e.type = t;
            e.text = s;
            o && e.setAttribute('nonce', o);
            doc.head.appendChild(e).parentNode.removeChild(e);
        }
    }

    function lookup(s, c) {
        var i = map.names.indexOf(s);

        if (i > -1) {
            return map.classes[i];

        }

        var r = t,
            p = s.split('.'),
            n;

        while (p.length) {
            n = p.shift();
            if (r[n] === undefined) {
                if (c) {
                    r[n] = {};

                } else {
                    throw new Error(s + ' not found in context');

                }
            }

            r = r[n];

        }

        map.names.push(s);
        map.classes.push(r);

        return r;

    }

    function lookupClass(o) {
        if (typeof o === 'object' && o.constructor !== Object) {
            o = o.constructor;

        }

        if (typeof o !== 'function' && typeof o !== 'object') {
            throw new Error('Cannot lookup class name of non-object');

        }

        var i = map.classes.indexOf(o);

        return i === -1 ? false : map.names[i];

    }

    function load() {
        var u, a, p = promise.resolve(true);

        for (a = 0; a < arguments.length; a++) {
            if (typeof arguments[a] === 'function') {
                p = p.then(function(f) {
                    return function () {
                        return invoke(f);

                    };
                }(arguments[a]));

            } else if (typeof arguments[a] === 'string') {
                u = resolveUrl(arguments[a]);

                if (loaded.indexOf(u) === -1) {
                    if (loading[u]) {
                        p = p.then(function (p) {
                            return function () {
                                return p;

                            };
                        }(loading[u]));
                    } else {
                        p = loading[u] = function (p, u) {
                            return new promise(function (f, r) {
                                xhr(u).then(function (xhr) {
                                    p.then(function () {
                                        exec(xhr.responseText, xhr.getResponseHeader('Content-Type'), u);
                                        delete loading[u];
                                        loaded.push(u);
                                        f();

                                    }, r);
                                });
                            });

                        }(p, u);
                    }
                }
            }
        }

        return a = {
            then: function (fulfilled, rejected) {
                p.then(function () {
                    fulfilled && invoke(fulfilled);
                }, function () {
                    rejected && invoke(rejected);
                });

                return a;

            }
        };
    }


    function invoke(ns, f, i) {
        if (i === undefined && typeof ns === 'function') {
            i = f;
            f = ns;
            ns = null;

        }

        if (ns) {
            nsStack.unshift(ns, ns = lookup(ns, true));

        } else {
            ns = t;
            nsStack.unshift(null, ns);

        }

        var params = f.length ? f.toString().match(/^function\s*\((.*?)\)/i)[1].split(/\s*,\s*/) : [],
            args = [],
            p, c, r;

        for (p = 0; p < params.length; p++) {
            if (params[p] === 'context') {
                args.push(api);

            } else if (params[p] === '_NS_') {
                args.push(ns);

            } else if (params[p] === 'undefined') {
                args.push(undefined);

            } else if (i !== undefined && params[p] in i) {
                c = i[params[p]];

                if (typeof c === 'string') {
                    c = lookup(c);

                }

                args.push(c);

            } else if (ns[params[p]] !== undefined) {
                args.push(ns[params[p]]);

            } else if (t[params[p]] !== undefined) {
                args.push(t[params[p]]);

            } else {
                throw new Error('"' + params[p] + '" not found in context');

            }
        }

        r = f.apply(ns, args);

        nsStack.shift();
        nsStack.shift();
        return r;

    }

    function register(constructor, name) {
        var ns = name.split(/\./g),
            key = ns.pop();

        if (ns.length) {
            ns = lookup(ns.join('.'), true);

        } else {
            if (nsStack.length && nsStack[0] !== null) {
                name = nsStack[0] + '.' + name;
                ns = nsStack[1];

            } else {
                ns = t;

            }
        }

        ns[key] = constructor;

        map.names.push(name);
        map.classes.push(constructor);
        return api;

    }

    function __ns() {
        if (arguments.length) {
            nsStack.unshift(arguments[0], arguments[1]);

        } else {
            nsStack.shift();
            nsStack.shift();
        }
    }

    function extend(parent, constructor, proto) {
        if (!proto) {
            proto = constructor;
            constructor = parent;
            parent = null;

        }

        if (!parent) {
            parent = Object;

        } else if (typeof parent === 'string') {
            parent = lookup(parent);

        }

        var tmp = function () {};
        tmp.prototype = parent.prototype;
        constructor.prototype = new tmp();
        constructor.prototype.constructor = constructor;
        constructor.Super = parent;

        if (proto) {
            if (proto.hasOwnProperty('STATIC') && proto.STATIC) {
                copyProps(constructor, proto.STATIC);

            }

            copyProps(constructor.prototype, proto);

        }

        return constructor;

    }

    function mixin(target, source, map) {
        if (typeof target === 'string') {
            target = lookup(target);

        }

        if (typeof source === 'string') {
            source = lookup(source);

        }

        if (source.hasOwnProperty('STATIC') && source.STATIC) {
            merge(target, source.STATIC);

        }

        copyProps(target.prototype, source, map);
        return target;

    }

    function copyProps(target, source, map) {
        var key;

        for (key in source) {
            if (source.hasOwnProperty(key) && key !== 'STATIC') {
                target[map && key in map ? map[key] : key] = source[key];

            }
        }
    }

    function merge(a, b) {
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                if (!a.hasOwnProperty(key)) {
                    a[key] = b[key];

                } else if (typeof a[key] === 'object' && typeof b[key] === 'object') {
                    if (!a[key]) {
                        a[key] = b[key];

                    } else if (b[key]) {
                        merge(a[key], b[key]);

                    }
                } else {
                    a[key] = b[key];

                }
            }
        }
    }

    return api = {
        lookup: lookup,
        lookupClass: lookupClass,
        invoke: invoke,
        load: load,
        extend: extend,
        mixin: mixin,
        register: register,
        __ns: __ns
    };

})();

_context.invoke('Utils', function(undefined) {

    var Strings = {
        applyModifiers: function(s) {
            var f = Array.prototype.slice.call(arguments, 1),
                i = 0,
                a, m;

            for (; i < f.length; i++) {
                a = f[i].split(':');
                m = a.shift();
                a.unshift(s);
                s = Strings[m].apply(Strings, a);

            }

            return s;

        },

        toString: function(s) {
            return s === undefined ? 'undefined' : (typeof s === 'string' ? s : (s.toString !== undefined ? s.toString() : Object.prototype.toString.call(s)));

        },

        sprintf: function(s) {
            return Strings.vsprintf(s, Array.prototype.slice.call(arguments, 1));

        },

        vsprintf: function(s, args) {
            var n = 0;

            return s.replace(/%(?:(\d+)\$)?(\.\d+|\[.*?:.*?\])?([idsfa%])/g, function(m, a, p, f) {
                if (f === '%') {
                    return f;

                }

                a = a ? parseInt(a) - 1 : n++;

                if (args[a] === undefined) {
                    throw new Error('Missing parameter #' + (a + 1));

                }

                a = args[a];

                switch (f) {
                    case 's':
                        return Strings.toString(a);

                    case 'i':
                    case 'd':
                        return parseInt(a);

                    case 'f':
                        a = parseFloat(a);

                        if (p && p.match(/^\.\d+$/)) {
                            a = a.toFixed(parseInt(p.substr(1)));

                        }

                        return a;

                    case 'a':
                        p = p && p.match(/^\[.*:.*\]$/) ? p.substr(1, p.length - 2).split(':') : [', ', ', '];
                        return a.length === 0 ? '' : a.slice(0, -1).join(p[0]) + (a.length > 1 ? p[1] : '') + a[a.length - 1];

                }

                return m;

            });
        },

        webalize: function(s, chars, ws) {
            if (ws) {
                s = s.replace(/\s+/g, '_');

            }

            s = s.replace(new RegExp('[^_A-Za-z\u00C0-\u017F' + Strings.escapeRegex(chars || '').replace(/\\-/g, '-') + ']+', 'g'), '-');

            return Strings.trim(s, '_-');

        },

        escapeRegex: function(s) {
            return s.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");

        },

        split: function(s, re, offsetCapture, noEmpty, delimCapture) {
            if (re instanceof RegExp) {
                re = new RegExp(re.source, [re.ignoreCase ? 'i' : '', re.multiline ? 'm' : '', 'g'].filter(function(v) { return !!v; }).join(''))

            } else {
                re = new RegExp(re, 'g');

            }

            var r = [],
                len = 0;

            s = s.replace(re, function(m, p, ofs) {
                ofs = arguments[arguments.length - 2];
                p = s.substring(len, ofs);

                if (p.length && !p.match(/^[\t ]+$/) || !noEmpty) {
                    r.push(offsetCapture ? [p, len] : s.substring(len, ofs));

                }

                if (delimCapture && (m.length && !m.match(/^[\t ]+$/) || !noEmpty)) {
                    r.push(offsetCapture ? [m, ofs] : m);

                }

                len = ofs + m.length;

                return m;

            });

            if (len < s.length || !noEmpty) {
                s = s.substring(len);
                (!noEmpty || (s.length && !s.match(/^[\t ]+$/))) && r.push(offsetCapture ? [s, len] : s);

            }

            return r;

        },

        trim: function(s, c) {
            return Strings._trim(s, c, true, true);

        },

        trimLeft: function(s, c) {
            return Strings._trim(s, c, true, false);

        },

        trimRight: function(s, c) {
            return Strings._trim(s, c, false, true);

        },

        _trim: function (s, c, l, r) {
            if (!c) {
                c = " \t\n\r\0\x0B\xC2\xA0";

            }

            var re = [];
            c = '[' + Strings.escapeRegex(c) + ']+';
            l && re.push('^', c);
            l && r && re.push('|');
            r && re.push(c, '$');

            return s.replace(new RegExp(re.join(''), 'ig'), '');

        },

        firstUpper: function(s) {
            return s.substr(0, 1).toUpperCase() + s.substr(1);

        },

        compare: function(a, b, len) {
            if (typeof a !== "string" || typeof b !== 'string') {
                return false;

            }

            if (!len) {
                len = Math.min(a.length, b.length);

            }

            return a.substr(0, len).toLowerCase() === b.substr(0, len).toLowerCase();

        },

        contains: function(h, n) {
            return h.indexOf(n) !== -1;

        },

        isNumeric: function(s) {
            return Object.prototype.toString.call(s) !== '[object Array]' && (s - parseFloat(s) + 1) >= 0;

        },

        escapeHtml: function(s) {
            return s
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#039;');

        },

        nl2br: function(s, collapse) {
            return s.replace(collapse ? /\n+/g : /\n/g, '<br />');

        },

        random: function(len, chars) {
            chars = (chars || 'a-z0-9').replace(/.-./g, function(m, a, b) {
                a = m.charCodeAt(0);
                b = m.charCodeAt(2);
                var n = Math.abs(b - a),
                    c = new Array(n),
                    o = Math.min(a, b),
                    i = 0;

                for (; i <= n; i++) {
                    c[i] = o + i;
                }

                return String.fromCharCode.apply(null, c);

            });

            len || (len = 8);

            var s = new Array(len),
                n = chars.length - 1,
                i;

            for (i = 0; i < len; i++) {
                s[i] = chars[Math.round(Math.random() * n)];

            }

            return s.join('');

        }
    };

    _context.register(Strings, 'Strings');

});

_context.invoke('Utils', function(undefined) {

    var Arrays = {
        isArrayLike: function(a) {
            return typeof a === 'object' && a.length !== undefined;

        },

        shuffle: function (a) {
            var c = a.length, t, i;

            // While there are elements in the array
            while (c--) {
                // Pick a random index
                i = (Math.random() * c) | 0;

                // And swap the last element with it
                t = a[c];
                a[c] = a[i];
                a[i] = t;
            }

            return a;

        },

        createFrom: function(a, s, e) {
            if (a.length === undefined) {
                throw new Error('Invalid argument, only array-like objects can be supplied');

            }

            return Array.prototype.slice.call(a, s || 0, e || a.length);

        },

        getKeys: function(a) {
            var keys = [], k;

            if (Array.isArray(a)) {
                for (k = 0; k < a.length; k++) {
                    keys.push(k);

                }
            } else {
                for (k in a) {
                    keys.push(k);

                }
            }

            return keys;

        },

        filterKeys: function() {
            var args = Arrays.createFrom(arguments),
                t = args.shift(),
                a, i, r = {}, rem;

            rem = function(k) {
                if (r[k] === undefined) {
                    r[k] = t[k];
                    delete t[k];

                }
            };

            while (args.length) {
                a = args.shift();

                if (typeof a === 'object') {
                    if (a instanceof Array) {
                        for (i = 0; i < a.length; i++) {
                            rem(a[i]);

                        }
                    } else {
                        for (i in a) {
                            rem(i);

                        }
                    }
                } else {
                    rem(a);

                }
            }
        },

        getValues: function(a) {
            var arr = [], k;

            for (k in a) {
                arr.push(a[k]);

            }

            return arr;

        },

        merge: function() {
            var args = Arrays.createFrom(arguments),
                a = args.shift(),
                r = false,
                b, i;

            if (typeof a === 'boolean') {
                r = a;
                a = args.shift();

            }

            if (!a) {
                a = [];
            }

            while (args.length) {
                b = args.shift();
                if (b instanceof Array) {
                    for (i = 0; i < b.length; i++) {
                        if (r && typeof b[i] === 'object' && Object.prototype.toString.call(b[i]) === '[object Object]') {
                            a.push(Arrays.mergeTree(r, {}, b[i]));

                        } else {
                            a.push(b[i]);

                        }
                    }
                }
            }

            return a;

        },

        mergeTree: function() {
            var r = false,
                args = Arrays.createFrom(arguments),
                ofs = 1,
                t = args.shift(),
                props = [];

            if (typeof t === 'boolean') {
                r = t;
                t = args.shift();
                ofs = 2;

            }

            while (args.length) {
                var o = args.pop(),
                    p, a, i;

                if (typeof o !== 'object' || o === null) {
                    continue;

                }

                if (!t) {
                    t = {};

                }

                for (p in o) {
                    if (!o.hasOwnProperty(p) || props.indexOf(p) !== -1) {
                        continue;

                    }

                    if (typeof o[p] === 'object') {
                        if (r) {
                            if (o[p] instanceof Array) {
                                a = [r, t[p] || null];

                                for (i = ofs; i < arguments.length; i++) {
                                    a.push(arguments[i][p] || null);

                                }

                                t[p] = Arrays.merge.apply(this, a);

                            } else {
                                a = [r, null];

                                for (i = ofs; i < arguments.length; i++) {
                                    a.push(arguments[i] ? arguments[i][p] || null : null);

                                }

                                t[p] = Arrays.mergeTree.apply(this, a) || t[p];

                            }

                        } else {
                            t[p] = t[p] === undefined ? o[p] : (o[p] === null ? t[p] : o[p]);

                        }
                    } else {
                        t[p] = o[p];

                    }

                    props.push(p);

                }
            }

            return t;

        },

        walk: function(r, a, f) {
            if (typeof r !== "boolean") {
                f = a;
                a = r;
                r = false;
            }

            var i,
                p = function(k, v) {
                    if (r && (v instanceof Array || v instanceof Object)) {
                        Arrays.walk(r, v, f);

                    } else {
                        f.call(v, k, v);

                    }
                };

            if (a instanceof Array) {
                for (i = 0; i < a.length; i++) {
                    p(i, a[i]);

                }
            } else if (a instanceof Object) {
                for (i in a) {
                    p(i, a[i]);

                }
            } else {
                p(null, a);

            }
        }
    };

    _context.register(Arrays, 'Arrays');

});

_context.invoke('Utils', function (Arrays, undefined) {

    var HashMap = _context.extend(function (src) {
        this._ = {
            keys: [],
            values: [],
            nonNumeric: 0,
            nextNumeric: 0
        };

        if (src) {
            this.merge(src);

        }
    }, {
        STATIC: {
            from: function (data, keys) {
                if (!keys) {
                    return data instanceof HashMap ? data.clone() : new HashMap(data);

                } else if (!Array.isArray(keys)) {
                    throw new Error('Invalid argument supplied to HashMap.from(): the second argument must be an array');

                }

                var map = new HashMap(),
                    i, n = keys.length,
                    k,
                    arr = Array.isArray(data);

                for (i = 0; i < n; i++) {
                    k = arr ? i : keys[i];

                    if (data[k] !== undefined) {
                        map.set(keys[i], data[k]);

                    }
                }

                return map;

            }
        },

        length: 0,

        isList: function () {
            return this._.nonNumeric === 0;

        },

        clone: function (deep) {
            var o = new HashMap();
            o._.keys = this._.keys.slice();
            o._.nextNumeric = this._.nextNumeric;
            o.length = this.length;

            if (deep) {
                o._.values = this._.values.map(function (v) {
                    return v instanceof HashMap ? v.clone(deep) : v;
                });
            } else {
                o._.values = this._.values.slice();

            }

            return o;

        },

        merge: function (src) {
            if (src instanceof HashMap || Array.isArray(src)) {
                src.forEach(function(value, key) { this.set(key, value); }, this);

            } else if (typeof src === 'object' && src !== null) {
                for (var k in src) {
                    if (src.hasOwnProperty(k)) {
                        this.set(k, src[k]);

                    }
                }
            } else {
                throw new TypeError('HashMap.merge() expects the first argument to be an array or an object, ' + (typeof src) + ' given');

            }

            return this;

        },

        append: function (src) {
            if (src instanceof HashMap || Array.isArray(src)) {
                src.forEach(function (value, key) {
                    if (typeof key === 'number') {
                        this.push(value);

                    } else {
                        this.set(key, value);

                    }
                }, this);
            } else {
                this.merge(src);

            }

            return this;

        },

        push: function (value) {
            for (var i = 0; i < arguments.length; i++) {
                this._.keys.push(this._.nextNumeric);
                this._.values.push(arguments[i]);
                this._.nextNumeric++;
                this.length++;

            }

            return this;

        },

        pop: function () {
            if (!this.length) {
                return null;

            }

            var k = this._.keys.pop();

            if (typeof k === 'number') {
                if (k + 1 === this._.nextNumeric) {
                    this._.nextNumeric--;

                }
            } else {
                this._.nonNumeric--;

            }

            this.length--;
            return this._.values.pop();

        },

        shift: function () {
            if (!this.length) {
                return null;

            }

            if (typeof this._.keys[0] === 'number') {
                this._.nextNumeric--;
                this._shiftKeys(1, this.length, -1);

            } else {
                this._.nonNumeric--;

            }

            this.length--;
            this._.keys.shift();
            return this._.values.shift();

        },

        unshift: function (value) {
            var values = Arrays.createFrom(arguments),
                n = values.length,
                i = 0,
                keys = new Array(n);

            while (i < n) {
                keys[i] = i++;
            }

            keys.unshift(0, 0);
            values.unshift(0, 0);

            this._shiftKeys(0, this.length, n);
            this._.keys.splice.apply(this._.keys, keys);
            this._.values.splice.apply(this._.values, values);
            this._.nextNumeric += n;
            this.length += n;
            return this;

        },

        slice: function (from, to) {
            (from === undefined) && (from = 0);
            (from < 0) && (from += this.length);
            (to === undefined) && (to = this.length);
            (to < 0) && (to += this.length);

            var o = new HashMap();

            o._.keys = this._.keys.slice(from, to).map(function(k) {
                if (typeof k === 'number') {
                    k = o._.nextNumeric;
                    o._.nextNumeric++;
                    return k;

                } else {
                    o._.nonNumeric++;
                    return k;

                }
            });

            o._.values = this._.values.slice(from, to);
            o.length = o._.keys.length;

            return o;

        },

        splice: function (from, remove) {
            var values = Arrays.createFrom(arguments),
                keys = values.slice().map(function() { return -1; }),
                removed, i;

            keys[0] = values[0];
            keys[1] = values[1];

            this._.keys.splice.apply(this._.keys, keys);
            removed = this._.values.splice.apply(this._.values, values);

            this.length = this._.keys.length;
            this._.nextNumeric = 0;
            this._.nonNumeric = 0;

            for (i = 0; i < this.length; i++) {
                if (typeof this._.keys[i] === 'number') {
                    this._.keys[i] = this._.nextNumeric;
                    this._.nextNumeric++;

                } else {
                    this._.nonNumeric++;

                }
            }

            return removed;

        },

        'set': function (key, value) {
            var i = this._.keys.indexOf(key);

            if (i === -1) {
                this._.keys.push(key);
                this._.values.push(value);
                this.length++;

                if (typeof key === 'number') {
                    if (key >= this._.nextNumeric) {
                        this._.nextNumeric = key + 1;

                    }
                } else {
                    this._.nonNumeric++;

                }
            } else {
                this._.values[i] = value;

            }

            return this;

        },

        'get': function (key, need) {
            var i = this._.keys.indexOf(key);

            if (i > -1) {
                return this._.values[i];

            } else if (need) {
                throw new RangeError('Key ' + key + ' not present in HashMap');

            }

            return null;

        },

        has: function (key) {
            var index = this._.keys.indexOf(key);
            return index > -1 && this._.values[index] !== undefined;

        },

        remove: function (key, strict) {
            var index = this._.keys.indexOf(key);

            if (index > -1) {
                this._.keys.splice(index, 1);
                this._.values.slice(index, 1);
                this.length--;

                if (typeof key === 'number') {
                    if (key + 1 === this._.nextNumeric) {
                        this._.nextNumeric--;
                    }
                } else {
                    this._.nonNumeric--;
                }
            } else if (strict) {
                throw new RangeError('Key ' + key + ' not present in HashMap');
            }

            return this;
        },

        forEach: function (callback, thisArg) {
            for (var i = 0; i < this.length; i++) {
                callback.call(thisArg || null, this._.values[i], this._.keys[i], this);

            }

            return this;

        },

        map: function (callback, recursive, thisArg) {
            return this.clone(recursive).walk(callback, recursive, thisArg);

        },

        walk: function (callback, recursive, thisArg) {
            for (var i = 0; i < this.length; i++) {
                if (recursive && this._.values[i] instanceof HashMap) {
                    this._.values[i].walk(callback, recursive, thisArg);

                } else {
                    this._.values[i] = callback.call(thisArg || null, this._.values[i], this._.keys[i], this);

                }
            }

            return this;

        },

        find: function (predicate, thisArg) {
            var i = this._find(predicate, thisArg, true);
            return i === false ? null : this._.values[i];

        },

        findKey: function (predicate, thisArg) {
            var i = this._find(predicate, thisArg, true);
            return i === false ? null : this._.keys[i];

        },

        some: function (predicate, thisArg) {
            return this._find(predicate, thisArg, true) !== false;

        },

        all: function (predicate, thisArg) {
            return this._find(predicate, thisArg, false) === false;

        },

        filter: function (predicate, thisArg) {
            var o = new HashMap(),
                i;

            for (i = 0; i < this.length; i++) {
                if (predicate.call(thisArg || null, this._.values[i], this._.keys[i], this)) {
                    if (typeof this._.keys[i] === 'number') {
                        o.push(this._.values[i]);

                    } else {
                        o.set(this._.keys[i], this._.values[i]);

                    }
                }
            }

            return o;

        },

        exportData: function () {
            if (this.isList()) {
                return this.getValues().map(function(v) {
                    return v instanceof HashMap ? v.exportData() : v;

                });
            }

            for (var i = 0, r = {}; i < this.length; i++) {
                if (this._.values[i] instanceof HashMap) {
                    r[this._.keys[i]] = this._.values[i].exportData();

                } else {
                    r[this._.keys[i]] = this._.values[i];

                }
            }

            return r;

        },

        getKeys: function () {
            return this._.keys.slice();

        },

        getValues: function () {
            return this._.values.slice();

        },

        _shiftKeys: function (from, to, diff) {
            while (from < to) {
                if (typeof this._.keys[from] === 'number') {
                    this._.keys[from] += diff;

                }

                from++;

            }
        },

        _find: function (predicate, thisArg, expect) {
            for (var i = 0; i < this.length; i++) {
                if (predicate.call(thisArg || null, this._.values[i], this._.keys[i], this) === expect) {
                    return i;

                }
            }

            return false;

        }
    });

    _context.register(HashMap, 'HashMap');

});

_context.invoke('Utils', function(Strings, undefined) {

    var location = window.history.location || window.location; // support for HTML5 history polyfill

    var Url = function(s) {
        if (s === null || s === '' || s === undefined) {
            this._ = {
                protocol: location.protocol,
                hostname: location.hostname,
                port: location.port,
                path: location.pathname,
                params: Url.parseQuery(location.search),
                hash: location.hash
            };

            extractAuthInfo(location.href, this._);
        } else {
            s += '';

            var proto = Url.RE_PROTOCOL.exec(s),
                auth,
                i;

            this._ = {
                protocol: proto ? proto[1] || location.protocol : location.protocol
            };

            if (proto) {
                if (proto[2] && proto[3] || proto[4]) {
                    s = s.substr(proto[0].length);
                    auth = Url.RE_AUTHORITY.exec(s) || [''];
                    s = s.substr(auth[0].length);
                    this._.username = auth[1] || '';
                    this._.password = auth[2] || '';
                    this._.hostname = auth[3] || '';
                    this._.port = auth[4] || '';
                } else {
                    this._.username
                        = this._.password
                        = this._.hostname
                        = this._.port
                        = this._.path
                        = this._.hash
                        = '';

                    this._.params = {};
                    return;
                }
            } else {
                this._.username = '';
                this._.password = '';
                this._.hostname = location.hostname;
                this._.port = location.port;
            }

            if ((i = s.indexOf('#')) > -1) {
                this._.hash = s.substr(i);
                s = s.substr(0, i);
            } else {
                this._.hash = '';
            }

            if ((i = s.indexOf('?')) > -1) {
                this._.params = Url.parseQuery(s.substr(i + 1));
                s = s.substr(0, i);
            } else {
                this._.params = {};
            }

            this._.path = s || '/';
        }
    };

    Url.prototype.getProtocol = function() {
        return this._.protocol;

    };

    Url.prototype.getUsername = function() {
        return this._.username;

    };

    Url.prototype.getPassword = function() {
        return this._.password;

    };

    Url.prototype.getHostname = function() {
        return this._.hostname;

    };

    Url.prototype.getPort = function() {
        return this._.port;

    };

    Url.prototype.getAuthority = function() {
        var a = '';

        if (this._.username) {
            if (this._.password) {
                a += this._.username + ':' + this._.password + '@';

            } else {
                a += this._.username + '@';

            }
        }

        a += this._.hostname;

        if (this._.port) {
            a += ':' + this._.port;

        }

        return a;

    };

    Url.prototype.getOrigin = function () {
        return this._.protocol + '//' + this._.hostname + (this._.port ? ':' + this._.port : '');
    };

    Url.prototype.getPath = function() {
        return this._.path;

    };

    Url.prototype.getQuery = function() {
        var q = Url.buildQuery(this._.params);
        return q.length ? '?' + q : '';

    };

    Url.prototype.getParam = function(n) {
        return this._.params[n];

    };

    Url.prototype.hasParam = function(n) {
        return this._.params[n] !== undefined;

    };

    Url.prototype.getParams = function() {
        return this._.params;

    };

    Url.prototype.getHash = function() {
        return this._.hash;

    };


    Url.prototype.setProtocol = function(protocol) {
        this._.protocol = protocol ? Strings.trimRight(protocol, ':') + ':' : '';
        return this;

    };

    Url.prototype.setUsername = function(username) {
        this._.username = username;
        return this;

    };

    Url.prototype.setPassword = function(password) {
        this._.password = password;
        return this;

    };

    Url.prototype.setHostname = function(hostname) {
        this._.hostname = hostname;
        return this;

    };

    Url.prototype.setPort = function(port) {
        this._.port = port;
        return this;

    };

    Url.prototype.setPath = function(path) {
        this._.path = path ? '/' + Strings.trimLeft(path, '/') : '';
        return this;

    };

    Url.prototype.setQuery = function(query) {
        this._.params = Url.parseQuery(query);
        return this;

    };

    Url.prototype.setParam = function(n, v) {
        this._.params[n] = v;
        return this;

    };

    Url.prototype.addParams = function(p) {
        if (Array.isArray(p) && (p.length && 'name' in p[0] && 'value' in p[0])) {
            p = Url.parseQuery(Url.buildQuery(p, true));
        }

        for (var k in p) {
            if (p[k] !== undefined) {
                this._.params[k] = p[k];
            }
        }

        return this;

    };

    Url.prototype.getParams = function () {
        return this._.params;

    };

    Url.prototype.setParams = function(p) {
        this._.params = {};
        this.addParams(p);
        return this;

    };

    Url.prototype.removeParam = function(n) {
        delete this._.params[n];
        return this;

    };

    Url.prototype.setHash = function(hash) {
        this._.hash = hash ? '#' + Strings.trimLeft(hash, '#') : '';
        return this;

    };


    Url.prototype.toAbsolute = function() {
        return this._.protocol + '//' + this.getAuthority() + this._.path + this.getQuery() + this._.hash;

    };

    Url.prototype.toLocal = function () {
        return this._.path + this.getQuery() + this._.hash;

    };

    Url.prototype.toRelative = function(to) {
        to = Url.from(to || location.href);

        if (to.getProtocol() !== this.getProtocol()) {
            return this.toAbsolute();

        }

        if (to.getAuthority() !== this.getAuthority()) {
            return '//' + this.getAuthority() + this.getPath() + this.getQuery() + this.getHash();

        }

        if (to.getPath() !== this.getPath()) {
            return Url.getRelativePath(to.getPath(), this.getPath()) + this.getQuery() + this.getHash();

        }

        var qto = to.getQuery(), qthis = this.getQuery();
        if (qto !== qthis) {
            return qthis + this.getHash();

        }

        return to.getHash() === this.getHash() ? '' : this.getHash();

    };

    Url.prototype.toString = function() {
        return this.toAbsolute();

    };

    Url.prototype.isLocal = function() {
        return this.compare(Url.fromCurrent()) < Url.PART.PORT;

    };

    Url.prototype.compare = function(to) {
        if (!(to instanceof Url)) {
            to = Url.from(to);

        }

        var r = 0;

        this.getProtocol() !== to.getProtocol() && (r |= Url.PART.PROTOCOL);
        this.getUsername() !== to.getUsername() && (r |= Url.PART.USERNAME);
        this.getPassword() !== to.getPassword() && (r |= Url.PART.PASSWORD);
        this.getHostname() !== to.getHostname() && (r |= Url.PART.HOSTNAME);
        this.getPort() !== to.getPort() && (r |= Url.PART.PORT);
        this.getPath() !== to.getPath() && (r |= Url.PART.PATH);
        this.getQuery() !== to.getQuery() && (r |= Url.PART.QUERY);
        this.getHash() !== to.getHash() && (r |= Url.PART.HASH);

        return r;

    };

    Url.RE_PROTOCOL = /^((?:(https?)|[a-z][a-z0-9.+-]*):)(\/\/)?|^(\/\/)/i;
    Url.RE_AUTHORITY = /^(?:([^@:]+?)(?::([^@]+))?@)?([^:\/]+)(?::(\d+))?/;

    Url.PART = {
        PROTOCOL: 128,
        USERNAME: 64,
        PASSWORD: 32,
        HOSTNAME: 16,
        PORT: 8,
        PATH: 4,
        QUERY: 2,
        HASH: 1
    };

    Url.from = function(s) {
        return s instanceof Url ? new Url(s.toAbsolute()) : new Url(s);
    };

    Url.fromCurrent = function() {
        return new Url();
    };

    Url.getDirName = function (path) {
        return path.replace(/(^|\/)[^\/]*$/, '');

    };

    Url.getRelativePath = function(from, to) {
        from = Strings.trimLeft(from, '/').split('/');
        from.pop(); // last element is either a file or empty because the previous element is a directory

        if (!to.match(/^\//)) {
            return to.replace(/^\.\//, '');

        }

        to = Strings.trimLeft(to, '/').split('/');

        var e = 0,
            f,
            t,
            o = [],
            n = Math.min(from.length, to.length);

        for (; e < n; e++) {
            if (from[e] !== to[e]) {
                break;

            }
        }

        for (f = e; f < from.length; f++) {
            o.push('..');

        }

        for (t = e; t < to.length; t++) {
            o.push(to[t]);

        }

        return o.join('/');

    };

    Url.buildQuery = function(data, pairs) {
        var q = [], n;

        function en(v) {
            return encodeURIComponent(v).replace(/%20/g, '+');
        }

        function val(v) {
            if (v === undefined) {
                return null;

            } else if (typeof v === 'boolean') {
                return v ? 1 : 0;

            } else {
                return en('' + v);

            }
        }

        function flatten(a, n) {
            var r = [], i;

            if (Array.isArray(a)) {
                for (i = 0; i < a.length; i++) {
                    r.push(en(n + '[]') + '=' + val(a[i]));

                }
            } else {
                for (i in a) {
                    if (typeof a[i] === 'object') {
                        r.push(flatten(a[i], n + '[' + i + ']'));

                    } else {
                        r.push(en(n + '[' + i + ']') + '=' + val(a[i]));

                    }
                }
            }

            return r.length ? r.filter(function(v) { return v !== null }).join('&') : null;

        }

        for (n in data) {
            if (data[n] === null || data[n] === undefined) {
                continue;

            } else if (pairs) {
                q.push(en(data[n].name) + '=' + val(data[n].value));

            } else if (typeof data[n] === 'object') {
                q.push(flatten(data[n], n));

            } else {
                q.push(en(n) + '=' + val(data[n]));

            }
        }

        return q.filter(function(v) { return v !== null; }).join('&');

    };

    Url.parseQuery = function(s) {
        if (s.match(/^\??$/)) {
            return {};

        }

        s = Strings.trimLeft(s, '?').split('&');

        var p = {}, a = false, c, d, k, i, m, n, v;

        function dec(v) {
            return decodeURIComponent(v.replace(/\+/g,' '));
        }

        function convertType(v) {
            var c;

            if (v.match(/^(?:[1-9]\d*|0)$/) && (c = parseInt(v)) + '' === v) {
                return c;

            } else if (v.match(/^\d*\.\d+$/) && (c = parseFloat(v)) + '' === v) {
                return c;

            }

            return v;

        }

        for (i = 0; i < s.length; i++) {
            m = s[i].split('=');
            n = dec(m.shift());
            v = convertType(dec(m.join('=')));

            if (n.indexOf('[') !== -1) {
                n = n.replace(/\]/g, '');
                d = n.split('[');
                c = p;
                a = false;

                if (n.match(/\[$/)) {
                    d.pop();
                    a = true;

                }

                n = d.pop();

                while (d.length) {
                    k = d.shift();

                    if (c[k] === undefined) {
                        c[k] = {};

                    }

                    c = c[k];

                }

                if (a) {
                    if (c[n] === undefined) {
                        c[n] = [v];

                    } else {
                        c[n].push(v);

                    }
                } else {
                    c[n] = v;

                }
            } else {
                p[n] = v;

            }
        }

        return p;

    };


    function extractAuthInfo(url, onto) {
        url = url.replace(Url.RE_PROTOCOL, '');

        var tmp = url.indexOf('@');

        if (tmp > -1) {
            tmp = url.substr(0, tmp).split(':', 2);
            onto.username = tmp[0];
            onto.password = tmp[1] || '';
        } else {
            onto.username = onto.password = '';
        }
    }

    _context.register(Url, 'Url');

});

_context.invoke('Utils', function (Arrays, Strings, undefined) {

    /****** Utilities *******/

    function map(args, callback) {
        args = Arrays.createFrom(args);

        if (Array.isArray(args[0])) {
            for (var i = 0, elems = args[0], ret = []; i < elems.length; i++) {
                args[0] = getElem(elems[i]);

                if (args[0]) {
                    ret.push(callback.apply(null, args));

                } else {
                    ret.push(args[0]);

                }
            }

            return ret;

        } else {
            args[0] = getElem(args[0]);

            if (args[0]) {
                return callback.apply(null, args);

            } else {
                return args[0];

            }
        }
    }

    function getElem(elem) {
        if (Array.isArray(elem) || elem instanceof HTMLCollection || elem instanceof NodeList) {
            elem = elem[0];

        }

        return typeof elem === 'string' ? DOM.getById(elem) : elem;

    }

    function getPrefixed(elem, prop) {
        elem = getElem(elem);

        if (!elem || prop in elem.style) {
            return prop;

        }


        var p = prop.charAt(0).toUpperCase() + prop.substr(1),
            variants = ['webkit' + p, 'moz' + p, 'o' + p, 'ms' + p],
            i;

        for (i = 0; i < variants.length; i++) {
            if (variants[i] in elem.style) {
                return variants[i];

            }
        }

        return prop;

    }

    function parseData(value) {
        if (!value) return null;

        try {
            return JSON.parse(value);

        } catch (e) {
            return value;

        }
    }




    /******* CustomEvent support in IE9+ ******/

    if (typeof window.CustomEvent !== 'function') {
        window.CustomEvent = function(event, params) {
            params = params || { bubbles: false, cancelable: false, detail: undefined };
            var evt = document.createEvent('CustomEvent');
            evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
            return evt;
        };

        window.CustomEvent.prototype = window.Event.prototype;

    }

    var knownEventModules = {
        MouseEvent: {
            create: function(type, params) {
                params.view || (params.view = window);
                return new MouseEvent(type, params);
            },
            init: function(event, type, params) {
                event.initMouseEvent(
                    type,
                    params.bubbles,
                    params.cancelable,
                    params.view || window,
                    params.detail || 1,
                    params.screenX || 0,
                    params.screenY || 0,
                    params.clientX || 0,
                    params.clientY || 0,
                    params.ctrlKey || false,
                    params.altKey || false,
                    params.shiftKey || false,
                    params.metaKey || false,
                    params.button || 1,
                    params.relatedTarget
                );
            }
        },
        KeyboardEvent: {
            create: function(type, params) { return new KeyboardEvent(type, params); },
            init: function(event, type, params) {
                var modifiers = [];
                params.ctrlKey && modifiers.push('Control');
                params.shiftKey && modifiers.push('Shift');
                params.altKey && modifiers.push('Alt');
                params.metaKey && modifiers.push('Meta');
                event.initKeyboardEvent(type, params.bubbles, params.cancelable, params.view || window, params.key || '', params.location || 0, modifiers.join(' '));
            }
        },
        FocusEvent: {
            create: function(type, params) { return new FocusEvent(type, params); },
            init: function(event, type, params) {
                event.initUIEvent(type, params.bubbles, params.cancelable, params.view || window, params.detail || 0);
            },
            name: 'UIEvent'
        },
        HTMLEvents: {
            create: function(type, params) { return new Event(type, params); },
            init: function(event, type, params) {
                event.initEvent(type, params.bubbles, params.cancelable);
            }
        },
        CustomEvent: {
            create: function(type, params) { return new CustomEvent(type, params); },
            init: function(event, type, params) {
                event.initCustomEvent(type, params.bubbles, params.cancelable, params.detail);
            }
        }
    };

    var knownEvents = {
        click: 'MouseEvent',
        dblclick: 'MouseEvent',
        mousedown: 'MouseEvent',
        mouseenter: 'MouseEvent',
        mouseleave: 'MouseEvent',
        mousemove: 'MouseEvent',
        mouseout: 'MouseEvent',
        mouseover: 'MouseEvent',
        mouseup: 'MouseEvent',
        contextmenu: 'MouseEvent',
        keydown: 'KeyboardEvent',
        keypress: 'KeyboardEvent',
        keyup: 'KeyboardEvent',
        focus: 'FocusEvent',
        blur: 'FocusEvent',
        change: 'HTMLEvents',
        submit: 'HTMLEvents',
        reset: 'HTMLEvents'
    };

    var containers = {
        caption: 'table',
        colgroup: 'table',
        col: 'colgroup',
        thead: 'table',
        tbody: 'table',
        tfoot: 'table',
        tr: 'tbody',
        th: 'tr',
        td: 'tr',
        li: 'ul',
        optgroup: 'select',
        option: 'select'
    };



    /******* Public interface *******/

    var DOM = {
        getByClassName: function (className, context) {
            return Arrays.createFrom((context || document).getElementsByClassName(className));

        },

        getById: function (id) {
            return document.getElementById(id);

        },

        find: function (sel, context) {
            var elems = [];
            sel = sel.trim().split(/\s*,\s*/g);

            sel.forEach(function (s) {
                var m = s.match(/^#([^\s\[>+:.]+)\s+\.([^\s\[>+:]+)$/);

                if (m) {
                    elems.push.apply(elems, DOM.getByClassName(m[2], DOM.getById(m[1])));
                    return;

                } else if (s.match(/^[^.#]|[\s\[>+:]/)) {
                    throw new TypeError('Invalid selector "' + s + '", only single-level .class and #id or "#id .class" are allowed');

                }

                if (s.charAt(0) === '#') {
                    m = DOM.getById(s.substr(1));

                    if (m) {
                        elems.push(m);

                    }
                } else {
                    m = DOM.getByClassName(s.substr(1), context);
                    elems.push.apply(elems, m);

                }
            });

            return elems;

        },

        getChildren: function (elem) {
            return Arrays.createFrom(elem.childNodes || '').filter(function (node) {
                return node.nodeType === 1;

            });
        },

        closest: function (elem, nodeName, className) {
            return map(arguments, function (elem, nodeName, className) {
                while (elem) {
                    if (elem.nodeType === 1 && (!nodeName || elem.nodeName.toLowerCase() === nodeName) && (!className || DOM.hasClass(elem, className))) {
                        return elem;

                    }

                    elem = elem.parentNode;

                }

                return null;
            });
        },

        create: function (elem, attrs) {
            elem = document.createElement(elem);

            if (attrs) {
                DOM.setAttributes(elem, attrs);

            }

            return elem;

        },

        createFromHtml: function (html) {
            var container,
                elems;

            if (container = html.match(/^\s*<(caption|colgroup|col|thead|tbody|tfoot|tr|th|td|li|optgroup|option)[\s>]/i)) {
                container = containers[container[1].toLowerCase()];
            }

            container = DOM.create(container || 'div');
            DOM.html(container, html);
            elems = DOM.getChildren(container);

            elems.forEach(function (e) {
                container.removeChild(e);
            });

            container = null;

            return elems.length > 1 ? elems : elems[0];

        },

        setAttributes: function (elem, attrs) {
            return map([elem], function (elem) {
                for (var a in attrs) {
                    if (attrs.hasOwnProperty(a)) {
                        elem.setAttribute(a, attrs[a]);

                    }
                }

                return elem;

            });
        },

        setStyle: function (elem, prop, value, prefix) {
            if (prop && typeof prop === 'object') {
                prefix = value;
                value = prop;

                for (prop in value) {
                    if (value.hasOwnProperty(prop)) {
                        DOM.setStyle(elem, prop, value[prop], prefix);

                    }
                }

                return elem;

            }

            if (prefix !== false) {
                prop = getPrefixed(elem, prop);

            }

            return map([elem], function (elem) {
                elem.style[prop] = value;

            });
        },

        getStyle: function(elem, props, prefix) {
            if (!Array.isArray(props)) {
                props = props.split(/\s+/g);
            }

            var prefixed = props;

            if (prefix !== false) {
                prefixed = props.map(function(prop) {
                    return getPrefixed(elem, prop);
                });
            }

            return map([elem], function(elem) {
                var style = window.getComputedStyle(elem);

                if (props.length === 1) {
                    return style[prefixed[0]];

                } else {
                    var res = {};

                    props.forEach(function(prop, i) {
                        res[prop] = style[prefixed[i]];

                    });

                    return res;

                }
            });
        },

        getStyleFloat: function(elem, props, prefix) {
            if (!Array.isArray(props)) {
                props = props.split(/\s+/g);
            }

            var style = DOM.getStyle(elem, props, prefix),
                refloat = /^(\d+|\d*\.\d+)(px|m?s)?$/;

            function normalizeValue(v) {
                var m = refloat.exec(v);

                if (m) {
                    v = parseFloat(m[1]);

                    if (m[2] === 's') {
                        v *= 1000;

                    }
                }

                return v;

            }

            function stylePropsToFloat(style) {
                if (props.length === 1) {
                    return normalizeValue(style);

                } else {
                    props.forEach(function(prop) {
                        style[prop] = normalizeValue(style[prop]);

                    });

                    return style;

                }
            }

            if (Array.isArray(style)) {
                return style.map(stylePropsToFloat);

            } else {
                return stylePropsToFloat(style);

            }
        },

        html: function (elem, html) {
            return map([elem], function (elem) {
                elem.innerHTML = html;

                Arrays.createFrom(elem.getElementsByTagName('script')).forEach(function (elem) {
                    var type = elem.type ? elem.type.toLowerCase() : null;

                    if (!type || type === 'text/javascript' || type === 'application/javascript') {
                        var load = elem.hasAttribute('src'),
                            src = load ? elem.src : (elem.text || elem.textContent || elem.innerHTML || ''),
                            attrs = {}, i,
                            script;

                        for (i = 0; i < elem.attributes.length; i++) {
                            if (elem.attributes.item(i).name !== 'src') {
                                attrs[elem.attributes.item(i).name] = elem.attributes.item(i).value;
                            }
                        }

                        script = DOM.create('script', attrs);

                        if (load) {
                            script.src = src;

                        } else {
                            try {
                                script.appendChild(document.createTextNode(src));

                            } catch (e) {
                                script.text = src;

                            }
                        }

                        elem.parentNode.insertBefore(script, elem);
                        elem.parentNode.removeChild(elem);

                    }
                });
            });
        },

        text: function (str) {
            if (arguments.length > 1) {
                if (Array.isArray(arguments[1])) {
                    str = Strings.vsprintf(str, arguments[1]);
                } else {
                    str = Arrays.createFrom(arguments).join(' ');
                }
            }

            return document.createTextNode(str);
        },

        empty: function(elem) {
            return map(arguments, function (elem) {
                while (elem.firstChild) {
                    elem.removeChild(elem.firstChild);
                }
            });
        },

        append: function (elem, children) {
            elem = getElem(elem);
            children = Array.isArray(children) ? children : Arrays.createFrom(arguments, 1);

            children.forEach(function(child) {
                elem.appendChild(child);
            });

            return elem;

        },

        prepend: function (elem, children) {
            elem = getElem(elem);
            children = Array.isArray(children) ? children : Arrays.createFrom(arguments, 1);

            var first = elem.firstChild;

            children.forEach(function(child) {
                elem.insertBefore(child, first);
            });

            return elem;

        },

        insertBefore: function(before, elem) {
            var elems = Array.isArray(elem) ? elem : Arrays.createFrom(arguments, 1),
                parent;

            before = getElem(before);
            parent = before.parentNode;

            elems.forEach(function(elem) {
                parent.insertBefore(elem, before);
            });

            return before;

        },

        contains: function( a, b ) {
            var adown = a.nodeType === 9 ? a.documentElement : a,
                bup = b && b.parentNode;

            return a === bup || !!( bup && bup.nodeType === 1 && (
                    adown.contains
                        ? adown.contains( bup )
                        : a.compareDocumentPosition && a.compareDocumentPosition( bup ) & 16
                ));
        },

        addListener: function (elem, evt, listener, capture) {
            return map(arguments, function (elem, evt, listener, capture) {
                elem.addEventListener(evt, listener, !!capture);
                return elem;

            });
        },
        removeListener: function (elem, evt, listener, capture) {
            return map(arguments, function (elem, evt, listener, capture) {
                elem.removeEventListener(evt, listener, !!capture);
                return elem;

            });
        },

        trigger: function (elem, evt, params) {
            if (!(elem = getElem(elem))) {
                return;
            }
            
            var module = knownEvents[evt] || 'CustomEvent',
                event;
            
            params || (params = {});
            'bubbles' in params || (params.bubbles = true);
            'cancelable' in params || (params.cancelable = true);

            try {
                event = knownEventModules[module].create(evt, params);
            } catch (e) {
                event = document.createEvent(knownEventModules[module].name || module);
                knownEventModules[module].init(event, evt, params);
            }

            return elem.dispatchEvent(event);
        },

        delegate: function(sel, handler) {
            sel = sel
                .trim()
                .split(/\s*,\s*/g)
                .map(function(s) {
                    var m = s.match(/^(?:(?:#([^\s\[>+:.]+)\s+)?\.([^\s\[>+:]+)|#([^\s\[>+:.]+))$/);
                    return [m[1] || m[3], m[2]];
                });

            return function(evt) {
                if (!evt.target) {
                    return;
                }

                var elems = [],
                    ids = [],
                    classes = [],
                    found = [],
                    elem = evt.target,
                    i, j;

                do {
                    elems.push(elem);
                    ids.push(elem.id);
                    classes.push(((elem.className || '') + '').trim().split(/\s+/g));
                } while (elem = elem.parentNode);

                for (i = 0; i < elems.length; i++) {
                    for (j = 0; j < sel.length; j++) {
                        if ((!sel[j][1] || classes[i].indexOf(sel[j][1]) > -1) && (!sel[j][0] || (!sel[j][1] ? ids[i] === sel[j][0] : ids.indexOf(sel[j][0]) > i))) {
                            found.push(elems[i]);
                        }
                    }
                }

                for (i = 0; i < found.length; i++) {
                    handler.call(found[i], evt, found[i]);
                }
            };
        },

        getData: function (elem, key, def) {
            elem = getElem(elem);
            key = 'data-' + key;

            if (!elem.hasAttribute(key)) {
                return def;
            }

            return parseData(elem.getAttribute(key));

        },
        setData: function (elem, key, value) {
            return map([elem], function (elem) {
                elem.setAttribute('data-' + key, JSON.stringify(value));
                return elem;

            });
        },

        addClass: null,
        removeClass: null,
        toggleClass: null,
        hasClass: null
    };


    var testElem = DOM.create('span'),
        prepare = function(args, asStr) {
            args = Arrays.createFrom(args, 1).join(' ').trim();
            return asStr ? args : args.split(/\s+/g);
        };

    if ('classList' in testElem) {
        testElem.classList.add('c1', 'c2');

        if (testElem.classList.contains('c2')) {
            DOM.addClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    elem.classList.add.apply(elem.classList, classes);
                    return elem;

                });
            };

            DOM.removeClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    elem.classList.remove.apply(elem.classList, classes);
                    return elem;

                });
            };
        } else {
            DOM.addClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    classes.forEach(function (c) {
                        elem.classList.add(c);

                    });

                    return elem;

                });
            };

            DOM.removeClass = function (elem, classes) {
                classes = prepare(arguments);

                return map([elem], function (elem) {
                    classes.forEach(function (c) {
                        elem.classList.remove(c);

                    });

                    return elem;

                });
            };
        }

        testElem.classList.toggle('c1', true);

        if (testElem.classList.contains('c1')) {
            DOM.toggleClass = function (elem, classes, value) {
                classes = classes.trim().split(/\s+/g);

                return map([elem], function (elem) {
                    if (value === undefined) {
                        classes.forEach(function (c) {
                            elem.classList.toggle(c);

                        });
                    } else {
                        classes.forEach(function (c) {
                            elem.classList.toggle(c, !!value);

                        });
                    }

                    return elem;

                });
            };
        } else {
            DOM.toggleClass = function (elem, classes, value) {
                classes = classes.trim().split(/\s+/g);

                return map([elem], function (elem) {
                    classes.forEach(function (c) {
                        if (value === undefined || !value === elem.classList.contains(c)) {
                            elem.classList.toggle(c);

                        }
                    });

                    return elem;

                });
            };
        }

        DOM.hasClass = function (elem, classes) {
            elem = getElem(elem);
            classes = prepare(arguments);

            for (var i = 0; i < classes.length; i++) {
                if (!elem.classList.contains(classes[i])) {
                    return false;

                }
            }

            return true;

        };
    } else {
        DOM.addClass = function (elem, classes) {
            classes = prepare(arguments, true);

            return map([elem], function (elem) {
                elem.className += (elem.className ? ' ' : '') + classes;
                return elem;

            });
        };

        DOM.removeClass = function (elem, classes) {
            classes = prepare(arguments).map(Strings.escapeRegex);

            return map([elem], function (elem) {
                if (!elem.className) return elem;

                elem.className = elem.className.replace(new RegExp('(?:(?:^|\\s+)(?:' + classes.join('|') + '))+(?=\\s+|$)', 'g'), ' ').trim().replace(/\s\s+/g, ' ');
                return elem;

            });
        };

        DOM.toggleClass = function (elem, classes, value) {
            classes = classes.trim().split(/\s+/g);

            return map([elem], function (elem) {
                var current = (elem.className || '').trim().split(/\s+/g);

                classes.forEach(function (c) {
                    var i = current.indexOf(c),
                        has = i > -1;

                    if (value !== false && !has) {
                        current.push(c);

                    } else if (value !== true && has) {
                        current.splice(i, 1);

                    }
                });

                elem.className = current.join(' ');
                return elem;

            });
        };

        DOM.hasClass = function (elem, classes) {
            elem = getElem(elem);
            if (!elem.className) return false;
            classes = prepare(arguments);

            var current = elem.className.trim().split(/\s+/g);

            for (var i = 0; i < classes.length; i++) {
                if (current.indexOf(classes[i]) === -1) {
                    return false;

                }
            }

            return true;

        };
    }

    testElem = null;

    _context.register(DOM, 'DOM');

});

_context.invoke('Utils', function (DOM) {

    var CSSTransitions = {
        support: 'getComputedStyle' in window,

        getDuration: function (elements) {
            if (!Array.isArray(elements)) {
                elements = [elements];
            }

            var durations = DOM.getStyle(elements, 'animationDuration')
                .concat(DOM.getStyle(elements, 'transitionDuration'))
                .map(function(d) {
                    if (!d) {
                        return 0;
                    }

                    return Math.max.apply(null, d.split(/\s*,\s*/g).map(function(v) {
                        v = v.match(/^((?:\d*\.)?\d+)(m?s)$/);
                        return v ? parseFloat(v[1]) * (v[2] === 'ms' ? 1 : 1000) : 0;

                    }));
                });

            return durations.length ? Math.max.apply(null, durations) : 0;

        },

        run: function(elements, classes, forceLayout) {
            if (!CSSTransitions.support || (Array.isArray(elements) ? !elements.length : !elements)) {
                return Promise.resolve(elements);

            } else {
                return CSSTransitions._resolve(elements, classes, forceLayout);

            }
        },

        _resolve: function (elements, classes, forceLayout) {
            if (forceLayout) {
                var foo = window.pageXOffset; // needed to force layout and thus run asynchronously

            }

            classes && classes.add && DOM.addClass(elements, classes.add);
            classes && classes.remove && DOM.removeClass(elements, classes.remove);

            var duration = CSSTransitions.getDuration(elements);

            return new Promise(function (fulfill) {
                window.setTimeout(function () {
                    classes && classes.add && DOM.removeClass(elements, classes.add);
                    classes && classes.after && DOM.addClass(elements, classes.after);
                    fulfill(elements);

                }, duration);
            });
        }
    };

    if (CSSTransitions.support) try {
        var s = DOM.create('span').style;

        CSSTransitions.support = [
            'transition',
            'WebkitTransition',
            'MozTransition',
            'msTransition',
            'OTransition'
        ].some(function(prop) {
            return prop in s;
        });

        s = null;

    } catch (e) { }

    _context.register(CSSTransitions, 'CSSTransitions');

});

_context.invoke('Utils', function(undefined) {

    var ReflectionClass = function(c) {
        this._ = {
            reflectedClass: typeof c === "string" ? ReflectionClass.getClass(c) : c
        };
    };

    ReflectionClass.from = function(c) {
        return c instanceof ReflectionClass ? c : new ReflectionClass(c);

    };

    ReflectionClass.getClass = function(name) {
        return _context.lookup(name);

    };

    ReflectionClass.getClassName = function(obj, need) {
        var className = _context.lookupClass(obj);

        if (className === false && need) {
            throw new Error('Unknown class');

        }

        return className;

    };

    ReflectionClass.prototype.hasProperty = function(name) {
        return this._.reflectedClass.prototype[name] !== undefined && typeof this._.reflectedClass.prototype[name] !== "function";

    };

    ReflectionClass.prototype.hasMethod = function(name) {
        return this._.reflectedClass.prototype[name] !== undefined && typeof this._.reflectedClass.prototype[name] === "function";

    };

    ReflectionClass.prototype.newInstance = function() {
        return this.newInstanceArgs(arguments);

    };

    ReflectionClass.prototype.newInstanceArgs = function(args) {
        var inst, ret, tmp = function() {};
        tmp.prototype = this._.reflectedClass.prototype;
        inst = new tmp();
        ret = this._.reflectedClass.apply(inst, args);

        return Object(ret) === ret ? ret : inst;

    };

    _context.register(ReflectionClass, 'ReflectionClass');

});

_context.invoke('Utils', function(Arrays, undefined) {

    var ReflectionFunction = function(f) {
        this._ = {
            reflectedFunction: f,
            argsList: null,
            name: null
        };

        var parts = f.toString()
            .match(/^\s*function(?:\s*|\s+([^\(]+?)\s*)\(\s*([\s\S]*?)\s*\)/i);

        this._.name = parts[1] || null;
        this._.argsList = !parts[2] ? [] : parts[2]
            .replace(/\/\*\*?[\s\S]*?\*\//g, '')
            .trim()
            .split(/\s*,\s*/);

    };

    ReflectionFunction.from = function(f) {
        return f instanceof ReflectionFunction ? f : new ReflectionFunction(f);

    };

    ReflectionFunction.prototype.getName = function () {
        return this._.name;

    };

    ReflectionFunction.prototype.getArgs = function () {
        return this._.argsList;

    };

    ReflectionFunction.prototype.invoke = function(context) {
        var args = Arrays.createFrom(arguments);
        args.shift();

        return this._.reflectedFunction.apply(context, args);

    };

    ReflectionFunction.prototype.invokeArgs = function(context, args) {
        var list = [];
        for (var i = 0; i < this._.argsList.length; i++) {
            if (args[this._.argsList[i]] === undefined) {
                throw new Error('Parameter "' + this._.argsList[i] + '" was not provided in argument list');

            }

            list.push(args[this._.argsList[i]]);

        }

        return this._.reflectedFunction.apply(context, list);

    };

    _context.register(ReflectionFunction, 'ReflectionFunction');

});

_context.invoke('Nittro', function () {

    function prepare (self, need) {
        if (!self._) {
            if (need === false) return false;
            self._ = {};

        }

        if (!self._.eventEmitter) {
            if (need === false) return false;

            self._.eventEmitter = {
                listeners: {},
                defaultListeners: {},
                namespaces: []
            };
        }
    }

    function prepareNamespaces (emitter, namespaces) {
        return namespaces.map(function (ns) {
            var i = emitter.namespaces.indexOf(ns);

            if (i > -1) return i;

            i = emitter.namespaces.length;
            emitter.namespaces.push(ns);

            return i;

        });
    }

    function hasCommonElement (a, b) {
        var i = 0, j = 0;

        while (i < a.length && j < b.length) {
            if (a[i] < b[j]) i++;
            else if (a[i] > b[j]) j++;
            else return true;

        }

        return false;

    }

    function process (emitter, evt, op, arg1, arg2) {
        evt = (evt || '').replace(/^\s+|\s+$/g, '').split(/\s+/g);

        evt.forEach(function (e) {
            var dflt = e.split(/:/),
                ns = dflt[0].split(/\./g);

            e = ns.shift();
            ns = prepareNamespaces(emitter, ns);
            ns.sort();
            op(emitter, e, ns, dflt[1] === 'default', arg1, arg2);

        });
    }

    function add (emitter, evt, ns, dflt, handler, mode) {
        if (!evt) {
            throw new TypeError('No event specified');
        }

        if (dflt) {
            if (mode !== 0 || ns.length) {
                throw new TypeError("Default event handlers don't support namespaces and one()/first()");

            } else if (emitter.defaultListeners.hasOwnProperty(evt)) {
                throw new TypeError("Event '" + evt + "' already has a default listener");

            }

            emitter.defaultListeners[evt] = handler;
            return;

        }

        if (mode === 2) {
            ns.unshift(emitter.namespaces.length);

        }

        emitter.listeners[evt] || (emitter.listeners[evt] = []);
        emitter.listeners[evt].push({handler: handler, namespaces: ns, mode: mode});

    }

    function remove (emitter, evt, ns, dflt, handler) {
        if (!evt) {
            var listeners = dflt ? emitter.defaultListeners : emitter.listeners;

            for (evt in listeners) {
                if (listeners.hasOwnProperty(evt)) {
                    remove(emitter, evt, ns, dflt, handler);

                }
            }

            return;

        }

        if (dflt) {
            if (emitter.defaultListeners.hasOwnProperty(evt) && (!handler || emitter.defaultListeners[evt] === handler)) {
                delete emitter.defaultListeners[evt];

            }

            return;

        }

        if (!emitter.listeners[evt]) return;

        if (ns.length) {
            emitter.listeners[evt] = emitter.listeners[evt].filter(function (listener) {
                if (handler && listener.handler !== handler) return true;
                return !listener.namespaces.length || !hasCommonElement(listener.namespaces, ns);

            });
        } else if (handler) {
            emitter.listeners[evt] = emitter.listeners[evt].filter(function (listener) {
                return listener.handler !== handler;

            });
        } else {
            if (emitter.listeners.hasOwnProperty(evt)) {
                delete emitter.listeners[evt];

            }

            if (emitter.defaultListeners.hasOwnProperty(evt)) {
                delete emitter.defaultListeners[evt];

            }
        }
    }

    function trigger (self, evt, data) {
        var e, _ = self._.eventEmitter;

        if (typeof evt === "object") {
            e = evt;
            evt = e.type;
        } else {
            e = new NittroEvent(self, evt, data);
        }

        if (_.listeners.hasOwnProperty(evt)) {
            _.listeners[evt].slice().forEach(function (listener) {
                if (listener.mode === 1) {
                    remove(_, evt, [], false, listener.handler);

                } else if (listener.mode === 2) {
                    remove(_, '', [listener.namespaces[0]], false);

                }

                listener.handler.call(self, e);

            });
        }

        if (e.isAsync()) {
            e.then(function () {
                triggerDefault(self, _, evt, e);
            }, function() { /* no default handler on async reject */ });
        } else {
            triggerDefault(self, _, evt, e);
        }

        return e;

    }

    function triggerDefault (self, _, evt, e) {
        if (!e.isDefaultPrevented() && _.defaultListeners.hasOwnProperty(evt)) {
            _.defaultListeners[evt].call(self, e);
        }
    }

    var NittroEventEmitter = {
        on: function (evt, handler) {
            prepare(this);
            process(this._.eventEmitter, evt, add, handler, 0);
            return this;

        },

        one: function (evt, handler) {
            prepare(this);
            process(this._.eventEmitter, evt, add, handler, 1);
            return this;

        },

        first: function (evt, handler) {
            prepare(this);
            process(this._.eventEmitter, evt, add, handler, 2);
            this._.eventEmitter.namespaces.push(null);
            return this;

        },

        off: function (evt, handler) {
            if (prepare(this, false) === false) return this;
            process(this._.eventEmitter, evt, remove, handler);
            return this;

        },

        trigger: function (evt, data) {
            prepare(this);
            return trigger(this, evt, data);

        }
    };

    var NittroEvent = _context.extend(function (target, type, data) {
        this.target = target;
        this.type = type;
        this.data = data || {};

        this._ = {
            defaultPrevented: false,
            async: false,
            queue: null,
            promise: null
        };
    }, {
        preventDefault: function () {
            this._.defaultPrevented = true;
            return this;
        },

        isDefaultPrevented: function () {
            return this._.defaultPrevented;
        },

        waitFor: function (promise) {
            if (this._.promise) {
                throw new Error('The event\'s queue has already been frozen');
            }

            this._.queue || (this._.queue = []);
            this._.queue.push(promise);
            this._.async = true;
            return this;
        },

        isAsync: function () {
            return this._.async;
        },

        then: function (onfulfilled, onrejected) {
            if (!this._.promise) {
                this._.promise = this._.queue ? Promise.all(this._.queue) : Promise.resolve();
                this._.queue = null;
            }

            return this._.promise.then(onfulfilled, onrejected);
        }
    });

    _context.register(NittroEventEmitter, 'EventEmitter');
    _context.register(NittroEvent, 'Event');

});

_context.invoke('Nittro', function () {

    var prepare = function (self, need) {
        if (!self._) {
            if (need === false) return false;
            self._ = {};

        }

        if (!self._.hasOwnProperty('frozen')) {
            if (need === false) return false;
            self._.frozen = false;

        }
    };

    var Freezable = {
        freeze: function () {
            prepare(this);
            this._.frozen = true;
            return this;

        },

        isFrozen: function () {
            if (prepare(this, false) === false) {
                return false;

            }

            return this._.frozen;

        },

        _updating: function (prop) {
            if (prepare(this, false) === false) {
                return this;

            }

            if (this._.frozen) {
                var className = _context.lookupClass(this) || 'object';

                if (prop) {
                    prop = ' "' + prop + '"';

                }

                throw new Error('Cannot update property' + prop + ' of a frozen ' + className);

            }

            return this;

        }
    };


    _context.register(Freezable, 'Freezable');

});

_context.invoke('Nittro', function () {

    var Object = _context.extend(function () {
        this._ = { };

    }, {

    });

    _context.mixin(Object, 'Nittro.EventEmitter');
    _context.register(Object, 'Object');

});

_context.invoke('Utils', function (Utils, undefined) {

    var DateInterval = function (interval, locale) {
        this._ = {
            initialized: false,
            interval: interval,
            locale: locale || Utils.DateTime.defaultLocale
        };
    };

    DateInterval.from = function (interval, locale) {
        return new DateInterval(interval, locale);

    };

    var intervals = [
        'year', 'month', 'week', 'day', 'hour', 'minute', 'second', 'millisecond'
    ];

    var intervalLengths = {
        year: 31536000000,
        month: 2678400000,
        week: 604800000,
        day: 86400000,
        hour: 3600000,
        minute: 60000,
        second: 1000,
        millisecond: 1
    };

    function getValue(interval) {
        if (typeof interval === 'number') {
            return interval;
        } else if (interval instanceof DateInterval) {
            return interval.getLength();
        } else {
            return DateInterval.from(interval).getLength();
        }
    }

    DateInterval.prototype.add = function (interval) {
        this._initialize();
        this._.interval += getValue(interval);
        return this;

    };

    DateInterval.prototype.subtract = function (interval) {
        this._initialize();
        this._.interval -= getValue(interval);
        return this;

    };

    DateInterval.prototype.isNegative = function () {
        this._initialize();
        return this._.interval < 0;

    };

    DateInterval.prototype.getLength = function () {
        this._initialize();
        return this._.interval;

    };

    DateInterval.prototype.valueOf = function () {
        return this.getLength();

    };


    function formatAuto(interval, precision, locale) {
        if (precision === true) {
            precision = 8;

        } else if (!precision) {
            precision = 2;

        }

        var i, v, str = [], last, sign = '';

        if (interval < 0) {
            sign = '-';
            interval = -interval;

        }

        intervals.some(function (i) {
            if (interval >= intervalLengths[i]) {
                precision--;
                v = interval / intervalLengths[i];
                v = precision === 0 ? Math.round(v) : Math.floor(v);
                str.push(v + ' ' + Utils.DateTime.i18n.getInterval(locale, i, v));
                interval -= v * intervalLengths[i];

                if (precision === 0) {
                    return true;

                }
            }
        });

        if (str.length > 2) {
            last = str.pop();
            return sign + str.join(', ') + ' ' + Utils.DateTime.i18n.getConjuction(locale) + ' ' + last;

        } else {
            return sign + str.join(' ' + Utils.DateTime.i18n.getConjuction(locale) + ' ');

        }
    }

    function format(interval, pattern) {
        var sign = interval < 0 ? '-' : '+';
        interval = Math.abs(interval);

        return (pattern + '').replace(/%(.)/g, function (m, f) {
            var v, pad = false;

            switch (f) {
                case '%':
                    return '%';

                case 'y':
                    m = intervalLengths.year;
                    break;

                case 'w':
                    m = intervalLengths.week;
                    break;

                case 'm':
                    pad = true;
                case 'n':
                    m = intervalLengths.month;
                    break;

                case 'd':
                    pad = true;
                case 'j':
                    m = intervalLengths.day;
                    break;

                case 'H':
                    pad = true;
                case 'G':
                    m = intervalLengths.hour;
                    break;

                case 'i':
                    pad = true;
                case 'I':
                    m = intervalLengths.minute;
                    break;

                case 's':
                    pad = true;
                case 'S':
                    m = intervalLengths.second;
                    break;

                case '-':
                    return sign === '-' ? sign : '';

                case '+':
                    return sign;

                default:
                    throw new Error('Unknown format modifier: %' + f);

            }

            v = Math.floor(interval / m);
            interval -= m * v;
            return pad && v < 10 ? '0' + v : v;

        });
    }

    DateInterval.prototype.format = function (pattern) {
        this._initialize();

        if (typeof pattern === 'boolean' || typeof pattern === 'number' || !pattern) {
            return formatAuto(this._.interval, pattern, this._.locale);

        } else {
            return format(this._.interval, pattern);

        }
    };

    DateInterval.prototype._initialize = function () {
        if (this._.initialized) {
            return;
        }

        this._.initialized = true;

        if (typeof this._.interval === 'number') {
            return;

        }

        var interval = this._.interval;

        if (interval instanceof DateInterval) {
            this._.interval = interval.getLength();

        } else if (typeof interval === 'string') {
            if (interval.match(/^\s*(?:\+|-)?\s*\d+\s*$/)) {
                this._.interval = parseInt(interval.trim());

            } else {
                var res = 0,
                    rest;

                rest = interval.replace(Utils.DateTime.i18n.getIntervalParser(this._.locale), function (_, sign, n, y, m, w, d, h, i, s, u) {
                    sign = sign === '-' ? -1 : 1;

                    n = parseInt(n) * sign;

                    y && (n *= intervalLengths.year);
                    m && (n *= intervalLengths.month);
                    w && (n *= intervalLengths.week);
                    d && (n *= intervalLengths.day);
                    h && (n *= intervalLengths.hour);
                    i && (n *= intervalLengths.minute);
                    s && (n *= intervalLengths.second);
                    u && (n *= intervalLengths.millisecond);

                    res += n;

                    return '';

                });

                if (rest.length) {
                    throw new Error('Invalid interval specification "' + interval + '", didn\'t understand "' + rest + '"');

                }

                this._.interval = res;

            }
        } else {
            throw new Error('Invalid interval specification, expected string, number or a DateInterval instance');

        }
    };

    _context.register(DateInterval, 'DateInterval');

});

_context.invoke('Utils', function(Strings, Arrays, DateInterval, undefined) {

	var DateTime = function(d, locale) {
		this._ = {
			initialized: false,
			date: d || new Date(),
            locale: locale || DateTime.defaultLocale
		};
	};

	DateTime.defaultLocale = 'en';

	DateTime.from = function(s, locale) {
		return new DateTime(s, locale);

	};

	DateTime.now = function () {
		return new DateTime();
	};

	DateTime.isDateObject = function(o) {
		return typeof o === 'object' && o && o.date !== undefined && o.timezone !== undefined && o.timezone_type !== undefined;

	};

	DateTime.isLeapYear = function(y) {
		return y % 4 === 0 && y % 100 !== 0 || y % 400 === 0;

	};

    DateTime.isModifyString = function (str, locale) {
        return DateTime.i18n.getParser(locale || DateTime.defaultLocale).test(str);
    };

	DateTime.getDaysInMonth = function(m, y) {
	    while (m < 0) { m += 12; y--; }
	    while (m > 12) { m -= 12; y++; }
		return m === 1 ? (DateTime.isLeapYear(y) ? 29 : 28) : (m in {3:1,5:1,8:1,10:1} ? 30 : 31);

	};

	var ni = function() { throw new Error('Not implemented!'); },
		pad = function(n) {
			return (n < 10) ? '0' + n : n;
		};

	var formatTz = function (offset) {
		if ((typeof offset === 'string' || offset instanceof String) && offset.match(/(\+|-)\d\d:\d\d/)) {
			return offset;

		}

		if (typeof offset !== 'number') {
			offset = parseInt(offset);

		}

		return (offset < 0 ? '+' : '-') + pad(parseInt(Math.abs(offset) / 60)) + ':' + pad(Math.abs(offset) % 60)

	};

	DateTime.getLocalTzOffset = function () {
		return formatTz(new Date().getTimezoneOffset());

	};

	DateTime.formatModifiers = {
		d: function(d, u) { return pad(u ? d.getUTCDate() : d.getDate()); },
		D: function(d, u, o) { return DateTime.i18n.getWeekday(o, u ? d.getUTCDay() : d.getDay(), true); },
		j: function(d, u) { return u ? d.getUTCDate() : d.getDate(); },
		l: function(d, u, o) { return DateTime.i18n.getWeekday(o, u ? d.getUTCDay() : d.getDay()); },
		N: function(d, u, n) { n = u ? d.getUTCDay() : d.getDay(); return n === 0 ? 7 : n; },
		S: function(d, u, n) { n = u ? d.getUTCDate() : d.getDate(); n %= 10; return n === 0 || n > 3 ? 'th' : ['st', 'nd', 'rd'][n - 1]; },
		w: function(d, u) { return u ? d.getUTCDay() : d.getDay(); },
		z: function(d, u, n, m, y, M) { n = u ? d.getUTCDate() : d.getDate(); n--; y = u ? d.getUTCFullYear() : d.getFullYear(); m = 0; M = u ? d.getUTCMonth() : d.getMonth(); while (m < M) n += DateTime.getDaysInMonth(m++, y); return n; },
		W: ni,
		F: function(d, u, o) { return DateTime.i18n.getMonth(o, u ? d.getUTCMonth() : d.getMonth()); },
		m: function(d, u) { return pad((u ? d.getUTCMonth() : d.getMonth()) + 1); },
		M: function(d, u, o) { return DateTime.i18n.getMonth(o, u ? d.getUTCMonth() : d.getMonth(), true); },
		n: function(d, u) { return (u ? d.getUTCMonth() : d.getMonth()) + 1; },
		t: function(d, u) { return DateTime.getDaysInMonth(u ? d.getUTCMonth() : d.getMonth(), u ? d.getUTCFullYear() : d.getFullYear()); },
		L: function(d, u) { return DateTime.isLeapYear(u ? d.getUTCFullYear() : d.getFullYear()) ? 1 : 0; },
		o: ni,
		Y: function(d, u) { return u ? d.getUTCFullYear() : d.getFullYear(); },
		y: function(d, u) { return (u ? d.getUTCFullYear() : d.getFullYear()).toString().substr(-2); },
		a: function(d, u, h) { h = u ? d.getUTCHours() : d.getHours(); return h >= 0 && h < 12 ? 'am' : 'pm'; },
		A: function(d, u) { return DateTime.formatModifiers.a(d, u).toUpperCase(); },
		g: function(d, u, h) { h = u ? d.getUTCHours() : d.getHours(); return h === 0 ? 12 : (h > 12 ? h - 12 : h); },
		G: function(d, u) { return u ? d.getUTCHours() : d.getHours(); },
		h: function(d, u) { return pad(DateTime.formatModifiers.g(d, u)); },
		H: function(d, u) { return pad(u ? d.getUTCHours() : d.getHours()); },
		i: function(d, u) { return pad(u ? d.getUTCMinutes() : d.getMinutes()); },
		s: function(d, u) { return pad(u ? d.getUTCSeconds() : d.getSeconds()); },
		u: function(d, u) { return (u ? d.getUTCMilliseconds() : d.getMilliseconds()) * 1000; },
		e: ni,
		I: ni,
		O: function (d, u) { return DateTime.formatModifiers.P(d, u).replace(':', ''); },
		P: function (d, u) { return u ? '+00:00' : formatTz(d.getTimezoneOffset()); },
		T: ni,
		Z: function (d, u) { return u ? 0 : d.getTimezoneOffset() * -60; },
		c: function (d, u) { return DateTime.from(d).format('Y-m-d\\TH:i:sP', u); },
		r: function (d, u) { return DateTime.from(d).format('D, n M Y G:i:s O', u); },
		U: function(d) { return Math.round(d.getTime() / 1000); }
	};

	DateTime.prototype.format = function(f, utc) {
		this._initialize();

		var date = this._.date,
            locale = this._.locale,
			pattern = Arrays.getKeys(DateTime.formatModifiers).map(Strings.escapeRegex).join('|'),
			re = new RegExp('(\\\\*)(' + pattern + ')', 'g');

		return f.replace(re, function(s, c, m) {
			if (c.length % 2) {
				return c.substr(1) + m;

			}

			return c + '' + (DateTime.formatModifiers[m](date, utc, locale));

		});
	};

	DateTime.prototype.getLocale = function () {
        return this._.locale;
    };

	DateTime.prototype.setLocale = function (locale) {
	    if (!DateTime.i18n.hasLocale(locale)) {
	        throw new Error('Unknown locale: ' + locale);
        }

        this._.locale = locale;
        return this;

    };

	[
        'getTime',
        'getDate', 'getDay', 'getMonth', 'getFullYear',
        'getHours', 'getMinutes', 'getSeconds', 'getMilliseconds', 'getTimezoneOffset',
        'getUTCDate', 'getUTCDay', 'getUTCMonth', 'getUTCFullYear',
        'getUTCHours', 'getUTCMinutes', 'getUTCSeconds', 'getUTCMilliseconds',
        'toDateString', 'toISOString', 'toJSON',
        'toLocaleDateString', 'toLocaleFormat', 'toLocaleTimeString',
        'toString', 'toTimeString', 'toUTCString'
    ].forEach(function (method) {
        DateTime.prototype[method] = function () {
            this._initialize();
            return this._.date[method].apply(this._.date, arguments);

        };
    });

    [
        'setTime',
        'setDate', 'setMonth', 'setFullYear',
        'setHours', 'setMinutes', 'setSeconds', 'setMilliseconds',
        'setUTCDate', 'setUTCMonth', 'setUTCFullYear',
        'setUTCHours', 'setUTCMinutes', 'setUTCSeconds', 'setUTCMilliseconds'
    ].forEach(function (method) {
        DateTime.prototype[method] = function () {
            this._initialize();
            this._.date[method].apply(this._.date, arguments);
            return this;

        };
    });

	DateTime.prototype.getTimestamp = function() {
		this._initialize();
		return Math.round(this._.date.getTime() / 1000);

	};

	DateTime.prototype.getDateObject = function () {
		this._initialize();
		return this._.date;

	};

	DateTime.prototype.valueOf = function () {
		return this.getTimestamp();

	};

	DateTime.prototype.modify = function(s) {
		this._initialize();

        var t = this._.date.getTime(),
            parts, dt, i, o;

        if (s instanceof DateInterval) {
            this._.date = new Date(t + s.getLength());
            return this;

        }

        parts = DateTime.i18n.getParser(this._.locale).exec(s.toLowerCase());

        if (!parts) {
            throw new Error('Invalid interval expression: ' + s);
        }

        /**
         * Parts' indices:
         *  1: now
         *  2: yesterday
         *  3: today
         *  4: tomorrow
         *  5: first of
         *  6: last of
         *  7: last
         *  8: this
         *  9: next
         * 10: year
         * 11: month
         * 12: week
         * 13: last
         * 14: this
         * 15: next
         * 16-27: months
         * 28-34: weekdays
         * 35: noon
         * 36: midnight
         * 37: time
         * 38: relative offset
         */

        if (parts[1]) {
            t = Date.now();

        } else if (parts[2]) {
            t -= 86400000;

        } else if (parts[3]) {
            dt = new Date();
            dt.setHours(this._.date.getHours(), this._.date.getMinutes(), this._.date.getSeconds(), this._.date.getMilliseconds());
            t = dt.getTime();

        } else if (parts[4]) {
            t += 86400000;

        } else if (parts[5] || parts[6]) {
            dt = new Date(t);
            o = parts[7] ? -1 : (parts[9] ? 1 : 0);

            if (parts[10]) {
                dt.setFullYear(dt.getFullYear() + o, parts[5] ? 0 : 11, parts[5] ? 1 : 31);

            } else if (parts[11]) {
                dt.setMonth(dt.getMonth() + o, parts[5] ? 1 : DateTime.getDaysInMonth(dt.getMonth() + o, dt.getFullYear()));

            } else { // parts[12]
                dt.setDate(dt.getDate() - dt.getDay() + DateTime.i18n.getWeekStart(this._.locale) + o * 7 + (parts[5] ? 0 : 6));

            }

            t = dt.getTime();

        } else if (parts[13] || parts[14] || parts[15]) {
            dt = new Date(t);
            o = parts[13] ? -1 : (parts[15] ? 1 : 0);

            for (i = 16; i < 35; i++) {
                if (parts[i]) {
                    break;
                }
            }

            if (i < 28) {
                i -= 16;
                dt.setMonth(o * 12 + i, 1);

            } else {
                i -= 28;

                if (i < DateTime.i18n.getWeekStart(this._.locale)) {
                    i += 7;
                }

                dt.setDate(dt.getDate() - dt.getDay() + o * 7 + i);

            }

            t = dt.getTime();

        }

        if (parts[35] || parts[36]) {
            dt = new Date(t);
            dt.setHours(parts[36] ? 0 : 12, 0, 0, 0);
            t = dt.getTime();

        } else if (parts[37]) {
            dt = new Date(t);
            o = parts[37].match(/^(\d+)(?::(\d+)(?::(\d+))?)?\s*([ap]m)?/i);
            o[1] = parseInt(o[1].replace(/^0(\d)$/, '$1'));

            if (o[1] === 12 && o[4] === 'am') {
                o[1] = 0;
            } else if (o[1] < 12 && o[4] === 'pm') {
                o[1] += 12;
            }

            o[2] = o[2] !== undefined ? parseInt(o[2].replace(/^0(\d)$/, '$1')) : 0;
            o[3] = o[3] !== undefined ? parseInt(o[3].replace(/^0(\d)$/, '$1')) : 0;
            dt.setHours(o[1], o[2], o[3], 0);
            t = dt.getTime();

        }

        if (parts[38]) {
            t += DateInterval.from(parts[38], this._.locale).getLength();
        }

        this._.date = new Date(t);
        return this;

	};

	DateTime.prototype.modifyClone = function(s) {
		return DateTime.from(this).modify(s);

	};

	DateTime.prototype._initialize = function() {
		if (this._.initialized) {
			return;

		}

		this._.initialized = true;

        var m, s;

		if (typeof this._.date === 'string') {
			if (m = this._.date.match(/^@(\d+)$/)) {
				this._.date = new Date(m[1] * 1000);

			} else if (m = this._.date.match(/^(\d\d\d\d-\d\d-\d\d)[ T](\d\d:\d\d(?::\d\d(?:\.\d+)?)?)([-+]\d\d:?\d\d)?$/)) {
				this._.date = new Date(m[1] + 'T' + m[2] + (m[3] || ''));

			} else if (DateTime.isModifyString(this._.date, this._.locale)) {
				s = this._.date;
				this._.date = new Date();
				this.modify(s);

			} else {
				this._.date = new Date(this._.date);

			}
		} else if (typeof this._.date === 'number') {
			this._.date = new Date(this._.date);

		} else if (DateTime.isDateObject(this._.date)) {
			s = this._.date.date;

			if (this._.date.timezone_type !== 3 || this._.date.timezone === 'UTC') {
				s += ' ' + this._.date.timezone;

			}

			this._.date = new Date(s);

		} else if (this._.date instanceof DateTime) {
		    this._.locale = this._.date.getLocale();
			this._.date = new Date(this._.date.getTime());

		}
	};

    _context.register(DateTime, 'DateTime');

});

_context.invoke('Utils', function(DateTime, Strings) {

    function buildParser(locale) {
        var i;

        if (!('months' in locale.parsers)) {
            locale.parsers.months = [];

            for (i = 0; i < 12; i++) {
                locale.parsers.months.push(Strings.escapeRegex(locale.keywords.months.full[i]) + '|' + Strings.escapeRegex(locale.keywords.months.abbrev[i]));
            }
        }

        if (!('weekdays' in locale.parsers)) {
            locale.parsers.weekdays = [];

            for (i = 0; i < 7; i++) {
                locale.parsers.weekdays.push(Strings.escapeRegex(locale.keywords.weekdays.full[i]) + '|' + Strings.escapeRegex(locale.keywords.weekdays.abbrev[i]));
            }
        }

        var parts = [
            '^',
            '(?:',
                '(?:',
                    '(', locale.parsers.now, ')|',
                    '(', locale.parsers.yesterday, ')|',
                    '(', locale.parsers.today, ')|',
                    '(', locale.parsers.tomorrow, ')|',
                    '(?:',
                        '(', locale.parsers.firstOf, ')|',
                        '(', locale.parsers.lastOf, ')',
                    ')\\s+(?:',
                        '(', locale.parsers.last, ')|',
                        '(', locale.parsers['this'], ')|',
                        '(', locale.parsers.next, ')',
                    ')\\s+(?:',
                        '(', locale.parsers.year, ')|',
                        '(', locale.parsers.month, ')|',
                        '(', locale.parsers.week, ')',
                    ')',
                    '|',
                    '(?:',
                        '(', locale.parsers.last, ')|',
                        '(', locale.parsers['this'], ')|',
                        '(', locale.parsers.next, ')',
                    ')\\s+(?:',
                        '(', locale.parsers.months.join(')|('), ')',
                        '|',
                        '(', locale.parsers.weekdays.join(')|('), ')',
                    ')',
                ')(?:\\s+|$)',
            ')?',
            '(?:',
                '(?:', locale.parsers.at, '\\s+)?',
                '(?:',
                    '(', locale.parsers.noon, ')|',
                    '(', locale.parsers.midnight, ')|',
                    '([012]?\\d(?::[0-5]\\d(?::[0-5]\\d)?)?(?:\\s*[ap]m)?)',
                ')',
                '(?=[-+]|\\s|$)',
            ')?',
            '(',
                '(?:',
                    '\\s*[-+]?\\s*\\d+\\s+',
                    '(?:',
                        locale.parsers.intervals.year, '|',
                        locale.parsers.intervals.month, '|',
                        locale.parsers.intervals.week, '|',
                        locale.parsers.intervals.day, '|',
                        locale.parsers.intervals.hour, '|',
                        locale.parsers.intervals.minute, '|',
                        locale.parsers.intervals.second, '|',
                        locale.parsers.intervals.millisecond,
                    ')',
                    '(?=[-+]|\\s|$)',
                ')*',
            ')',
            '$'
        ];

        return new RegExp(parts.join(''), 'i');

    }

    function buildIntervalParser(locale) {
        var parts = [
            '\\s*([-+]?)\\s*(\\d+)\\s+',
            '(?:',
                '(', locale.parsers.intervals.year, ')|',
                '(', locale.parsers.intervals.month, ')|',
                '(', locale.parsers.intervals.week, ')|',
                '(', locale.parsers.intervals.day, ')|',
                '(', locale.parsers.intervals.hour, ')|',
                '(', locale.parsers.intervals.minute, ')|',
                '(', locale.parsers.intervals.second, ')|',
                '(', locale.parsers.intervals.millisecond, ')',
            ')\\s*'
        ];

        return new RegExp(parts.join(''), 'ig');

    }

    var i18n = DateTime.i18n = {
        locales: {},

        hasLocale: function(locale) {
            return locale in i18n.locales;
        },

        getLocale: function(locale) {
            if (!i18n.hasLocale(locale)) {
                throw new Error('Unknown locale: ' + locale);
            }

            return i18n.locales[locale];

        },

        getMonth: function(locale, m, abbrev) {
            return i18n.getLocale(locale).keywords.months[abbrev ? 'abbrev' : 'full'][m];
        },

        getWeekday: function(locale, d, abbrev) {
            return i18n.getLocale(locale).keywords.weekdays[abbrev ? 'abbrev' : 'full'][d];
        },

        getConjuction: function(locale) {
            return i18n.getLocale(locale).keywords.conjuction;
        },

        getInterval: function(locale, unit, n) {
            locale = i18n.getLocale(locale);
            n = locale.getPlural(n);
            return locale.keywords.intervals[unit][n];

        },

        getWeekStart: function(locale) {
            return i18n.getLocale(locale).weekStart;
        },

        getParser: function (locale) {
            locale = i18n.getLocale(locale);

            if (!locale.parser) {
                locale.parser = buildParser(locale);
            }

            return locale.parser;

        },

        getIntervalParser: function(locale) {
            locale = i18n.getLocale(locale);

            if (!locale.intervalParser) {
                locale.intervalParser = buildIntervalParser(locale);
            }

            return locale.intervalParser;

        }
    };

});

_context.invoke('Utils', function (DateTime) {

    DateTime.i18n.locales.en = {
        getPlural: function(n) { return n === 1 ? 0 : 1; },
        weekStart: 0,
        keywords: {
            weekdays: {
                abbrev: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
                full: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
            },
            months: {
                abbrev: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                full: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
            },
            intervals: {
                year: ['year', 'years'],
                month: ['month', 'months'],
                week: ['week', 'weeks'],
                day: ['day', 'days'],
                hour: ['hour', 'hours'],
                minute: ['minute', 'minutes'],
                second: ['second', 'seconds'],
                millisecond: ['millisecond', 'milliseconds']
            },
            conjuction: 'and'
        },
        parsers: {
            now: 'now',
            today: 'today',
            tomorrow: 'tomorrow',
            yesterday: 'yesterday',
            at: 'at',
            noon: 'noon',
            midnight: 'midnight',
            last: 'last',
            'this': 'this',
            next: 'next',
            firstOf: 'first(?:\\s+day)?\\s+of',
            lastOf: 'last(?:\\s+day)?\\s+of',
            year: 'year',
            month: 'month',
            week: 'week',
            intervals: {
                year: 'y(?:ears?)?',
                month: 'mon(?:ths?)?',
                week: 'w(?:eeks?)?',
                day: 'd(?:ays?)?',
                hour: 'h(?:ours?)?',
                minute: 'min(?:utes?)?',
                second: 's(?:ec(?:onds?)?)?',
                millisecond: 'millis(?:econds?)?|ms'
            }
        }
    };

});

_context.invoke('Nittro.Utils', function(Nittro, Strings, Arrays, HashMap, undefined) {

    var Tokenizer = _context.extend(function(patterns, matchCase) {
        var types = false;

        if (!Array.isArray(patterns)) {
            if (patterns instanceof HashMap) {
                types = patterns.getKeys();
                patterns = patterns.getValues();

            } else {
                var tmp = patterns, type;
                types = [];
                patterns = [];

                for (type in tmp) {
                    if (tmp.hasOwnProperty(type)) {
                        types.push(type);
                        patterns.push(tmp[type]);

                    }
                }
            }
        }

        this._ = {
            pattern: '(' + patterns.join(')|(') + ')',
            types: types,
            matchCase: matchCase
        };
    }, {
        STATIC: {
            getCoordinates: function(text, offset) {
                text = text.substr(0, offset);
                var m = text.match(/\n/g);

                return [(m ? m.length : 0) + 1, offset - ("\n" + text).lastIndexOf("\n") + 1];

            }
        },

        tokenize: function(input) {
            var re, tokens, pos, n;

            if (this._.types) {
                re = new RegExp(this._.pattern, 'gm' + (this._.matchCase ? '' : 'i'));
                tokens = [];
                pos = 0;
                n = this._.types.length;

                input.replace(re, function () {
                    var ofs = arguments[n + 1],
                        i;

                    if (ofs > pos) {
                        tokens.push([input.substr(pos, ofs - pos), pos, null]);

                    }

                    for (i = 1; i <= n; i++) {
                        if (arguments[i] !== undefined) {
                            tokens.push([arguments[i], ofs, this._.types[i - 1]]);
                            pos = ofs + arguments[0].length;
                            return;

                        }
                    }

                    throw new Error('Unknown token type: ' + arguments[0]);

                }.bind(this));

                if (pos + 1 < input.length) {
                    tokens.push([input.substr(pos), pos, null]);

                }
            } else {
                tokens = Strings.split(input, new RegExp(this._.pattern, 'm' + (this._.matchCase ? '' : 'i')), true, true, true);

            }

            return tokens;

        }
    });

    _context.register(Tokenizer, 'Tokenizer');

}, {
    Strings: 'Utils.Strings',
    Arrays: 'Utils.Arrays',
    HashMap: 'Utils.HashMap'
});

_context.invoke('Nittro.Neon', function(Nittro, HashMap, Tokenizer, Strings, Arrays, DateTime, undefined) {

    var Neon = _context.extend(function() {
        this._cbStr = this._cbStr.bind(this);

    }, {
        STATIC: {
            patterns: [
                '\'[^\'\\n]*\'|"(?:\\\\.|[^"\\\\\\n])*"', //string
                '(?:[^#"\',:=[\\]{}()\x00-\x20!`-]|[:-][^"\',\\]})\\s])(?:[^,:=\\]})(\x00-\x20]|:(?![\\s,\\]})]|$)|[ \\t]+[^#,:=\\]})(\x00-\x20])*', // literal / boolean / integer / float
                '[,:=[\\]{}()-]', // symbol
                '?:#.*', // comment
                '\\n[\\t ]*', // new line + indent
                '?:[\\t ]+' // whitespace
            ],

            brackets: {
                '{' : '}',
                '[' : ']',
                '(' : ')'
            },

            consts: {
                'true': true, 'True': true, 'TRUE': true, 'yes': true, 'Yes': true, 'YES': true, 'on': true, 'On': true, 'ON': true,
                'false': false, 'False': false, 'FALSE': false, 'no': false, 'No': false, 'NO': false, 'off': false, 'Off': false, 'OFF': false,
                'null': null, 'Null': null, 'NULL': null
            },

            indent: '    ',

            BLOCK: 1,

            encode: function(data, options) {
                var tmp, s, isList;

                if (data instanceof DateTime) {
                    return data.format('Y-m-d H:i:s O');

                } else if (data instanceof NeonEntity) {
                    tmp = Neon.encode(data.attributes);
                    return Neon.encode(data.value) + '(' + tmp.substr(1, tmp.length - 2) + ')';

                }

                if (data && typeof data === 'object') { // array or object literal
                    s = [];
                    isList = Array.isArray(data);

                    if (options & Neon.BLOCK) {
                        Arrays.walk(data, function(k, v) {
                            v = Neon.encode(v, Neon.BLOCK);
                            s.push(isList ? '-' : (Neon.encode(k) + ':'), Strings.contains(v, "\n") ? "\n" + Neon.indent + v.replace(/\n/g, "\n" + Neon.indent) : (' ' + v), "\n");

                        });

                        return s.length ? s.join('') : '[]';

                    } else {
                        Arrays.walk(data, function(k, v) {
                            s.push(isList ? '' : (Neon.encode(k) + ': '), Neon.encode(v), ', ');

                        });

                        s.pop(); // remove last ', '
                        return (isList ? '[' : "{") + s.join('') + (isList ? ']' : '}');

                    }
                } else if (typeof data === 'string' && !Strings.isNumeric(data)
                    && !data.match(/[\x00-\x1F]|^\d{4}|^(true|false|yes|no|on|off|null)$/i)
                    && data.match(new RegExp('^' + Neon.patterns[1] + '$'))) {

                    return data;

                } else {
                    return JSON.stringify(data);

                }
            },

            decode: function(input) {
                if (typeof input !== 'string') {
                    throw new Error('Invalid argument, must be a string');

                }

                if (!Neon.tokenizer) {
                    Neon.tokenizer = new Tokenizer(Neon.patterns);

                }

                input = input.replace(/\r/g, '');

                var parser = new Neon(),
                    res;

                parser.input = input;
                parser.tokens = Neon.tokenizer.tokenize(input);

                res = parser.parse(0, new HashMap());

                while (parser.tokens[parser.n] !== undefined) {
                    if (parser.tokens[parser.n][0].charAt(0) === "\n") {
                        parser.n++;

                    } else {
                        parser.error();

                    }
                }

                return res;

            }
        },

        input: null,
        tokens: null,
        n: 0,
        indentTabs: null,

        parse: function(indent, result) {
            indent === undefined && (indent = null);
            result === undefined && (result = new HashMap());

            var inlineParser = (indent === null),
                value = null, key = null, entity = null,
                hasValue = false, hasKey = false,
                t;

            for (; this.n < this.tokens.length; this.n++) {
                t = this.tokens[this.n][0];

                if (t === ',') {
                    if ((!hasKey && !hasValue) || !inlineParser) {
                        this.error();

                    }

                    this.addValue(result, hasKey, key, hasValue ? value : null);
                    hasKey = hasValue = false;

                } else if (t === ':' || t === '=') {
                    if (hasKey || !hasValue) {
                        this.error();

                    }

                    if (typeof value !== 'string' && typeof value !== 'number') {
                        this.error('Unacceptable key');

                    }

                    key = Strings.toString(value);
                    hasKey = true;
                    hasValue = false;

                } else if (t === '-') {
                    if (hasKey || hasValue || inlineParser) {
                        this.error();

                    }

                    key = null;
                    hasKey = true;

                } else if (Neon.brackets[t] !== undefined) {
                    if (hasValue) {
                        if (t !== '(') {
                            this.error();

                        }

                        this.n++;

                        entity = new NeonEntity();
                        entity.value = value;
                        entity.attributes = this.parse(null, new HashMap());
                        value = entity;

                    } else {
                        this.n++;
                        value = this.parse(null, new HashMap());

                    }

                    hasValue = true;

                    if (this.tokens[this.n] === undefined || this.tokens[this.n][0] !== Neon.brackets[t]) {
                        this.error();

                    }

                } else if (t === '}' || t === ']' || t === ')') {
                    if (!inlineParser) {
                        this.error();

                    }

                    break;

                } else if (t.charAt(0) === "\n") {
                    if (inlineParser) {
                        if (hasKey || hasValue) {
                            this.addValue(result, hasKey, key, hasValue ? value : null);
                            hasKey = hasValue = false;

                        }
                    } else {
                        while (this.tokens[this.n + 1] !== undefined && this.tokens[this.n + 1][0].charAt(0) === "\n") {
                            this.n++;

                        }

                        if (this.tokens[this.n + 1] === undefined) {
                            break;

                        }

                        var newIndent = this.tokens[this.n][0].length - 1;
                        if (indent === null) {
                            indent = newIndent;

                        }

                        if (newIndent) {
                            if (this.indentTabs === null) {
                                this.indentTabs = this.tokens[this.n][0].charAt(1) === "\t";

                            }

                            if (Strings.contains(this.tokens[this.n][0], this.indentTabs ? ' ' : "\t")) {
                                this.n++;
                                this.error('Either tabs or spaces may be used for indentation, not both');

                            }
                        }

                        if (newIndent > indent) {
                            if (hasValue || !hasKey) {
                                this.n++;
                                this.error('Unexpected indentation');

                            } else {
                                this.addValue(result, key !== null, key, this.parse(newIndent, new HashMap()));

                            }

                            newIndent = this.tokens[this.n] !== undefined ? this.tokens[this.n][0].length - 1 : 0;
                            hasKey = false;

                        } else {
                            if (hasValue && !hasKey) {
                                break;

                            } else if (hasKey) {
                                this.addValue(result, key !== null, key, hasValue ? value : null);
                                hasKey = hasValue = false;

                            }
                        }

                        if (newIndent < indent) {
                            return result;

                        }
                    }
                } else {
                    if (hasValue) {
                        this.error();

                    }

                    if (t.charAt(0) === '"') {
                        value = t.substr(1, t.length - 2).replace(/\\(?:u[0-9a-f]{4}|x[0-9a-f]{2}|.)/gi, this._cbStr);

                    } else if (t.charAt(0) === "'") {
                        value = t.substr(1, t.length - 2);

                    } else if (Neon.consts[t] !== undefined) {
                        value = Neon.consts[t];

                    } else if (Strings.isNumeric(t)) {
                        value = parseFloat(t);

                    } else if (t.match(/^\d\d\d\d-\d\d?-\d\d?(?:(?:[Tt]| +)\d\d?:\d\d(?::\d\d(?:\.\d*)?)? *(?:Z|[-+]\d\d?(?::?\d\d)?)?)?$/)) {
                        value = DateTime.from(t);

                    } else {
                        value = t;

                    }

                    hasValue = true;

                }
            }

            if (inlineParser) {
                if (hasKey || hasValue) {
                    this.addValue(result, hasKey, key, hasValue ? value : null);

                }
            } else {
                if (hasValue && !hasKey) {
                    if (!result.length) {
                        result = value;

                    } else {
                        this.error();

                    }
                } else if (hasKey) {
                    this.addValue(result, key !== null, key, hasValue ? value : null);

                }
            }

            return result;

        },

        addValue: function(result, hasKey, key, value) {
            if (hasKey) {
                if (result && result.has(key)) {
                    this.error("Duplicated key " + key);

                }

                result.set(key, value);

            } else {
                result.push(value);

            }
        },

        _cbStr: function(m) {
            var mapping = {t: '\t', n: '\n', r: '\r', f: '\x0C', b: '\x08', '"': '"', '\\': '\\', '/': '/', '_': '\xC2\xA0'}

            if (mapping[m.charAt(1)] !== undefined) {
                return mapping[m.charAt(1)];

            } else if (m.charAt(1) === 'u' && m.length === 6) {
                return String.fromCharCode(parseInt(m.substr(2), 16));

            } else if (m.charAt(1) === 'x' && m.length === 4) {
                return String.fromCharCode(parseInt(m.substr(2), 16));

            } else {
                this.error('Invalid escape sequence ' + m);

            }
        },

        error: function(msg) {
            var last = this.tokens[this.n] !== undefined ? this.tokens[this.n] : null,
                pos = Tokenizer.getCoordinates(this.input, last ? last[1] : this.input.length),
                token = last ? last[0].substr(0, 40).replace(/\n/g, '<new line>') : 'end';

            throw new Error((msg || 'Unexpected %s').replace(/%s/g, token) + ' on line ' + pos[0] + ', column ' + pos[1]);

        }

    });

    var NeonEntity = function(value, attributes) {
        this.value = value || null;
        this.attributes = attributes || null;

    };

    _context.register(Neon, 'Neon');
    _context.register(NeonEntity, 'NeonEntity');

}, {
    HashMap: 'Utils.HashMap',
    Strings: 'Utils.Strings',
    Arrays: 'Utils.Arrays',
    DateTime: 'Utils.DateTime',
    Tokenizer: 'Nittro.Utils.Tokenizer'
});

_context.invoke('Nittro.DI', function(undefined) {

    var ServiceDefinition = _context.extend(function(factory, args, setup, run) {
        this._ = {
            factory: factory,
            args: args || {},
            setup: setup || [],
            run: !!run
        };
    }, {
        getFactory: function() {
            return this._.factory;
        },

        setFactory: function(factory, args) {
            this._.factory = factory;

            if (args !== undefined) {
                this._.args = args;
            }

            return this;
        },

        getArguments: function () {
            return this._.args;
        },

        setArguments: function(args) {
            this._.args = args;
            return this;
        },

        getSetup: function () {
            return this._.setup;
        },

        hasSetup: function() {
            return this._.setup.length > 0;
        },

        addSetup: function(callback) {
            this._.setup.push(callback);
            return this;
        },

        setRun: function(state) {
            this._.run = state === undefined || !!state;
            return this;
        },

        isRun: function() {
            return this._.run;
        }
    });

    _context.register(ServiceDefinition, 'ServiceDefinition');

});

_context.invoke('Nittro.DI', function(Nittro, ReflectionClass, ReflectionFunction, Arrays, Strings, HashMap, Neon, NeonEntity, ServiceDefinition, undefined) {

    var prepare = function (self) {
        if (!self._) {
            self._ = {};
        }

        if (!self._.services) {
            self._.services = {};
            self._.serviceDefs = {};

        }
    };

    var ContainerMixin = {
        addService: function (name, service) {
            prepare(this);

            if (this._.services[name] || this._.serviceDefs[name]) {
                throw new Error('Container already has a service named "' + name + '"');

            }

            this._.services[name] = service;

            return this;

        },

        addServiceDefinition: function (name, definition, override) {
            prepare(this);

            if (!override && (this._.services[name] || this._.serviceDefs[name])) {
               throw new Error('Container already has a service named "' + name + '"');

            }

            this._.serviceDefs[name] = definition;

            return this;

        },

        hasServiceDefinition: function(name) {
            prepare(this);
            return this._.serviceDefs[name] !== undefined;
        },

        getServiceDefinition: function(name) {
            prepare(this);

            if (!this._.serviceDefs[name]) {
                throw new Error('Container has no service "' + name + '"');

            }

            if (typeof this._.serviceDefs[name] === 'string') {
                this._.serviceDefs[name] = new ServiceDefinition(
                    this._.serviceDefs[name].replace(/!$/, ''),
                    null,
                    null,
                    !!this._.serviceDefs[name].match(/!$/)
                );
            } else if (typeof this._.serviceDefs[name] === 'function') {
                this._.serviceDefs[name] = new ServiceDefinition(
                    this._.serviceDefs[name]
                );
            } else if (!(this._.serviceDefs[name] instanceof ServiceDefinition)) {
                this._.serviceDefs[name] = new ServiceDefinition(
                    this._.serviceDefs[name].factory,
                    this._.serviceDefs[name].args,
                    this._.serviceDefs[name].setup,
                    this._.serviceDefs[name].run
                );
            }

            return this._.serviceDefs[name];

        },

        getService: function (name) {
            prepare(this);

            if (name === 'container') {
                return this;

            } else if (this._.services[name] === undefined) {
                if (this._.serviceDefs[name]) {
                    this._createService(name);

                } else {
                    throw new Error('Container has no service named "' + name + '"');

                }
            }

            return this._.services[name];

        },

        hasService: function (name) {
            prepare(this);
            return name === 'container' || this._.services[name] !== undefined || this._.serviceDefs[name] !== undefined;

        },

        isServiceCreated: function (name) {
            if (!this.hasService(name)) {
                throw new Error('Container has no service named "' + name + '"');

            }

            return !!this._.services[name];

        },

        runServices: function () {
            prepare(this);

            var name, def;

            for (name in this._.serviceDefs) {
                def = this.getServiceDefinition(name);

                if (def.isRun()) {
                    this.getService(name);

                }
            }
        },

        invoke: function (callback, args, thisArg) {
            prepare(this);
            args = this._autowireArguments(callback, args);
            return callback.apply(thisArg || null, this._expandArguments(args));

        },

        _createService: function (name) {
            var def = this.getServiceDefinition(name),
                factory = def.getFactory(),
                obj,
                service,
                setup;

            if (typeof factory === 'function') {
                service = this.invoke(factory, def.getArguments());

                if (!service) {
                    throw new Error('Factory failed to create service "' + name + '"');

                }
            } else {
                factory = this._toEntity(factory);
                service = this._expandEntity(factory, null, def.getArguments());

                if (service === factory) {
                    throw new Error('Invalid factory for service "' + name + '"');

                }
            }

            this._.services[name] = service;

            if (def.hasSetup()) {
                setup = def.getSetup();

                for (var i = 0; i < setup.length; i++) {
                    if (typeof setup[i] === 'function') {
                        this.invoke(setup[i], null, service);

                    } else {
                        obj = this._toEntity(setup[i]);
                        this._expandEntity(obj, service);

                    }
                }
            }

            return service;

        },

        _autowireArguments: function (callback) {
            var argList = ReflectionFunction.from(callback).getArgs();

            var args = Arrays.createFrom(arguments, 1)
                .filter(function(arg) { return !!arg; })
                .map(function (arg) {
                    if (arg instanceof HashMap) {
                        if (arg.isList()) {
                            arg = HashMap.from(arg.getValues(), argList);

                        }
                    } else {
                        arg = HashMap.from(arg, argList);

                    }

                    return arg;

                });

            var i, a;

            lookupArg:
            for (i = 0; i < argList.length; i++) {
                for (a = args.length - 1; a >= 0; a--) {
                    if (args[a].has(argList[i])) {
                        argList[i] = args[a].get(argList[i]);
                        continue lookupArg;

                    } else if (args[a].has(i)) {
                        argList[i] = args[a].get(i);
                        continue lookupArg;

                    }
                }

                if (this.hasService(argList[i])) {
                    argList[i] = this.getService(argList[i]);
                    continue;

                }

                throw new Error('Cannot autowire argument "' + argList[i] + '" of function');

            }

            return argList;

        },

        _expandArguments: function (args) {
            for (var i = 0; i < args.length; i++) {
                args[i] = this._expandArg(args[i]);

            }

            return args;

        },

        _expandArg: function (arg) {
            if (arg instanceof NeonEntity) {
                return this._expandEntity(arg);

            } else if (typeof arg === 'string' && arg.match(/^@\S+$/)) {
                return this.getService(arg.substr(1));

            } else {
                return arg;

            }
        },

        _toEntity: function (str) {
            var m = str.match(/^([^\(]+)\((.*)\)$/);

            if (m) {
                return new NeonEntity(m[1], Neon.decode('[' + m[2] + ']'));

            } else {
                return new NeonEntity(str, new HashMap());

            }
        },

        _expandEntity: function (entity, context, mergeArgs) {
            var m, obj, method, args;

            if (m = entity.value.match(/^(?:(@)?([^:].*?))?(?:::(.+))?$/)) {
                if (m[2]) {
                    obj = m[1] ? this.getService(m[2]) : ReflectionClass.getClass(m[2]);

                } else if (context) {
                    obj = context;

                } else {
                    throw new Error('No context for calling ' + entity.value + ' given');

                }

                if (m[3] !== undefined) {
                    method = m[3];
                    args = this._autowireArguments(obj[method], entity.attributes, mergeArgs);
                    return obj[method].apply(obj, this._expandArguments(args));

                } else if (!m[1]) {
                    args = this._autowireArguments(obj, entity.attributes, mergeArgs);
                    return ReflectionClass.from(obj).newInstanceArgs(this._expandArguments(args));

                } else if (entity.attributes.length) {
                    throw new Error('Invalid entity "' + entity.value + '"');

                } else {
                    return obj;

                }
            } else {
                return entity;

            }
        }
    };

    _context.register(ContainerMixin, 'ContainerMixin');

}, {
    ReflectionClass: 'Utils.ReflectionClass',
    ReflectionFunction: 'Utils.ReflectionFunction',
    Arrays: 'Utils.Arrays',
    Strings: 'Utils.Strings',
    HashMap: 'Utils.HashMap',
    Neon: 'Nittro.Neon.Neon',
    NeonEntity: 'Nittro.Neon.NeonEntity'
});

_context.invoke('Nittro.DI', function(ContainerMixin, Arrays, HashMap, ReflectionClass, NeonEntity, undefined) {

    function traverse(cursor, path, create) {
        if (typeof path === 'string') {
            path = path.split(/\./g);

        }

        var i, p, n = path.length;

        for (i = 0; i < n; i++) {
            p = path[i];

            if (Array.isArray(cursor) && p.match(/^\d+$/)) {
                p = parseInt(p);

            }

            if (cursor[p] === undefined) {
                if (create) {
                    cursor[p] = {};

                } else {
                    return undefined;

                }
            }

            cursor = cursor[p];

        }

        return cursor;

    }

    var Container = _context.extend(function(config) {
        config || (config = {});

        this._ = {
            params: Arrays.mergeTree({}, config.params || null),
            serviceDefs: Arrays.mergeTree({}, config.services || null),
            services: {},
            factories: Arrays.mergeTree({}, config.factories || null)
        };

    }, {
        hasParam: function(name) {
            return traverse(this._.params, name) !== undefined;

        },

        getParam: function(name, def) {
            var value = traverse(this._.params, name);
            return value !== undefined ? value : (def !== undefined ? def : null);

        },

        setParam: function(name, value) {
            name = name.split(/\./g);

            var p = name.pop(),
                cursor = this._.params;

            if (name.length) {
                cursor = traverse(cursor, name, true);

            }

            if (Array.isArray(cursor) && p.match(/^\d+$/)) {
                p = parseInt(p);

            }

            cursor[p] = value;

            return this;

        },

        hasFactory: function(name) {
            return this._.factories[name] !== undefined;

        },

        addFactory: function(name, factory, params) {
            if (typeof factory === 'string') {
                this._.factories[name] = factory;

            } else {
                this._.factories[name] = {
                    callback: factory,
                    params: params || null
                };
            }

            return this;

        },

        create: function(name, args) {
            if (!this.hasFactory(name)) {
                throw new Error('No factory named "' + name + '" has been registered');

            }

            var factory = this._.factories[name];

            if (typeof factory === 'string') {
                this._.factories[name] = factory = this._toEntity(factory);

            } else if (!(factory.params instanceof HashMap)) {
                factory.params = new HashMap(factory.params);

            }

            if (factory instanceof NeonEntity) {
                return this._expandEntity(factory, null, args);

            } else {
                args = this._autowireArguments(factory.callback, factory.params, args);
                return factory.callback.apply(null, this._expandArguments(args));

            }
        },

        _expandArg: function (arg) {
            if (typeof arg === 'string' && arg.indexOf('%') > -1) {
                if (arg.match(/^%[^%]+%$/)) {
                    return this.getParam(arg.replace(/^%|%$/g, ''));

                } else {
                    return arg.replace(/%([a-z0-9_.-]+)%/gi, function () {
                        return this.getParam(arguments[1]);

                    }.bind(this));
                }
            } else {
                return this.__expandArg(arg);

            }
        }
    });

    _context.mixin(Container, ContainerMixin, {
        _expandArg: '__expandArg'
    });

    _context.register(Container, 'Container');

}, {
    Arrays: 'Utils.Arrays',
    HashMap: 'Utils.HashMap',
    ReflectionClass: 'Utils.ReflectionClass',
    NeonEntity: 'Nittro.Neon.NeonEntity'
});

_context.invoke('Nittro.DI', function (Arrays) {

    var BuilderExtension = _context.extend(function(containerBuilder, config) {
        this._ = {
            containerBuilder: containerBuilder,
            config: config
        };
    }, {
        load: function() {

        },

        setup: function () {

        },

        _getConfig: function (defaults) {
            if (defaults) {
                this._.config = Arrays.mergeTree({}, defaults, this._.config);
            }

            return this._.config;

        },

        _getContainerBuilder: function () {
            return this._.containerBuilder;
        }
    });

    _context.register(BuilderExtension, 'BuilderExtension');

}, {
    Arrays: 'Utils.Arrays'
});

_context.invoke('Nittro.DI', function(Container, BuilderExtension, undefined) {

    var ContainerBuilder = _context.extend(Container, function(config) {
        config || (config = {});

        ContainerBuilder.Super.call(this, config);
        this._.extensions = config.extensions || {};

    }, {
        addExtension: function(name, extension) {
            if (this._.extensions[name] !== undefined) {
                throw new Error('Container builder already has an extension called "' + name + '"');
            }

            this._.extensions[name] = extension;

            return this;
        },

        createContainer: function() {
            this._prepareExtensions();
            this._loadExtensions();
            this._setupExtensions();

            return new Container({
                params: this._.params,
                services: this._.serviceDefs,
                factories: this._.factories
            });
        },

        _prepareExtensions: function () {
            var name, extension;

            for (name in this._.extensions) {
                extension = this._.extensions[name];

                if (typeof extension === 'function') {
                    extension = this.invoke(extension, {containerBuilder: this, config: this._.params[name] || {}});

                } else if (typeof extension === 'string') {
                    extension = this._expandEntity(this._toEntity(extension), null, {containerBuilder: this, config: this._.params[name] || {}});

                }

                if (!(extension instanceof BuilderExtension)) {
                    throw new Error('Extension "' + name + '" is not an instance of Nittro.DI.BuilderExtension');

                }

                this._.extensions[name] = extension;

            }
        },

        _loadExtensions: function () {
            for (var name in this._.extensions) {
                this._.extensions[name].load();

            }
        },

        _setupExtensions: function () {
            for (var name in this._.extensions) {
                this._.extensions[name].setup();

            }
        }
    });

    _context.register(ContainerBuilder, 'ContainerBuilder');

});

_context.invoke('Nittro.Ajax', function (Nittro, Url, undefined) {

    var Request = _context.extend('Nittro.Object', function(url, method, data) {
        this._ = {
            url: Url.from(url),
            method: (method || 'GET').toUpperCase(),
            data: data || {},
            headers: {},
            normalized: false,
            dispatched: false,
            deferred: {
                fulfill: null,
                reject: null,
                promise: null
            },
            abort: null,
            aborted: false,
            response: null
        };

        this._.deferred.promise = new Promise(function (fulfill, reject) {
            this._.deferred.fulfill = fulfill;
            this._.deferred.reject = reject;
        }.bind(this));
    }, {
        getUrl: function () {
            this._normalize();
            return this._.url;
        },

        getMethod: function () {
            return this._.method;
        },

        isGet: function () {
            return this._.method === 'GET';
        },

        isPost: function () {
            return this._.method === 'POST';
        },

        isMethod: function (method) {
            return method.toUpperCase() === this._.method;
        },

        getData: function () {
            this._normalize();
            return this._.data;
        },

        getHeaders: function () {
            return this._.headers;
        },

        setUrl: function (url) {
            this._updating('url');
            this._.url = Url.from(url);
            return this;
        },

        setMethod: function (method) {
            this._updating('method');
            this._.method = method.toLowerCase();
            return this;
        },

        setData: function (k, v) {
            this._updating('data');

            if (k === null) {
                this._.data = {};

            } else if (v === undefined && typeof k === 'object') {
                for (v in k) {
                    if (k.hasOwnProperty(v)) {
                        this._.data[v] = k[v];

                    }
                }
            } else {
                this._.data[k] = v;

            }

            return this;
        },

        setHeader: function (header, value) {
            this._updating('headers');
            this._.headers[header] = value;
            return this;
        },

        setHeaders: function (headers) {
            this._updating('headers');

            for (var header in headers) {
                if (headers.hasOwnProperty(header)) {
                    this._.headers[header] = headers[header];

                }
            }

            return this;
        },

        setDispatched: function(abort) {
            if (this._.dispatched) {
                throw new Error('Request has already been dispatched');
            } else if (typeof abort !== 'function') {
                throw new Error('"abort" must be a function');
            }

            this._.dispatched = true;
            this._.abort = abort;
            return this;
        },

        isDispatched: function () {
            return this._.dispatched;
        },

        setFulfilled: function (response) {
            if (response) {
                this.setResponse(response);
            }

            this._.deferred.fulfill(this.getResponse());
            return this;
        },

        setRejected: function (reason) {
            this._.deferred.reject(reason);
            return this;
        },

        then: function (onfulfilled, onrejected) {
            return this._.deferred.promise.then(onfulfilled, onrejected);
        },

        abort: function () {
            if (this._.abort && !this._.aborted) {
                this._.abort();
            }

            this._.aborted = true;
            return this;

        },

        isAborted: function () {
            return this._.aborted;
        },

        setResponse: function(response) {
            this._.response = response;
            return this;
        },

        getResponse: function () {
            return this._.response;
        },

        _normalize: function() {
            if (this._.normalized || !this.isFrozen()) {
                return;
            }

            this._.normalized = true;

            if (this._.method === 'GET' || this._.method === 'HEAD') {
                this._.url.addParams(Nittro.Forms && Nittro.Forms.FormData && this._.data instanceof Nittro.Forms.FormData ? this._.data.exportData(true) : this._.data);
                this._.data = {};
            }
        }
    });

    _context.mixin(Request, 'Nittro.Freezable');
    _context.register(Request, 'Request');

}, {
    Url: 'Utils.Url'
});

_context.invoke('Nittro.Ajax', function () {

    var Response = _context.extend(function(status, payload, headers) {
        this._ = {
            status: status,
            payload: payload,
            headers: headers
        };
    }, {
        getStatus: function () {
            return this._.status;

        },

        getPayload: function () {
            return this._.payload;

        },

        getHeader: function (name) {
            return this._.headers[name.toLowerCase()];

        },

        getAllHeaders: function () {
            return this._.headers;

        }
    });

    _context.register(Response, 'Response');

});

_context.invoke('Nittro.Ajax', function (Request, Arrays, Url) {

    var Service = _context.extend('Nittro.Object', function (options) {
        Service.Super.call(this);

        this._.options = Arrays.mergeTree({}, Service.defaults, options);
        this._.transport = null;

        if (!this._.options.allowOrigins) {
            this._.options.allowOrigins = [];
        } else if (!Array.isArray(this._.options.allowOrigins)) {
            this._.options.allowOrigins = this._.options.allowOrigins.split(/\s*,\s*/g);
        }

        this._.options.allowOrigins.push(Url.fromCurrent().getOrigin());
    }, {
        STATIC: {
            defaults: {
                allowOrigins: null
            }
        },

        setTransport: function (transport) {
            this._.transport = transport;
            return this;
        },

        addTransport: function (transport) {
            console.log('The Nittro.Ajax.Service.addTransport() method is deprecated, please use setTransport instead');
            return this.setTransport(transport);
        },

        supports: function (url, method, data) {
            return this._.transport.supports(url, method, data);
        },

        isAllowedOrigin: function(url) {
            return this._.options.allowOrigins.indexOf(Url.from(url).getOrigin()) > -1
        },

        'get': function (url, data) {
            return this.dispatch(this.createRequest(url, 'get', data));
        },

        post: function (url, data) {
            return this.dispatch(this.createRequest(url, 'post', data));
        },

        createRequest: function (url, method, data) {
            if (!this.isAllowedOrigin(url)) {
                throw new Error('The origin of the URL "' + url + '" is not in the list of allowed origins');
            } else if (!this.supports(url, method, data)) {
                throw new Error('The request with the specified URL, method and data isn\'t supported by the AJAX transport');
            }

            var request = new Request(url, method, data);
            this.trigger('request-created', {request: request});
            return request;
        },

        dispatch: function (request) {
            request.freeze();
            return this._.transport.dispatch(request);
        }
    });

    _context.register(Service, 'Service');

}, {
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});

_context.invoke('Nittro.Ajax.Transport', function (Nittro, Response, Url) {

    var Native = _context.extend(function() {

    }, {
        STATIC: {
            createXhr: function () {
                if (window.XMLHttpRequest) {
                    return new XMLHttpRequest();
                } else if (window.ActiveXObject) {
                    try {
                        return new ActiveXObject('Msxml2.XMLHTTP');
                    } catch (e) {
                        return new ActiveXObject('Microsoft.XMLHTTP');
                    }
                }
            }
        },

        supports: function (url, method, data) {
            if (data && Nittro.Forms && data instanceof Nittro.Forms.FormData && data.isUpload() && !window.FormData) {
                return false;
            }

            if ((!window.XMLHttpRequest || !('withCredentials' in XMLHttpRequest.prototype)) && Url.fromCurrent().compare(url) >= Url.PART.PORT) {
                return false;
            }

            return true;
        },

        dispatch: function (request) {
            var xhr = Native.createXhr(),
                adv = this._checkSupport(request, xhr),
                abort = xhr.abort.bind(xhr);

            if (request.isAborted()) {
                request.setRejected(this._createError(request, xhr, {type: 'abort'}));
                return request;
            }

            this._bindEvents(request, xhr, adv);

            xhr.open(request.getMethod(), request.getUrl().toAbsolute(), true);

            var data = this._formatData(request, xhr);
            this._addHeaders(request, xhr);
            xhr.send(data);

            request.setDispatched(abort);

            return request;

        },

        _checkSupport: function (request, xhr) {
            var adv;

            if (!(adv = 'addEventListener' in xhr) && !('onreadystatechange' in xhr)) {
                throw new Error('Unsupported XHR implementation');
            }

            return adv;

        },

        _bindEvents: function (request, xhr, adv) {
            var self = this,
                done = false;

            function onLoad(evt) {
                if (done) return;
                done = true;

                if (xhr.status >= 200 && xhr.status < 300) {
                    request.setFulfilled(self._createResponse(xhr));
                } else {
                    request.setRejected(self._createError(request, xhr, evt));
                }
            }

            function onError(evt) {
                if (done) return;
                done = true;

                request.setRejected(self._createError(request, xhr, evt));
            }

            function onProgress(evt) {
                request.trigger('progress', {
                    lengthComputable: evt.lengthComputable,
                    loaded: evt.loaded,
                    total: evt.total
                });
            }

            if (adv) {
                xhr.addEventListener('load', onLoad, false);
                xhr.addEventListener('error', onError, false);
                xhr.addEventListener('abort', onError, false);

                if ('upload' in xhr) {
                    xhr.upload.addEventListener('progress', onProgress, false);
                }
            } else {
                xhr.onreadystatechange = function () {
                    if (xhr.readyState === 4) {
                        if (xhr.status >= 200 && xhr.status < 300) {
                            onLoad();
                        } else {
                            onError();
                        }
                    }
                };

                if ('ontimeout' in xhr) {
                    xhr.ontimeout = onError;
                }

                if ('onerror' in xhr) {
                    xhr.onerror = onError;
                }

                if ('onload' in xhr) {
                    xhr.onload = onLoad;
                }
            }
        },

        _addHeaders: function (request, xhr) {
            var headers = request.getHeaders(),
                h;

            for (h in headers) {
                if (headers.hasOwnProperty(h)) {
                    xhr.setRequestHeader(h, headers[h]);
                }
            }

            if (!headers.hasOwnProperty('X-Requested-With')) {
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
            }
        },

        _formatData: function (request, xhr) {
            var data = request.getData();

            if (Nittro.Forms && data instanceof Nittro.Forms.FormData) {
                data = data.exportData(request.isGet() || request.isMethod('HEAD'));

                if (!window.FormData || !(data instanceof window.FormData)) {
                    data = Url.buildQuery(data, true);
                    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
                }
            } else {
                data = Url.buildQuery(data);
                xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
            }

            return data;
        },

        _createResponse: function (xhr) {
            var payload,
                headers = {};

            (xhr.getAllResponseHeaders() || '').trim().split(/\r\n/g).forEach(function(header) {
                if (header && !header.match(/^\s*$/)) {
                    header = header.match(/^\s*([^:]+):\s*(.+?)\s*$/);
                    headers[header[1].toLowerCase()] = header[2];
                }
            });

            if (headers['content-type'] && headers['content-type'].split(/;/)[0] === 'application/json') {
                payload = JSON.parse(xhr.responseText || '{}');
            } else {
                payload = xhr.responseText;
            }

            return new Response(xhr.status, payload, headers);
        },

        _createError: function (request, xhr, evt) {
            if (xhr.readyState === 4 && xhr.status !== 0) {
                request.setResponse(this._createResponse(xhr));
            }

            if (evt && evt.type === 'abort') {
                return {
                    type: 'abort',
                    status: null,
                    request: request
                };
            } else if (xhr.status === 0) {
                return {
                    type: 'connection',
                    status: null,
                    request: request
                };
            } else if (xhr.status < 200 || xhr.status >= 300) {
                return {
                    type: 'response',
                    status: xhr.status,
                    request: request
                };
            }

            return {
                type: 'unknown',
                status: xhr.status,
                request: request
            };
        }
    });

    _context.register(Native, 'Native');

}, {
    Url: 'Utils.Url',
    Response: 'Nittro.Ajax.Response'
});

/**
 * NetteForms - simple form validation.
 *
 * This file is part of the Nette Framework (https://nette.org)
 * Copyright (c) 2004 David Grudl (https://davidgrudl.com)
 */

(function(global, factory) {
	if (!global.JSON) {
		return;
	}

	if (typeof define === 'function' && define.amd) {
		define(function() {
			return factory(global);
		});
	} else if (typeof module === 'object' && typeof module.exports === 'object') {
		module.exports = factory(global);
	} else {
		var init = !global.Nette || !global.Nette.noInit;
		global.Nette = factory(global);
		if (init) {
			global.Nette.initOnLoad();
		}
	}

}(typeof window !== 'undefined' ? window : this, function(window) {

	'use strict';

	var Nette = {};

	Nette.formErrors = [];
	Nette.version = '2.4';


	/**
	 * Attaches a handler to an event for the element.
	 */
	Nette.addEvent = function(element, on, callback) {
		if (on === 'DOMContentLoaded' && element.readyState !== 'loading') {
			callback.call(this);
		} else if (element.addEventListener) {
			element.addEventListener(on, callback);
		} else if (on === 'DOMContentLoaded') {
			element.attachEvent('onreadystatechange', function() {
				if (element.readyState === 'complete') {
					callback.call(this);
				}
			});
		} else {
			element.attachEvent('on' + on, getHandler(callback));
		}
	};


	function getHandler(callback) {
		return function(e) {
			return callback.call(this, e);
		};
	}


	/**
	 * Returns the value of form element.
	 */
	Nette.getValue = function(elem) {
		var i;
		if (!elem) {
			return null;

		} else if (!elem.tagName) { // RadioNodeList, HTMLCollection, array
			return elem[0] ? Nette.getValue(elem[0]) : null;

		} else if (elem.type === 'radio') {
			var elements = elem.form.elements; // prevents problem with name 'item' or 'namedItem'
			for (i = 0; i < elements.length; i++) {
				if (elements[i].name === elem.name && elements[i].checked) {
					return elements[i].value;
				}
			}
			return null;

		} else if (elem.type === 'file') {
			return elem.files || elem.value;

		} else if (elem.tagName.toLowerCase() === 'select') {
			var index = elem.selectedIndex,
				options = elem.options,
				values = [];

			if (elem.type === 'select-one') {
				return index < 0 ? null : options[index].value;
			}

			for (i = 0; i < options.length; i++) {
				if (options[i].selected) {
					values.push(options[i].value);
				}
			}
			return values;

		} else if (elem.name && elem.name.match(/\[\]$/)) { // multiple elements []
			elements = elem.form.elements[elem.name].tagName ? [elem] : elem.form.elements[elem.name];
			values = [];

			for (i = 0; i < elements.length; i++) {
				if (elements[i].type !== 'checkbox' || elements[i].checked) {
					values.push(elements[i].value);
				}
			}
			return values;

		} else if (elem.type === 'checkbox') {
			return elem.checked;

		} else if (elem.tagName.toLowerCase() === 'textarea') {
			return elem.value.replace('\r', '');

		} else {
			return elem.value.replace('\r', '').replace(/^\s+|\s+$/g, '');
		}
	};


	/**
	 * Returns the effective value of form element.
	 */
	Nette.getEffectiveValue = function(elem) {
		var val = Nette.getValue(elem);
		if (elem.getAttribute) {
			if (val === elem.getAttribute('data-nette-empty-value')) {
				val = '';
			}
		}
		return val;
	};


	/**
	 * Validates form element against given rules.
	 */
	Nette.validateControl = function(elem, rules, onlyCheck, value, emptyOptional) {
		elem = elem.tagName ? elem : elem[0]; // RadioNodeList
		rules = rules || Nette.parseJSON(elem.getAttribute('data-nette-rules'));
		value = value === undefined ? {value: Nette.getEffectiveValue(elem)} : value;

		for (var id = 0, len = rules.length; id < len; id++) {
			var rule = rules[id],
				op = rule.op.match(/(~)?([^?]+)/),
				curElem = rule.control ? elem.form.elements.namedItem(rule.control) : elem;

			rule.neg = op[1];
			rule.op = op[2];
			rule.condition = !!rule.rules;

			if (!curElem) {
				continue;
			} else if (rule.op === 'optional') {
				emptyOptional = !Nette.validateRule(elem, ':filled', null, value);
				continue;
			} else if (emptyOptional && !rule.condition && rule.op !== ':filled') {
				continue;
			}

			curElem = curElem.tagName ? curElem : curElem[0]; // RadioNodeList
			var curValue = elem === curElem ? value : {value: Nette.getEffectiveValue(curElem)},
				success = Nette.validateRule(curElem, rule.op, rule.arg, curValue);

			if (success === null) {
				continue;
			} else if (rule.neg) {
				success = !success;
			}

			if (rule.condition && success) {
				if (!Nette.validateControl(elem, rule.rules, onlyCheck, value, rule.op === ':blank' ? false : emptyOptional)) {
					return false;
				}
			} else if (!rule.condition && !success) {
				if (Nette.isDisabled(curElem)) {
					continue;
				}
				if (!onlyCheck) {
					var arr = Nette.isArray(rule.arg) ? rule.arg : [rule.arg],
						message = rule.msg.replace(/%(value|\d+)/g, function(foo, m) {
							return Nette.getValue(m === 'value' ? curElem : elem.form.elements.namedItem(arr[m].control));
						});
					Nette.addError(curElem, message);
				}
				return false;
			}
		}

		if (elem.type === 'number' && !elem.validity.valid) {
			if (!onlyCheck) {
				Nette.addError(elem, 'Please enter a valid value.');
			}
			return false;
		}

		return true;
	};


	/**
	 * Validates whole form.
	 */
	Nette.validateForm = function(sender, onlyCheck) {
		var form = sender.form || sender,
			scope = false;

		Nette.formErrors = [];

		if (form['nette-submittedBy'] && form['nette-submittedBy'].getAttribute('formnovalidate') !== null) {
			var scopeArr = Nette.parseJSON(form['nette-submittedBy'].getAttribute('data-nette-validation-scope'));
			if (scopeArr.length) {
				scope = new RegExp('^(' + scopeArr.join('-|') + '-)');
			} else {
				Nette.showFormErrors(form, []);
				return true;
			}
		}

		var radios = {}, i, elem;

		for (i = 0; i < form.elements.length; i++) {
			elem = form.elements[i];

			if (elem.tagName && !(elem.tagName.toLowerCase() in {input: 1, select: 1, textarea: 1, button: 1})) {
				continue;

			} else if (elem.type === 'radio') {
				if (radios[elem.name]) {
					continue;
				}
				radios[elem.name] = true;
			}

			if ((scope && !elem.name.replace(/]\[|\[|]|$/g, '-').match(scope)) || Nette.isDisabled(elem)) {
				continue;
			}

			if (!Nette.validateControl(elem, null, onlyCheck) && !Nette.formErrors.length) {
				return false;
			}
		}
		var success = !Nette.formErrors.length;
		Nette.showFormErrors(form, Nette.formErrors);
		return success;
	};


	/**
	 * Check if input is disabled.
	 */
	Nette.isDisabled = function(elem) {
		if (elem.type === 'radio') {
			for (var i = 0, elements = elem.form.elements; i < elements.length; i++) {
				if (elements[i].name === elem.name && !elements[i].disabled) {
					return false;
				}
			}
			return true;
		}
		return elem.disabled;
	};


	/**
	 * Adds error message to the queue.
	 */
	Nette.addError = function(elem, message) {
		Nette.formErrors.push({
			element: elem,
			message: message
		});
	};


	/**
	 * Display error messages.
	 */
	Nette.showFormErrors = function(form, errors) {
		var messages = [],
			focusElem;

		for (var i = 0; i < errors.length; i++) {
			var elem = errors[i].element,
				message = errors[i].message;

			if (!Nette.inArray(messages, message)) {
				messages.push(message);

				if (!focusElem && elem.focus) {
					focusElem = elem;
				}
			}
		}

		if (messages.length) {
			alert(messages.join('\n'));

			if (focusElem) {
				focusElem.focus();
			}
		}
	};


	/**
	 * Expand rule argument.
	 */
	Nette.expandRuleArgument = function(form, arg) {
		if (arg && arg.control) {
			var control = form.elements.namedItem(arg.control),
				value = {value: Nette.getEffectiveValue(control)};
			Nette.validateControl(control, null, true, value);
			arg = value.value;
		}
		return arg;
	};


	var preventFiltering = false;

	/**
	 * Validates single rule.
	 */
	Nette.validateRule = function(elem, op, arg, value) {
		value = value === undefined ? {value: Nette.getEffectiveValue(elem)} : value;

		if (op.charAt(0) === ':') {
			op = op.substr(1);
		}
		op = op.replace('::', '_');
		op = op.replace(/\\/g, '');

		var arr = Nette.isArray(arg) ? arg.slice(0) : [arg];
		if (!preventFiltering) {
			preventFiltering = true;
			for (var i = 0, len = arr.length; i < len; i++) {
				arr[i] = Nette.expandRuleArgument(elem.form, arr[i]);
			}
			preventFiltering = false;
		}
		return Nette.validators[op]
			? Nette.validators[op](elem, Nette.isArray(arg) ? arr : arr[0], value.value, value)
			: null;
	};


	Nette.validators = {
		filled: function(elem, arg, val) {
			if (elem.type === 'number' && elem.validity.badInput) {
				return true;
			}
			return val !== '' && val !== false && val !== null
				&& (!Nette.isArray(val) || !!val.length)
				&& (!window.FileList || !(val instanceof window.FileList) || val.length);
		},

		blank: function(elem, arg, val) {
			return !Nette.validators.filled(elem, arg, val);
		},

		valid: function(elem) {
			return Nette.validateControl(elem, null, true);
		},

		equal: function(elem, arg, val) {
			if (arg === undefined) {
				return null;
			}

			function toString(val) {
				if (typeof val === 'number' || typeof val === 'string') {
					return '' + val;
				} else {
					return val === true ? '1' : '';
				}
			}

			val = Nette.isArray(val) ? val : [val];
			arg = Nette.isArray(arg) ? arg : [arg];
			loop:
			for (var i1 = 0, len1 = val.length; i1 < len1; i1++) {
				for (var i2 = 0, len2 = arg.length; i2 < len2; i2++) {
					if (toString(val[i1]) === toString(arg[i2])) {
						continue loop;
					}
				}
				return false;
			}
			return true;
		},

		notEqual: function(elem, arg, val) {
			return arg === undefined ? null : !Nette.validators.equal(elem, arg, val);
		},

		minLength: function(elem, arg, val) {
			if (elem.type === 'number') {
				if (elem.validity.tooShort) {
					return false;
				} else if (elem.validity.badInput) {
					return null;
				}
			}
			return val.length >= arg;
		},

		maxLength: function(elem, arg, val) {
			if (elem.type === 'number') {
				if (elem.validity.tooLong) {
					return false;
				} else if (elem.validity.badInput) {
					return null;
				}
			}
			return val.length <= arg;
		},

		length: function(elem, arg, val) {
			if (elem.type === 'number') {
				if (elem.validity.tooShort || elem.validity.tooLong) {
					return false;
				} else if (elem.validity.badInput) {
					return null;
				}
			}
			arg = Nette.isArray(arg) ? arg : [arg, arg];
			return (arg[0] === null || val.length >= arg[0]) && (arg[1] === null || val.length <= arg[1]);
		},

		email: function(elem, arg, val) {
			return (/^("([ !#-[\]-~]|\\[ -~])+"|[-a-z0-9!#$%&'*+/=?^_`{|}~]+(\.[-a-z0-9!#$%&'*+/=?^_`{|}~]+)*)@([0-9a-z\u00C0-\u02FF\u0370-\u1EFF]([-0-9a-z\u00C0-\u02FF\u0370-\u1EFF]{0,61}[0-9a-z\u00C0-\u02FF\u0370-\u1EFF])?\.)+[a-z\u00C0-\u02FF\u0370-\u1EFF]([-0-9a-z\u00C0-\u02FF\u0370-\u1EFF]{0,17}[a-z\u00C0-\u02FF\u0370-\u1EFF])?$/i).test(val);
		},

		url: function(elem, arg, val, value) {
			if (!(/^[a-z\d+.-]+:/).test(val)) {
				val = 'http://' + val;
			}
			if ((/^https?:\/\/((([-_0-9a-z\u00C0-\u02FF\u0370-\u1EFF]+\.)*[0-9a-z\u00C0-\u02FF\u0370-\u1EFF]([-0-9a-z\u00C0-\u02FF\u0370-\u1EFF]{0,61}[0-9a-z\u00C0-\u02FF\u0370-\u1EFF])?\.)?[a-z\u00C0-\u02FF\u0370-\u1EFF]([-0-9a-z\u00C0-\u02FF\u0370-\u1EFF]{0,17}[a-z\u00C0-\u02FF\u0370-\u1EFF])?|\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}|\[[0-9a-f:]{3,39}\])(:\d{1,5})?(\/\S*)?$/i).test(val)) {
				value.value = val;
				return true;
			}
			return false;
		},

		regexp: function(elem, arg, val) {
			var parts = typeof arg === 'string' ? arg.match(/^\/(.*)\/([imu]*)$/) : false;
			try {
				return parts && (new RegExp(parts[1], parts[2].replace('u', ''))).test(val);
			} catch (e) {} // eslint-disable-line no-empty
		},

		pattern: function(elem, arg, val, value, caseInsensitive) {
			if (typeof arg !== 'string') {
				return null;
			}

			try {
				try {
					var regExp = new RegExp('^(?:' + arg + ')$', caseInsensitive ? 'ui' : 'u');
				} catch (e) {
					regExp = new RegExp('^(?:' + arg + ')$', caseInsensitive ? 'i' : '');
				}

				if (window.FileList && val instanceof FileList) {
					for (var i = 0; i < val.length; i++) {
						if (!regExp.test(val[i].name)) {
							return false;
						}
					}

					return true;
				}

				return regExp.test(val);
			} catch (e) {} // eslint-disable-line no-empty
		},

		patternCaseInsensitive: function(elem, arg, val) {
			return Nette.validators.pattern(elem, arg, val, null, true);
		},

		integer: function(elem, arg, val) {
			if (elem.type === 'number' && elem.validity.badInput) {
				return false;
			}
			return (/^-?[0-9]+$/).test(val);
		},

		'float': function(elem, arg, val, value) {
			if (elem.type === 'number' && elem.validity.badInput) {
				return false;
			}
			val = val.replace(/ +/g, '').replace(/,/g, '.');
			if ((/^-?[0-9]*\.?[0-9]+$/).test(val)) {
				value.value = val;
				return true;
			}
			return false;
		},

		min: function(elem, arg, val) {
			if (elem.type === 'number') {
				if (elem.validity.rangeUnderflow) {
					return false;
				} else if (elem.validity.badInput) {
					return null;
				}
			}
			return arg === null || parseFloat(val) >= arg;
		},

		max: function(elem, arg, val) {
			if (elem.type === 'number') {
				if (elem.validity.rangeOverflow) {
					return false;
				} else if (elem.validity.badInput) {
					return null;
				}
			}
			return arg === null || parseFloat(val) <= arg;
		},

		range: function(elem, arg, val) {
			if (elem.type === 'number') {
				if (elem.validity.rangeUnderflow || elem.validity.rangeOverflow) {
					return false;
				} else if (elem.validity.badInput) {
					return null;
				}
			}
			return Nette.isArray(arg) ?
				((arg[0] === null || parseFloat(val) >= arg[0]) && (arg[1] === null || parseFloat(val) <= arg[1])) : null;
		},

		submitted: function(elem) {
			return elem.form['nette-submittedBy'] === elem;
		},

		fileSize: function(elem, arg, val) {
			if (window.FileList) {
				for (var i = 0; i < val.length; i++) {
					if (val[i].size > arg) {
						return false;
					}
				}
			}
			return true;
		},

		image: function (elem, arg, val) {
			if (window.FileList && val instanceof window.FileList) {
				for (var i = 0; i < val.length; i++) {
					var type = val[i].type;
					if (type && type !== 'image/gif' && type !== 'image/png' && type !== 'image/jpeg') {
						return false;
					}
				}
			}
			return true;
		},

		'static': function (elem, arg) {
			return arg;
		}
	};


	/**
	 * Process all toggles in form.
	 */
	Nette.toggleForm = function(form, elem) {
		var i;
		Nette.toggles = {};
		for (i = 0; i < form.elements.length; i++) {
			if (form.elements[i].tagName.toLowerCase() in {input: 1, select: 1, textarea: 1, button: 1}) {
				Nette.toggleControl(form.elements[i], null, null, !elem);
			}
		}

		for (i in Nette.toggles) {
			Nette.toggle(i, Nette.toggles[i], elem);
		}
	};


	/**
	 * Process toggles on form element.
	 */
	Nette.toggleControl = function(elem, rules, success, firsttime, value) {
		rules = rules || Nette.parseJSON(elem.getAttribute('data-nette-rules'));
		value = value === undefined ? {value: Nette.getEffectiveValue(elem)} : value;

		var has = false,
			handled = [],
			handler = function () {
				Nette.toggleForm(elem.form, elem);
			},
			curSuccess;

		for (var id = 0, len = rules.length; id < len; id++) {
			var rule = rules[id],
				op = rule.op.match(/(~)?([^?]+)/),
				curElem = rule.control ? elem.form.elements.namedItem(rule.control) : elem;

			if (!curElem) {
				continue;
			}

			curSuccess = success;
			if (success !== false) {
				rule.neg = op[1];
				rule.op = op[2];
				var curValue = elem === curElem ? value : {value: Nette.getEffectiveValue(curElem)};
				curSuccess = Nette.validateRule(curElem, rule.op, rule.arg, curValue);
				if (curSuccess === null) {
					continue;

				} else if (rule.neg) {
					curSuccess = !curSuccess;
				}
				if (!rule.rules) {
					success = curSuccess;
				}
			}

			if ((rule.rules && Nette.toggleControl(elem, rule.rules, curSuccess, firsttime, value)) || rule.toggle) {
				has = true;
				if (firsttime) {
					var oldIE = !document.addEventListener, // IE < 9
						name = curElem.tagName ? curElem.name : curElem[0].name,
						els = curElem.tagName ? curElem.form.elements : curElem;

					for (var i = 0; i < els.length; i++) {
						if (els[i].name === name && !Nette.inArray(handled, els[i])) {
							Nette.addEvent(els[i], oldIE && els[i].type in {checkbox: 1, radio: 1} ? 'click' : 'change', handler);
							handled.push(els[i]);
						}
					}
				}
				for (var id2 in rule.toggle || []) {
					if (Object.prototype.hasOwnProperty.call(rule.toggle, id2)) {
						Nette.toggles[id2] = Nette.toggles[id2] || (rule.toggle[id2] ? curSuccess : !curSuccess);
					}
				}
			}
		}
		return has;
	};


	Nette.parseJSON = function(s) {
		return (s || '').substr(0, 3) === '{op'
			? eval('[' + s + ']') // backward compatibility with Nette 2.0.x
			: JSON.parse(s || '[]');
	};


	/**
	 * Displays or hides HTML element.
	 */
	Nette.toggle = function(id, visible, srcElement) { // eslint-disable-line no-unused-vars
		var elem = document.getElementById(id);
		if (elem) {
			elem.style.display = visible ? '' : 'none';
		}
	};


	/**
	 * Setup handlers.
	 */
	Nette.initForm = function(form) {
		Nette.toggleForm(form);

		if (form.noValidate) {
			return;
		}

		form.noValidate = true;

		Nette.addEvent(form, 'submit', function(e) {
			if (!Nette.validateForm(form)) {
				if (e && e.stopPropagation) {
					e.stopPropagation();
					e.preventDefault();
				} else if (window.event) {
					event.cancelBubble = true;
					event.returnValue = false;
				}
			}
		});
	};


	/**
	 * @private
	 */
	Nette.initOnLoad = function() {
		Nette.addEvent(document, 'DOMContentLoaded', function() {
			for (var i = 0; i < document.forms.length; i++) {
				var form = document.forms[i];
				for (var j = 0; j < form.elements.length; j++) {
					if (form.elements[j].getAttribute('data-nette-rules')) {
						Nette.initForm(form);
						break;
					}
				}
			}

			Nette.addEvent(document.body, 'click', function(e) {
				var target = e.target || e.srcElement;
				while (target) {
					if (target.form && target.type in {submit: 1, image: 1}) {
						target.form['nette-submittedBy'] = target;
						break;
					}
					target = target.parentNode;
				}
			});
		});
	};


	/**
	 * Determines whether the argument is an array.
	 */
	Nette.isArray = function(arg) {
		return Object.prototype.toString.call(arg) === '[object Array]';
	};


	/**
	 * Search for a specified value within an array.
	 */
	Nette.inArray = function(arr, val) {
		if ([].indexOf) {
			return arr.indexOf(val) > -1;
		} else {
			for (var i = 0; i < arr.length; i++) {
				if (arr[i] === val) {
					return true;
				}
			}
			return false;
		}
	};


	/**
	 * Converts string to web safe characters [a-z0-9-] text.
	 */
	Nette.webalize = function(s) {
		s = s.toLowerCase();
		var res = '', i, ch;
		for (i = 0; i < s.length; i++) {
			ch = Nette.webalizeTable[s.charAt(i)];
			res += ch ? ch : s.charAt(i);
		}
		return res.replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
	};

	Nette.webalizeTable = {\u00e1: 'a', \u00e4: 'a', \u010d: 'c', \u010f: 'd', \u00e9: 'e', \u011b: 'e', \u00ed: 'i', \u013e: 'l', \u0148: 'n', \u00f3: 'o', \u00f4: 'o', \u0159: 'r', \u0161: 's', \u0165: 't', \u00fa: 'u', \u016f: 'u', \u00fd: 'y', \u017e: 'z'};

	return Nette;
}));

_context.invoke('Nittro.Forms', function () {
    var Nette;

    if (typeof module === 'object' && typeof module.exports === 'object') {
        Nette = require('nette-forms');
    } else {
        Nette = window.Nette;
    }

    if (!Nette || !Nette.validators) {
        throw new Error('netteForms.js asset from Nette/Forms has not been loaded');
    }

    _context.register(Nette, 'Vendor');

});

_context.invoke('Nittro.Forms', function(undefined) {

    var FormData = _context.extend(function() {
        this._ = {
            dataStorage: [],
            upload: false
        };
    }, {
        append: function(name, value) {
            if (value === undefined || value === null) {
                return this;

            }

            if (this._isFile(value)) {
                this._.upload = true;

            } else if (typeof value === 'object' && 'valueOf' in value && /string|number|boolean/.test(typeof value.valueOf()) && !arguments[2]) {
                return this.append(name, value.valueOf(), true);

            } else if (!/string|number|boolean/.test(typeof value)) {
                throw new Error('Only scalar values and File/Blob objects can be appended to FormData, ' + (typeof value) + ' given');

            }

            this._.dataStorage.push({ name: name, value: value });

            return this;

        },

        isUpload: function() {
            return this._.upload;

        },

        _isFile: function(value) {
            return window.File !== undefined && value instanceof window.File || window.Blob !== undefined && value instanceof window.Blob;

        },

        mergeData: function(data) {
            for (var i = 0; i < data.length; i++) {
                this.append(data[i].name, data[i].value);

            }

            return this;

        },

        exportData: function(forcePlain) {
            if (!forcePlain && this.isUpload() && window.FormData !== undefined) {
                var fd = new window.FormData(),
                    i;

                for (i = 0; i < this._.dataStorage.length; i++) {
                    if (typeof this._.dataStorage[i].value === 'boolean') {
                        fd.append(this._.dataStorage[i].name, this._.dataStorage[i].value ? 1 : 0);
                    } else {
                        fd.append(this._.dataStorage[i].name, this._.dataStorage[i].value);
                    }
                }

                return fd;

            } else {
                return this._.dataStorage.filter(function(e) {
                    return !this._isFile(e.value);

                }, this);

            }
        }
    });

    _context.register(FormData, 'FormData');

});

_context.invoke('Nittro.Forms', function (DOM, Arrays, DateTime, FormData, Vendor, undefined) {

    var FileList = window.FileList || function() {};

    var Form = _context.extend('Nittro.Object', function (form) {
        Form.Super.call(this);

        this._.submittedBy = null;
        this._.inLiveValidation = false;
        this._.errorRenderer = null;
        this._handleSubmit = this._handleSubmit.bind(this);
        this._handleReset = this._handleReset.bind(this);

        this.setElement(form);

        this.on('error:default', this._handleError.bind(this));
        this.on('blur:default', this._handleBlur.bind(this));

    }, {
        setErrorRenderer: function (renderer) {
            this._.errorRenderer = renderer;
        },

        setElement: function (form) {
            if (typeof form === 'string') {
                form = DOM.getById(form);
            }

            if (!form || !(form instanceof HTMLFormElement)) {
                throw new TypeError('Invalid argument, must be a HTMLFormElement');
            }

            this._.form = form;
            this._.form.noValidate = 'novalidate';
            this._.validationMode = DOM.getData(form, 'validation-mode');

            if (this._.submittedBy) {
                this._.form['nette-submittedBy'] = this.getElement(this._.submittedBy);
            }

            DOM.addListener(this._.form, 'submit', this._handleSubmit);
            DOM.addListener(this._.form, 'reset', this._handleReset);

            return this;
        },

        getElement: function (name) {
            return name ? this._.form.elements.namedItem(name) : this._.form;
        },

        getElements: function () {
            return this._.form.elements;
        },

        setSubmittedBy: function (value) {
            if (value) {
                this._.submittedBy = value;
                this._.form['nette-submittedBy'] = this.getElement(value);
            } else {
                this._.submittedBy = this._.form['nette-submittedBy'] = null;
            }

            return this;
        },

        validate: function (sender) {
            if (this._.errorRenderer) {
                this._.errorRenderer.cleanupErrors(this._.form);
            }

            if (!Vendor.validateForm(sender || this._.form)) {
                return false;
            }

            var evt = this.trigger('validate', {
                sender: sender
            });

            return !evt.isDefaultPrevented();
        },

        setValues: function (values, reset) {
            var names = this._getFieldNames(),
                name, value, i;

            values || (values = {});

            for (i = 0; i < names.length; i++) {
                name = names[i];
                value = undefined;

                if (name.indexOf('[') > -1) {
                    value = values;

                    name.replace(/]/g, '').split(/\[/g).some(function (key) {
                        if (key === '') {
                            return true;
                        } else if (!(key in value)) {
                            value = undefined;
                            return true;
                        } else {
                            value = value[key];
                            return false;
                        }
                    });
                } else if (name in values) {
                    value = values[name];
                }

                if (value === undefined) {
                    if (reset) {
                        value = null;
                    } else {
                        continue;
                    }
                }

                this.setValue(name, value);
            }
        },

        setValue: function (elem, value) {
            if (typeof elem === 'string') {
                elem = this._.form.elements.namedItem(elem);
            }

            var i,
                toStr = function(v) { return '' + v; };

            if (!elem) {
                throw new TypeError('Invalid argument to setValue(), must be (the name of) an existing form element');
            } else if (!elem.tagName) {
                if ('length' in elem) {
                    for (i = 0; i < elem.length; i++) {
                        this.setValue(elem[i], value);
                    }
                }
            } else if (elem.type === 'radio') {
                elem.checked = value !== null && elem.value === toStr(value);
            } else if (elem.type === 'file') {
                if (value === null) {
                    value = elem.parentNode.innerHTML;
                    DOM.html(elem.parentNode, value);
                }
            } else if (elem.tagName.toLowerCase() === 'select') {
                var single = elem.type === 'select-one',
                    arr = Array.isArray(value),
                    v;

                if (arr) {
                    value = value.map(toStr);
                } else {
                    value = toStr(value);
                }

                for (i = 0; i < elem.options.length; i++) {
                    v = arr ? value.indexOf(elem.options.item(i).value) > -1 : value === elem.options.item(i).value;
                    elem.options.item(i).selected = v;

                    if (v && single) {
                        break;
                    }
                }
            } else if (elem.type === 'checkbox') {
                elem.checked = Array.isArray(value) ? value.map(toStr).indexOf(elem.value) > -1 : !!value;
            } else if (elem.type === 'date') {
                elem.value = value ? DateTime.from(value).format('Y-m-d') : '';
            } else if (elem.type === 'datetime-local' || elem.type === 'datetime') {
                elem.value = value ? DateTime.from(value).format('Y-m-d\\TH:i:s') : '';
            } else {
                elem.value = value !== null ? toStr(value) : '';
            }

            return this;
        },

        getValue: function (name) {
            return Vendor.getEffectiveValue(this.getElement(name));
        },

        serialize: function () {
            var elem, i,
                data = new FormData(),
                names = this._getFieldNames(true),
                value;

            if (this._.submittedBy) {
                names.push(this._.submittedBy);
            }

            for (i = 0; i < names.length; i++) {
                elem = this._.form.elements.namedItem(names[i]);
                value = Vendor.getEffectiveValue(elem);

                if (Array.isArray(value) || value instanceof FileList) {
                    for (var j = 0; j < value.length; j++) {
                        data.append(names[i], value[j]);
                    }
                } else {
                    data.append(names[i], value);
                }
            }

            this.trigger('serialize', data);

            return data;
        },

        submit: function (by) {
            if (by) {
                var btn = this._.form.elements.namedItem(by);

                if (btn && btn.type === 'submit') {
                    DOM.trigger(btn, 'click');
                } else {
                    throw new TypeError('Unknown element or not a submit button: ' + by);
                }
            } else {
                DOM.trigger(this._.form, 'submit');
            }

            return this;
        },

        reset: function () {
            this._.form.reset();
            return this;
        },

        destroy: function () {
            this.trigger('destroy');
            this.off();
            DOM.removeListener(this._.form, 'submit', this._handleSubmit);
            DOM.removeListener(this._.form, 'reset', this._handleReset);
            this._.form = null;
        },

        _handleSubmit: function (evt) {
            if (this.trigger('submit').isDefaultPrevented()) {
                evt.preventDefault();
                return;
            }

            var sender = this._.submittedBy ? this.getElement(this._.submittedBy) : null;

            if (!this.validate(sender)) {
                evt.preventDefault();
            }
        },

        _handleReset: function (evt) {
            if (evt.target !== this._.form) {
                return;
            }

            var elem, i;

            for (i = 0; i < this._.form.elements.length; i++) {
                elem = this._.form.elements.item(i);

                if (elem.type === 'hidden' && elem.hasAttribute('data-default-value')) {
                    this.setValue(elem, DOM.getData(elem, 'default-value'));
                } else if (elem.type === 'file') {
                    this.setValue(elem, null);
                }
            }

            this._.submittedBy = this._.form['nette-submittedBy'] = null;

            this.trigger('reset');
        },

        _handleError: function (evt) {
            if (this._.errorRenderer) {
                this._.errorRenderer.addError(this._.form, evt.data.element, evt.data.message);
            }

            if (!this._.inLiveValidation && evt.data.element && typeof evt.data.element.focus === 'function') {
                evt.data.element.focus();
            }
        },

        _handleBlur: function (evt) {
            if (this._.errorRenderer) {
                this._.errorRenderer.cleanupErrors(this._.form, evt.data.element);
            }

            if (DOM.getData(evt.data.element, 'validation-mode', this._.validationMode) === 'live') {
                this._.inLiveValidation = true;
                Vendor.validateControl(evt.data.element);
                this._.inLiveValidation = false;
            }
        },

        _getFieldNames: function (enabledOnly) {
            var elem, i,
                names = [];

            for (i = 0; i < this._.form.elements.length; i++) {
                elem = this._.form.elements.item(i);

                if (elem.name && (!enabledOnly || !elem.disabled) && names.indexOf(elem.name) === -1 && !(elem.type in {submit: 1, button: 1, reset: 1})) {
                    names.push(elem.name);
                }
            }

            return names;
        }
    });

    _context.register(Form, 'Form');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    DateTime: 'Utils.DateTime'
});

_context.invoke('Nittro.Forms', function (Form, Vendor, DOM, Arrays) {

    var anonId = 0;

    var Locator = _context.extend('Nittro.Object', function (formErrorRenderer) {
        this._ = {
            errorRenderer: formErrorRenderer || null,
            registry: {}
        };

        Vendor.addError = this._forwardError.bind(this);
        DOM.addListener(document, 'blur', this._handleBlur.bind(this), true);

    }, {
        getForm: function (id) {
            var elem;

            if (typeof id !== 'string') {
                elem = id;

                if (!elem.getAttribute('id')) {
                    elem.setAttribute('id', 'frm-anonymous' + (++anonId));
                }

                id = elem.getAttribute('id');

            }

            if (!(id in this._.registry)) {
                this._.registry[id] = new Form(elem || id);
                this._.registry[id].setErrorRenderer(this._.errorRenderer);
                this.trigger('form-added', { form: this._.registry[id] });
            }

            return this._.registry[id];

        },

        removeForm: function (id) {
            if (typeof id !== 'string') {
                id = id.getAttribute('id');
            }

            if (id in this._.registry) {
                this.trigger('form-removed', { form: this._.registry[id] });
                this._.registry[id].destroy();
                delete this._.registry[id];
            }
        },

        refreshForms: function () {
            var elem, id;

            for (id in this._.registry) {
                if (this._.registry.hasOwnProperty(id)) {
                    elem = DOM.getById(id);

                    if (elem) {
                        if (elem !== this._.registry[id].getElement()) {
                            this._.registry[id].setElement(elem);
                        }
                    } else {
                        this.removeForm(id);
                    }
                }
            }

            Arrays.createFrom(document.getElementsByTagName('form'))
                .forEach(this.getForm.bind(this));
        },

        _forwardError: function (elem, msg) {
            this.getForm(elem.form).trigger('error', {element: elem, message: msg});
        },

        _handleBlur: function (evt) {
            if (evt.target.form && evt.target.form instanceof HTMLFormElement) {
                this.getForm(evt.target.form).trigger('blur', { element: evt.target });
            }
        }
    });

    _context.register(Locator, 'Locator');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});

_context.invoke('Nittro.Forms', function (DOM) {

    var DefaultErrorRenderer = _context.extend(function () {

    }, {
        addError: function (form, element, message) {
            var container = this._getErrorContainer(form, element),
                elem;

            if (container) {
                if (element && element.parentNode === container) {
                    elem = DOM.create('span', {'class': 'error'});
                } else {
                    elem = DOM.create(container.tagName.match(/^(ul|ol)$/i) ? 'li' : 'p', {'class': 'error'});
                }

                elem.textContent = message;
                container.appendChild(elem);
            }
        },

        cleanupErrors: function (form, element) {
            var container = element ? this._getErrorContainer(form, element) : form;

            if (container) {
                DOM.getByClassName('error', container)
                    .forEach(function (elem) {
                        elem.parentNode.removeChild(elem);
                    });
            }
        },

        _getErrorContainer: function (form, elem) {
            var container = elem && elem.id ? DOM.getById(elem.id + '-errors') : null;
            return container || DOM.getById(form.id + '-errors') || (elem ? elem.parentNode : null);
        }
    });

    _context.register(DefaultErrorRenderer, 'DefaultErrorRenderer');

}, {
    DOM: 'Utils.DOM'
});

_context.invoke('Nittro.Page', function (DOM, undefined) {

    var Snippet = _context.extend(function (id, phase) {
        this._ = {
            id: id,
            container: false,
            phase: typeof phase === 'number' ? phase : Snippet.INACTIVE,
            data: {},
            handlers: [
                [], [], [], []
            ]
        };
    }, {
        STATIC: {
            INACTIVE: -1,
            PREPARE_SETUP: 0,
            RUN_SETUP: 1,
            PREPARE_TEARDOWN: 2,
            RUN_TEARDOWN: 3
        },

        getId: function () {
            return this._.id;

        },

        setup: function (prepare, run) {
            if (prepare && !run) {
                run = prepare;
                prepare = null;

            }

            if (prepare) {
                if (this._.phase === Snippet.PREPARE_SETUP) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_SETUP].push(prepare);

                }
            }

            if (run) {
                if (this._.phase === Snippet.RUN_SETUP) {
                    run(this.getElement());

                } else {
                    this._.handlers[Snippet.RUN_SETUP].push(run);

                }
            }

            return this;

        },

        teardown: function (prepare, run) {
            if (prepare && !run) {
                run = prepare;
                prepare = null;

            }

            if (prepare) {
                if (this._.phase === Snippet.PREPARE_TEARDOWN) {
                    prepare(this.getElement());

                } else {
                    this._.handlers[Snippet.PREPARE_TEARDOWN].push(prepare);

                }
            }

            if (run) {
                if (this._.phase === Snippet.RUN_TEARDOWN) {
                    run(this.getElement());

                } else {
                    this._.handlers[Snippet.RUN_TEARDOWN].push(run);

                }
            }

            return this;

        },

        runPhase: function (phase) {
            if (phase === Snippet.INACTIVE) {
                this._.phase = phase;

                this._.handlers.forEach(function (queue) {
                    queue.splice(0, queue.length);

                });

            } else if (phase - 1 === this._.phase) {
                this._.phase = phase;

                var elm = this.getElement();

                this._.handlers[this._.phase].forEach(function (handler) {
                    handler(elm);

                });

                this._.handlers[this._.phase].splice(0, this._.handlers[this._.phase].length);

            }

            return this;

        },

        getPhase: function () {
            return this._.phase;

        },

        getData: function (key, def) {
            return key in this._.data ? this._.data[key] : (def === undefined ? null : def);

        },

        setData: function (key, value) {
            this._.data[key] = value;
            return this;

        },

        setContainer: function () {
            this._.container = true;
            return this;

        },

        isContainer: function () {
            return this._.container;

        },

        getElement: function () {
            return DOM.getById(this._.id);

        }
    });

    _context.register(Snippet, 'Snippet');

}, {
    DOM: 'Utils.DOM'
});

_context.invoke('Nittro.Page', function(DOM) {

    var Helpers = {
        buildContent: function(elem, html) {
            elem = elem.split(/\./g);
            elem[0] = DOM.create(elem[0]);

            if (elem.length > 1) {
                DOM.addClass.apply(DOM, elem);
            }

            elem = elem[0];
            DOM.html(elem, html);

            return elem;

        },

        prepareDynamicContainer: function (snippet) {
            var elem = snippet.getElement(),
                params = {
                    id: snippet.getId(),
                    mask: new RegExp('^' + DOM.getData(elem, 'dynamic-mask') + '$'),
                    element: DOM.getData(elem, 'dynamic-element') || 'div',
                    sort: DOM.getData(elem, 'dynamic-sort') || 'append',
                    sortCache: DOM.getData(elem, 'dynamic-sort-cache') === false ? false : null
                };

            snippet.setContainer();
            snippet.setData('_snippet_container', params);
            return params;

        },

        computeSortedSnippets: function (container, snippets, changeset) {
            var sortData = Helpers._getSortData(container.getData('_snippet_container'), container.getElement(), changeset);
            Helpers._mergeSortData(sortData, snippets);
            return Helpers._applySortData(sortData);
        },

        applySortedSnippets: function (container, ids, snippets) {
            var i = 0, n = ids.length, tmp;

            tmp = container.firstElementChild;

            while (i < n && ids[i] in snippets && !snippets[ids[i]].element) {
                container.insertBefore(snippets[ids[i]].content, tmp);
                i++;

            }

            while (n > i && ids[n - 1] in snippets && !snippets[ids[n - 1]].element) {
                n--;

            }

            for (; i < n; i++) {
                if (ids[i] in snippets) {
                    if (snippets[ids[i]].element) {
                        if (snippets[ids[i]].element.previousElementSibling !== (i > 0 ? DOM.getById(ids[i - 1]) : null)) {
                            container.insertBefore(snippets[ids[i]].element, i > 0 ? DOM.getById(ids[i - 1]).nextElementSibling : container.firstElementChild);

                        }
                    } else {
                        container.insertBefore(snippets[ids[i]].content, DOM.getById(ids[i - 1]).nextElementSibling);

                    }
                }
            }

            while (n < ids.length) {
                container.appendChild(snippets[ids[n]].content);
                n++;

            }
        },

        _applySortData: function (sortData) {
            var sorted = [],
                id;

            for (id in sortData.snippets) {
                if (sortData.snippets.hasOwnProperty(id)) {
                    sorted.push({id: id, values: sortData.snippets[id]});

                }
            }

            sorted.sort(Helpers._compareSnippets.bind(null, sortData.descriptor));
            return sorted.map(function(snippet) { return snippet.id; });

        },

        _compareSnippets: function (descriptor, a, b) {
            var i, n, v;

            for (i = 0, n = descriptor.length; i < n; i++) {
                v = a.values[i] < b.values[i] ? -1 : (a.values[i] > b.values[i] ? 1 : 0);

                if (v !== 0) {
                    return v * (descriptor[i].asc ? 1 : -1);

                }
            }

            return 0;

        },

        _getSortData: function (params, elem, changeset) {
            var sortData = params.sortCache;

            if (!sortData) {
                sortData = Helpers._buildSortData(params, elem, changeset);

                if (params.sortCache !== false) {
                    params.sortCache = sortData;

                }
            } else {
                for (var id in sortData.snippets) {
                    if (sortData.snippets.hasOwnProperty(id) && (id in changeset.remove || !DOM.getById(id))) {
                        delete sortData.snippets[id];

                    }
                }
            }

            return sortData;

        },

        _buildSortData: function (params, elem, changeset) {
            var sortData = {
                descriptor: params.sort.trim().split(/\s*,\s*/g).map(Helpers._parseDescriptor.bind(null, params.id)),
                snippets: {}
            };

            var children = {};

            DOM.getChildren(elem).forEach(function(child) {
                if (!(child.id in changeset.remove || child.id in changeset.update)) {
                    children[child.id] = {
                        content: child
                    };
                }
            });

            Helpers._mergeSortData(sortData, children);

            return sortData;

        },

        _mergeSortData: function (sortData, snippets) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    sortData.snippets[id] = Helpers._extractSortData(snippets[id].content, sortData.descriptor);

                }
            }
        },

        _extractSortData: function (elem, descriptor) {
            return descriptor.map(function (field) {
                return field.extractor(elem);

            });
        },

        _parseDescriptor: function (id, descriptor) {
            var m = descriptor.match(/^(.+?)(?:\[(.+?)\])?(?:\((.+?)\))?(?:\s+(.+?))?$/),
                sel, attr, prop, asc;

            if (!m) {
                throw new Error('Invalid sort descriptor: ' + descriptor);

            }

            sel = m[1];
            attr = m[2];
            prop = m[3];
            asc = m[4];

            if (sel.match(/^[^.]|[\s#\[>+:]/)) {
                throw new TypeError('Invalid selector for sorted insert mode in container #' + id);

            }

            sel = sel.substr(1);
            asc = asc ? /^[1tay]/i.test(asc) : true;

            if (attr) {
                return {extractor: Helpers._getAttrExtractor(sel, attr), asc: asc};

            } else if (prop) {
                return {extractor: Helpers._getDataExtractor(sel, prop), asc: asc};

            } else {
                return {extractor: Helpers._getTextExtractor(sel), asc: asc};

            }
        },

        _getAttrExtractor: function (sel, attr) {
            return function (elem) {
                elem = elem.getElementsByClassName(sel);
                return elem.length ? elem[0].getAttribute(attr) || null : null;
            };
        },

        _getDataExtractor: function (sel, prop) {
            return function (elem) {
                elem = elem.getElementsByClassName(sel);
                return elem.length ? DOM.getData(elem[0], prop, null) : null;
            };
        },

        _getTextExtractor: function (sel) {
            return function (elem) {
                elem = elem.getElementsByClassName(sel);
                return elem.length ? elem[0].textContent : null;
            };
        }
    };

    _context.register(Helpers, 'SnippetManagerHelpers');

}, {
    DOM: 'Utils.DOM'
});

_context.invoke('Nittro.Page', function (Helpers, Snippet, DOM, Arrays, undefined) {

    var SnippetManager = _context.extend('Nittro.Object', function() {
        SnippetManager.Super.call(this);

        this._.snippets = {};
        this._.containerCache = null;
        this._.currentPhase = Snippet.INACTIVE;

    }, {
        getSnippet: function (id) {
            if (!this._.snippets[id]) {
                this._.snippets[id] = new Snippet(id, this._.currentPhase);

            }

            return this._.snippets[id];

        },

        isSnippet: function (elem) {
            return (typeof elem === 'string' ? elem : elem.id) in this._.snippets;

        },

        setup: function() {
            this.trigger('after-update');
            this._runSnippetsPhase(this._.snippets, Snippet.PREPARE_SETUP);
            this._runSnippetsPhase(this._.snippets, Snippet.RUN_SETUP);
        },

        getRemoveTargets: function (elem) {
            var sel = DOM.getData(elem, 'dynamic-remove');
            return sel ? DOM.find(sel) : [];

        },

        computeChanges: function (snippets, removeTargets) {
            this._clearDynamicContainerCache();

            var changeset = {
                remove: {},
                update: {},
                add: {},
                containers: {}
            };

            this._resolveRemovals(removeTargets, changeset);
            this._resolveUpdates(snippets, changeset);
            this._resolveDynamicSnippets(changeset);

            return changeset;

        },

        applyChanges: function (changeset) {
            var teardown = Arrays.mergeTree({}, changeset.remove, changeset.update);

            this._runSnippetsPhase(teardown, Snippet.PREPARE_TEARDOWN);
            this._runSnippetsPhase(teardown, Snippet.RUN_TEARDOWN);
            this._runSnippetsPhase(teardown, Snippet.INACTIVE);

            this.trigger('before-update', changeset);

            this._applyRemove(changeset.remove);
            this._applyUpdate(changeset.update);
            this._applyAdd(changeset.add, changeset.containers);
            this._applyDynamic(changeset.containers, Arrays.mergeTree({}, changeset.update, changeset.add));

            this.trigger('after-update', changeset);

            return this._runSnippetsPhaseOnNextFrame(this._.snippets, Snippet.PREPARE_SETUP)
                .then(function () {
                    this._runSnippetsPhase(this._.snippets, Snippet.RUN_SETUP);

                }.bind(this));
        },

        cleanupDescendants: function(elem, changeset) {
            var id, snippet,
                snippets = changeset ? changeset.remove : {};

            for (id in this._.snippets) {
                if (this._.snippets.hasOwnProperty(id) && !(id in snippets)) {
                    snippet = this._.snippets[id].getElement();

                    if (snippet !== elem && DOM.contains(elem, snippet)) {
                        snippets[id] = {
                            element: snippet,
                            isDescendant: true
                        };
                    }
                }
            }

            if (!changeset) {
                this._runSnippetsPhase(snippets, Snippet.PREPARE_TEARDOWN);
                this._runSnippetsPhase(snippets, Snippet.RUN_TEARDOWN);
                this._runSnippetsPhase(snippets, Snippet.INACTIVE);
            }
        },

        _resolveRemovals: function(removeTargets, changeset) {
            removeTargets.forEach(function(elem) {
                changeset.remove[elem.id] = {
                    element: elem
                };

                this.cleanupDescendants(elem, changeset);

            }.bind(this));
        },

        _resolveUpdates: function(snippets, changeset) {
            var id, elem, params;

            for (id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    elem = DOM.getById(id);

                    if (elem) {
                        this.cleanupDescendants(elem, changeset);

                        if (id in changeset.remove && (params = this._resolveAddition(id, snippets[id]))) {
                            changeset.add[id] = params;

                        } else {
                            changeset.update[id] = this._resolveUpdate(elem, snippets[id]);

                        }
                    } else if (params = this._resolveAddition(id, snippets[id])) {
                        changeset.add[id] = params;

                    }
                }
            }
        },

        _resolveDynamicSnippets: function(changeset) {
            var id, type, cid, params;

            for (type in {update: 1, add: 1}) {
                for (id in changeset[type]) {
                    if (changeset[type].hasOwnProperty(id) && (cid = changeset[type][id].container)) {
                        params = this._getDynamicContainerParams(cid);

                        if (params.sort !== 'prepend' && params.sort !== 'append') {
                            changeset.containers[cid] || (changeset.containers[cid] = {});
                            changeset.containers[cid][id] = changeset[type][id];

                        } else {
                            changeset[type][id].action = params.sort;

                        }
                    }
                }
            }

            for (cid in changeset.containers) {
                if (changeset.containers.hasOwnProperty(cid)) {
                    changeset.containers[cid] = Helpers.computeSortedSnippets(this.getSnippet(cid), changeset.containers[cid], changeset);

                }
            }
        },

        _resolveUpdate: function(elem, content) {
            return {
                element: elem,
                content: Helpers.buildContent(elem.tagName, content),
                container: DOM.hasClass(elem.parentNode, 'nittro-snippet-container') ? elem.parentNode.id : null
            };
        },

        _resolveAddition: function(id, content) {
            var params = this._getDynamicContainerParamsForId(id),
                elem;

            if (!params) {
                return null;
            }

            elem = Helpers.buildContent(params.element, content);
            elem.id = id;

            return {
                content: elem,
                container: params.id
            };
        },

        _runSnippetsPhase: function (snippets, phase) {
            this._.currentPhase = phase;

            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    this.getSnippet(id).runPhase(phase);

                }
            }
        },

        _runSnippetsPhaseOnNextFrame: function(snippets, phase) {
            return new Promise(function(fulfill) {
                window.requestAnimationFrame(function() {
                    this._runSnippetsPhase(snippets, phase);
                    fulfill();

                }.bind(this));
            }.bind(this));
        },

        _applyRemove: function(snippets) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    if (!snippets[id].isDescendant && snippets[id].element.parentNode) {
                        snippets[id].element.parentNode.removeChild(snippets[id].element);
                    }

                    if (id in this._.snippets) {
                        delete this._.snippets[id];
                    }
                }
            }
        },

        _applyUpdate: function(snippets) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id)) {
                    DOM.empty(snippets[id].element);
                    DOM.append(snippets[id].element, Arrays.createFrom(snippets[id].content.childNodes));

                }
            }
        },

        _applyAdd: function(snippets, containers) {
            for (var id in snippets) {
                if (snippets.hasOwnProperty(id) && !(snippets[id].container in containers)) {
                    if (snippets[id].action === 'prepend') {
                        DOM.prepend(snippets[id].container, snippets[id].content);

                    } else {
                        DOM.append(snippets[id].container, snippets[id].content);

                    }
                }
            }
        },

        _applyDynamic: function(containers, snippets) {
            for (var cid in containers) {
                if (containers.hasOwnProperty(cid)) {
                    Helpers.applySortedSnippets(this.getSnippet(cid).getElement(), containers[cid], snippets);

                }
            }
        },

        _getDynamicContainerCache: function () {
            if (this._.containerCache === null) {
                this._.containerCache = DOM.getByClassName('nittro-snippet-container')
                    .map(function (elem) {
                        return elem.id;
                    });
            }

            return this._.containerCache;

        },

        _clearDynamicContainerCache: function () {
            this._.containerCache = null;

        },

        _getDynamicContainerParams: function (id) {
            var container = this.getSnippet(id),
                params = container.isContainer() ? container.getData('_snippet_container') : null;

            if (!params || params.sortCache === false) {
                return Helpers.prepareDynamicContainer(container);
            } else {
                return params;
            }
        },

        _getDynamicContainerParamsForId: function (id) {
            var cache = this._getDynamicContainerCache(),
                i, n, params;

            for (i = 0, n = cache.length; i < n; i++) {
                params = this._getDynamicContainerParams(cache[i]);

                if (params.mask.test(id)) {
                    return params;

                }
            }

            if (window.console) {
                console.error('Dynamic snippet #' + id + ' has no container');
            }

            return null;
        }
    });

    _context.register(SnippetManager, 'SnippetManager');

}, {
    Helpers: 'Nittro.Page.SnippetManagerHelpers',
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});

_context.invoke('Nittro.Page', function() {

    var SnippetAgent = _context.extend(function(page, snippetManager) {
        this._ = {
            page: page,
            snippetManager: snippetManager
        };

        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        _initTransaction: function(evt) {
            var data = {
                removeTargets: 'remove' in evt.data.context
                    ? evt.data.context.remove || []
                    : (evt.data.context.element ? this._.snippetManager.getRemoveTargets(evt.data.context.element) : [])
            };

            evt.data.transaction.on('ajax-response', this._handleResponse.bind(this, data));
        },

        _handleResponse: function(data, evt) {
            var payload = evt.data.response.getPayload(),
                changeset;

            if (payload.snippets || data.removeTargets.length) {
                changeset = this._.snippetManager.computeChanges(payload.snippets || {}, data.removeTargets);
                evt.waitFor(this._applyChangeset(evt.target, changeset));
            }
        },

        _applyChangeset: function (transaction, changeset) {
            return Promise.resolve().then(this._doApplyChangeset.bind(this, transaction, changeset));
        },

        _doApplyChangeset: function (transaction, changeset) {
            return transaction.trigger('snippets-apply', { changeset: changeset })
                .then(function() {
                    this._.snippetManager.applyChanges(changeset)
                }.bind(this));
        }
    });

    _context.register(SnippetAgent, 'SnippetAgent');

});

_context.invoke('Nittro.Page', function(Arrays) {

    var AjaxAgent = _context.extend(function(page, ajax, options) {
        this._ = {
            page: page,
            ajax: ajax,
            options: Arrays.mergeTree({}, AjaxAgent.defaults, options)
        };

        this._.page.on('before-transaction', this._checkTransaction.bind(this));
        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        STATIC: {
            defaults: {
                whitelistRedirects: false
            }
        },

        _checkTransaction: function (evt) {
            if (!this._.ajax.isAllowedOrigin(evt.data.url) || !this._.ajax.supports(evt.data.url, evt.data.context.method, evt.data.context.data)) {
                evt.preventDefault();
            }
        },

        _initTransaction: function(evt) {
            var data = {
                request: this._.ajax.createRequest(evt.data.transaction.getUrl(), evt.data.context.method, evt.data.context.data)
            };

            evt.data.transaction.on('dispatch', this._dispatch.bind(this, data));
            evt.data.transaction.on('abort', this._abort.bind(this, data));
        },

        _dispatch: function(data, evt) {
            evt.waitFor(Promise.resolve().then(this._doDispatch.bind(this, evt.target, data)));
        },

        _doDispatch: function (transaction, data) {
            return transaction.trigger('ajax-request', { request: data.request })
                .then(this._.ajax.dispatch.bind(this._.ajax, data.request))
                .then(this._handleResponse.bind(this, transaction, data));
        },

        _abort: function(data) {
            data.request.abort();
        },

        _handleResponse: function (transaction, data, response) {
            return Promise.resolve().then(this._doHandleResponse.bind(this, transaction, data, response));
        },

        _doHandleResponse: function(transaction, data, response) {
            return transaction.trigger('ajax-response', { response: response })
                .then(function() {
                    var payload = response.getPayload();

                    if (payload.postGet) {
                        transaction.setUrl(payload.url);
                    }

                    if ('redirect' in payload) {
                        if ((!this._.options.whitelistRedirects ? payload.allowAjax !== false : payload.allowAjax) && this._.ajax.isAllowedOrigin(payload.redirect)) {
                            transaction.setUrl(payload.redirect);
                            data.request = this._.ajax.createRequest(payload.redirect);
                            return this._doDispatch(transaction, data);

                        } else {
                            document.location.href = payload.redirect;
                            return new Promise(function() {});
                        }
                    } else {
                        return data.request;
                    }
                }.bind(this));
        }
    });

    _context.register(AjaxAgent, 'AjaxAgent');

}, {
    Arrays: 'Utils.Arrays'
});

_context.invoke('Nittro.Page', function(Arrays, DOM, Url) {

    var HistoryAgent = _context.extend(function(page, history, options) {
        this._ = {
            page: page,
            history: history,
            options: Arrays.mergeTree({}, HistoryAgent.defaults, options)
        };

        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        STATIC: {
            defaults: {
                whitelistHistory: false
            }
        },

        _initTransaction: function (evt) {
            if (evt.data.context.fromHistory) {
                evt.data.transaction.setIsFromHistory();
            } else if ('history' in evt.data.context) {
                evt.data.transaction.setIsHistoryState(evt.data.context.history);
            } else if (evt.data.context.element) {
                evt.data.transaction.setIsHistoryState(DOM.getData(evt.data.context.element, 'history', !this._.options.whitelistHistory));
            } else {
                evt.data.transaction.setIsHistoryState(!this._.options.whitelistHistory);
            }

            var data = {
                title: document.title
            };

            evt.data.transaction.on('dispatch', this._dispatch.bind(this, data));
            evt.data.transaction.on('ajax-response', this._handleResponse.bind(this, data));
        },

        _dispatch: function (data, evt) {
            evt.target.then(this._saveState.bind(this, evt.target, data), function () { /* noop on transaction error */ });
        },

        _handleResponse: function (data, evt) {
            var payload = evt.data.response.getPayload();

            if (payload.title) {
                data.title = payload.title;
            }
        },

        _saveState: function (transaction, data) {
            if (transaction.getUrl().getOrigin() !== Url.fromCurrent().getOrigin() || transaction.isBackground()) {
                transaction.setIsHistoryState(false);
            } else if (transaction.isHistoryState()) {
                data.state = {};

                if (!transaction.trigger('history-save', data).isDefaultPrevented()) {
                    this._.history.push(transaction.getUrl().toAbsolute(), data.title, data.state);
                }
            }

            if (data.title) {
                document.title = data.title;
            }
        }
    });

    _context.register(HistoryAgent, 'HistoryAgent');

}, {
    Arrays: 'Utils.Arrays',
    DOM: 'Utils.DOM',
    Url: 'Utils.Url'
});

_context.invoke('Nittro.Page', function (DOM, Arrays) {

    var location = window.history.location || window.location; // support for HTML5 history polyfill

    var History = _context.extend('Nittro.Object', function () {
        History.Super.call(this);
        this._.state = null;
        DOM.addListener(window, 'popstate', this._handleState.bind(this));
    }, {
        init: function () {
            if (window.history.state && window.history.state._nittro) {
                this._.state = window.history.state.data;
            } else {
                this._.state = {};
                this.update();
            }
        },

        push: function (url, title, data) {
            this._saveState(url, title, data, false);
        },

        replace: function (url, title, data) {
            this._saveState(url, title, data, true);
        },

        update: function (data) {
            Arrays.mergeTree(this._.state, data);
            window.history.replaceState({_nittro: true, data: this._.state}, document.title, location.href);
        },

        getState: function () {
            return this._.state;
        },

        _saveState: function (url, title, data, replace) {
            data = data || {};
            this.trigger('before-savestate', data);

            this._.state = data;

            if (replace) {
                window.history.replaceState({_nittro: true, data: data}, title || document.title, url);
            } else {
                window.history.pushState({_nittro: true, data: data}, title || document.title, url);
            }

            title && (document.title = title);

            this.trigger('savestate', {
                title: title,
                url: url,
                data: data,
                replace: replace
            });
        },

        _handleState: function (evt) {
            if (!evt.state || !evt.state._nittro) {
                return;
            }

            this._.state = evt.state.data;

            this.trigger('popstate', {
                title: document.title,
                url: location.href,
                data: evt.state.data
            });
        }
    });

    _context.register(History, 'History');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});

_context.invoke('Nittro.Page', function (DOM, Arrays, CSSTransitions, undefined) {

    var TransitionAgent = _context.extend('Nittro.Object', function(page, options) {
        TransitionAgent.Super.call(this);

        this._.page = page;
        this._.options = Arrays.mergeTree({}, TransitionAgent.defaults, options);

        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        STATIC: {
            defaults: {
                defaultSelector: '.nittro-transition-auto'
            }
        },

        _initTransaction: function(evt) {
            var data = {
                elements: this._getTransitionTargets(evt.data.context),
                removeTargets: this._getRemoveTargets(evt.data.context)
            };

            evt.data.transaction.on('dispatch', this._dispatch.bind(this, data));
            evt.data.transaction.on('abort', this._abort.bind(this, data));
            evt.data.transaction.on('snippets-apply', this._handleSnippets.bind(this, data));
        },

        _dispatch: function(data, evt) {
            evt.target.on('error', this._handleError.bind(this, data));
            evt.target.then(this._transitionIn.bind(this, data, false), this._transitionIn.bind(this, data, true));

            if (data.elements.length || data.removeTargets.length) {
                DOM.addClass(data.removeTargets, 'nittro-dynamic-remove');
                data.transitionOut = this._transitionOut(data);
                evt.waitFor(data.transitionOut);
            }
        },

        _abort: function(data) {
            if (data.elements.length || data.removeTargets.length) {
                this._transitionIn(data, true);
            }
        },

        _handleSnippets: function(data, evt) {
            var changeset = evt.data.changeset,
                id;

            for (id in changeset.add) {
                if (changeset.add.hasOwnProperty(id)) {
                    DOM.addClass(changeset.add[id].content, 'nittro-dynamic-add', 'nittro-transition-middle');
                    data.elements.push(changeset.add[id].content);
                }
            }

            if (data.transitionOut) {
                evt.waitFor(data.transitionOut);
            }
        },

        _handleError: function (data, evt) {
            if (data.transitionOut) {
                evt.waitFor(data.transitionOut);
            }
        },

        _transitionOut: function (data) {
            return this._transition(data.elements.concat(data.removeTargets), 'out');
        },

        _transitionIn: function (data, aborting) {
            var elements = aborting ? data.elements.concat(data.removeTargets) : data.elements;

            if (elements.length) {
                return this._transition(elements, 'in')
                    .then(function () {
                        DOM.removeClass(elements, 'nittro-dynamic-add', 'nittro-dynamic-remove');
                    });

            }
        },

        _transition: function(elements, dir) {
            return CSSTransitions.run(elements, {
                    add: 'nittro-transition-active nittro-transition-' + dir,
                    remove: 'nittro-transition-middle',
                    after: dir === 'out' ? 'nittro-transition-middle' : null
                }, dir === 'in');
        },

        _getTransitionTargets: function(context) {
            var sel, targets;

            if (context.transition !== undefined) {
                sel = context.transition;
            } else {
                sel = context.element ? DOM.getData(context.element, 'transition') : undefined;
            }

            if (sel === undefined && (!context.element || !DOM.getData(context.element, 'dynamic-remove'))) {
                sel = this._.options.defaultSelector;
            }

            targets = sel ? DOM.find(sel) : [];

            this.trigger('prepare-transition-targets', {
                element: context.element,
                targets: targets
            });

            return targets;

        },

        _getRemoveTargets: function (context) {
            if (!context.element) {
                return [];
            }

            var sel = DOM.getData(context.element, 'dynamic-remove'),
                targets = sel ? DOM.find(sel) : [];

            if (targets.length) {
                this.trigger('prepare-remove-targets', {
                    targets: targets.slice()
                });
            }

            return targets;

        }
    });

    _context.register(TransitionAgent, 'TransitionAgent');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    CSSTransitions: 'Utils.CSSTransitions'
});

_context.invoke('Nittro.Page', function (DOM, Arrays) {

    var location = window.history.location || window.location; // support for HTML5 history polyfill

    var ScrollAgent = _context.extend(function (page, history, options) {
        this._ = {
            page: page,
            history: history,
            anchor: DOM.create('div'),
            options: Arrays.mergeTree({}, ScrollAgent.defaults, options)
        };

        this._.anchor.style.position = 'absolute';
        this._.anchor.style.left = 0;
        this._.anchor.style.top = 0;
        this._.anchor.style.width = '100%';
        this._.anchor.style.height = '1px';
        this._.anchor.style.marginTop = '-1px';

        window.history.scrollRestoration = 'manual';
        this._.page.on('ready', this._init.bind(this));
        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        STATIC: {
            defaults: {
                target: null,
                margin: 30,
                scrollDown: false,
                duration: 400
            }
        },

        _init: function () {
            var state = this._.history.getState(),
                target;

            if ('scrollAgent' in state) {
                target = state.scrollAgent.target;
            } else if (location.hash.match(/^#[^\s\[>+:.]+$/i)) {
                target = this._resolveSingleTarget(location.hash);
            }

            if (typeof target === 'number') {
                this._scrollTo(target, true, true);
            }
        },

        _initTransaction: function (evt) {
            if (evt.data.transaction.isBackground()) {
                return;
            }

            var rect = document.body.getBoundingClientRect(),
                data = {
                    previous: window.pageYOffset,
                    target: this._.options.target
                };

            this._.anchor.style.top = data.previous + rect.bottom + 'px';
            document.body.appendChild(this._.anchor);
            evt.data.transaction.on('dispatch', this._dispatch.bind(this, data));
            evt.data.transaction.on('abort error', this._cleanup.bind(this));
            evt.data.transaction.on('ajax-response', this._handleResponse.bind(this, data));
            evt.data.transaction.on('snippets-apply', this._handleSnippets.bind(this, data));
            evt.data.transaction.on('history-save', this._handleHistory.bind(this, data));

            if ('scrollTo' in evt.data.context) {
                data.target = evt.data.context.scrollTo;
            } else if (evt.data.context.element && evt.data.context.element.hasAttribute('data-scroll-to')) {
                data.target = DOM.getData(evt.data.context.element, 'scroll-to', null);
            }
        },

        _dispatch: function (data, evt) {
            var state = this._.history.getState();

            if (data.target === null && evt.target.isFromHistory() && state && 'scrollAgent' in state) {
                data.target = state.scrollAgent.target;
            }

            evt.target.then(this._apply.bind(this, data, evt.target), this._cleanup.bind(this));
        },

        _cleanup: function () {
            if (this._.anchor.parentNode) {
                this._.anchor.parentNode.removeChild(this._.anchor);
                this._.anchor.style.top = 0;
            }
        },

        _handleResponse: function (data, evt) {
            var payload = evt.data.response.getPayload();

            if ('scrollTo' in payload) {
                data.target = payload.scrollTo;
            }
        },

        _handleSnippets: function (data, evt) {
            if (data.target === null) {
                data.target = [];

                var id, params;

                for (id in evt.data.changeset.add) if (evt.data.changeset.add.hasOwnProperty(id)) {
                    params = evt.data.changeset.add[id];

                    if (!DOM.getData(params.container, 'scroll-ignore')) {
                        data.target.push('#' + id);
                    }
                }

                for (id in evt.data.changeset.update) if (evt.data.changeset.update.hasOwnProperty(id)) {
                    if (!DOM.getData(id, 'scroll-ignore')) {
                        data.target.push('#' + id);
                    }
                }
            }
        },

        _apply: function (data, transaction) {
            if (this._resolveTarget(data)) {
                this._scrollTo(data.target, transaction.isFromHistory());
            } else {
                this._cleanup();
            }
        },

        _scrollTo: function (to, force, instant) {
            var y0 = window.pageYOffset,
                dy = to - y0,
                t0 = Date.now(),
                dt = this._.options.duration,
                a = this._.anchor;

            if (force || this._.options.scrollDown || dy < 0) {
                if (instant) {
                    window.scrollTo(null, to);
                } else {
                    window.requestAnimationFrame(step);
                }
            } else {
                this._cleanup();
            }

            function step() {
                var x = (Date.now() - t0) / dt,
                    y;

                if (x <= 1) {
                    window.requestAnimationFrame(step);

                    y = y0 + dy * (-0.5 * Math.cos(Math.PI * x) + 0.5);
                    window.scrollTo(null, y);
                } else if (a.parentNode) {
                    a.parentNode.removeChild(a);
                    a.style.top = 0;
                }
            }
        },

        _handleHistory: function (data, evt) {
            this._.history.update({
                scrollAgent: {
                    target: data.previous
                }
            });

            this._resolveTarget(data);

            evt.data.state.scrollAgent = {
                target: data.target
            };
        },

        _resolveSingleTarget: function(target) {
            if (target === false) {
                return false;
            } else if (target === null) {
                return 0;
            } else if (typeof target === 'string') {
                if (target = DOM.find(target)[0]) {
                    return target.getBoundingClientRect().top + window.pageYOffset - this._.options.margin;
                } else {
                    return 0;
                }
            } else if (typeof target === 'number') {
                return target;
            } else {
                return false;
            }
        },

        _resolveTarget: function(data) {
            if (data.target === false) {
                return false;
            } else if (data.target === null) {
                data.target = 0;
            } else if (typeof data.target !== 'number') {
                if (Array.isArray(data.target)) {
                    data.target = data.target.join(',');
                }

                data.target = DOM.find(data.target).map(function (elem) {
                    return elem.getBoundingClientRect().top;
                });

                data.target = data.target.length
                    ? Math.min.apply(null, data.target) + window.pageYOffset - this._.options.margin
                    : 0;
            }

            return true;
        }
    });

    _context.register(ScrollAgent, 'ScrollAgent');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays'
});

_context.invoke('Nittro.Page', function(Url) {

    var Transaction = _context.extend('Nittro.Object', function (url) {
        Transaction.Super.call(this);

        this._.url = Url.from(url);
        this._.history = true;
        this._.fromHistory = false;
        this._.background = false;

        this._.promise = new Promise(function(fulfill, reject) {
            this._.fulfill = fulfill;
            this._.reject = reject;
        }.bind(this));
    }, {
        STATIC: {
            createRejected: function (url, reason) {
                var self = new Transaction(url);
                self._.reject(reason);
                return self;
            }
        },

        getUrl: function() {
            return this._.url;
        },

        setUrl: function(url) {
            this._.url = Url.from(url);
            return this;
        },

        isHistoryState: function() {
            return this._.history;
        },

        setIsHistoryState: function(value) {
            this._.history = value;
            return this;
        },

        isFromHistory: function() {
            return this._.fromHistory;
        },

        setIsFromHistory: function() {
            this._.fromHistory = true;
            this._.history = false;
        },

        isBackground: function() {
            return this._.background;
        },

        setIsBackground: function(value) {
            this._.background = value;
            return this;
        },

        dispatch: function() {
            this.trigger('dispatch')
                .then(this._.fulfill, this._handleError.bind(this));

            return this;
        },

        abort: function() {
            this._.reject({type: 'abort'});
            this.trigger('abort');
            return this;
        },

        then: function(onfulfilled, onrejected) {
            return this._.promise.then(onfulfilled, onrejected);
        },

        _handleError: function (err) {
            this.trigger('error')
                .then(function () {
                    this._.reject(err);
                }.bind(this));
        }
    });

    _context.register(Transaction, 'Transaction');

}, {
    Url: 'Utils.Url'
});

_context.invoke('Nittro.Page', function () {

    var CspAgent = _context.extend(function(page, nonce) {
        this._ = {
            page: page,
            nonce: nonce
        };

        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        _initTransaction: function (evt) {
            var data = {
                nonce: null,
                pending: null
            };

            evt.data.transaction.on('ajax-response', this._handleResponse.bind(this, data));
            evt.data.transaction.on('snippets-apply', this._handleSnippets.bind(this, data));
        },

        _handleResponse: function (data, evt) {
            if ('redirect' in evt.data.response.getPayload()) {
                return;
            }

            var h = evt.data.response.getHeader('Content-Security-Policy') || evt.data.response.getHeader('Content-Security-Policy-Report-Only') || '',
                m = /(?:^|;\s*)script-src\s[^;]*'nonce-([^']+)'/.exec(h);

            if (m) {
                data.nonce = m[1];
            } else {
                data.nonce = false;
            }
        },

        _handleSnippets: function (data, evt) {
            this._handleChangeset(evt.data.changeset, data.nonce);
        },

        _handleChangeset: function (changeset, nonce) {
            if (!nonce) {
                return;
            }

            var id;

            for (id in changeset.add) {
                if (changeset.add.hasOwnProperty(id)) {
                    this._fixNonce(changeset.add[id].content, nonce);
                }
            }

            for (id in changeset.update) {
                if (changeset.update.hasOwnProperty(id)) {
                    this._fixNonce(changeset.update[id].content, nonce);
                }
            }
        },

        _fixNonce: function (elem, nonce) {
            var scripts = elem.getElementsByTagName('script'),
                i;

            for (i = 0; i < scripts.length; i++) {
                if (scripts.item(i).nonce === nonce) {
                    scripts.item(i).setAttribute('nonce', this._.nonce || '');
                }
            }
        }
    });

    _context.register(CspAgent, 'CspAgent');

});

_context.invoke('Nittro.Page', function (Url) {

    var GoogleAnalyticsHelper = _context.extend(function (history) {
        this._ = {
            history: history
        };

        this._.history.on('savestate popstate', this._handleState.bind(this));
    }, {
        _handleState: function (evt) {
            if (typeof window.ga === 'function' && !evt.data.replace) {
                window.ga('set', {
                    page: Url.from(evt.data.url).setHash(null).toLocal(),
                    title: evt.data.title
                });

                window.ga('send', 'pageview');
            }
        }
    });

    _context.register(GoogleAnalyticsHelper, 'GoogleAnalyticsHelper');

}, {
    Url: 'Utils.Url'
});

_context.invoke('Nittro.Page', function (Transaction, DOM, Arrays, Url) {

    var Service = _context.extend('Nittro.Object', function (snippetManager, history, options) {
        Service.Super.call(this);

        this._.snippetManager = snippetManager;
        this._.history = history;
        this._.options = Arrays.mergeTree({}, Service.defaults, options);
        this._.setup = false;
        this._.currentTransaction = null;
        this._.currentUrl = Url.fromCurrent();

        this._.history.on('popstate', this._handleState.bind(this));
        DOM.addListener(document, 'click', this._handleLinkClick.bind(this));

        this._checkReady();

    }, {
        STATIC: {
            defaults: {
                whitelistLinks: false,
                backgroundErrors: false
            }
        },

        open: function (url, method, data, context) {
            try {
                context || (context = {});
                context.method = method;
                context.data = data;

                var evt = this.trigger('before-transaction', {
                    url: url,
                    context: context
                });

                if (evt.isDefaultPrevented()) {
                    return this._createRejectedTransaction(url, {type: 'abort'});
                }

                context.event && context.event.preventDefault();

                return evt.then(function () {
                    if (evt.isDefaultPrevented()) {
                        return this._createRejectedTransaction(url, {type: 'abort'});
                    } else {
                        return this._createTransaction(url, context);
                    }
                }.bind(this));
            } catch (e) {
                return this._createRejectedTransaction(url, e);
            }
        },

        openLink: function (link, evt) {
            return this.open(link.href, 'get', null, {
                event: evt,
                element: link
            });
        },

        getSnippet: function (id) {
            return this._.snippetManager.getSnippet(id);
        },

        isSnippet: function (elem) {
            return this._.snippetManager.isSnippet(elem);
        },

        _handleState: function (evt) {
            if (!this._checkUrl(null, this._.currentUrl)) {
                return;
            }

            var url = Url.from(evt.data.url);
            this._.currentUrl = url;

            this.open(url, 'get', null, {fromHistory: true})
                .then(null, function () {
                    document.location.href = url.toAbsolute();
                });
        },

        _checkReady: function () {
            if (document.readyState === 'loading') {
                DOM.addListener(document, 'readystatechange', this._checkReady.bind(this));
                return;
            }

            if (!this._.setup) {
                this._.setup = true;

                Promise.resolve().then(function () {
                    this._.history.init();
                    this._.snippetManager.setup();
                    this.trigger('ready');
                }.bind(this));
            }
        },

        _handleLinkClick: function(evt) {
            if (evt.defaultPrevented || evt.ctrlKey || evt.shiftKey || evt.altKey || evt.metaKey || evt.button > 0) {
                return;
            }

            var link = DOM.closest(evt.target, 'a');

            if (!link || !this._checkLink(link) || !this._checkUrl(link.href)) {
                return;
            }

            this.openLink(link, evt);
        },

        _createTransaction: function(url, context) {
            var transaction = new Transaction(url);

            this._initTransaction(transaction, context);

            this.trigger('transaction-created', {
                transaction: transaction,
                context: context
            });

            return this._dispatchTransaction(transaction);
        },

        _createRejectedTransaction: function (url, reason) {
            var transaction = Transaction.createRejected(url, reason);
            return transaction.then(null, this._handleError.bind(this, transaction));
        },

        _initTransaction: function (transaction, context) {
            if ('background' in context) {
                transaction.setIsBackground(context.background);
            } else if (context.element) {
                transaction.setIsBackground(DOM.getData(context.element, 'background', false));
            }
        },

        _dispatchTransaction: function(transaction) {
            if (!transaction.isBackground()) {
                if (this._.currentTransaction) {
                    this._.currentTransaction.abort();
                }

                this._.currentTransaction = transaction;
            }

            return transaction.dispatch().then(
                this._handleSuccess.bind(this, transaction),
                this._handleError.bind(this, transaction)
            );
        },

        _checkUrl: function(url, current) {
            url = url ? Url.from(url) : Url.fromCurrent();
            current = current ? Url.from(current) : Url.fromCurrent();
            return url.compare(current) !== Url.PART.HASH;
        },

        _checkLink: function (link) {
            return !link.hasAttribute('target') && link.hasAttribute('href') && DOM.getData(link, 'ajax', !this._.options.whitelistLinks);
        },

        _handleSuccess: function(transaction) {
            if (!transaction.isBackground()) {
                this._.currentTransaction = null;
            }

            if (transaction.isHistoryState()) {
                this._.currentUrl = transaction.getUrl();
            }
        },

        _handleError: function (transaction, err) {
            if (transaction === this._.currentTransaction) {
                this._.currentTransaction = null;
            }

            if (!transaction.isBackground() || this._.options.backgroundErrors) {
                this.trigger('error', err);
            }
        }
    });

    _context.register(Service, 'Service');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    Url: 'Utils.Url'
});

_context.invoke('Nittro.Flashes', function (DOM) {

    var Helpers = {
        hasFixedParent: function (elem) {
            do {
                if (DOM.getStyle(elem, 'position', false) === 'fixed') return true;
                elem = elem.offsetParent;

            } while (elem && elem !== document.documentElement && elem !== document.body);

            return false;

        },

        getRect: function (elem) {
            var rect = elem.getBoundingClientRect();

            return {
                left: rect.left,
                top: rect.top,
                right: rect.right,
                bottom: rect.bottom,
                width: 'width' in rect ? rect.width : (rect.right - rect.left),
                height: 'height' in rect ? rect.height : (rect.bottom - rect.top)
            };
        },

        tryFloatingPosition: function (elem, target, placement, positioner) {
            DOM.addClass(elem, 'nittro-flash-floating');
            DOM.setStyle(elem, {
                position: 'absolute',
                opacity: 0
            });

            var fixed = Helpers.hasFixedParent(target),
                elemRect = Helpers.getRect(elem),
                targetRect = Helpers.getRect(target),
                style = {},
                order = positioner.getDefaultOrder(),
                force = false,
                position;

            if (fixed) {
                style.position = 'fixed';

            }

            if (placement) {
                var m = placement.match(/^(.+?)(!)?(!)?$/);

                if (!positioner.supports(m[1])) {
                    throw new Error("Placement '" + m[1] + "' isn't supported");
                }

                force = !!m[3];
                order = m[2] ? [m[1]] : [m[1]].concat(order);
            }

            for (var i = 0; i < order.length; i++) {
                placement = order[i];

                if (position = positioner[placement].call(positioner, targetRect, elemRect, force)) {
                    break;
                }
            }

            if (position) {
                style.left = position.left;
                style.top = position.top;

                if (!fixed) {
                    style.left += window.pageXOffset;
                    style.top += window.pageYOffset;
                }

                style.left += 'px';
                style.top += 'px';
                style.opacity = '';

                DOM.setStyle(elem, style);
                return placement;

            } else {
                DOM.removeClass(elem, 'nittro-flash-floating');
                DOM.setStyle(elem, {
                    position: '',
                    opacity: ''
                });

                return null;
            }
        }
    };

    _context.register(Helpers, 'Helpers');

}, {
    DOM: 'Utils.DOM'
});

_context.invoke('Nittro.Flashes', function (DOM, Arrays, CSSTransitions, Helpers) {

    var Message = _context.extend('Nittro.Object', function (service, content, options) {
        Message.Super.call(this);

        this._doDismiss = this._doDismiss.bind(this);

        this._.service = service;
        this._.options = Arrays.mergeTree({}, Message.defaults, options);
        this._.visible = false;

        if (this._.service === null) {
            this._.elem = content;
            this._.visible = true;
            this._normalizeDismissTime();
            this._scheduleDismiss();
            return;
        }

        var target = this._getTarget(),
            tag = 'div';

        if (target) {
            this._.options.classes === null && (this._.options.classes = DOM.getData(target, 'flash-classes'));
            this._.options.inline === null && (this._.options.inline = DOM.getData(target, 'flash-inline'));
            this._.options.rich === null && (this._.options.rich = DOM.getData(target, 'flash-rich'));

            if (this._.options.inline) {
                tag = target.tagName.match(/^(?:ul|ol)$/i) ? 'li' : 'p';
            }
        } else {
            this._.options.inline = false;
        }

        this._.elem = DOM.create(tag, {
            'class': 'nittro-flash nittro-flash-' + this._.options.type,
            'data-flash-dynamic': 'true'
        });

        if (this._.options.classes) {
            DOM.addClass(this._.elem, this._.options.classes.replace(/%type%/g, this._.options.type));
        }

        if (this._.options.rich) {
            DOM.html(this._.elem, content);
        } else {
            DOM.addClass(this._.elem, 'nittro-flash-plain');
            this._.elem.textContent = content;
        }

        this._normalizeDismissTime();
    }, {
        STATIC: {
            wrap: function (elem) {
                return new Message(null, elem);
            },
            defaults: {
                type: 'info',
                target: null,
                classes: null,
                inline: null,
                placement: null,
                rich: null,
                dismiss: null
            }
        },

        getElement: function () {
            return this._.elem;
        },

        show: function () {
            if (this._.visible !== false) {
                return Promise.resolve(this);
            }

            this._.visible = null;

            var target = this._getTarget();

            if (target) {
                if (this._.options.inline) {
                    target.appendChild(this._.elem);
                    return this._show('inline');
                } else {
                    this._.service.getLayer().appendChild(this._.elem);

                    var placement = Helpers.tryFloatingPosition(this._.elem, target, this._.options.placement, this._.service.getPositioner());

                    if (placement) {
                        return this._show(placement);
                    }
                }
            }

            this._.service.getGlobalHolder().appendChild(this._.elem);
            return this._show('global');
        },

        hide: function () {
            if (this._.visible !== true) {
                return Promise.resolve(this);
            }

            this._.visible = null;

            DOM.addClass(this._.elem, 'nittro-flash-hide');
            this.trigger('hide');

            return CSSTransitions.run(this._.elem).then(function () {
                this._.visible = false;
                this._.elem.parentNode.removeChild(this._.elem);
                DOM.removeClass(this._.elem, 'nittro-flash-hide');
                this.trigger('hidden');
                return this;
            }.bind(this));
        },

        dismiss: function () {
            return this.hide().then(function () {
                this.off();
                this._.elem = this._.options = this._.service = null;
            }.bind(this));
        },

        _show: function (placement) {
            DOM.toggleClass(this._.elem, 'nittro-flash-prepare nittro-flash-' + placement, true);
            this.trigger('show');
            this.one('hidden', function() { DOM.toggleClass(this._.elem, 'nittro-flash-' + placement, false); });

            return CSSTransitions.run(this._.elem, {remove: 'nittro-flash-prepare'}, true).then(function () {
                this._.visible = true;
                this.trigger('shown');
                this._scheduleDismiss();
                return this;
            }.bind(this));
        },

        _normalizeDismissTime: function () {
            if (this._.options.dismiss !== false) {
                if (typeof this._.options.dismiss !== 'number') {
                    this._.options.dismiss = Math.max(5000, Math.round(this._.elem.textContent.split(/\s+/).length / 0.003));
                }
            }
        },

        _scheduleDismiss: function () {
            if (this._.options.dismiss === false) {
                return;
            }

            DOM.addListener(document, 'mousemove', this._doDismiss);
            DOM.addListener(document, 'mousedown', this._doDismiss);
            DOM.addListener(document, 'keydown', this._doDismiss);
            DOM.addListener(document, 'touchstart', this._doDismiss);
        },

        _doDismiss: function () {
            DOM.removeListener(document, 'mousemove', this._doDismiss);
            DOM.removeListener(document, 'mousedown', this._doDismiss);
            DOM.removeListener(document, 'keydown', this._doDismiss);
            DOM.removeListener(document, 'touchstart', this._doDismiss);

            window.setTimeout(this.dismiss.bind(this), this._.options.dismiss);
        },

        _getTarget: function () {
            return typeof this._.options.target === 'string' ? DOM.getById(this._.options.target) : this._.options.target;
        }
    });

    _context.register(Message, 'Message');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    CSSTransitions: 'Utils.CSSTransitions'
});

_context.invoke('Nittro.Flashes', function () {

    var DefaultPositioner = _context.extend(function (margin, defaultOrder) {
        this._ = {
            margin: typeof margin === 'number' ? margin : 20,
            defaultOrder: defaultOrder || 'above,rightOf,below,leftOf'
        };

        if (typeof this._.defaultOrder === 'string') {
            this._.defaultOrder = this._.defaultOrder.split(/\s*,\s*/g);
        }
    }, {
        supports: function (placement) {
            return placement === 'above' || placement === 'below' || placement === 'leftOf' || placement === 'rightOf';
        },

        getDefaultOrder: function () {
            return this._.defaultOrder;
        },

        above: function (target, elem, force) {
            var res = {
                left: target.left + (target.width - elem.width) / 2,
                top: target.top - elem.height
            };

            if (force || res.left > this._.margin && res.left + elem.width < window.innerWidth - this._.margin && res.top > this._.margin && res.top + elem.height < window.innerHeight - this._.margin) {
                return res;

            }
        },
        below: function(target, elem, force) {
            var res = {
                left: target.left + (target.width - elem.width) / 2,
                top: target.bottom
            };

            if (force || res.left > this._.margin && res.left + elem.width < window.innerWidth - this._.margin && res.top + elem.height < window.innerHeight - this._.margin && res.top > this._.margin) {
                return res;

            }
        },
        leftOf: function (target, elem, force) {
            var res = {
                left: target.left - elem.width,
                top: target.top + (target.height - elem.height) / 2
            };

            if (force || res.top > this._.margin && res.top + elem.height < window.innerHeight - this._.margin && res.left > this._.margin && res.left + elem.width < window.innerWidth - this._.margin) {
                return res;

            }
        },
        rightOf: function (target, elem, force) {
            var res = {
                left: target.right,
                top: target.top + (target.height - elem.height) / 2
            };

            if (force || res.top > this._.margin && res.top + elem.height < window.innerHeight - this._.margin && res.left + elem.width < window.innerWidth - this._.margin && res.left > this._.margin) {
                return res;

            }
        }
    });


    _context.register(DefaultPositioner, 'DefaultPositioner');

});

_context.invoke('Nittro.Flashes', function (Message, DOM, Arrays) {

    var Service = _context.extend(function (positioner, options) {
        this._ = {
            positioner: positioner,
            options: Arrays.mergeTree({}, Service.defaults, options),
            globalHolder: DOM.create('div', {'class': 'nittro-flash-global-holder'})
        };

        if (typeof this._.options.layer === 'string') {
            this._.options.layer = DOM.getById(this._.options.layer);
        } else if (!this._.options.layer) {
            this._.options.layer = document.body;
        }

        this._.options.layer.appendChild(this._.globalHolder);

        if (!this._.options.classes) {
            this._.options.classes = DOM.getData(this._.options.layer, 'flash-classes');
        }

        Message.defaults.classes = this._.options.classes;

        this._removeStatic();
    }, {
        STATIC: {
            defaults: {
                layer: null,
                classes: null
            }
        },

        create: function (content, options) {
            return new Message(this, content, options);
        },

        add: function (content, type, target, rich) {
            var options;

            if (type && typeof type === 'object') {
                options = type;
            } else {
                options = {
                    type: type || 'info',
                    target: target,
                    rich: rich
                };
            }

            return this.create(content, options).show();
        },

        getGlobalHolder: function () {
            return this._.globalHolder;
        },

        getLayer: function () {
            return this._.options.layer;
        },

        getPositioner: function () {
            return this._.positioner;
        },

        _removeStatic: function () {
            DOM.getByClassName('nittro-flash')
                .forEach(function (elem) {
                    if (!DOM.getData(elem, 'flash-dynamic')) {
                        Message.wrap(elem);
                    }
                }.bind(this));
        }
    });

    _context.register(Service, 'Service');

}, {
    DOM: 'Utils.DOM',
    Arrays: 'Utils.Arrays',
    CSSTransitions: 'Utils.CSSTransitions'
});

_context.invoke('Nittro.Ajax.Bridges.AjaxDI', function(Nittro) {

    var AjaxExtension = _context.extend('Nittro.DI.BuilderExtension', function(containerBuilder, config) {
        AjaxExtension.Super.call(this, containerBuilder, config);
    }, {
        STATIC: {
            defaults: {
                allowOrigins: null
            }
        },
        load: function() {
            var builder = this._getContainerBuilder(),
                config = this._getConfig(AjaxExtension.defaults);

            builder.addServiceDefinition('ajax', {
                factory: 'Nittro.Ajax.Service()',
                args: {
                    options: config
                },
                run: true,
                setup: [
                    '::setTransport(Nittro.Ajax.Transport.Native())'
                ]
            });
        }
    });

    _context.register(AjaxExtension, 'AjaxExtension')

});

_context.invoke('Nittro.Forms.Bridges.FormsDI', function(Nittro) {

    var FormsExtension = _context.extend('Nittro.DI.BuilderExtension', function(containerBuilder, config) {
        FormsExtension.Super.call(this, containerBuilder, config);
    }, {
        STATIC: {
            defaults: {
                whitelistForms: false,
                autoResetForms: true
            }
        },

        load: function() {
            var builder = this._getContainerBuilder();
            builder.addServiceDefinition('formLocator', 'Nittro.Forms.Locator()');

        },

        setup: function () {
            var builder = this._getContainerBuilder(),
                config = this._getConfig(FormsExtension.defaults);

            if (builder.hasServiceDefinition('page')) {
                builder.getServiceDefinition('page')
                    .addSetup(function (formLocator) {
                        this.initForms(formLocator, config);
                    });
            }

            if (!builder.hasServiceDefinition('formErrorRenderer')) {
                builder.addServiceDefinition('formErrorRenderer', 'Nittro.Forms.DefaultErrorRenderer()');
            }
        }
    });

    _context.register(FormsExtension, 'FormsExtension')

});

_context.invoke('Nittro.Forms.Bridges.FormsPage', function(Service, DOM) {

    var FormsMixin = {
        initForms: function (formLocator, options) {
            this._.formLocator = formLocator;
            this._.options.whitelistForms = options.whitelistForms;
            this._.options.autoResetForms = options.autoResetForms;

            DOM.addListener(document, 'submit', this._handleSubmit.bind(this));
            DOM.addListener(document, 'click', this._handleButtonClick.bind(this));
            this._.snippetManager.on('after-update', this._refreshForms.bind(this));
            this.on('transaction-created', this._initFormTransaction.bind(this));
        },

        sendForm: function (form, evt) {
            var frm = this._.formLocator.getForm(form);

            return this.open(form.action, form.method, frm.serialize(), {
                    event: evt,
                    element: form
                })
                .then(this._handleFormSuccess.bind(this, frm));
        },

        _initFormTransaction: function (evt) {
            if (evt.data.context.element && evt.data.context.element instanceof HTMLFormElement) {
                var data = {
                    form: this._.formLocator.getForm(evt.data.context.element),
                    allowReset: true
                };

                evt.data.transaction.on('ajax-response', this._handleFormResponse.bind(this, data));
                evt.data.transaction.then(this._handleFormSuccess.bind(this, data), function() { /* noop on transaction error */ });
            }
        },

        _handleFormResponse: function (data, evt) {
            var payload = evt.data.response.getPayload();

            if ('allowReset' in payload) {
                data.allowReset = payload.allowReset;
            }
        },

        _handleFormSuccess: function (data) {
            if (data.allowReset && data.form.getElement() && DOM.getData(data.form.getElement(), 'reset', this._.options.autoResetForms)) {
                data.form.reset();
            }
        },

        _handleSubmit: function (evt) {
            if (evt.defaultPrevented || !(evt.target instanceof HTMLFormElement) || !this._checkForm(evt.target)) {
                return;
            }

            this.sendForm(evt.target, evt);

        },

        _handleButtonClick: function (evt) {
            if (evt.defaultPrevented || evt.ctrlKey || evt.shiftKey || evt.altKey || evt.metaKey || evt.button > 0) {
                return;

            }

            var btn = DOM.closest(evt.target, 'button') || DOM.closest(evt.target, 'input'),
                frm;

            if (!btn || btn.type !== 'submit' || !btn.form || !this._checkForm(btn.form)) {
                return;

            }

            frm = this._.formLocator.getForm(btn.form);
            frm.setSubmittedBy(btn.name || null);

        },

        _checkForm: function (form) {
            if (form.getAttribute('target')) {
                return false;
            }

            return DOM.getData(form, 'ajax', !this._.options.whitelistForms);

        },

        _refreshForms: function() {
            this._.formLocator.refreshForms();
        }
    };

    _context.register(FormsMixin, 'FormsMixin');
    _context.mixin(Service, FormsMixin);

    Service.defaults.whitelistForms = false;
    Service.defaults.autoResetForms = true;

}, {
    Service: 'Nittro.Page.Service',
    DOM: 'Utils.DOM'
});

_context.invoke('Nittro.Page.Bridges.PageDI', function (Nittro) {

    var PageExtension = _context.extend('Nittro.DI.BuilderExtension', function (containerBuilder, config) {
        PageExtension.Super.call(this, containerBuilder, config);
    }, {
        STATIC: {
            defaults: {
                whitelistHistory: false,
                whitelistLinks: false,
                whitelistRedirects: false,
                backgroundErrors: false,
                csp: null,
                transitions: {
                    defaultSelector: '.nittro-transition-auto'
                },
                i18n: {
                    connectionError: 'There was an error connecting to the server. Please check your internet connection and try again.',
                    unknownError: 'There was an error processing your request. Please try again later.'
                },
                scroll: {
                    target: null,
                    margin: 30,
                    scrollDown: false,
                    duration: 500
                }
            }
        },
        load: function () {
            var builder = this._getContainerBuilder(),
                config = this._getConfig(PageExtension.defaults);

            builder.addServiceDefinition('page', {
                factory: 'Nittro.Page.Service()',
                args: {
                    options: {
                        whitelistLinks: config.whitelistLinks,
                        backgroundErrors: config.backgroundErrors
                    }
                },
                run: true
            });

            builder.addServiceDefinition('ajaxAgent', {
                factory: 'Nittro.Page.AjaxAgent()',
                args: {
                    options: {
                        whitelistRedirects: config.whitelistRedirects
                    }
                },
                run: true
            });

            builder.addServiceDefinition('historyAgent', {
                factory: 'Nittro.Page.HistoryAgent()',
                args: {
                    options: {
                        whitelistHistory: config.whitelistHistory
                    }
                },
                run: true
            });

            builder.addServiceDefinition('scrollAgent', {
                factory: 'Nittro.Page.ScrollAgent()',
                args: {
                    options: config.scroll
                },
                run: true
            });

            builder.addServiceDefinition('snippetAgent', 'Nittro.Page.SnippetAgent()!');
            builder.addServiceDefinition('snippetManager', 'Nittro.Page.SnippetManager()');
            builder.addServiceDefinition('history', 'Nittro.Page.History()');

            if (typeof window.ga === 'function') {
                builder.addServiceDefinition('googleAnalyticsHelper', 'Nittro.Page.GoogleAnalyticsHelper()!');
            }

            if (config.transitions) {
                builder.addServiceDefinition('transitionAgent', {
                    factory: 'Nittro.Page.TransitionAgent()',
                    args: {
                        options: {
                            defaultSelector: config.transitions.defaultSelector
                        }
                    },
                    run: true
                });
            }

            if (config.csp !== false) {
                var scripts = document.getElementsByTagName('script'),
                    i, n, nonce = null;

                for (i = 0, n = scripts.length; i < n; i++) {
                    if (/^((text|application)\/javascript)?$/i.test(scripts.item(i).type) && scripts.item(i).nonce) {
                        nonce = scripts.item(i).nonce;
                        break;
                    }
                }

                if (config.csp || nonce) {
                    builder.addServiceDefinition('cspAgent', {
                        factory: 'Nittro.Page.CspAgent()',
                        args: {
                            nonce: nonce
                        },
                        run: true
                    });
                }
            }
        },

        setup: function() {
            var builder = this._getContainerBuilder(),
                config = this._getConfig();

            if (builder.hasServiceDefinition('flashes')) {
                builder.addServiceDefinition('flashAgent', 'Nittro.Page.Bridges.PageFlashes.FlashAgent()!');

                builder.getServiceDefinition('page')
                    .addSetup(function(flashes) {
                        this.on('error:default', function (evt) {
                            if (evt.data.type === 'connection') {
                                flashes.add(config.i18n.connectionError, 'error');

                            } else if (evt.data.type !== 'abort') {
                                flashes.add(config.i18n.unknownError, 'error');

                            }
                        });
                    });
            }
        }
    });

    _context.register(PageExtension, 'PageExtension');

});

_context.invoke('Nittro.Page.Bridges.PageFlashes', function () {

    var FlashAgent = _context.extend(function(page, flashes) {
        this._ = {
            page: page,
            flashes: flashes
        };

        this._handleResponse = this._handleResponse.bind(this);
        this._.page.on('transaction-created', this._initTransaction.bind(this));
    }, {
        _initTransaction: function (evt) {
            evt.data.transaction.on('ajax-response', this._handleResponse);
        },

        _handleResponse: function (evt) {
            var payload = evt.data.response.getPayload();

            if (!payload.redirect && payload.flashes) {
                this._showFlashes(payload.flashes);
            }
        },

        _showFlashes: function (flashes) {
            var id, i;

            for (id in flashes) {
                if (flashes.hasOwnProperty(id) && flashes[id]) {
                    for (i = 0; i < flashes[id].length; i++) {
                        this._.flashes.add(flashes[id][i].message, flashes[id][i].type, id + 'es');

                    }
                }
            }
        }
    });

    _context.register(FlashAgent, 'FlashAgent');

});

_context.invoke('Nittro.Flashes.Bridges.FlashesDI', function(Neon, NeonEntity, HashMap) {

    var FlashesExtension = _context.extend('Nittro.DI.BuilderExtension', function(containerBuilder, config) {
        FlashesExtension.Super.call(this, containerBuilder, config);

    }, {
        STATIC: {
            defaults: {
                layer: null,
                classes: null,
                positioner: {
                    defaultOrder: null,
                    margin: null
                }
            }
        },
        load: function() {
            var builder = this._getContainerBuilder(),
                config = this._getConfig(FlashesExtension.defaults);

            var positioner;

            if (typeof config.positioner === 'string') {
                positioner = config.positioner.match(/^@[^(]+$/) ? config.positioner : Neon.decode('[' + config.positioner + ']').shift();
            } else {
                positioner = new NeonEntity('Nittro.Flashes.DefaultPositioner', HashMap.from(config.positioner));
            }

            builder.addServiceDefinition('flashes', {
                factory: 'Nittro.Flashes.Service()',
                args: {
                    positioner: positioner,
                    options: {
                        layer: config.layer,
                        classes: config.classes
                    }
                },
                run: true
            });
        }
    });

    _context.register(FlashesExtension, 'FlashesExtension');

}, {
    Neon: 'Nittro.Neon.Neon',
    NeonEntity: 'Nittro.Neon.NeonEntity',
    HashMap: 'Utils.HashMap'
});

_context.invoke('App', function (Nette) {

    var NetteBasicFormToggle = _context.extend(function(snippetManager) {
        this._ = {
            snippetManager: snippetManager
        };

        this._.snippetManager.on('after-update', this._handleUpdate.bind(this));
    }, {
        _handleUpdate: function() {
            var forms = [].slice.call(document.getElementsByTagName('form'));
            forms.forEach(Nette.toggleForm);
        }
    });

    _context.register(NetteBasicFormToggle, 'NetteBasicFormToggle');

}, {
    Nette: 'Nittro.Forms.Vendor'
});

_context.invoke(function(Nittro) {
    var builder = new Nittro.DI.ContainerBuilder({
        "params": {},
        "extensions": {
            "ajax": "Nittro.Ajax.Bridges.AjaxDI.AjaxExtension()",
            "forms": "Nittro.Forms.Bridges.FormsDI.FormsExtension()",
            "page": "Nittro.Page.Bridges.PageDI.PageExtension()",
            "flashes": "Nittro.Flashes.Bridges.FlashesDI.FlashesExtension()"
        },
        "services": {
            "netteBasicFormToggle": "App.NetteBasicFormToggle()!"
        },
        "factories": {}
    });

    this.di = builder.createContainer();
    this.di.runServices();

});
window._stack || (window._stack = []);

(function(stack) {
    function exec(f) {
        if (typeof f === 'function') {
            _context.invoke(f);

        } else if (typeof f === 'object' && typeof f.load !== 'undefined') {
            var q = _context.load.apply(_context, f.load);

            if (typeof f.then === 'function') {
                q.then(f.then);

            } else if (f.then && f.then instanceof Array) {
                q.then.apply(_context, f.then);

            }
        } else {
            _context.invoke.apply(_context, f);

        }
    }

    while (stack.length) {
        exec(stack.shift());

    }

    stack.push = function() {
        for (var i = 0; i < arguments.length; i++) {
            exec(arguments[i]);

        }
    };
})(window._stack);
