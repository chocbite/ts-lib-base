import state from "@chocbite/ts-lib-state";
import { Base } from "./base";
import { define_element } from "./define_element";

interface LoopOptions<T, N extends Node> {
  change?: (element: N, new_value: T) => void;
  destructor?: (element: N) => void;
}

export class Loop<T, N extends Node> extends Base {
  static element_name(): string {
    return "loop";
  }
  static element_name_space(): string {
    return "loop";
  }

  #generator: (val: T) => N;
  #destructor?: (element: N) => void;
  #change?: (element: N, new_value: T) => void;

  constructor(generator: (val: T) => N, options?: LoopOptions<T, N>) {
    super();
    this.#generator = generator;
    this.#destructor = options?.destructor;
    this.#change = options?.change;
  }

  set array(array: readonly T[]) {
    const read = state.a.read(array);
    for (let i = 0; i < read.length; i++) {
      const element = read[i];
      if (element.type === "fresh")
        this.replaceChildren(...array.map(this.#generator));
      else if (element.type === "added") {
        const child_nodes = this.childNodes;
        if (element.index === child_nodes.length)
          this.append(...array.slice(element.index).map(this.#generator));
        else {
          for (let i = element.items.length; i > 0; i--) {
            this.insertBefore(
              this.#generator(element.items[i - 1]),
              child_nodes[element.index],
            );
          }
        }
      } else if (element.type === "removed")
        for (let i = 0; i < element.items.length; i++) {
          this.#destructor?.(this.childNodes[element.index] as unknown as N);
          this.childNodes[element.index].remove();
        }
      else if (element.type === "changed")
        for (let i = 0; i < element.items.length; i++)
          if (this.#change)
            this.#change(
              this.childNodes[i + element.index] as unknown as N,
              element.items[i],
            );
          else {
            this.#destructor?.(
              this.childNodes[i + element.index] as unknown as N,
            );
            this.childNodes[i + element.index].replaceWith(
              this.#generator(element.items[i]),
            );
          }
    }
  }

  set error(err: Node) {
    this.replaceChildren(err);
  }
}
define_element(Loop);

export function base_loop<T, N extends Node>(
  generator: (val: T) => N,
  options?: LoopOptions<T, N>,
) {
  return new Loop<T, N>(generator, options);
}

export function base_loop_state() {}
