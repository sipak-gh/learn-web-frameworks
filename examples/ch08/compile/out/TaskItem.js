import { template as _$template } from "solid-js/web";
import { delegateEvents as _$delegateEvents } from "solid-js/web";
import { setAttribute as _$setAttribute } from "solid-js/web";
import { insert as _$insert } from "solid-js/web";
import { addEventListener as _$addEventListener } from "solid-js/web";
import { effect as _$effect } from "solid-js/web";
var _tmpl$ = /*#__PURE__*/_$template(`<li class=task><label><input type=checkbox> <span></span></label><button type=button class=delete>×`);
export function TaskItem(props) {
  return (() => {
    var _el$ = _tmpl$(),
      _el$2 = _el$.firstChild,
      _el$3 = _el$2.firstChild,
      _el$4 = _el$3.nextSibling,
      _el$5 = _el$4.nextSibling,
      _el$6 = _el$2.nextSibling;
    _$addEventListener(_el$3, "change", props.onToggle);
    _$insert(_el$5, () => props.task.title);
    _$addEventListener(_el$6, "click", props.onRemove, true);
    _$effect(_p$ => {
      var _v$ = !!props.task.done,
        _v$2 = `Delete "${props.task.title}"`;
      _v$ !== _p$.e && _el$.classList.toggle("done", _p$.e = _v$);
      _v$2 !== _p$.t && _$setAttribute(_el$6, "aria-label", _p$.t = _v$2);
      return _p$;
    }, {
      e: undefined,
      t: undefined
    });
    _$effect(() => _el$3.checked = props.task.done);
    return _el$;
  })();
}
_$delegateEvents(["click"]);
