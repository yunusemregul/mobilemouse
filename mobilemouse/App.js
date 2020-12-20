import React, {useEffect} from 'react';
import {SafeAreaView, Text, View} from 'react-native';
import {AppearanceProvider} from 'react-native-appearance';
import {NetworkInfo} from 'react-native-network-info';

const PORT = 41414;

function App() {
  useEffect(() => {
    NetworkInfo.getIPV4Address().then((ipAddress) => {
      const LAN = ipAddress.substring(0, ipAddress.lastIndexOf('.'));

      for (let i = 0; i <= 255; i++) {
        const ipToScan = LAN + '.' + i;

        fetch('http://' + ipToScan + ':' + PORT)
          .then(() => {
            console.log(ipToScan);
          })
          .catch(() => {});
      }
    });
  }, []);

  return (
    <SafeAreaView style={{flex: 1}}>
      <View
        style={{
          backgroundColor: '#444',
          flex: 1,
        }}
        onMoveShouldSetResponder={(evt) => true}
        onResponderMove={(evt) => {
          //console.log(evt);
        }}></View>
    </SafeAreaView>
  );
}

export default () => (
  <AppearanceProvider>
    <App />
  </AppearanceProvider>
);
