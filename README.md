# proxyWithStorage

## Install

```
npm i github:lai-dai/valtio-storage
```

## Usage

```js
import { proxyWithStorage } from "@lai-dai/valtio-storage";

const state = proxyWithStorage(
  {
    text: "hello world",
    count: 0,
  },
  {
    key: "hello",
  }
);

// state -> text | count | persister
```
