import { Component, computed, input, output } from '@angular/core';
import * as i0 from "@angular/core";
// An attribute selector: the <li> itself is the component's host element.
export class TaskItem {
    task = input.required(/* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "task" }] : /* istanbul ignore next */ []));
    toggle = output();
    remove = output();
    deleteLabel = computed(() => `Delete "${this.task().title}"`, /* @ts-ignore */
    ...(ngDevMode ? [{ debugName: "deleteLabel" }] : /* istanbul ignore next */ []));
    static ɵfac = function TaskItem_Factory(__ngFactoryType__) { return new (__ngFactoryType__ || TaskItem)(); };
    static ɵcmp = /*@__PURE__*/ i0.ɵɵdefineComponent({ type: TaskItem, selectors: [["li", "app-task-item", ""]], hostAttrs: [1, "task"], hostVars: 2, hostBindings: function TaskItem_HostBindings(rf, ctx) { if (rf & 2) {
            i0.ɵɵclassProp("done", ctx.task().done);
        } }, inputs: { task: [1, "task"] }, outputs: { toggle: "toggle", remove: "remove" }, decls: 6, vars: 3, consts: [["type", "checkbox", 3, "change", "checked"], ["type", "button", 1, "delete", 3, "click"]], template: function TaskItem_Template(rf, ctx) { if (rf & 1) {
            i0.ɵɵdomElementStart(0, "label")(1, "input", 0);
            i0.ɵɵdomListener("change", function TaskItem_Template_input_change_1_listener() { return ctx.toggle.emit(); });
            i0.ɵɵdomElementEnd();
            i0.ɵɵdomElementStart(2, "span");
            i0.ɵɵtext(3);
            i0.ɵɵdomElementEnd()();
            i0.ɵɵdomElementStart(4, "button", 1);
            i0.ɵɵdomListener("click", function TaskItem_Template_button_click_4_listener() { return ctx.remove.emit(); });
            i0.ɵɵtext(5, " \u00D7\n");
            i0.ɵɵdomElementEnd();
        } if (rf & 2) {
            i0.ɵɵadvance();
            i0.ɵɵdomProperty("checked", ctx.task().done);
            i0.ɵɵadvance(2);
            i0.ɵɵtextInterpolate(ctx.task().title);
            i0.ɵɵadvance();
            i0.ɵɵattribute("aria-label", ctx.deleteLabel());
        } }, encapsulation: 2 });
}
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassMetadata(TaskItem, [{
        type: Component,
        args: [{ selector: 'li[app-task-item]', host: { class: 'task', '[class.done]': 'task().done' }, template: "<label>\n  <input type=\"checkbox\" [checked]=\"task().done\" (change)=\"toggle.emit()\" />\n  <span>{{ task().title }}</span>\n</label>\n<button type=\"button\" class=\"delete\" [attr.aria-label]=\"deleteLabel()\" (click)=\"remove.emit()\">\n  \u00D7\n</button>\n" }]
    }], null, { task: [{ type: i0.Input, args: [{ isSignal: true, alias: "task", required: true }] }], toggle: [{ type: i0.Output, args: ["toggle"] }], remove: [{ type: i0.Output, args: ["remove"] }] }); })();
(() => { (typeof ngDevMode === "undefined" || ngDevMode) && i0.ɵsetClassDebugInfo(TaskItem, { className: "TaskItem", filePath: "task-item/task-item.ts", lineNumber: 10 }); })();
