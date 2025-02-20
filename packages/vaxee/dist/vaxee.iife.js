var vaxee = function(exports, vue2) {
  "use strict";
  const IS_DEV = process.env.NODE_ENV !== "production";
  const IS_CLIENT = typeof window !== "undefined";
  const VAXEE_LOG_START = "[🌱 vaxee]: ";
  const vaxeeSymbol = Symbol("vaxee");
  let vaxeeInstance = null;
  function setVaxeeInstance(instance) {
    vaxeeInstance = instance;
  }
  const getVaxeeInstance = () => vaxeeInstance;
  function createVaxee(options = {}) {
    const vaxee2 = {
      install(app) {
        setVaxeeInstance(vaxee2);
        app.provide(vaxeeSymbol, vaxee2);
        if (IS_DEV && IS_CLIENT && true) {
          console.log(
            VAXEE_LOG_START + "Store successfully installed. Enjoy! Also you can check current Vaxee state by calling a `$vaxee()` method in the `window`."
          );
          window.$vaxee = () => vue2.reactive(vaxee2.state)._value;
        }
      },
      state: vue2.ref({}),
      _stores: {},
      _options: options
    };
    return vaxee2;
  }
  function useVaxee() {
    const hasContext = vue2.hasInjectionContext();
    const vaxee2 = hasContext ? vue2.inject(vaxeeSymbol) : getVaxeeInstance();
    if (!vaxee2) {
      throw new Error(
        VAXEE_LOG_START + "Seems like you forgot to install the plugin"
      );
    }
    return vaxee2;
  }
  const stateSymbol = Symbol("vaxee-state");
  const getterSymbol = Symbol("vaxee-getter");
  function getDefaultPersist() {
    const vaxee2 = useVaxee();
    return {
      get: (key) => {
        if (vaxee2._options.persist) {
          return vaxee2._options.persist.get(key);
        }
        return IS_CLIENT ? JSON.parse(localStorage.getItem(key) || "null") : null;
      },
      set: (key, value) => {
        var _a;
        if (vaxee2._options.persist) {
          (_a = vaxee2._options.persist) == null ? void 0 : _a.set(key, value);
        } else if (IS_CLIENT) {
          localStorage.setItem(key, JSON.stringify(value));
        }
      }
    };
  }
  function state(value, options) {
    const _ref = (options == null ? void 0 : options.shallow) ? vue2.shallowRef(value) : vue2.ref(value);
    _ref.StateSymbol = stateSymbol;
    if (typeof (options == null ? void 0 : options.persist) === "object" && "get" in options.persist && "set" in options.persist) {
      _ref._persist = options.persist;
    } else if (typeof (options == null ? void 0 : options.persist) === "string") {
      const { get: _get, set: _set } = getDefaultPersist();
      _ref._persist = {
        get: () => _get(options.persist),
        set: (value2) => _set(options.persist, value2)
      };
    } else {
      _ref._persist = null;
    }
    if (_ref._persist) {
      const persisted = _ref._persist.get();
      if (persisted !== void 0 && persisted !== null) _ref.value = persisted;
      vue2.watch(
        _ref,
        (value2) => {
          _ref._persist.set(value2);
        },
        { deep: true }
      );
    }
    return _ref;
  }
  const isState = (ref2) => (ref2 == null ? void 0 : ref2.StateSymbol) === stateSymbol;
  function getter(fn) {
    const ref2 = vue2.computed(() => fn());
    ref2.GetterSymbol = getterSymbol;
    return ref2;
  }
  const isGetter = (ref2) => (ref2 == null ? void 0 : ref2.GetterSymbol) === getterSymbol;
  const requestSymbol = Symbol("vaxee-request");
  var VaxeeRequestStatus = /* @__PURE__ */ ((VaxeeRequestStatus2) => {
    VaxeeRequestStatus2["Idle"] = "idle";
    VaxeeRequestStatus2["Fetching"] = "fetching";
    VaxeeRequestStatus2["Refreshing"] = "refreshing";
    VaxeeRequestStatus2["Error"] = "error";
    VaxeeRequestStatus2["Success"] = "success";
    return VaxeeRequestStatus2;
  })(VaxeeRequestStatus || {});
  function checkPrivateRequest(request2) {
    if ((request2 == null ? void 0 : request2.RequestSymbol) !== requestSymbol) {
      throw new Error("This is not a private request");
    }
  }
  function request(callback, options = {}) {
    if (!options.mode) {
      if (options.sendManually) {
        console.warn(
          VAXEE_LOG_START + "`sendManually` is deprecated. Use `mode: 'manual'` instead."
        );
        options.mode = "manual";
      } else if (options.sendOnServer) {
        console.warn(
          VAXEE_LOG_START + "`sendOnServer` is deprecated. Use `mode: 'client'` instead."
        );
        options.mode = "client";
      }
    }
    options.mode || (options.mode = "auto");
    const _param = vue2.ref(void 0);
    const q = {
      data: vue2.ref(null),
      error: vue2.ref(null),
      status: vue2.ref(
        options.mode === "manual" ? "idle" : "fetching"
        /* Fetching */
      ),
      suspense: () => Promise.resolve(),
      async execute(param) {
        if (param) {
          _param.value = param;
        }
        q.status.value = "fetching";
        q.data.value = null;
        q.error.value = null;
        const promise = sendRequest();
        q.suspense = async () => {
          await promise;
        };
        return promise;
      },
      async refresh() {
        q.status.value = "refreshing";
        q.error.value = null;
        const promise = sendRequest();
        q.suspense = async () => {
          await promise;
        };
        return promise;
      },
      onError(callback2) {
        if (IS_CLIENT) {
          return vue2.watch(
            q.error,
            (error) => {
              if (error) {
                callback2(error);
              }
            },
            {
              immediate: true
            }
          );
        }
        return () => {
        };
      },
      onSuccess(callback2) {
        if (IS_CLIENT) {
          return vue2.watch(
            q.status,
            (status) => {
              if (status === "success") {
                callback2(q.data.value);
              }
            },
            {
              immediate: true
            }
          );
        }
        return () => {
        };
      }
    };
    let abortController = null;
    const sendRequest = async () => {
      var _a;
      let isAborted = false;
      if (abortController) {
        abortController.abort();
      }
      abortController = new AbortController();
      abortController.signal.onabort = () => {
        isAborted = true;
      };
      try {
        const data = await callback({
          signal: abortController.signal,
          param: _param.value
        });
        q.data.value = data;
        q.status.value = "success";
        abortController = null;
      } catch (error) {
        if (!isAborted) {
          q.error.value = error;
          q.status.value = "error";
          abortController = null;
          (_a = options.onError) == null ? void 0 : _a.call(options, error);
        }
      }
    };
    function _init(store, key) {
      var _a;
      const vaxee2 = useVaxee();
      const initial = ((_a = vaxee2.state.value[store]) == null ? void 0 : _a[key]) && vaxee2.state.value[store][key].status !== "fetching" ? vaxee2.state.value[store][key] : void 0;
      if (initial) {
        q.data.value = initial.data;
        q.error.value = initial.error;
        q.status.value = initial.status;
        return q;
      }
      if (options.mode === "auto" || options.mode === "client") {
        const promise = options.mode === "auto" || IS_CLIENT && options.mode === "client" ? sendRequest() : Promise.resolve();
        const instance = vue2.getCurrentInstance();
        if (options.mode === "auto" && instance) {
          vue2.onServerPrefetch(() => promise, instance);
        }
        q.suspense = async () => {
          await promise;
        };
      }
      return q;
    }
    if (options.watch) {
      if (options.watch.some(
        (w) => !isState(w) && !isGetter(w) && typeof w !== "function"
      )) {
        throw new Error(
          VAXEE_LOG_START + "Watch should be an array of `state` or `getter` or `function` that returns a value"
        );
      }
      if (IS_CLIENT) {
        vue2.watch(options.watch, q.refresh);
      }
    }
    const returning = {
      ...q,
      _init,
      RequestSymbol: requestSymbol
    };
    return returning;
  }
  const isRequest = (request2) => (request2 == null ? void 0 : request2.RequestSymbol) === requestSymbol;
  function parseStore(store) {
    return Object.entries(store).reduce(
      (acc, [key, value]) => {
        if (isState(value)) {
          acc.states[key] = value;
        } else if (isGetter(value)) {
          acc.getters[key] = value;
        } else if (isRequest(value)) {
          acc.requests[key] = value;
        } else if (typeof value === "function") {
          acc.actions[key] = value;
        } else {
          acc.other[key] = vue2.unref(value);
        }
        return acc;
      },
      {
        states: {},
        actions: {},
        getters: {},
        requests: {},
        other: {}
      }
    );
  }
  function prepareStore(name, store) {
    const vaxee2 = useVaxee();
    if (vaxee2._stores[name]) {
      return vaxee2._stores[name];
    }
    const { states, actions, getters, requests, other } = parseStore(store);
    if (vaxee2.state.value[name]) {
      for (const key in states) {
        states[key].value = vaxee2.state.value[name][key];
      }
    }
    const preparedRequests = {};
    for (const key in requests) {
      checkPrivateRequest(requests[key]);
      const request2 = requests[key]._init(name, key);
      states[key] = state({
        data: request2.data,
        status: request2.status
      });
      preparedRequests[key] = request2;
    }
    vaxee2.state.value[name] = states;
    vaxee2._stores[name] = {
      ...states,
      ...actions,
      ...getters,
      ...preparedRequests,
      ...other,
      _state: states,
      _actions: actions,
      _getters: getters,
      _requests: preparedRequests,
      _other: other
    };
    Object.defineProperty(vaxee2._stores[name], "_state", {
      get: () => vaxee2.state.value[name],
      set: (state2) => {
        Object.assign(vaxee2.state.value[name], state2);
      }
    });
    return vaxee2._stores[name];
  }
  const createStore = (name, store) => {
    var _a;
    if ((_a = getVaxeeInstance()) == null ? void 0 : _a._stores[name]) {
      if (IS_DEV) {
        console.warn(
          VAXEE_LOG_START + `The store with name "${name}" already exists. In production, this will throw an error.`
        );
      } else {
        throw new Error(
          VAXEE_LOG_START + `The store with name "${name}" already exists.`
        );
      }
    }
    function use(propName) {
      if (propName !== void 0 && typeof propName !== "string") {
        throw new Error(
          VAXEE_LOG_START + `The prop name must be a string when using the store "${name}"`
        );
      }
      const _store = prepareStore(name, store({ state, getter, request }));
      if (propName !== void 0 && !Object.keys(_store).includes(propName)) {
        throw new Error(
          VAXEE_LOG_START + `The prop name "${propName}" does not exist in the store "${name}"`
        );
      }
      if (propName) {
        if (_store._actions[propName]) {
          return _store._actions[propName];
        }
        if (_store._getters[propName]) {
          return _store._getters[propName];
        }
        if (_store._requests[propName]) {
          const request2 = _store._requests[propName];
          const requestPromise = Promise.resolve(request2.suspense()).then(
            () => request2
          );
          Object.assign(requestPromise, request2);
          return requestPromise;
        }
        if (_store._other[propName]) {
          return _store._other[propName];
        }
        return vue2.computed({
          get: () => _store._state[propName],
          set: (value) => {
            _store._state[propName] = value;
          }
        });
      }
      return _store;
    }
    use.$inferState = {};
    use.reactive = () => vue2.reactive(use());
    return use;
  };
  exports.VaxeeRequestStatus = VaxeeRequestStatus;
  exports.createStore = createStore;
  exports.createVaxee = createVaxee;
  exports.getter = getter;
  exports.request = request;
  exports.setVaxeeInstance = setVaxeeInstance;
  exports.state = state;
  exports.useVaxee = useVaxee;
  Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
  return exports;
}({}, vue);
