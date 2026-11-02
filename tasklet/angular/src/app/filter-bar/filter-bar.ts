import { Component, model } from '@angular/core';
import type { Filter } from '../tasks';

@Component({
  selector: 'app-filter-bar',
  templateUrl: './filter-bar.html',
})
export class FilterBar {
  // A model input: the parent binds it with [(filter)], and set() here
  // writes the new value back to the parent's signal.
  readonly filter = model.required<Filter>();

  protected readonly filters: { value: Filter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'active', label: 'Active' },
    { value: 'done', label: 'Done' },
  ];
}
