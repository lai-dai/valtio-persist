## Install

```
npm i github:lai-dai/valtio-storage
```

## Usage

```js
const state = proxyPersist(
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
