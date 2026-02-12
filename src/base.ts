import { EventHandler } from "@chocbite/ts-lib-event";
import { some, type Option } from "@chocbite/ts-lib-result";
import {
  state,
  type State,
  type StateInferSub,
  type StateREA,
  type StateROA,
  type StateSub,
} from "@chocbite/ts-lib-state";
import { AccessTypes } from "./access";
import { BaseObserver, type BaseObserverOptions } from "./observer";

/**Event types for base*/
export const ConnectEventVal = {
  /**When element is connected from document*/
  Connect: 0,
  /**When element is disconnected from document*/
  Disconnect: 1,
  /**When element is adopted by another document*/
  Adopted: 2,
} as const;
export type ConnectEventVal =
  (typeof ConnectEventVal)[keyof typeof ConnectEventVal];

/**Events for Base element */
export interface BaseEvents {
  connect: ConnectEventVal;
  visible: boolean;
}

// Helpers for opts
type DataProps<T> = {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  [K in keyof T as T[K] extends Function ? never : K]: T[K];
};
type WithStateROA<T> = {
  [K in keyof T]?: T[K] | StateROA<T[K]>;
};

/**Shared class for elements to extend
 * All none abstract elements must use the define_element function to declare itself
 *
 * All none abstracts classes must override the static method element_name to return the name of the element
 * Abstract classes should return @abstract@
 *
 * If another library defines an abstract base class, it is recommended to change the static element_name_space method to the name of the library
 * example for this library '@chocolatelibui/core' becomes 'chocolatelibui-core'
 * static element_name_space() { return 'chocolatelibui-core' }
 * This resets the nametree to the library name and prevents too long element names
 *
 * Elements have an access propery, which builds on the html inert property
 * Access has the following three states
 * write = normal interaction and look
 * read = inert attribute is added making the element uninteractable, and add opacity 0.5 to make the element look inaccessible
 * none = adds display:none to element to make it */
export abstract class Base extends HTMLElement {
  /**Returns the name used to define the element, Abstract classes should return @abstract@ */
  static element_name() {
    return "@abstract@";
  }
  /**Returns the namespace override for the element*/
  static element_name_space() {
    return "lib";
  }
  /**Events for element*/
  #base_events = new EventHandler<BaseEvents, Base>(this);
  /**Events for element*/
  readonly base_events = this.#base_events.consumer;

  #states: Map<StateSub<any>, [State<any>, boolean]> = new Map();

  #is_connected: boolean = false;

  /**Observer for children of this element */
  #observer?: BaseObserver;

  /**Works when element is connected to observer, otherwise it is an alias for isConnected*/
  readonly is_visible: boolean = false;
  #attached_observer?: BaseObserver;

  #access?: AccessTypes;

  #props: Map<any, StateSub<any>> = new Map();
  #attr: Map<string, StateSub<any>> = new Map();

  /**Runs when element is attached to document*/
  protected connectedCallback() {
    this.#base_events.emit("connect", ConnectEventVal.Connect);
    for (const [f, [s, v]] of this.#states) if (!v) s.sub(f, true);
    if (this.#attached_observer) this.#attached_observer.observe(this);
    else this.internal_set_visible(true);
    this.#is_connected = true;
  }

  /**Runs when element is dettached from document*/
  protected disconnectedCallback() {
    this.#base_events.emit("connect", ConnectEventVal.Disconnect);
    for (const [f, [s, v]] of this.#states) if (!v) s.unsub(f);
    if (this.#attached_observer) {
      this.#attached_observer.unobserve(this);
      this.internal_set_visible(false);
    }
    this.#is_connected = false;
  }

  /**Runs when element is attached to different document*/
  protected adoptedCallback() {
    this.#base_events.emit("connect", ConnectEventVal.Adopted);
  }

  private internal_set_visible(is: boolean) {
    if (this.is_visible !== is) {
      //@ts-expect-error Change readonly, in same class
      this.is_visible = is;
      this.#base_events.emit("visible", is);
      if (is) {
        for (const [f, [s, v]] of this.#states) if (v) s.sub(f, true);
      } else {
        for (const [f, [s, v]] of this.#states) if (v) s.unsub(f);
      }
    }
  }

  /**Sets any attribute on the base element, to either a fixed value or a state value */
  opts(opts: WithStateROA<DataProps<this>>): this {
    for (const key in opts) {
      const opt = opts[key] as this[typeof key] | StateROA<this[typeof key]>;
      if (state.h.is.roa(opt)) this.attach_state_ROA_to_prop(key, opt);
      else this[key] = opt;
    }
    return this;
  }

  /**Returns an observer for the element */
  observer(
    options: BaseObserverOptions = {
      root: this,
      threshold: 0,
      deffered_hidden: 1000,
    },
  ): BaseObserver {
    return (this.#observer ??= new BaseObserver(options));
  }

  /**Attaches the component to an observer, which is needed for the isVisible state and event to work and for the state system to work on visible*/
  attach_to_observer(observer?: BaseObserver): this {
    if (observer) {
      if (this.#is_connected) {
        if (this.#attached_observer) this.#attached_observer.unobserve(this);
        observer.observe(this);
      }
      this.#attached_observer = observer;
    } else if (this.#attached_observer) {
      if (this.#is_connected) this.#attached_observer.unobserve(this);
      if (!this.is_visible) this.internal_set_visible(true);
      this.#attached_observer = undefined;
    }
    return this;
  }

  /**Attaches a state to a function, so that the function is subscribed to the state when the component is connected
   * @param visible when set true the function is only subscribed when the element is visible, this requires an observer to be attached to the element*/
  attach_state<S extends State<any>>(
    state: S,
    func: StateInferSub<S>,
    visible?: boolean,
  ): typeof func {
    if (this.#states.has(func))
      console.error("Function already registered with element", func, this);
    else {
      this.#states.set(func, [state, Boolean(visible)]);
      if (visible ? this.is_visible : this.#is_connected)
        state.sub(func as StateSub<any>, true);
    }
    return func;
  }

  /**Detaches the function from the state/component */
  detach_state(func: StateSub<any>): typeof func {
    const state = this.#states.get(func);
    if (state) {
      if (state[1] ? this.is_visible : this.#is_connected) state[0].unsub(func);
      this.#states.delete(func);
    } else console.error("Function not registered with element", func, this);
    return func;
  }

  /**Attaches a state to a property, so that the property is updated when the state changes
   * @param prop the property to attach the state to
   * @param state the state to attach to the property
   * @param visible when set true the property is only updated when the element is visible, this requires an observer to be attached to the element*/
  // eslint-disable-next-line @typescript-eslint/naming-convention
  attach_state_ROA_to_prop<K extends keyof this>(
    prop: K,
    state: StateROA<this[K]>,
    visible?: boolean,
  ): this {
    this.detach_state_from_prop(prop).#props.set(
      prop,
      this.attach_state(state, (val) => (this[prop] = val.value), visible),
    );
    return this;
  }

  /**Attaches a state to a property, so that the property is updated when the state changes
   * @param prop the property to attach the state to
   * @param state the state to attach to the property
   * @param visible when set true the property is only updated when the element is visible, this requires an observer to be attached to the element
   * @param fallback the fallback value for the property when the state is not ok, if undefined the property is not updated when the state is not ok*/
  // eslint-disable-next-line @typescript-eslint/naming-convention
  attach_state_ROA_to_prop_map<K extends keyof this, T = this[K]>(
    prop: K,
    state: StateROA<T>,
    map: (val: T) => Option<this[K]>,
    visible?: boolean,
  ): this {
    this.detach_state_from_prop(prop).#props.set(
      prop,
      this.attach_state(
        state,
        (val) => {
          const o = map(val.value);
          if (o.some) this[prop] = o.value;
        },
        visible,
      ),
    );
    return this;
  }

  /**Attaches a state to a property, so that the property is updated when the state changes
   * @param prop the property to attach the state to
   * @param state the state to attach to the property
   * @param map_err function called when state gives a ResultErr,
   * @param visible when set true the property is only updated when the element is visible, this requires an observer to be attached to the element*/
  attach_state_to_prop<K extends keyof this>(
    prop: K,
    state: StateREA<this[K]>,
    map_err: (error: string) => Option<this[K]>,
    visible?: boolean,
  ): this {
    this.detach_state_from_prop(prop).#props.set(
      prop,
      this.attach_state(
        state,
        (v) => {
          const o = v.ok ? some(v.value) : map_err(v.error);
          if (o.some) this[prop] = o.value;
        },
        visible,
      ),
    );
    return this;
  }
  /**Attaches a state to a property, so that the property is updated when the state changes
   * @param prop the property to attach the state to
   * @param state the state to attach to the property
   * @param map_err function called when state gives a ResultErr,
   * @param map function called when state gives a ResultOk,
   * @param visible when set true the property is only updated when the element is visible, this requires an observer to be attached to the element*/
  attach_state_to_prop_map<K extends keyof this, T = this[K]>(
    prop: K,
    state: StateREA<T>,
    map_err: (error: string) => Option<this[K]>,
    map: (val: T) => Option<this[K]>,
    visible?: boolean,
  ): this {
    this.detach_state_from_prop(prop).#props.set(
      prop,
      this.attach_state(
        state,
        (v) => {
          const o = v.ok ? map(v.value) : map_err(v.error);
          if (o.some) this[prop] = o.value;
        },
        visible,
      ),
    );
    return this;
  }

  /**Detaches the state from the property */
  detach_state_from_prop<T extends keyof this>(prop: T): this {
    const pro = this.#props.get(prop);
    if (pro) {
      this.detach_state(pro);
      this.#props.delete(prop);
    }
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  attach_state_ROA_to_attribute(
    qualified_name: string,
    state: StateROA<string>,
    visible?: boolean,
  ): this {
    this.detach_state_from_attribute(qualified_name).#attr.set(
      qualified_name,
      this.attach_state(
        state,
        (val) => this.setAttribute(qualified_name, val.value),
        visible,
      ),
    );
    return this;
  }

  // eslint-disable-next-line @typescript-eslint/naming-convention
  attach_state_ROA_to_attribute_map<U>(
    qualified_name: string,
    state: StateROA<U>,
    map: (val: U) => Option<string>,
    visible?: boolean,
  ): this {
    this.detach_state_from_attribute(qualified_name).#attr.set(
      qualified_name,
      this.attach_state(
        state,
        (val) => {
          const o = map(val.value);
          if (o.some) this.setAttribute(qualified_name, o.value);
        },
        visible,
      ),
    );
    return this;
  }

  attach_state_to_attribute(
    qualified_name: string,
    state: StateREA<string>,
    map_err: (error: string) => Option<string>,
    visible?: boolean,
  ): this {
    this.detach_state_from_attribute(qualified_name).#attr.set(
      qualified_name,
      this.attach_state(
        state,
        (v) => {
          const o = v.ok ? some(v.value) : map_err(v.error);
          if (o.some) this.setAttribute(qualified_name, o.value);
        },
        visible,
      ),
    );
    return this;
  }

  attach_state_to_attribute_map<U>(
    qualified_name: string,
    state: StateREA<U>,
    map_err: (error: string) => Option<string>,
    map: (val: U) => Option<string>,
    visible?: boolean,
  ): this {
    this.detach_state_from_attribute(qualified_name).#attr.set(
      qualified_name,
      this.attach_state(
        state,
        (v) => {
          const o = v.ok ? map(v.value) : map_err(v.error);
          if (o.some) this.setAttribute(qualified_name, o.value);
        },
        visible,
      ),
    );
    return this;
  }

  /**Detaches the state from the property */
  detach_state_from_attribute(qualified_name: string): this {
    const pro = this.#attr.get(qualified_name);
    if (pro) this.detach_state(pro);
    return this;
  }

  /**Sets the access of the element, passing undefined is the same as passing write access*/
  set access(access: AccessTypes) {
    this.#access = access;
    switch (access) {
      case AccessTypes.Write:
        this.inert = false;
        break;
      case AccessTypes.Read:
        this.inert = true;
        break;
      case AccessTypes.None:
        this.setAttribute("inert", "none");
        break;
    }
  }

  /**Overrideable function called when access is changed */
  protected on_access(_access: AccessTypes) {}

  /**Returns the current access of the element */
  get access(): AccessTypes {
    return this.#access ?? AccessTypes.Write;
  }
}
