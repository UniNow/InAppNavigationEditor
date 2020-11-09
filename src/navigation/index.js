export const getHtml = `getHtml = () => {
const html = document.getElementsByTagName("html")[0].innerHTML;
const getFrameHtml=(doc)=> {
  const frames = document.querySelectorAll('iframe');
  for (frame of frames) {
    const frameDoc = frame.contentWindow.document
    const frameHtml = frameDoc.body.innerHTML;
    html = html.concat(frameHtml);
    getFrameHtml(frameDoc)
  }
}
getFrameHtml(document);
return "<html>"+html+"</html>";
};`;
export const baseFunctions = `
${getHtml}
const postError = (message) => {
  window.ReactNativeWebView.postMessage(JSON.stringify({type: 'error',message,html:getHtml()}));  
};
const postFailure = (message) => window.ReactNativeWebView.postMessage(JSON.stringify({type: 'failure',message}));
const postFinish = () => window.ReactNativeWebView.postMessage(JSON.stringify({type: 'finish',html:getHtml()}));
const log=(message)=>window.ReactNativeWebView.postMessage(JSON.stringify({type: 'log',message}));
const findElement = (selector) => {
    const findInFrames = doc => {
      frames = doc.querySelectorAll('iframe');
      for (frame of frames){
        let inFrame = frame.contentWindow.document.querySelector(selector);
        if (!inFrame) inFrame = findInFrames(frame.contentWindow.document);
        if (inFrame) return inFrame;
      }
      return null;
    }
    let element = document.querySelector(selector);
    if(!element){
      const inFrame = findInFrames(document);
      if (inFrame) return inFrame;
      
    }
    return element;
  };
const getElement = (selector) => {
    const element = findElement(selector);
    if(!element){postError('selector missing: ' + selector);}
    return element;    
}
const waitForElement = async (selector, inverse) => {
    const elementFound = findElement(selector)
    if ((!elementFound && !inverse) || (elementFound && inverse)) {
      await new Promise((resolve, reject) => {
        log('waiting for: ' + selector);
        let retries = 0;
        const maxRetries = 50;
        const interval = setInterval(function () {
          const element = findElement(selector);
          const elementVisible = element && element.offsetWidth > 0 && element.offsetHeight > 0;
          if ((elementVisible && !inverse) || (!elementVisible && inverse) ) {
            clearInterval(interval);
            log('finished waiting for: ' + selector);
            resolve();
          } else {
            retries += 1;
            if (retries > maxRetries) {
              clearInterval(interval);
              postError('timed out looking for selector ' + selector);
              reject();
            }
          }
        }, 100); // check every 100ms
      });
    }
  }
`;

export class NavigationError extends Error {
  constructor(message, html, url, ...params) {
    super(message, ...params);
    this.html = html;
    this.url = url;
  }
}

export const siteNavigation = {
  fail: () => `postFailure('triggered failure');`,
  finish: () => `postFinish();`,
  formFill: (selector, value) => `getElement('${selector}').value = '${value}';`,
  formSubmit: selector => `getElement('${selector}').submit();`,
  elementClick: selector => `getElement('${selector}').click();`,
  elementTouch: selector => `(()=>{
    const element = getElement('${selector}')
    const start = new Event('touchstart');
    const end = new Event('touchend');
    element.dispatchEvent(start);
    element.dispatchEvent(end);})()`,
  failIfExists: selector =>
    `if(document.querySelector('${selector}')){postFailure('failed because selector exists: ' + '${selector}');return true;}`,
  failIfNotExists: selector =>
    `if(!document.querySelector('${selector}')){postFailure('failed because selector exists: ' + '${selector}');return true;}`,
  finishIfExists: selector =>
    `if(document.querySelector('${selector}')){postFinish();return true;}`,
  finishIfNotExists: selector =>
    `if(!document.querySelector('${selector}')){postFinish();return true;}`,
  waitForElement: selector => `
    await waitForElement('${selector}', false);
  `,
  waitForElementToDisappear: selector => `
    await waitForElement('${selector}', true);
  `,
  removeAttribute: (selector, attribute) =>
    `getElement('${selector}').removeAttribute('${attribute}');`,
  triggerKeyboardInputEvent: selector => `(()=>{
    const element = getElement('${selector}');
    element.dispatchEvent(new Event('input'));
    })();`,
};

export const wrapSteps = stepJS =>
  `(async function() {${baseFunctions}
  try {
   ${stepJS}
  } catch (e) {
    postError(e.message)
  }})();
  true`;
