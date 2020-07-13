## 原生的 Promise

```js
new Promise((resolve, reject) => {
  resolve("解决");
  reject("拒绝");
}).then(
  ((value) => {},
  (reason) => {
    console.log(reason);
  })
);
```

## 1. 需要人为干预 this 指向

因为在 JS 的类中默认使用的是严格模式
也就是说 this 指向的是 window , window 中没有 resolve / reject 所以自然就会报 undefined 的错
所以需要人为的干预类中的 this 的指向 => call / apply / bind

```js
executor(this.resolve, this.reject); // 会报错 因为 this 指向的是 window
executor(this.resolve.bind(this), this.reject.bind(this)); // 正确写法
```

## 2. call / apply / bind

因为 bind() 返回的是一个函数,以便于后续的调用,所以在原生 Promise 中用 bind() 方法改变 this 指向是最合适的

## 3. 在原生 Promise 中,一旦当状态改变之后就不能再进行修改了

Promise 的开始状态就是从准备状态(pending)开始的,所以我们修改状态之前就必须要对状态进行判断
只有当状态是准备状态才能开始修改状态(fulfilled / rejected)

```js
if (this.status == HD.PENDING) {
  // 修改状态为 成功状态
  this.status = HD.FULFILLED;
  this.value = value;
}
// 拒绝状态同样如此
if (this.status == HD.PENDING) {...}
```

## 4. 在原生 Promise 中,then() 方法不是调用之后就马上执行的.它是根据 Promise 中返回的状态如何再执行相对应的状态

因此就需要控制 then() 方法,判断状态是否相对应再执行

```js
.then(onFulfilled, onRejected) {
    // 控制 then 方法,只有状态为成功的时候再执行 onFulfilled() 方法
    if (this.status == HD.FULFILLED) {
      onFulfilled(this.value);
    }
    // 控制 then 方法,只有状态为失败的时候再执行 onRejected() 方法
    if (this.status == HD.REJECTED) {
      onRejected(this.value);
    }
  }
```

## 5. then() 方法中的参数必须要是函数,因此需要在判断状态之前将 onFulfilled / onRejected 转为函数

```js
 then(onFulfilled, onRejected) {
    if (typeof onFulfilled != "function") {
      onFulfilled = () => {};
    }
    if (typeof onRejected != "function") {
      onRejected = () => {};
    }
    .....
```

但是因为在原生的 Promise 中,then()方法是可以链式调用的,因此直接再 then()方法的内部强转为函数是不对的

> 原因,then() 的穿透的问题 => 当直接是 then() 的时候,会返回 undefined
> 解决方法: 给每个函数返回一个 value 值

```js
onFulfilled = () => this.value;
onRejected = () => this.value;
```

## 6. 就目前来说,手写的 Promise 还不能实现异步,可以随便打印一个东西试试

因此我们需要利用定时器(setTimeout)将 then()方法放置于队列之中,等待下一次轮询

```js
if (this.status == HD.FULFILLED) {
  setTimeout(() => {
    try {
      onFulfilled(this.value);
    } catch (error) {
      onRejected(error);
    }
  });
}
 if (this.status == HD.REJECTED) {
      setTimeout(() => {...});
    }
```

## 7. 实现 then() 的链式调用 => 在 then() 方法中返回一个新的 HD 方法

```js
then(onFulfilled, onRejected) {
    ...
    return new HD((resolve, reject) => {
      if (this.status == HD.PENDING) {
        this.callbacks.push({
          onFulfilled: ...},
          onRejected: ...},
        });
      }
      if (this.status == HD.FULFILLED) {...});
      }
      if (this.status == HD.REJECTED) {...});
      }
    });
  }
```

## 8. 需要注意的是,在 then() 方法的链式调用中,第一个 then 无论返回的是成功状态还是拒绝状态,都是会进入第二个 then 方法中的成功状态

## 9. 在 Promise 中,promise 是不允许返回自身的,否则会报错

```js
let promise = new Promise((resolve, reject) => {
  resolve("解决");
});
let p = promise.then((value) => {
  return p;
});
// 会报错 => Uncaught (in promise) TypeError: Chaining cycle detected for promise #<Promise>
```

> 但目前手写的 Promise 还没能实现这个功能
>
> 实现方法:1. 不要直接返回 new HD() ,而是将它赋给一个变量,然后再返回(return)出去 || 2. pares() 方法中添加一个参数 this.parse(promise,....) || 3. 最后在这个 pares() 方法中判断这个返回的值是否是自身,是的话就抛出错误

```js
if (promise == result) {
  throw typeError("Chaining cycle detected for promise");
}
```
