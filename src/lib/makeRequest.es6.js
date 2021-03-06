import superagent from 'superagent';

// Subclass the Request method, and overwrite the `end` and `then` methods.
class Request extends superagent.Request {
  end() {
    throw new Error('Please use \'then\' instead');
  }

  then(onSuccess, onError) {
    // return a Promise
    const p = new Promise((resolve, reject) => {
      superagent.Request.prototype.end.call(this, function(err, res) {
        if (err) {
          reject({ ...res, ...err });
        } else {
          resolve(res);
        }
      });
    });

    // chain the promise if neccessary
    if (onSuccess || onError) {
      return p.then(onSuccess, onError);
    }

    return p;
  }

  // anything with a status of 0 is classified as a cors error by superagent.
  // issue: https://github.com/visionmedia/superagent/issues/484
  crossDomainError() {
    const err = new Error('Request has been terminated. Possible causes: the network is offline, Origin is not allowed by Access-Control-Allow-Origin, the page is being unloaded, etc.');

    // set this for backwards compat.
    err.crossDomain = true;

    // copy additional data for further inspection.
    err.xhr = this.xhr;
    err.url = this.url;
    err.method = this.method;

    this.callback(err);
  }
}

// Create a helper to keep actions code dry. This code is a near complete copy
// of superagent's actual action code.
const execute = (type, url, data, fn) => {
  const req = new Request(type, url);
  if (typeof data === 'function') {
    fn = data;
    data = null;
  }

  if (data) {
    if (type === 'GET') {
      req.query(data);
    } else {
      req.send(data);
    }
  }

  if (fn) { return req.then(fn); }
  return req;
};

export default {
  // We don't really use the function call api for superagent, so just clone the
  // methods on the function.
  ...superagent,

  // use our version of Request.
  Request,

  // overwrite the action methods. superagent uses a private reference to
  // Request, so we need to overwrite the methods to ensure our new version of
  // Request gets used instead.
  head(url, data, fn) { return execute('HEAD', url, data, fn); },
  get(url, data, fn) { return execute('GET', url, data, fn); },
  post(url, data, fn) { return execute('POST', url, data, fn); },
  patch(url, data, fn) { return execute('PATCH', url, data, fn); },
  put(url, data, fn) { return execute('PUT', url, data, fn); },
  del(url, fn) { return execute('DELETE', url, null, fn); },
};
