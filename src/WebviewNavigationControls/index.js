import React from 'react';
import PropTypes from 'prop-types';
import { TouchableOpacity, View, StyleSheet, Text } from 'react-native';

function WebviewNavigationControls({  canGoBack, canGoForward, onGoBack, onGoForward }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
      }}
    >
      <TouchableOpacity disabled={!canGoBack} onPress={onGoBack} style={{ padding: 10 }}>
        <Text>{'<'}</Text>
      </TouchableOpacity>

      <TouchableOpacity disabled={!canGoForward} onPress={onGoForward} style={{ padding: 10 }}>
        <Text>{'>'}</Text>
      </TouchableOpacity>
    </View>
  );
}

WebviewNavigationControls.propTypes = {
  canGoBack: PropTypes.bool.isRequired,
  canGoForward: PropTypes.bool.isRequired,
  onGoBack: PropTypes.func.isRequired,
  onGoForward: PropTypes.func.isRequired,
};

export default WebviewNavigationControls;
