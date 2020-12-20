import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  Text,
  View,
  AppRegistry,
  TouchableOpacity,
} from 'react-native';
import {NetworkInfo} from 'react-native-network-info';
import {name as appName} from './app.json';

const PORT = 41414;

// TODO: refresh connectable desktop IPs every x secs
// TODO: separate this file into smaller components, improve the UI

let ws: WebSocket;
let dragLastPointX: number, dragLastPointY: number; // TODO: join these two in a single object

function App() {
  const [desktopIPs, setDesktopIPs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    NetworkInfo.getIPV4Address().then((ipAddress) => {
      if (ipAddress) {
        const LAN = ipAddress.substring(0, ipAddress.lastIndexOf('.'));

        for (let i = 0; i <= 255; i++) {
          const ipToScan = LAN + '.' + i;

          fetch('http://' + ipToScan + ':' + PORT)
            .then(() => {
              setDesktopIPs((desktopIPs) => [...desktopIPs, ipToScan]);
            })
            .catch(() => {});
        }
      }
    });
  }, []);

  return (
    <SafeAreaView style={{flex: 1}}>
      {isConnected ? (
        <>
          <View
            style={{
              backgroundColor: '#222',
              flex: 1,
              flexDirection: 'row',
              justifyContent: 'center',
            }}
            onMoveShouldSetResponder={() => true}
            onResponderMove={(e) => {
              // TODO: doesn't work as expected
              ws.send(
                e.nativeEvent.pageX -
                  dragLastPointX +
                  ':' +
                  (e.nativeEvent.pageY - dragLastPointY),
              );
              
              dragLastPointX = e.nativeEvent.pageX;
              dragLastPointY = e.nativeEvent.pageY;
            }}>
            <Text style={{color: '#fff', top: 60, textAlign: 'center'}}>
              Drag around to control your mouse!
            </Text>
          </View>
        </>
      ) : (
        <>
          <View
            style={{
              backgroundColor: '#444',
              flex: 1,
              flexDirection: 'row',
            }}>
            <View style={{padding: 12}}>
              <Text style={{color: '#fff', fontSize: 20}}>
                Connectable devices:
              </Text>
              <View style={{display: 'flex', flexDirection: 'row'}}>
                {desktopIPs.map((ip) => (
                  <TouchableOpacity
                    onPress={() => {
                      ws = new WebSocket('ws://' + ip + ':' + PORT);
                      setIsConnected(true);
                    }}
                    key={ip}
                    style={{
                      backgroundColor: '#555',
                      padding: 12,
                      width: '100%',
                      marginTop: 8,
                    }}>
                    <View style={{}}>
                      <Text style={{color: '#00ff00', fontSize: 16}}>{ip}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

AppRegistry.registerComponent(appName, () => App);
