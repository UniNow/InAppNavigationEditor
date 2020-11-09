import React from 'react';
import PropTypes from 'prop-types';
import { WebView } from 'react-native-webview';

import { siteNavigation, NavigationError, wrapSteps, getHtml } from '../navigation';
import WebviewNavigationControls from '../WebviewNavigationControls';

class AutoLoginWebView extends React.Component {
  constructor() {
    super();
    this.webView = React.createRef();
    this.doLogin = this.doLogin.bind(this);
    this.onPageLoad = this.onPageLoad.bind(this);
    this.injectSteps = this.injectSteps.bind(this);

    this.currentStep = 0;
    this.credentials = {};
    this.working = false;
    this.onSuccess = () => {};
    this.onError = () => {};
    this.state = {
      canGoBack: false,
      canGoForward: false,
    };
  }

  onPageLoad(event) {
    const { data } = event.nativeEvent;
    this.lastPageEvent = data;
    if (!this.working) {
      return;
    }
    console.log(data);
    const parsedData = JSON.parse(data);
    const currentUrl = parsedData?.href;
    if (parsedData.html) {
      this.lastHtml = parsedData.html;
    }

    if (parsedData?.type) {
      switch (parsedData.type) {
        case 'log':
          break;
        case 'finish':
          this.working = false;
          this.onSuccess(parsedData.html);
          break;
        case 'error':
          this.onError(
            new NavigationError(
              `error during login navigation in step ${this.currentStep - 1}: ${
                parsedData.message
              }`,
              this.lastHtml,
              currentUrl
            )
          );
          this.working = false;
          break;
        case 'failure':
          this.working = false;
          this.onError();
          break;
        default:
          break;
      }
      return;
    }
    const { config } = this.props;
    const { loginSteps } = config;

    const stepsForPage = loginSteps[this.currentStep];
    if (!stepsForPage || !currentUrl || !currentUrl.startsWith(stepsForPage.conditionUrl)) return;
    if (this.currentStep >= loginSteps.length) {
      this.working = false;
      this.onError(
        new NavigationError('last step did not fail or finish the login', this.lastHtml, currentUrl)
      );
      return;
    }
    this.injectSteps(stepsForPage.instructions);
    if (this.currentStep < loginSteps.length - 1) this.currentStep += 1;
  }

  onNavigationStateChange = navState => {
    const { canGoBack, canGoForward, url } = navState;
    this.setState({ canGoBack, canGoForward });
  };

  doLogin(credentials, timeout) {
    return Promise.race([
      new Promise((resolve, reject) => {
        const { config } = this.props;
        if (!config.loginSteps || config.loginSteps.length === 0) {
          resolve();
          return;
        }
        this.credentials = credentials;
        this.working = true;
        this.onSuccess = (...params) => {
          this.resetNavigation();
          resolve(...params);
        };
        this.onError = e => {
          this.resetNavigation();
          reject(e);
        };
        this.webView.current.reload();
      }),
      new Promise((resolve, reject) =>
        setTimeout(() => {
          const lastData = this.lastPageEvent;
          const { lastHtml } = this;
          let parsedData;
          try {
            parsedData = JSON.parse(lastData);
          } catch (e) {
            parsedData = null;
          }
          const currentUrl = parsedData?.href;
          this.resetNavigation();
          reject(
            new NavigationError(
              `timed out after ${timeout} ms in step ${this.currentStep}`,
              lastHtml,
              currentUrl
            )
          );
        }, timeout)
      ),
    ]);
  }

  resetNavigation() {
    this.currentStep = 0;
    this.credentials = {};
    this.working = false;
    this.lastHtml = null;
    this.lastPageEvent = null;
    this.webView.current?.stopLoading();
  }

  injectSteps(stepsForPage) {
    const stepJS = stepsForPage
      .map(step => {
        if (step.type === 'formFill') {
          const { formFill } = siteNavigation;
          return formFill(step.selector, step.fixedValue || this.credentials[step.credentialsKey]);
        }
        if (step.type === 'removeAttribute') {
          const { removeAttribute } = siteNavigation;
          return removeAttribute(step.selector, step.attribute);
        }
        return siteNavigation[step.type](step.selector);
      })
      .join('\n');
    const injectAction = wrapSteps(stepJS);
    if (this.webView) this.webView.current.injectJavaScript(injectAction);
  }

  render() {
    const { config, renderNavigationControls } = this.props;
    const injectOnPageLoad = `(function() {
      ${getHtml}
      window.ReactNativeWebView.postMessage(JSON.stringify({...window.location, html: getHtml()}));
    })();`;

    const { canGoBack, canGoForward } = this.state;
    return (
      <>
        <WebView
          thirdPartyCookiesEnabled={false}
          ref={this.webView}
          style={{ flex: 1 }}
          injectedJavaScript={injectOnPageLoad}
          onMessage={this.onPageLoad}
          source={
            config?.url
              ? {
                  uri: config.url,
                }
              : { html: '<html />' }
          }
          onContentProcessDidTerminate={syntheticEvent => {
            const { nativeEvent } = syntheticEvent;
            console.log('Content process terminated, reloading', nativeEvent);
          }}
          originWhitelist={['https://*', 'http://*', 'mailto:*']}
          onShouldStartLoadWithRequest={({ url: requestUrl }) => {
            if (requestUrl?.startsWith('mailto')) {
              console.log('open mail:',requestUrl);
              return false;
            }
            return true;
          }}
          onNavigationStateChange={this.onNavigationStateChange}
          cacheEnabled={false}
          sharedCookiesEnabled={config.loginSteps && config.loginSteps.length !== 0}
        />
        {renderNavigationControls && (
          <WebviewNavigationControls
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onGoBack={() => this.webView.current.goBack()}
            onGoForward={() => this.webView.current.goForward()}
          />
        )}
      </>
    );
  }
}

AutoLoginWebView.defaultProps = {
  renderNavigationControls: true,
};

AutoLoginWebView.propTypes = {
  config: PropTypes.shape({
    loginSteps: PropTypes.arrayOf(
      PropTypes.shape({
        conditionUrl: PropTypes.string.isRequired,
        instructions: PropTypes.arrayOf(
          PropTypes.oneOfType([
            PropTypes.shape({
              type: PropTypes.string.isRequired,
            }).isRequired,
            PropTypes.shape({
              type: PropTypes.string.isRequired,
              selector: PropTypes.string.isRequired,
            }).isRequired,
            PropTypes.shape({
              type: PropTypes.string.isRequired,
              selector: PropTypes.string.isRequired,
              fixedValue: PropTypes.string.isRequired,
            }).isRequired,
            PropTypes.shape({
              type: PropTypes.string.isRequired,
              selector: PropTypes.string.isRequired,
              credentialsKey: PropTypes.string.isRequired,
            }).isRequired,
          ])
        ),
      })
    ),
    url: PropTypes.string,
  }).isRequired,
  renderNavigationControls: PropTypes.bool,
};

export default AutoLoginWebView;
