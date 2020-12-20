import React, {useEffect} from 'react';
import {SafeAreaView, Text, View, AppRegistry} from 'react-native';
import {NetworkInfo} from 'react-native-network-info';
import {name as appName} from './app.json';

const PORT = 41414;

const App: () => React.ReactElement = () => {
  useEffect(() => {
    NetworkInfo.getIPV4Address().then((ipAddress) => {
      if (ipAddress) {
        const LAN = ipAddress.substring(0, ipAddress.lastIndexOf('.'));

        for (let i = 0; i <= 255; i++) {
          const ipToScan = LAN + '.' + i;

          fetch('http://' + ipToScan + ':' + PORT)
            .then(() => {
              console.log(ipToScan);
            })
            .catch(() => {});
        }
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
};

AppRegistry.registerComponent(appName, () => App);
