# Pobiega's typescript repo for Bitburner

This entire repo is provided as-is, and since I'm using typescript, you can't just copypaste into the game and expect it to work, sadly. Still, here is my "short guide" on how to use these.

## Installation
1. Make sure you have typescript installed!
2. Clone the repo
3. run `tsc` (the typescript compiler) in the repo root folder
4. open the `dist` folder that was just created. These are the compiled javascript files.
5. get them into the game however you want.

You will also need the so called "payload" scripts:

### weaken.js
```js
/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const threads = ns.args[1];
    const delay = ns.args[2];

    if (delay && delay > 0) {
        await ns.asleep(delay);
    }

    await ns.weaken(target, { threads: threads });
}
```

### grow.js
```js
/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const threads = ns.args[1];
    const delay = ns.args[2];

    if (delay && delay > 0) {
        await ns.asleep(delay);
    }

    await ns.grow(target, { threads: threads });
}
```

### hack.js
```js
/** @param {NS} ns */
export async function main(ns) {
    const target = ns.args[0];
    const threads = ns.args[1];
    const delay = ns.args[2];

    if (delay && delay > 0) {
        await ns.asleep(delay);
    }

    await ns.hack(target, { threads: threads });
}
```

## Usage

### `run controller.js`

will start the controller. This does pretty much everything automatically, including rooting new machines, finding targets, preparing them for HWGW and finally HWGW attacks.

### `run xpfarm.js`
perfect for "I just installed augments, whats next?". Will root new machines etc and then get a lot of XP from poor "joesguns".

### `run privateservers.js [plan,buy,delete] [ram]`

Plan will show you some suggestions on how to spend your money.
buy takes ram size in and buys the most it can of that size.
delete takes ram size in and deletes all servers with that ram size.