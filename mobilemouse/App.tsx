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

//let wsecho: WebSocket;

function App() {
  const [desktopIPs, setDesktopIPs] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // TODO: learn what useAsync is
  function findDesktops() {
    NetworkInfo.getIPV4Address().then((ipAddress) => {
      if (ipAddress) {
        const LAN = ipAddress.substring(0, ipAddress.lastIndexOf('.'));
        console.log('LAN: ' + LAN + '.X');

        for (let i = 2; i <= 16; i++) {
          const ipToScan = LAN + '.' + i;

          let xhr = new XMLHttpRequest();

          xhr.onload = function () {
            if (xhr.readyState === 4) {
              if (xhr.status === 200) {
                if (xhr.getResponseHeader('Content-Type') === 'mobilemouse') {
                  if (!desktopIPs.includes(ipToScan)) {
                    setDesktopIPs([...desktopIPs, ipToScan]);
                  }
                }
              }
            }
          };

          xhr.open('HEAD', 'http://' + ipToScan + ':' + PORT);
          xhr.setRequestHeader('Connection', 'close');
          xhr.timeout = 1000;
          xhr.send(null);
        }
      }
    });
  }

  useEffect(() => {
    findDesktops();
    /*wsecho = new WebSocket('wss://echo.websocket.org');
    let i = 0;
    wsecho.onopen = function () {
      setInterval(() => {
        wsecho.send('' + i++);
      }, 200);
    };
    wsecho.onmessage = function (message) {
      console.log(message);
    };*/
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
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(
                  e.nativeEvent.pageX -
                    dragLastPointX +
                    ':' +
                    (e.nativeEvent.pageY - dragLastPointY),
                );
              }

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
            <View style={{padding: 12, width: '100%'}}>
              <Text style={{color: '#fff', fontSize: 20}}>
                Connectable devices:
              </Text>
              <View style={{display: 'flex', flexDirection: 'row'}}>
                {desktopIPs.map((ip) => (
                  <TouchableOpacity
                    onPress={() => {
                      ws = new WebSocket('ws://' + ip + ':' + PORT);
                      let i = 0;
                      ws.onopen = function () {
                        setIsConnected(true);
                      };
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
              <TouchableOpacity
                style={{
                  backgroundColor: '#666',
                  marginTop: 12,
                  padding: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
                onPress={findDesktops}>
                <Text style={{color: '#ffff00', fontWeight: 'bold'}}>
                  REFRESH
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

AppRegistry.registerComponent(appName, () => App);
