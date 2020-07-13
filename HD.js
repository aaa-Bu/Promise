class HD {
  static PENDING = "pending";
  static FULFILLED = " ";
  static REJECTED = "rejected";
  constructor(executor) {
    this.status = HD.PENDING; // 准备状态
    this.value = null;
    this.callbacks = []; // 放置要执行的方法,等状态改变之后再拿出来执行
    // 接受两个参数(类方法的形式)
    /*
     如果用以下方法写的话,是会报错的,因为在 JS 的类中默认使用的是严格模式
     也就是说 this 指向的是 window , window 中没有 resolve / reject 所以自然就会报 undefined 的错
     所以需要人为的干预类中的 this 的指向 => call / apply / bind
    */
    // executor(this.resolve, this.reject) // => 报错
    // 因为 bind 是返回一个函数,便于后续调用,所以用 bind 改变 this 指向是最好的选择
    try {
      executor(this.resolve.bind(this), this.reject.bind(this));
    } catch (error) {
      // 捕获异常 如果有异常就调用 reject
      this.reject(error);
    }
  }
  resolve(value) {
    // console.log(this);
    // 因为在 Promise 中 状态(fulfilled / rejected)被改变之后就不能再改了
    // 所以需要对 Promise 的状态进行判断(只有当状态为准备状态(pending)的时候,才可以修改状态),如果不进行判断的话,Promise 的状态就可以随时改变 不符合要求
    if (this.status == HD.PENDING) {
      // 修改状态为 成功状态
      this.status = HD.FULFILLED;
      this.value = value;

      // 成功状态下再调用 then() 中的 onFulfilled()
      // onFulfilled() 方法在 callbacks 数组中
      setTimeout(() => {
        // 要确保 then() 是处于异步之中
        this.callbacks.map((callback) => {
          callback.onFulfilled(value);
        });
      });
    }
  }
  reject(reason) {
    if (this.status == HD.PENDING) {
      // 修改状态为 拒绝状态
      this.status = HD.REJECTED;
      this.value = reason;

      setTimeout(() => {
        this.callbacks.map((callback) => {
          callback.onRejected(reason);
        });
      });
    }
  }
  then(onFulfilled, onRejected) {
    if (typeof onFulfilled != "function") {
      onFulfilled = () => this.value;
    }
    if (typeof onRejected != "function") {
      onRejected = () => this.value;
    }

    let promise = new HD((resolve, reject) => {
      if (this.status == HD.PENDING) {
        this.callbacks.push({
          onFulfilled: (value) => {
            this.parse(promise, onFulfilled(value), resolve, reject)
          },
          onRejected: (value) => {
            this.parse(promise, onRejected(value), resolve, reject)
          },
        });
      }

      // 控制 then 方法,只有状态为成功的时候再执行 onFulfilled() 方法
      if (this.status == HD.FULFILLED) {
        setTimeout(() => {
          this.parse(promise, onFulfilled(this.value), resolve, reject)
        });
      }
      // 控制 then 方法,只有状态为失败的时候再执行 onRejected() 方法
      if (this.status == HD.REJECTED) {
        setTimeout(() => {
          this.parse(promise, onRejected(this.value), resolve, reject)
        });
      }
      return promise;
    });
  }
  parse(promise, result, resolve, reject) {
    if (result == promise) {
      throw TypeError("Chaining cycle detected for promise")
    }
    try {
      // 判断 result 是否属于 HD 这个实例对象
      if (result instanceof HD) {
        // 是 调用一个 then() 将其返回出去
        result.then(resolve, reject)
      } else { // 不是,直接返回值
        resolve(result);
      }
    } catch (error) {
      reject(error);
    }
  }
  // 静态方法
  static resolve(value) {
    return new HD((resolve, reject) => {
      if (value instanceof HD) {
        value.then(resolve, reject)
      } else {
        resolve(value)
      }
    })
  }
  static reject(value) {
    return new HD((resolve, reject) => {
      reject(value)
    })
  }
  static all(promises) {
    const values = []
    return new HD((resolve, reject) => {
      promises.forEach(promise => {
        promise.then(
          value => {
            values.push(value)
            if (values.length == promises.length) {
              // 判断 Promise 的长度跟 values 的长度是否相等,相等表示全部 Promise 已经跑完,就可以将数组返回出去了
              resolve(values)
            }
          },
          reason => {
            // all() 方法只要有一个 Promise 返回错误 整体就会返回错误
            reject(reason)
          })
      })
    })
  }
  static race(promises) {
    return new HD((resolve, reject) => {
      promises.map(promise => {
        promise.then(value => {
          resolve(value)
        }, reason => {
          reject(reason)
        })
      })
    })
  }
}