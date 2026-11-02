// <form-toggle-chip>: <toggle-chip> taught to take part in forms.
// Load toggle-chip.js first: classic scripts share one global scope, so the
// ToggleChip class it declares is visible here.

class FormToggleChip extends ToggleChip {
  // Opt in: the element can now be a form control, like <input>.
  static formAssociated = true

  #internals = this.attachInternals()

  // What a form control is expected to have.
  get form() {
    return this.#internals.form
  }

  get name() {
    return this.getAttribute('name')
  }

  attributeChangedCallback(name, oldValue, newValue) {
    super.attributeChangedCallback(name, oldValue, newValue)
    // Submitted as name=value when pressed, left out when not (a checkbox's rule).
    this.#internals.setFormValue(newValue === null ? null : (this.getAttribute('value') ?? 'on'))
  }

  // Called by the browser when the form is reset.
  formResetCallback() {
    this.pressed = false
  }
}

customElements.define('form-toggle-chip', FormToggleChip)
