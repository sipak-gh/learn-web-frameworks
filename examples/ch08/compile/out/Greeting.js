import { template as _$template } from "solid-js/web";
import { insert as _$insert } from "solid-js/web";
var _tmpl$ = /*#__PURE__*/_$template(`<p class=greeting>Hello, <!>!`);
export function Greeting(props) {
  return (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$4 = _el$2.nextSibling,
      _el$3 = _el$4.nextSibling;
    _$insert(_el$, () => props.name, _el$4);
    return _el$;
  })();
}
export function DestructuredGreeting({
  name
}) {
  return (() => {
    var _el$5 = _tmpl$(),
      _el$6 = _el$5.firstChild,
      _el$8 = _el$6.nextSibling,
      _el$7 = _el$8.nextSibling;
    _$insert(_el$5, name, _el$8);
    return _el$5;
  })();
}
