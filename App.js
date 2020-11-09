/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React,{useRef, useState} from 'react';
import {SafeAreaView, StatusBar,Text,TouchableOpacity} from 'react-native';
import AutoLoginWebView from './src/AutoLoginWebView';
import config from './src/config';

const App= () => {
  const webView = useRef();
  const [status, setStatus] = useState('idle');
  const credentials={
    user:'test',
    password:'test',
  }
  const doLogin = async () => {
    try {
      setStatus('loading')
      await webView.current.doLogin(credentials, 10000);
      setStatus('success');
      return true;
    } catch (e) {
      setStatus('error');
      return false;
    }
  };

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={{flex:1}}><AutoLoginWebView config={config}
                                                       ref={webView}/>
      <TouchableOpacity style={{ height: 50, alignItems: 'center', justifyContent:'center', backgroundColor:'#bfbfbf'}} onPress={doLogin}><Text>Run</Text><Text>{status}</Text></TouchableOpacity></SafeAreaView>
    </>
  );
};

export default App;
