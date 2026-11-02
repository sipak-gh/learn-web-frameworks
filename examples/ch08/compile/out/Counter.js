import { template as _$template } from "solid-js/web";
import { delegateEvents as _$delegateEvents } from "solid-js/web";
import { insert as _$insert } from "solid-js/web";
var _tmpl$ = /*#__PURE__*/_$template(`<button type=button class=counter>Clicked <!> times`);
import { createSignal } from 'solid-js';
export function Counter() {
  const [count, setCount] = createSignal(0);
  return (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$4 = _el$2.nextSibling,
      _el$3 = _el$4.nextSibling;
    _el$.$$click = () => setCount(count() + 1);
    _$insert(_el$, count, _el$4);
    return _el$;
  })();
}
_$delegateEvents(["click"]);
