// 102,71,95,33,158,130,102,189,179,77,18,180,17,101,127,88,53,39

const numbers = Deno.args[0].split(",").map(Number);

let hold1: number = Number.MIN_SAFE_INTEGER;
let hold2: number = Number.MIN_SAFE_INTEGER;
let release1 = 0;
let release2 = 0;

for (const price of numbers) {
  release2 = Math.max(release2, hold2 + price);
  hold2 = Math.max(hold2, release1 - price);
  release1 = Math.max(release1, hold1 + price);
  hold1 = Math.max(hold1, price * -1);
}

console.log(release2);
