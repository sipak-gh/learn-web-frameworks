function addShipping(cents: number): number {
  return cents + 500
}

const fromForm = '250' // input.value is always a string
console.log(addShipping(fromForm))
