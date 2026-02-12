import type { Result } from "@chocbite/ts-lib-result";
import {
  default as st,
  type StateArray,
  type StateArrayRead,
  type StateSub,
} from "@libState";
import { Base } from "./base";

interface A<T, E extends Node> {
  generator: (val: T) => E;
  error: (err: string) => Node;
  destructor?: (val: T, element: E) => void;
  array?: T[];
  state?: StateArray<T>;
}

interface B<T, E extends Node> extends A<T, E> {
  array: T[];
  state?: undefined;
}

interface C<T, E extends Node> extends A<T, E> {
  array?: undefined;
  state: StateArray<T>;
}
export type LoopOptions<T, E extends Node> = B<T, E> | C<T, E>;

export class Loop<T, E extends Node> extends Base {
  #generator: (val: T) => E;
  //#error: (err: string) => Node = () => document.createTextNode("");
  #destructor?: (val: T, element: E) => void;
  #state_array?: StateArray<T>;
  #sub_subscriber?: StateSub<Result<StateArrayRead<T>, string>>;
  #values: T[] = [];
  #children: E[] = [];

  constructor(options: LoopOptions<T, E>) {
    super();
    this.#generator = options.generator;
    //this.#error = options.error;
    this.#destructor = options.destructor;
  }

  set array(array: T[]) {
    if (this.#sub_subscriber) this.#state_array?.unsub(this.#sub_subscriber);
    this.replaceChildren(...array.map(this.#generator));
  }

  set state(state: StateArray<T>) {
    if (state === this.#state_array) return;
    if (this.#sub_subscriber) this.#state_array?.unsub(this.#sub_subscriber);
    this.#state_array = state;
    this.#sub_subscriber = this.#state_array.sub((val) => {
      if (val.ok) {
        const value = val.value;
        this.#values = st.a.apply_read(this.#values, value);
        this.#children = st.a.apply_read(
          this.#children,
          value,
          this.#generator,
        );
        if (value.type === "fresh") this.replaceChildren(...this.#children);
        else if (value.type === "added") {
          const child_nodes = this.childNodes;
          if (value.index === child_nodes.length)
            this.append(...this.#children);
          else {
            for (let i = value.items.length; i > 0; i--) {
              this.insertBefore(
                this.childNodes[value.index],
                this.#generator(value.items[i - 1]),
              );
            }
          }
        } else if (value.type === "removed") {
          for (let i = 0; i < value.items.length; i++) {
            if (this.#destructor)
              this.#destructor(
                this.#values[value.index],
                this.#children[value.index],
              );
            this.childNodes[value.index].remove();
          }
        } else if (value.type === "changed")
          for (let i = 0; i < value.items.length; i++)
            this.childNodes[i].replaceWith(this.#generator(value.items[i]));
      }
    }, true);
  }
}
