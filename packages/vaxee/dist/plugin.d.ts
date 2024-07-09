import { type App, type Ref } from "vue";
import type { VaxeeStoreActions, VaxeeStoreGetters, VaxeeStoreOther, VaxeeStoreQueries, VaxeeStoreState } from "./store/types";
import type { BaseStore, VaxeeStore } from "./store/createStore";
export declare const vaxeeSymbol: unique symbol;
export type VaxeeInternalStore<Store extends BaseStore, Refs extends boolean = true> = VaxeeStore<Store, Refs> & {
    _state: VaxeeStoreState<Store>;
    _actions: VaxeeStoreActions<Store>;
    _getters: VaxeeStoreGetters<Store>;
    _queries: VaxeeStoreQueries<Store>;
    _other: VaxeeStoreOther<Store>;
};
export interface Vaxee {
    install(app: App): void;
    state: Ref<Record<string, VaxeeStoreState<any>>>;
    _stores: Record<string, VaxeeInternalStore<any>>;
    _options: VaxeeOptions;
}
export interface VaxeeOptions {
    persist?: {
        get: (key: string) => any;
        set: (key: string, value: any) => any;
    };
}
export declare function setVaxeeInstance(instance: Vaxee): void;
export declare const getVaxeeInstance: () => Vaxee | null;
export declare function createVaxee(options?: VaxeeOptions): Vaxee;
