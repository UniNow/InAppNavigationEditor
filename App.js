/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, {useRef, useState} from 'react';
import {SafeAreaView, StatusBar, Text, TouchableOpacity, View} from 'react-native';
import AutoLoginWebView from './src/AutoLoginWebView';
import config from './src/config';

const App = () => {
  const [key, setKey] = useState(1);
  const webView = useRef();
  const [status, setStatus] = useState('idle');
  const credentials = {
    user: 'test',
    password: 'test',
  };
  const doLogin = async () => {
    try {
      setStatus('loading');
      await webView.current.doLogin(credentials, 10000);
      setStatus('success');
      return true;
    } catch (e) {
      console.log(e);
      setStatus('error');
      return false;
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{flex: 1}}>
        <AutoLoginWebView config={config} ref={webView} key={key} />
        <View style={{height: 50, flexDirection: 'row'}}>
          <TouchableOpacity
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#bfbfbf',
            }}
            onPress={doLogin}>
            <Text>Run</Text>
            <Text>{status}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={{
              flex: 0.2,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#bfbfbf',
            }}
            onPress={() => {
              setStatus('idle');
              setKey(key + 1);
            }}>
            <Text>Reset</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </>
  );
};

export default App;
