import state from "@chocbite/ts-lib-state";
import { base_loop } from "./base_loop";

// class TestElement extends Base {
//   static element_name(): string {
//     return "test-element";
//   }
//   static element_name_space(): string {
//     return "chocbite";
//   }

//   set text(text: string) {
//     this.textContent = text;
//   }
// }
// define_element(TestElement);

// const SYMBOL = Symbol("test");
// const element = document.body.appendChild(new TestElement());
// const number = state.ok(13);
// element.attach_state_to_symbol(SYMBOL, number, (value) => {
//   element.text = `The value is ${value.value}`;
// });
// await new Promise((a) => setTimeout(a, 2000));
// number.set_ok(14);
// element.detach_state_from_symbol(SYMBOL);
// await new Promise((a) => setTimeout(a, 2000));
// number.set_ok(15);
// console.warn(number.ok());

const element2 = document.body.appendChild(
  base_loop((val: number) => {
    const el = document.createElement("div");
    el.textContent = `Value: ${val}`;
    return el;
  }, {}),
);

// element2.array = [1, 2, 3];
const st = state.ok([1, 2, 4, 3, 4, 4]);
element2.attach_state_ROA_to_prop("array", st);

// st.array.push(5, 6);
// st.array.unshift(2);
st.array.change(2, 99, 44);
// st.array.delete(4);
// st.array.splice(2, 1, 99);
